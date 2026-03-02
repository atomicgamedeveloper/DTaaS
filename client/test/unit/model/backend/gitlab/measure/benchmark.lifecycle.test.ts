import {
  restartMeasurement,
  handleBeforeUnload,
} from 'model/backend/gitlab/measure/benchmark.lifecycle';
import {
  benchmarkConfig as BenchmarkConfigOriginal,
  benchmarkState,
  restoreOriginalSettings,
  DEFAULT_CONFIG,

  BenchmarkSetters,
  TimedTask,
  ExecutionResult,
  Configuration,
  tasks,
  resetTasks} from 'model/backend/gitlab/measure/benchmark.execution';
import { cancelActivePipelines } from 'model/backend/gitlab/measure/benchmark.pipeline';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import { createMockSetters } from './benchmark.testUtil';

const BenchmarkConfig = BenchmarkConfigOriginal as {
  trials: number;
  runnerTag1: string;
  runnerTag2: string;
};

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => {
  const bs = {
    shouldStopPipelines: false,
    activePipelines: [] as unknown[],
    executionResults: [] as unknown[],
    currentMeasurementPromise: null as Promise<void> | null,
    currentTrialMinPipelineId: null as number | null,
    currentTrialExecutionIndex: 0,
    isRunning: false,
    results: null as TimedTask[] | null,
    currentTaskIndexUI: null as number | null,
    componentSetters: null as BenchmarkSetters | null,
  };
  return {
    benchmarkState: bs,
    saveOriginalSettings: jest.fn(),
    restoreOriginalSettings: jest.fn(),
    attachSetters: jest.fn((s: BenchmarkSetters) => {
      bs.componentSetters = s;
    }),
    wrapSetters: (): BenchmarkSetters => ({
      setIsRunning: (v: boolean) => {
        bs.isRunning = v;
        bs.componentSetters?.setIsRunning(v);
      },
      setCurrentExecutions: (v: ExecutionResult[]) => {
        bs.componentSetters?.setCurrentExecutions(v);
      },
      setCurrentTaskIndex: (v: number | null) => {
        bs.currentTaskIndexUI = v;
        bs.componentSetters?.setCurrentTaskIndex(v);
      },
      setResults: (v: React.SetStateAction<TimedTask[]>) => {
        bs.results = typeof v === 'function' ? v(bs.results ?? []) : v;
        bs.componentSetters?.setResults(v);
      },
    }),
    DEFAULT_CONFIG: {
      'Branch name': 'main',
      'Group name': 'dtaas',
      'Common Library project name': 'common',
      'DT directory': 'digital_twins',
      'Runner tag': 'linux',
    },
    ...(() => {
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
        benchmarkConfig: { trials: 3, runnerTag1: 'linux', runnerTag2: 'windows' },
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
    })(),
  };
});

jest.mock('model/backend/gitlab/measure/benchmark.pipeline', () => ({
  cancelActivePipelines: jest.fn().mockResolvedValue(undefined),
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

interface TestBenchmarkState {
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
  isRunning: boolean;
  results: TimedTask[] | null;
  currentTaskIndexUI: number | null;
  componentSetters: BenchmarkSetters | null;
}

describe('benchmark.lifecycle', () => {
  const state = benchmarkState as unknown as TestBenchmarkState;

  let setters: BenchmarkSetters;
  let isRunningRef: React.MutableRefObject<boolean>;
  let resultsRef: { current: TimedTask[] };

  const resetState = () => {
    Object.assign(state, {
      shouldStopPipelines: false,
      activePipelines: [],
      executionResults: [],
      currentMeasurementPromise: null,
      currentTrialMinPipelineId: null,
      isRunning: false,
      results: null,
      currentTaskIndexUI: null,
      componentSetters: null,
    });
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

  beforeEach(() => {
    jest.clearAllMocks();
    resetState();
    BenchmarkConfig.trials = 3;
    resultsRef = { current: [] };
    setters = createMockSetters(resultsRef);
    isRunningRef = { current: false };
    state.componentSetters = setters;
    state.results = null;
    initResults();
  });

  it('should cancel, restore settings, wait for promise and reset state', async () => {
    BenchmarkConfig.trials = 1;
    let resolve: () => void = () => {};
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
});
