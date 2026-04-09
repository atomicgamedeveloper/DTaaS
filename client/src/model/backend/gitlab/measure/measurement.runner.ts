/* eslint-disable no-await-in-loop */
import { getChildPipelineId } from 'model/backend/gitlab/execution/pipelineCore';
import {
  measurementConfig as MeasurementConfig,
  TimedTask,
  MeasurementSetters,
  Status,
  measurementState,
  saveOriginalSettings,
  restoreOriginalSettings,
  attachSetters,
  wrapSetters,
  resetTasks,
  getTasks,
  clearPersistedResults,
  getStore,
} from 'model/backend/gitlab/measure/measurement.execution';
import {
  cancelActivePipelines,
  runTrials,
} from 'model/backend/gitlab/measure/measurement.pipeline';
import {
  computeAverageTime,
  computeFinalStatus,
} from 'model/backend/gitlab/measure/measurement.utils';

interface MeasurementDB {
  add(task: TimedTask): Promise<string>;
  purge(): Promise<void>;
}

let measurementDB: MeasurementDB | null = null;

export function setMeasurementDB(service: MeasurementDB): void {
  measurementDB = service;
}

type TaskUpdater = (taskIndex: number, updates: Partial<TimedTask>) => void;

function createTaskUpdater(
  setResults: MeasurementSetters['setResults'],
): TaskUpdater {
  return (taskIndex: number, updates: Partial<TimedTask>) => {
    setResults((previous) =>
      previous.map((task, index) =>
        index === taskIndex ? { ...task, ...updates } : task,
      ),
    );
  };
}

async function executeTask(
  taskIndex: number,
  currentTask: TimedTask,
  setters: MeasurementSetters,
  updateTask: TaskUpdater,
): Promise<void> {
  if (measurementState.shouldStopPipelines) {
    return;
  }

  measurementState.executionResults = [];
  setters.setCurrentExecutions([]);
  setters.setCurrentTaskIndex(taskIndex);

  updateTask(taskIndex, {
    'Time Start': new Date(),
    Status: 'RUNNING',
    ExpectedTrials: MeasurementConfig.trials,
    Trials: [],
  });

  const taskExecutions = currentTask.Executions?.() ?? [];
  const previousTrialCount = { value: 0 };
  const trials = await runTrials(
    taskExecutions,
    MeasurementConfig.trials,
    [],
    (updatedTrials) => {
      setters.setCurrentExecutions([]);
      updateTask(taskIndex, { Trials: updatedTrials });
      previousTrialCount.value = updatedTrials.length;
    },
  );

  const finalStatus = computeFinalStatus(
    trials,
    MeasurementConfig.trials,
    measurementState.shouldStopPipelines,
  );
  const averageTime = computeAverageTime(trials);

  setters.setCurrentExecutions([]);
  setters.setCurrentTaskIndex(null);

  const completedTask: TimedTask = {
    ...currentTask,
    Trials: trials,
    'Time End': new Date(),
    'Average Time (s)': averageTime,
    Status: finalStatus,
  };

  updateTask(taskIndex, {
    Trials: trials,
    'Time End': completedTask['Time End'],
    'Average Time (s)': averageTime,
    Status: finalStatus,
  });

  if (finalStatus === 'SUCCESS' && measurementDB) {
    try {
      const taskToSave = {
        'Task Name': completedTask['Task Name'],
        Description: completedTask.Description,
        Trials: completedTask.Trials,
        'Time Start': completedTask['Time Start'],
        'Time End': completedTask['Time End'],
        'Average Time (s)': completedTask['Average Time (s)'],
        Status: completedTask.Status,
        ExpectedTrials: completedTask.ExpectedTrials,
      };
      await measurementDB.add(taskToSave as TimedTask);
    } catch {
      // ignore
    }
  }
}

export async function startMeasurement(
  setters: MeasurementSetters,
  isRunningRef: React.MutableRefObject<boolean>,
): Promise<void> {
  if (isRunningRef.current) {
    return;
  }

  isRunningRef.current = true;

  attachSetters(setters);
  const proxy = wrapSetters();

  measurementState.shouldStopPipelines = false;
  proxy.setIsRunning(true);
  saveOriginalSettings();

  proxy.setResults((previous) =>
    previous.map((task) =>
      task.Status === 'NOT_STARTED'
        ? { ...task, Status: 'PENDING' as Status }
        : task,
    ),
  );

  const updateTask = createTaskUpdater(proxy.setResults);

  try {
    const allTasks = getTasks();
    for (let i = 0; i < allTasks.length; i += 1) {
      if (measurementState.shouldStopPipelines) {
        break;
      }
      await executeTask(i, allTasks[i], proxy, updateTask);
    }
    if (!measurementState.shouldStopPipelines) {
      getStore().showSnackbar('All measurements completed', 'info');
    }
  } finally {
    isRunningRef.current = false;
    proxy.setIsRunning(false);
    measurementState.currentMeasurementPromise = null;
    restoreOriginalSettings();
  }
}

export async function stopAllPipelines(): Promise<void> {
  measurementState.shouldStopPipelines = true;
  restoreOriginalSettings();
  const proxy = wrapSetters();
  proxy.setIsRunning(false);
  await cancelActivePipelines();
  proxy.setResults((previous) =>
    previous.map((task) =>
      task.Status === 'PENDING' || task.Status === 'RUNNING'
        ? { ...task, Status: 'STOPPED' as Status }
        : task,
    ),
  );
}

let isRestarting = false;

export async function purgeMeasurementData(): Promise<void> {
  await measurementDB?.purge();
  clearPersistedResults();
  const fresh = resetTasks();
  measurementState.results = fresh;
  measurementState.componentSetters?.setResults(fresh);
}

export async function restartMeasurement(
  setters: MeasurementSetters,
  isRunningRef: React.MutableRefObject<boolean>,
): Promise<void> {
  if (isRestarting) {
    return;
  }
  isRestarting = true;

  try {
    measurementState.shouldStopPipelines = true;
    await cancelActivePipelines();

    if (measurementState.currentMeasurementPromise) {
      await measurementState.currentMeasurementPromise;
    }

    restoreOriginalSettings();

    attachSetters(setters);
    const proxy = wrapSetters();

    measurementState.shouldStopPipelines = false;
    measurementState.activePipelines = [];
    measurementState.executionResults = [];
    proxy.setCurrentExecutions([]);
    proxy.setCurrentTaskIndex(null);
    proxy.setResults(resetTasks());
    isRunningRef.current = false;

    measurementState.currentMeasurementPromise = startMeasurement(
      setters,
      isRunningRef,
    );
  } finally {
    isRestarting = false;
  }
}

export function handleBeforeUnload(
  event: BeforeUnloadEvent,
  isRunningRef: React.MutableRefObject<boolean>,
): void {
  if (isRunningRef.current && measurementState.activePipelines.length > 0) {
    event.preventDefault();

    measurementState.shouldStopPipelines = true;
    for (const { backend, pipelineId } of measurementState.activePipelines) {
      try {
        const projectId = backend.getProjectId();
        backend.api.cancelPipeline(projectId, pipelineId).catch(() => {});
        backend.api
          .cancelPipeline(projectId, getChildPipelineId(pipelineId))
          .catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  restoreOriginalSettings();
}
