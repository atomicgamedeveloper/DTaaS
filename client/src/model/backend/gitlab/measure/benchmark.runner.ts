// Top-level benchmark orchestrator (runs tasks across trials, updates UI, persists results)
/* eslint-disable no-await-in-loop */
import { getChildPipelineId } from 'model/backend/gitlab/execution/pipelineCore';
import {
  benchmarkConfig as BenchmarkConfig,
  TimedTask,
  BenchmarkSetters,
  Status,
  benchmarkState,
  saveOriginalSettings,
  restoreOriginalSettings,
  attachSetters,
  wrapSetters,
  resetTasks,
  getTasks,
  clearPersistedResults,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  cancelActivePipelines,
  runTrials,
} from 'model/backend/gitlab/measure/benchmark.pipeline';
import {
  computeAverageTime,
  computeFinalStatus,
} from 'model/backend/gitlab/measure/benchmark.utils';

interface MeasurementDB {
  add(task: TimedTask): Promise<string>;
  purge(): Promise<void>;
}

let _measurementDB: MeasurementDB | null = null;

export function setMeasurementDB(service: MeasurementDB): void {
  _measurementDB = service;
}

type TaskUpdater = (taskIndex: number, updates: Partial<TimedTask>) => void;

function createTaskUpdater(
  setResults: BenchmarkSetters['setResults'],
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
  setters: BenchmarkSetters,
  updateTask: TaskUpdater,
): Promise<void> {
  if (benchmarkState.shouldStopPipelines) {
    return;
  }

  benchmarkState.executionResults = [];
  setters.setCurrentExecutions([]);
  setters.setCurrentTaskIndex(taskIndex);

  updateTask(taskIndex, {
    'Time Start': new Date(),
    Status: 'RUNNING',
    ExpectedTrials: BenchmarkConfig.trials,
  });

  const taskExecutions = currentTask.Executions?.() ?? [];
  const trials = await runTrials(
    taskExecutions,
    BenchmarkConfig.trials,
    [],
    (updatedTrials) => {
      setters.setCurrentExecutions([]);
      updateTask(taskIndex, { Trials: updatedTrials });
    },
  );

  const finalStatus = computeFinalStatus(
    trials,
    BenchmarkConfig.trials,
    benchmarkState.shouldStopPipelines,
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

  if (finalStatus === 'SUCCESS' && _measurementDB) {
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
      await _measurementDB.add(taskToSave as TimedTask);
    } catch {
      // ignore storage errors
    }
  }
}

export async function startMeasurement(
  setters: BenchmarkSetters,
  isRunningRef: React.MutableRefObject<boolean>,
): Promise<void> {
  if (isRunningRef.current) {
    return;
  }

  isRunningRef.current = true;

  // Hook up the page's update functions and wrap them so every change
  // is kept in memory even if the user navigates away mid-measurement
  attachSetters(setters);
  const proxy = wrapSetters();

  benchmarkState.shouldStopPipelines = false;
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
      if (benchmarkState.shouldStopPipelines) {
        break;
      }
      await executeTask(i, allTasks[i], proxy, updateTask);
    }
  } finally {
    isRunningRef.current = false;
    proxy.setIsRunning(false);
    benchmarkState.currentMeasurementPromise = null;
    restoreOriginalSettings();
  }
}

export async function stopAllPipelines(): Promise<void> {
  benchmarkState.shouldStopPipelines = true;
  restoreOriginalSettings();
  // Save the stop to memory and update the screen if the page is open
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

export async function purgeBenchmarkData(): Promise<void> {
  await _measurementDB?.purge();
  clearPersistedResults();
  const fresh = resetTasks();
  benchmarkState.results = fresh;
  benchmarkState.componentSetters?.setResults(fresh);
}

export async function restartMeasurement(
  setters: BenchmarkSetters,
  isRunningRef: React.MutableRefObject<boolean>,
): Promise<void> {
  if (isRestarting) {
    return;
  }
  isRestarting = true;

  try {
    benchmarkState.shouldStopPipelines = true;
    await cancelActivePipelines();

    if (benchmarkState.currentMeasurementPromise) {
      await benchmarkState.currentMeasurementPromise;
    }

    restoreOriginalSettings();

    attachSetters(setters);
    const proxy = wrapSetters();

    benchmarkState.shouldStopPipelines = false;
    benchmarkState.activePipelines = [];
    benchmarkState.executionResults = [];
    proxy.setCurrentExecutions([]);
    proxy.setCurrentTaskIndex(null);
    proxy.setResults(resetTasks());
    isRunningRef.current = false;

    benchmarkState.currentMeasurementPromise = startMeasurement(
      setters,
      isRunningRef,
    );
  } finally {
    isRestarting = false;
  }
}

export function handleBeforeUnload(
  isRunningRef: React.MutableRefObject<boolean>,
): void {
  if (isRunningRef.current && benchmarkState.activePipelines.length > 0) {
    benchmarkState.shouldStopPipelines = true;
    for (const { backend, pipelineId } of benchmarkState.activePipelines) {
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
