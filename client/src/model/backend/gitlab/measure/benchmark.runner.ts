/* eslint-disable no-await-in-loop */
import { delay } from 'model/backend/gitlab/execution/pipelineCore';
import measurementDBService from 'database/measurementHistoryDB';
import {
  ExecutionResult,
  TimedTask,
  BenchmarkSetters,
  Status,
  Trial,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  benchmarkState,
  runDigitalTwin,
  cancelActivePipelines,
  saveOriginalSettings,
  restoreOriginalSettings,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  computeAverageTime,
  computeFinalStatus,
} from 'model/backend/gitlab/measure/benchmark.utils';
import {
  benchmarkConfig,
  resetTasks,
  tasks,
} from 'model/backend/gitlab/measure/benchmark.tasks';

export {
  statusColorMap,
  getExecutionStatusColor,
  secondsDifference,
  getTotalTime,
  downloadResultsJson,
  downloadTaskResultJson,
} from 'model/backend/gitlab/measure/benchmark.utils';
export {
  tasks,
  setTrials,
  setAlternateRunnerTag,
  DEFAULT_TASK as DEFAULT_MEASUREMENT,
  addTask as addNewTimedTask,
} from 'model/backend/gitlab/measure/benchmark.tasks';

let isRestarting = false;

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

function createTrialFromExecution(
  trialStart: Date,
  executions: ExecutionResult[],
): Trial {
  const hasFailure = executions.some((exec) => exec.status === 'failed');
  return {
    'Time Start': trialStart,
    'Time End': new Date(),
    Execution: executions,
    Status: hasFailure ? 'FAILURE' : 'SUCCESS',
    Error: undefined,
  };
}

function createTrialFromError(
  trialStart: Date,
  caughtError: unknown,
  wasStopped: boolean,
): Trial {
  const errorMessage =
    caughtError instanceof Error ? caughtError.message : String(caughtError);
  const error =
    caughtError instanceof Error ? caughtError : new Error(String(caughtError));

  const minPipelineId = benchmarkState.currentTrialMinPipelineId ?? 0;

  const capturedExecutions: ExecutionResult[] = [
    ...benchmarkState.executionResults.filter(
      (result) =>
        result.pipelineId !== null && result.pipelineId >= minPipelineId,
    ),
    ...benchmarkState.activePipelines
      .filter((pipeline) => pipeline.pipelineId >= minPipelineId)
      .map((pipeline) => ({
        dtName: pipeline.dtName,
        pipelineId: pipeline.pipelineId,
        status: 'cancelled',
        config: pipeline.config,
      })),
  ];

  return {
    'Time Start': trialStart,
    'Time End': wasStopped ? undefined : new Date(),
    Execution: capturedExecutions,
    Status: wasStopped ? 'STOPPED' : 'FAILURE',
    Error: wasStopped ? undefined : { message: errorMessage, error },
  };
}

async function runTrials(
  currentTask: TimedTask,
  existingTrials: Trial[],
  updateTrials: (trials: Trial[]) => void,
): Promise<Trial[]> {
  const trials: Trial[] = [...existingTrials];
  const startTrialNumber = existingTrials.length;
  const targetTrials = benchmarkConfig.trials;

  for (
    let trialNumber = startTrialNumber;
    trialNumber < targetTrials;
    trialNumber += 1
  ) {
    if (benchmarkState.shouldStopPipelines) {
      break;
    }

    if (trialNumber > 0) {
      await delay(1000);
    }

    benchmarkState.executionResults = [];
    benchmarkState.activePipelines = [];
    benchmarkState.currentTrialMinPipelineId = null;
    const trialStart = new Date();

    try {
      const executions = await currentTask.Function(runDigitalTwin);
      trials.push(createTrialFromExecution(trialStart, executions));
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError);
      const wasStopped =
        benchmarkState.shouldStopPipelines ||
        errorMessage.includes('stopped by user');

      trials.push(createTrialFromError(trialStart, caughtError, wasStopped));
    }

    benchmarkState.executionResults = [];
    updateTrials([...trials]);
  }

  return trials;
}

