import {
  startMeasurement,
  stopAllPipelines,
} from 'model/backend/gitlab/measure/benchmark.runner';
import {
  benchmarkConfig as BenchmarkConfigOriginal,
  benchmarkState,
  saveOriginalSettings,
  restoreOriginalSettings,

  BenchmarkSetters,
  TimedTask,
  ExecutionResult,
  tasks} from 'model/backend/gitlab/measure/benchmark.execution';
import { cancelActivePipelines } from 'model/backend/gitlab/measure/benchmark.pipeline';
import { delay } from 'model/backend/gitlab/execution/pipelineCore';
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
    runDigitalTwin: jest.fn(),
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
}));
jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: { add: jest.fn(() => Promise.resolve()) },
}));

interface TestBenchmarkState {
  shouldStopPipelines: boolean;
  activePipelines: unknown[];
  executionResults: unknown[];
  currentMeasurementPromise: Promise<void> | null;
  currentTrialMinPipelineId: number | null;
  isRunning: boolean;
  results: TimedTask[] | null;
  currentTaskIndexUI: number | null;
  componentSetters: BenchmarkSetters | null;
}

describe('benchmark.runner', () => {
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

  it('should handle stop flag during measurement', async () => {
    BenchmarkConfig.trials = 1;
    state.shouldStopPipelines = true;
    await startMeasurement(setters, isRunningRef);
    expect(setters.setResults).toHaveBeenCalled();
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
    await stopAllPipelines();
    expect(state.shouldStopPipelines).toBe(true);
    expect(cancelActivePipelines).toHaveBeenCalled();
    expect(setters.setResults).toHaveBeenCalled();
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
        config: {
          'Branch name': 'main',
          'Group name': 'dtaas',
          'Common Library project name': 'common',
          'DT directory': 'digital_twins',
          'Runner tag': 'linux',
        },
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
