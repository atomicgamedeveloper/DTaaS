import { getChildPipelineId } from 'model/backend/gitlab/execution/pipelineCore';
import {
  BenchmarkSetters,
  benchmarkState,
  restoreOriginalSettings,
  attachSetters,
  wrapSetters,
  resetTasks,
} from 'model/backend/gitlab/measure/benchmark.execution';
import { cancelActivePipelines } from 'model/backend/gitlab/measure/benchmark.pipeline';
import { startMeasurement } from 'model/backend/gitlab/measure/benchmark.runner';
import measurementDBService from 'database/measurementHistoryDB';

let isRestarting = false;

export async function purgeBenchmarkData(): Promise<void> {
  await measurementDBService.purge();
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
