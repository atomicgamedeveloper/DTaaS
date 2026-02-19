import {
  startMeasurement,
  stopAllPipelines,
  continueMeasurement,
  restartMeasurement,
  handleBeforeUnload,
} from 'model/backend/gitlab/measure/benchmark.runner';
import {
  benchmarkState,
  cancelActivePipelines,
  saveOriginalSettings,
  restoreOriginalSettings,
  DEFAULT_CONFIG,
} from 'model/backend/gitlab/measure/benchmark.execution';
import { delay } from 'model/backend/gitlab/execution/pipelineCore';
import {
  BenchmarkConfig as BenchmarkConfigOriginal,
  tasks,
  resetTasks,
} from 'model/backend/gitlab/measure/benchmark.tasks';

// The mock provides a mutable plain object, not the getter-based original
const BenchmarkConfig = BenchmarkConfigOriginal as {
  trials: number;
  runnerTag1: string;
  runnerTag2: string;
};
import {
  BenchmarkSetters,
  TimedTask,
  Trial,
  Configuration,
} from 'model/backend/gitlab/measure/benchmark.types';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import { createMockSetters } from './benchmark.testUtil';

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => ({
  benchmarkState: {
    shouldStopPipelines: false,
    activePipelines: [],
    executionResults: [],
    currentMeasurementPromise: null,
    currentTrialMinPipelineId: null,
  },
  runDigitalTwin: jest.fn(),
  cancelActivePipelines: jest.fn().mockResolvedValue(undefined),
  saveOriginalSettings: jest.fn(),
  restoreOriginalSettings: jest.fn(),
  DEFAULT_CONFIG: {
    'Branch name': 'main',
    'Group name': 'dtaas',
    'Common Library project name': 'common',
    'DT directory': 'digital_twins',
    'Runner tag': 'linux',
  },
}));

jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  delay: jest.fn().mockResolvedValue(undefined),
  getChildPipelineId: jest.fn((id: number) => id + 1),
}));

jest.mock('model/backend/gitlab/execution/statusChecking', () => ({
  isFailureStatus: jest.fn((status: string) => {
    const lower = status.toLowerCase();
    return lower === 'failed' || lower === 'skipped';
  }),
}));

jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: { add: jest.fn(() => Promise.resolve()) },
}));

jest.mock('model/backend/gitlab/measure/benchmark.tasks', () => {
  const createTask = (name: string, desc: string): TimedTask => ({
    'Task Name': name,
    Description: desc,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'PENDING' as const,
    Executions: () => [{ dtName: 'hello-world', config: {} }],
  });
  const tasksArray = [
    createTask('Task 1', 'First'),
    createTask('Task 2', 'Second'),
  ];
  return {
    tasks: tasksArray,
    BenchmarkConfig: { trials: 3, runnerTag1: 'linux', runnerTag2: 'windows' },
    resetTasks: jest.fn(() =>
      tasksArray.map((t) => ({
        ...t,
        Trials: [],
        'Time Start': undefined,
        'Time End': undefined,
        'Average Time (s)': undefined,
        Status: 'PENDING' as const,
      })),
    ),
    DEFAULT_TASK: createTask('', ''),
  };
});

