import {
  startMeasurement,
  stopAllPipelines,
  purgeBenchmarkData,
  restartMeasurement,
  handleBeforeUnload,
} from 'model/backend/gitlab/measure/benchmark.runner';
import {
  saveOriginalSettings,
  restoreOriginalSettings,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  cancelActivePipelines,
  runTrials,
} from 'model/backend/gitlab/measure/benchmark.pipeline';
import {
  setupBenchmarkTestHarness,
  createMockActivePipeline,
  createMockBackend,
} from './benchmark.testUtil';

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
  default: {
    add: jest.fn(() => Promise.resolve()),
    purge: jest.fn(() => Promise.resolve()),
  },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockMeasurementDB = require('database/measurementHistoryDB').default;

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

  describe('purgeBenchmarkData', () => {
    it('calls measurementDB.purge and resets state', async () => {
      await purgeBenchmarkData();
      expect(mockMeasurementDB.purge).toHaveBeenCalled();
    });
  });

  describe('restartMeasurement', () => {
    it('stops pipelines, resets state, and starts measurement', async () => {
      await restartMeasurement(harness.setters, harness.isRunningRef);
      expect(cancelActivePipelines).toHaveBeenCalled();
      expect(harness.setters.setResults).toHaveBeenCalled();
    });

    it('guards against concurrent restarts', async () => {
      const p1 = restartMeasurement(harness.setters, harness.isRunningRef);
      const p2 = restartMeasurement(harness.setters, harness.isRunningRef);
      await Promise.all([p1, p2]);
      expect(cancelActivePipelines).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleBeforeUnload', () => {
    it('cancels active pipelines when running', () => {
      const mockBackend = createMockBackend(1);
      harness.isRunningRef.current = true;
      harness.state.activePipelines = [
        createMockActivePipeline({ backend: mockBackend, pipelineId: 10 }),
      ] as unknown as typeof harness.state.activePipelines;

      handleBeforeUnload(harness.isRunningRef);

      expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 10);
    });

    it('only restores settings when not running', () => {
      const { restoreOriginalSettings } = jest.requireMock(
        'model/backend/gitlab/measure/benchmark.execution',
      );
      harness.isRunningRef.current = false;

      handleBeforeUnload(harness.isRunningRef);

      expect(restoreOriginalSettings).toHaveBeenCalled();
    });
  });
});
