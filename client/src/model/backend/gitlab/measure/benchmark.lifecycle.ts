import { getChildPipelineId } from 'model/backend/gitlab/execution/pipelineCore';
import {
  TimedTask,
  BenchmarkSetters,
  Status,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  benchmarkState,
  restoreOriginalSettings,
  attachSetters,
  wrapSetters,
} from 'model/backend/gitlab/measure/benchmark.execution';
import { cancelActivePipelines } from 'model/backend/gitlab/measure/benchmark.pipeline';
import { resetTasks } from 'model/backend/gitlab/measure/benchmark.tasks';
import { startMeasurement } from 'model/backend/gitlab/measure/benchmark.runner';

let isRestarting = false;

export async function continueMeasurement(
  setters: BenchmarkSetters,
  isRunningRef: React.MutableRefObject<boolean>,
  currentResults: TimedTask[],
): Promise<void> {
  if (isRunningRef.current) {
    return;
  }

  attachSetters(setters);
  const proxy = wrapSetters();

  const continueFromIndex = currentResults.findIndex(
    (task) => task.Status === 'STOPPED' || task.Status === 'PENDING',
  );

  if (continueFromIndex === -1) {
    return;
  }

  benchmarkState.executionResults = [];
  benchmarkState.activePipelines = [];
  benchmarkState.currentTrialExecutionIndex = 0;
  proxy.setCurrentExecutions([]);
  proxy.setCurrentTaskIndex(null);

  const stoppedTask = currentResults[continueFromIndex];
  const completedTrials = stoppedTask.Trials.filter(
    (trial) => trial.Status === 'SUCCESS' || trial.Status === 'FAILURE',
  );

  proxy.setResults((previous) =>
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
