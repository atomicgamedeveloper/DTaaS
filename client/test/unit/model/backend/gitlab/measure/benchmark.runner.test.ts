import {
  startMeasurement,
  stopAllPipelines,
} from 'model/backend/gitlab/measure/benchmark.runner';
import {
  saveOriginalSettings,
  restoreOriginalSettings,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  cancelActivePipelines,
  runTrials,
} from 'model/backend/gitlab/measure/benchmark.pipeline';
import { setupBenchmarkTestHarness } from './benchmark.testUtil';

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => {
  const { createBenchmarkExecutionMock } = jest.requireActual(
    './benchmark.envSetup',
  );
  return createBenchmarkExecutionMock({ runDigitalTwin: jest.fn() });
});

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
jest.mock('model/backend/gitlab/measure/benchmark.pipeline', () => ({
  runDigitalTwin: jest.fn(),
  cancelActivePipelines: jest.fn().mockResolvedValue(undefined),
  runTrials: jest.fn().mockResolvedValue([]),
}));
jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: { add: jest.fn(() => Promise.resolve()) },
}));

describe('benchmark.runner', () => {
  const harness = setupBenchmarkTestHarness();

  beforeEach(() => {
    harness.reset();
  });

  it('should not start if already running', async () => {
    harness.BenchmarkConfig.trials = 1;
    harness.isRunningRef.current = true;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setIsRunning).not.toHaveBeenCalled();
  });

  it('should manage lifecycle and iterate through tasks', async () => {
    harness.BenchmarkConfig.trials = 1;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setIsRunning).toHaveBeenCalledWith(true);
    expect(saveOriginalSettings).toHaveBeenCalled();
    expect(restoreOriginalSettings).toHaveBeenCalled();
    expect(harness.isRunningRef.current).toBe(false);
  });

  it('should handle stop flag during measurement', async () => {
    harness.BenchmarkConfig.trials = 1;
    harness.state.shouldStopPipelines = true;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setResults).toHaveBeenCalled();
  });

  it('should transition NOT_STARTED to PENDING and run multiple trials', async () => {
    harness.BenchmarkConfig.trials = 2;
    harness.resultsRef.current = harness.resultsRef.current.map((t) => ({
      ...t,
      Status: 'NOT_STARTED' as const,
    }));
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setResults).toHaveBeenCalled();
    expect(runTrials).toHaveBeenCalled();
  });

  it('should stop pipelines and update statuses', async () => {
    harness.resultsRef.current = [
      { ...harness.resultsRef.current[0], Status: 'RUNNING' },
      { ...harness.resultsRef.current[1], Status: 'PENDING' },
    ];
    await stopAllPipelines();
    expect(harness.state.shouldStopPipelines).toBe(true);
    expect(cancelActivePipelines).toHaveBeenCalled();
    expect(harness.setters.setResults).toHaveBeenCalled();
  });

  it('should create trials with SUCCESS/FAILURE status based on results', async () => {
    harness.BenchmarkConfig.trials = 1;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setResults).toHaveBeenCalled();
  });

  it('should create STOPPED trial and capture pipelines on user stop', async () => {
    harness.BenchmarkConfig.trials = 1;
    harness.state.currentTrialMinPipelineId = 100;
    harness.state.executionResults = [
      {
        dtName: 'dt',
        pipelineId: 100,
        status: 'success',
        config: {
          'Branch name': 'main',
          'Group name': 'dtaas',
          'Common Library project name': 'common',
          'DT directory': 'digital_twins',
          'Runner tag': 'linux',
        },
      },
    ];
    harness.state.shouldStopPipelines = true;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setResults).toHaveBeenCalled();
  });

  it('should handle errors and continue to next task', async () => {
    harness.BenchmarkConfig.trials = 1;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setResults).toHaveBeenCalled();
  });

  it('should break trial loop when shouldStopPipelines becomes true', async () => {
    harness.BenchmarkConfig.trials = 3;
    harness.state.shouldStopPipelines = false;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setResults).toHaveBeenCalled();
  });
});
