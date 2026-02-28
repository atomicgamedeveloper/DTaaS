/* eslint-disable no-await-in-loop */
import measurementDBService from 'database/measurementHistoryDB';
import {
  TimedTask,
  BenchmarkSetters,
  Status,
  Trial,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  benchmarkState,
  saveOriginalSettings,
  restoreOriginalSettings,
  attachSetters,
  wrapSetters,
} from 'model/backend/gitlab/measure/benchmark.execution';
import { cancelActivePipelines } from 'model/backend/gitlab/measure/benchmark.pipeline';
import {
  computeAverageTime,
  computeFinalStatus,
} from 'model/backend/gitlab/measure/benchmark.utils';
import {
  BenchmarkConfig,
  tasks,
} from 'model/backend/gitlab/measure/benchmark.tasks';
import { runTrials } from 'model/backend/gitlab/measure/benchmark.trials';

export {
  secondsDifference,
  getTotalTime,
  downloadResultsJson,
  downloadTaskResultJson,
} from 'model/backend/gitlab/measure/benchmark.utils';
export {
  tasks,
  DEFAULT_TASK as DEFAULT_MEASUREMENT,
} from 'model/backend/gitlab/measure/benchmark.tasks';
export {
  continueMeasurement,
  restartMeasurement,
  handleBeforeUnload,
} from 'model/backend/gitlab/measure/benchmark.lifecycle';

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
    ExpectedTrials: BenchmarkConfig.trials,
  });

  const taskExecutions = currentTask.Executions?.() ?? [];
  const trials = await runTrials(
    taskExecutions,
    BenchmarkConfig.trials,
    existingTrials,
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

  if (finalStatus === 'SUCCESS' && measurementDBService) {
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
    for (let i = startFromIndex; i < tasks.length; i += 1) {
      if (benchmarkState.shouldStopPipelines) {
        break;
      }
      const trialsToKeep =
        i === startFromIndex ? existingTrialsForFirstTask : [];
      await executeTask(i, tasks[i], proxy, updateTask, trialsToKeep);
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