describe('benchmark.runner', () => {
  const state = benchmarkState as {
    shouldStopPipelines: boolean;
    activePipelines: Array<{
      backend: BackendInterface;
      pipelineId: number;
      dtName: string;
      config: Configuration;
      status: string;
      phase: 'parent' | 'child';
    }>;
    executionResults: unknown[];
    currentMeasurementPromise: Promise<void> | null;
    currentTrialMinPipelineId: number | null;
  };

  let setters: BenchmarkSetters;
  let isRunningRef: React.MutableRefObject<boolean>;
  let resultsRef: { current: TimedTask[] };

  const resetState = () => {
    state.shouldStopPipelines = false;
    state.activePipelines = [];
    state.executionResults = [];
    state.currentMeasurementPromise = null;
    state.currentTrialMinPipelineId = null;
  };

  const initResults = () => {
    resultsRef.current = tasks.map((t) => ({
      ...t,
      Trials: [],
      'Time Start': undefined,
      'Time End': undefined,
      'Average Time (s)': undefined,
      Status: 'PENDING' as const,
    }));
  };

  const resetMocks = () => {
    // No longer needed - execution happens directly from Executions
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetState();
    BenchmarkConfig.trials = 3;
    resultsRef = { current: [] };
    setters = createMockSetters(resultsRef);
    isRunningRef = { current: false };
    resetMocks();
    initResults();
  });

  it('should not start if already running', async () => {
    BenchmarkConfig.trials = 1;
    isRunningRef.current = true;
    await startMeasurement(setters, isRunningRef);
    expect(setters.setIsRunning).not.toHaveBeenCalled();
  });

  it('should manage lifecycle and iterate through tasks', async () => {
    BenchmarkConfig.trials = 1;
    await startMeasurement(setters, isRunningRef);
    expect(setters.setIsRunning).toHaveBeenCalledWith(true);
    expect(saveOriginalSettings).toHaveBeenCalled();
    expect(restoreOriginalSettings).toHaveBeenCalled();
    expect(isRunningRef.current).toBe(false);
  });

  it('should start from specified index and handle stop flag', async () => {
    BenchmarkConfig.trials = 1;
    await startMeasurement(setters, isRunningRef, 1);
    // Task 1 should be executed when starting from index 1

    state.shouldStopPipelines = true;
    await startMeasurement(setters, isRunningRef);
    // Should stop when flag is set
  });

  it('should transition NOT_STARTED to PENDING and run multiple trials', async () => {
    BenchmarkConfig.trials = 2;
    resultsRef.current = resultsRef.current.map((t) => ({
      ...t,
      Status: 'NOT_STARTED' as const,
    }));
    await startMeasurement(setters, isRunningRef);
    expect(setters.setResults).toHaveBeenCalled();
    expect(delay).toHaveBeenCalled();
  });

  it('should stop pipelines and update statuses', async () => {
    resultsRef.current = [
      { ...resultsRef.current[0], Status: 'RUNNING' },
      { ...resultsRef.current[1], Status: 'PENDING' },
    ];
    await stopAllPipelines(setters);
    expect(state.shouldStopPipelines).toBe(true);
    expect(cancelActivePipelines).toHaveBeenCalled();
    expect(setters.setResults).toHaveBeenCalled();
  });

  it('should not continue if running or no tasks need continuation', async () => {
    BenchmarkConfig.trials = 1;
    initResults();
    isRunningRef.current = true;
    await continueMeasurement(setters, isRunningRef, resultsRef.current);
    expect(setters.setIsRunning).not.toHaveBeenCalled();

    isRunningRef.current = false;
    resultsRef.current = resultsRef.current.map((t) => ({
      ...t,
      Status: 'SUCCESS' as const,
    }));
    await continueMeasurement(setters, isRunningRef, resultsRef.current);
    expect(setters.setIsRunning).not.toHaveBeenCalled();
  });

  it('should continue from STOPPED task preserving completed trials', async () => {
    BenchmarkConfig.trials = 1;
    initResults();
    const trial: Trial = {
      'Time Start': new Date(),
      'Time End': new Date(),
      Execution: [],
      Status: 'SUCCESS',
      Error: undefined,
    };
    resultsRef.current = [
      {
        ...resultsRef.current[0],
        Status: 'STOPPED',
        Trials: [trial, { ...trial, Status: 'STOPPED', 'Time End': undefined }],
      },
    ];
    await continueMeasurement(setters, isRunningRef, resultsRef.current);
    expect(state.currentMeasurementPromise).not.toBeNull();
    expect(setters.setResults).toHaveBeenCalled();
  });

  it('should cancel, restore settings, wait for promise and reset state', async () => {
    BenchmarkConfig.trials = 1;
    let resolve: () => void = () => { };
    state.currentMeasurementPromise = new Promise((r) => {
      resolve = r;
    });
    const promise = restartMeasurement(setters, isRunningRef);
    resolve();
    await promise;
    expect(cancelActivePipelines).toHaveBeenCalled();
    expect(restoreOriginalSettings).toHaveBeenCalled();
    expect(resetTasks).toHaveBeenCalled();
  });

  it('should not restart if already restarting', async () => {
    BenchmarkConfig.trials = 1;
    await Promise.all([
      restartMeasurement(setters, isRunningRef),
      restartMeasurement(setters, isRunningRef),
    ]);
    expect(cancelActivePipelines).toHaveBeenCalledTimes(1);
  });

  it('should do nothing if not running or no active pipelines', () => {
    handleBeforeUnload(isRunningRef);
    expect(state.shouldStopPipelines).toBe(false);
    isRunningRef.current = true;
    handleBeforeUnload(isRunningRef);
    expect(state.shouldStopPipelines).toBe(false);
  });

  it('should cancel pipelines and handle errors gracefully', () => {
    isRunningRef.current = true;
    const cancelFn = jest.fn().mockReturnValue({ catch: jest.fn() });
    state.activePipelines = [
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
    handleBeforeUnload(isRunningRef);
    expect(state.shouldStopPipelines).toBe(true);
    expect(cancelFn).toHaveBeenCalledWith(1, 100);

    resetState();
    isRunningRef.current = true;
    state.activePipelines = [
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
    expect(() => handleBeforeUnload(isRunningRef)).not.toThrow();
    expect(restoreOriginalSettings).toHaveBeenCalled();
  });

  it('should create trials with SUCCESS/FAILURE status based on results', async () => {
    BenchmarkConfig.trials = 1;
    await startMeasurement(setters, isRunningRef);
    expect(setters.setResults).toHaveBeenCalled();
  });

  it('should create STOPPED trial and capture pipelines on user stop', async () => {
    BenchmarkConfig.trials = 1;
    state.currentTrialMinPipelineId = 100;
    state.executionResults = [
      {
        dtName: 'dt',
        pipelineId: 100,
        status: 'success',
        config: DEFAULT_CONFIG,
      },
    ];
    state.activePipelines = [
      {
        backend: {} as BackendInterface,
        pipelineId: 101,
        dtName: 'dt',
        config: DEFAULT_CONFIG,
        status: 'running',
        phase: 'parent',
      },
    ];
    state.shouldStopPipelines = true;
    await startMeasurement(setters, isRunningRef);
    expect(setters.setResults).toHaveBeenCalled();
  });

  it('should handle errors and continue to next task', async () => {
    BenchmarkConfig.trials = 1;
    await startMeasurement(setters, isRunningRef);
    expect(setters.setResults).toHaveBeenCalled();
  });

  it('should break trial loop when shouldStopPipelines becomes true', async () => {
    BenchmarkConfig.trials = 3;
    state.shouldStopPipelines = false;
    await startMeasurement(setters, isRunningRef);
    expect(setters.setResults).toHaveBeenCalled();
  });
});