async function executeTask(
  taskIndex: number,
  currentTask: TimedTask,
  setters: BenchmarkSetters,
  updateTask: TaskUpdater,
  existingTrials: Trial[] = [],
): Promise<void> {
  if (benchmarkState.shouldStopPipelines) {
    return;
  }

  benchmarkState.executionResults = [];
  setters.setCurrentExecutions([]);
  setters.setCurrentTaskIndex(taskIndex);

  const timeStartUpdate =
    existingTrials.length > 0 ? {} : { 'Time Start': new Date() };

  updateTask(taskIndex, {
    ...timeStartUpdate,
    Status: 'RUNNING',
    ExpectedTrials: benchmarkConfig.trials,
  });

  const trials = await runTrials(
    currentTask,
    existingTrials,
    (updatedTrials) => {
      setters.setCurrentExecutions([]);
      updateTask(taskIndex, { Trials: updatedTrials });
    },
  );

  const finalStatus = computeFinalStatus(
    trials,
    benchmarkConfig.trials,
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

  if (finalStatus === 'SUCCESS' && measurementDBService) {
    try {
      // Create a copy without the Function property for IndexedDB storage
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
      await measurementDBService.add(taskToSave as TimedTask);
    } catch {
      // ignore storage errors
    }
  }
}

export async function startMeasurement(
  setters: BenchmarkSetters,
  isRunningRef: React.MutableRefObject<boolean>,
  startFromIndex: number = 0,
  existingTrialsForFirstTask: Trial[] = [],
): Promise<void> {
  if (isRunningRef.current) {
    return;
  }

  isRunningRef.current = true;
  benchmarkState.shouldStopPipelines = false;
  setters.setIsRunning(true);
  saveOriginalSettings();

  setters.setResults((previous) =>
    previous.map((task) =>
      task.Status === 'NOT_STARTED'
        ? { ...task, Status: 'PENDING' as Status }
        : task,
    ),
  );

  const updateTask = createTaskUpdater(setters.setResults);

  for (let i = startFromIndex; i < tasks.length; i += 1) {
    if (benchmarkState.shouldStopPipelines) {
      break;
    }
    const trialsToKeep = i === startFromIndex ? existingTrialsForFirstTask : [];
    await executeTask(i, tasks[i], setters, updateTask, trialsToKeep);
  }

  isRunningRef.current = false;
  setters.setIsRunning(false);
  benchmarkState.currentMeasurementPromise = null;
  restoreOriginalSettings();
}

export async function stopAllPipelines(
  setters: Pick<BenchmarkSetters, 'setResults'>,
): Promise<void> {
  benchmarkState.shouldStopPipelines = true;
  await cancelActivePipelines();
  setters.setResults((previous) =>
    previous.map((task) =>
      task.Status === 'PENDING'
        ? { ...task, Status: 'STOPPED' as Status }
        : task,
    ),
  );
}

export async function continueMeasurement(
  setters: BenchmarkSetters,
  isRunningRef: React.MutableRefObject<boolean>,
  currentResults: TimedTask[],
): Promise<void> {
  if (isRunningRef.current) {
    return;
  }

  const continueFromIndex = currentResults.findIndex(
    (task) => task.Status === 'STOPPED' || task.Status === 'PENDING',
  );

  if (continueFromIndex === -1) {
    return;
  }

  benchmarkState.executionResults = [];
  benchmarkState.activePipelines = [];
  setters.setCurrentExecutions([]);
  setters.setCurrentTaskIndex(null);

  const stoppedTask = currentResults[continueFromIndex];
  const completedTrials = stoppedTask.Trials.filter(
    (trial) => trial.Status === 'SUCCESS' || trial.Status === 'FAILURE',
  );

  setters.setResults((previous) =>
    previous.map((task, index) => {
      if (index === continueFromIndex) {
        return {
          ...task,
          Status: 'PENDING' as Status,
          Trials: completedTrials,
          'Time Start':
            completedTrials.length > 0 ? task['Time Start'] : undefined,
          'Time End': undefined,
          'Average Time (s)': undefined,
        };
      }
      if (index > continueFromIndex) {
        return {
          ...task,
          Status: 'PENDING' as Status,
          Trials: [],
          'Time Start': undefined,
          'Time End': undefined,
          'Average Time (s)': undefined,
        };
      }
      return task;
    }),
  );

  benchmarkState.currentMeasurementPromise = startMeasurement(
    setters,
    isRunningRef,
    continueFromIndex,
    completedTrials,
  );
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

    benchmarkState.shouldStopPipelines = false;
    benchmarkState.activePipelines = [];
    benchmarkState.executionResults = [];
    setters.setCurrentExecutions([]);
    setters.setCurrentTaskIndex(null);
    setters.setResults(resetTasks());
    isRunningRef.current = false;

    benchmarkState.currentMeasurementPromise = startMeasurement(
      setters,
      isRunningRef,
    );
  } finally {
    isRestarting = false;
  }
}

function getChildPipelineId(parentPipelineId: number): number {
  return parentPipelineId + 1;
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
