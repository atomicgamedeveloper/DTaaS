import {
  restartMeasurement,
  handleBeforeUnload,
} from 'model/backend/gitlab/measure/benchmark.runner';
import {
  restoreOriginalSettings,
  DEFAULT_CONFIG,
  resetTasks,
} from 'model/backend/gitlab/measure/benchmark.execution';
import { cancelActivePipelines } from 'model/backend/gitlab/measure/benchmark.pipeline';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import { setupBenchmarkTestHarness } from './benchmark.testUtil';

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => {
  const { createBenchmarkExecutionMock } = jest.requireActual(
    './benchmark.envSetup',
  );
  return createBenchmarkExecutionMock();
});

jest.mock('model/backend/gitlab/measure/benchmark.pipeline', () => ({
  cancelActivePipelines: jest.fn().mockResolvedValue(undefined),
  runTrials: jest.fn().mockResolvedValue([]),
}));
jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  delay: jest.fn().mockResolvedValue(undefined),
  getChildPipelineId: jest.fn((id: number) => id + 1),
}));
jest.mock('model/backend/gitlab/execution/statusChecking', () => ({
  isFailureStatus: jest.fn(
    (s: string) =>
      s.toLowerCase() === 'failed' || s.toLowerCase() === 'skipped',
  ),
}));
jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: {
    add: jest.fn(() => Promise.resolve()),
    purge: jest.fn(() => Promise.resolve()),
  },
}));

describe('benchmark.lifecycle', () => {
  const harness = setupBenchmarkTestHarness();

  beforeEach(() => {
    harness.reset();
  });

  it('should cancel, restore settings, wait for promise and reset state', async () => {
    harness.BenchmarkConfig.trials = 1;
    let resolve: () => void = () => {};
    harness.state.currentMeasurementPromise = new Promise((r) => {
      resolve = r;
    });
    const promise = restartMeasurement(harness.setters, harness.isRunningRef);
    resolve();
    await promise;
    expect(cancelActivePipelines).toHaveBeenCalled();
    expect(restoreOriginalSettings).toHaveBeenCalled();
    expect(resetTasks).toHaveBeenCalled();
  });

  it('should not restart if already restarting', async () => {
    harness.BenchmarkConfig.trials = 1;
    await Promise.all([
      restartMeasurement(harness.setters, harness.isRunningRef),
      restartMeasurement(harness.setters, harness.isRunningRef),
    ]);
    expect(cancelActivePipelines).toHaveBeenCalledTimes(1);
  });

  it('should do nothing if not running or no active pipelines', () => {
    handleBeforeUnload(harness.isRunningRef);
    expect(harness.state.shouldStopPipelines).toBe(false);
    harness.isRunningRef.current = true;
    handleBeforeUnload(harness.isRunningRef);
    expect(harness.state.shouldStopPipelines).toBe(false);
  });

  it('should cancel pipelines and handle errors gracefully', () => {
    harness.isRunningRef.current = true;
    const cancelFn = jest.fn().mockReturnValue({ catch: jest.fn() });
    harness.state.activePipelines = [
      {
        backend: {
          getProjectId: () => 1,
          api: { cancelPipeline: cancelFn },
        } as unknown as BackendInterface,
        pipelineId: 100,
        dtName: 'test',
        config: DEFAULT_CONFIG,
        status: 'running',
        phase: 'parent',
      },
    ];
    handleBeforeUnload(harness.isRunningRef);
    expect(harness.state.shouldStopPipelines).toBe(true);
    expect(cancelFn).toHaveBeenCalledWith(1, 100);

    harness.reset();
    harness.isRunningRef.current = true;
    harness.state.activePipelines = [
      {
        backend: {
          getProjectId: () => {
            throw new Error('Mock getProjectId error');
          },
          api: { cancelPipeline: jest.fn() },
        } as unknown as BackendInterface,
        pipelineId: 100,
        dtName: 'test',
        config: DEFAULT_CONFIG,
        status: 'running',
        phase: 'parent',
      },
    ];
    expect(() => handleBeforeUnload(harness.isRunningRef)).not.toThrow();
    expect(restoreOriginalSettings).toHaveBeenCalled();
  });
});
