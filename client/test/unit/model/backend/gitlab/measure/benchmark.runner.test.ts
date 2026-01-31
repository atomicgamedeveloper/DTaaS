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
  benchmarkConfig,
  tasks,
  resetTasks,
} from 'model/backend/gitlab/measure/benchmark.tasks';
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
}));
jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: { add: jest.fn(() => Promise.resolve()) },
}));

jest.mock('model/backend/gitlab/measure/benchmark.tasks', () => {
  const createMockTask = (name: string, description: string): TimedTask => ({
    'Task Name': name,
    Description: description,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'PENDING' as const,
    Function: jest.fn().mockResolvedValue([
      {
        dtName: 'hello-world',
        pipelineId: 1,
        status: 'success',
        config: {
          'Branch name': 'main',
          'Group name': 'dtaas',
          'Common Library project name': 'common',
          'DT directory': 'digital_twins',
          'Runner tag': 'linux',
        },
      },
    ]),
  });

  const tasksArray: TimedTask[] = [
    createMockTask('Test Task 1', 'First test task'),
    createMockTask('Test Task 2', 'Second test task'),
  ];

  return {
    tasks: tasksArray,
    benchmarkConfig: { trials: 3, runnerTag1: 'linux', runnerTag2: 'windows' },
    setTrials: jest.fn(),
    setAlternateRunnerTag: jest.fn(),
    resetTasks: jest.fn(() =>
      tasksArray.map((task) => ({
        ...task,
        Trials: [],
        'Time Start': undefined,
        'Time End': undefined,
        'Average Time (s)': undefined,
        Status: 'PENDING' as const,
      })),
    ),
    DEFAULT_TASK: createMockTask('', ''),
    addTask: jest.fn(),
  };
});

describe('benchmark.runner', () => {
  const mockBenchmarkState = benchmarkState as {
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

  const mockCancelActivePipelines =
    cancelActivePipelines as jest.MockedFunction<typeof cancelActivePipelines>;
  const mockSaveOriginalSettings = saveOriginalSettings as jest.MockedFunction<
    typeof saveOriginalSettings
  >;
  const mockRestoreOriginalSettings =
    restoreOriginalSettings as jest.MockedFunction<
      typeof restoreOriginalSettings
    >;
  const mockDelay = delay as jest.MockedFunction<typeof delay>;
  const mockResetTasks = resetTasks as jest.MockedFunction<typeof resetTasks>;

  let mockSetters: BenchmarkSetters;
  let mockIsRunningRef: React.MutableRefObject<boolean>;
  let resultsStateRef: { current: TimedTask[] };

  const resetBenchmarkState = () => {
    mockBenchmarkState.shouldStopPipelines = false;
    mockBenchmarkState.activePipelines = [];
    mockBenchmarkState.executionResults = [];
    mockBenchmarkState.currentMeasurementPromise = null;
    mockBenchmarkState.currentTrialMinPipelineId = null;
  };

  const initializeResultsState = () => {
    resultsStateRef.current = tasks.map((task) => ({
      ...task,
      Trials: [],
      'Time Start': undefined,
      'Time End': undefined,
      'Average Time (s)': undefined,
      Status: 'PENDING' as const,
    }));
  };

  const resetTaskMocks = () => {
    tasks.forEach((task) => {
      (task.Function as jest.Mock).mockClear();
      (task.Function as jest.Mock).mockResolvedValue([
        {
          dtName: 'hello-world',
          pipelineId: 1,
          status: 'success',
          config: DEFAULT_CONFIG,
        },
      ]);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetBenchmarkState();
    benchmarkConfig.trials = 3;

    resultsStateRef = { current: [] };
    mockSetters = createMockSetters(resultsStateRef);
    mockIsRunningRef = { current: false };

    resetTaskMocks();
    initializeResultsState();
  });

  describe('startMeasurement', () => {
    beforeEach(() => {
      benchmarkConfig.trials = 1;
    });

    it('should not start if already running', async () => {
      mockIsRunningRef.current = true;
      await startMeasurement(mockSetters, mockIsRunningRef);
      expect(mockSetters.setIsRunning).not.toHaveBeenCalled();
    });

    it('should manage running state and settings lifecycle correctly', async () => {
      await startMeasurement(mockSetters, mockIsRunningRef);

      expect(mockSetters.setIsRunning).toHaveBeenCalledWith(true);
      expect(mockSaveOriginalSettings).toHaveBeenCalled();
      expect(mockRestoreOriginalSettings).toHaveBeenCalled();
      expect(mockSetters.setIsRunning).toHaveBeenLastCalledWith(false);
      expect(mockIsRunningRef.current).toBe(false);
      expect(mockBenchmarkState.currentMeasurementPromise).toBeNull();
    });

    it('should iterate through all tasks and set currentTaskIndex', async () => {
      await startMeasurement(mockSetters, mockIsRunningRef);

      expect(tasks[0].Function).toHaveBeenCalled();
      expect(tasks[1].Function).toHaveBeenCalled();
      expect(mockSetters.setCurrentTaskIndex).toHaveBeenCalled();
      const { calls } = (mockSetters.setCurrentTaskIndex as jest.Mock).mock;
      expect(calls[calls.length - 1]).toEqual([null]);
    });

    it('should start from specified index', async () => {
      await startMeasurement(mockSetters, mockIsRunningRef, 1);

      expect(tasks[0].Function).not.toHaveBeenCalled();
      expect(tasks[1].Function).toHaveBeenCalled();
    });

    it('should stop when shouldStopPipelines is set', async () => {
      (tasks[0].Function as jest.Mock).mockImplementation(async () => {
        mockBenchmarkState.shouldStopPipelines = true;
        return [
          {
            dtName: 'hello-world',
            pipelineId: 1,
            status: 'success',
            config: DEFAULT_CONFIG,
          },
        ];
      });

      await startMeasurement(mockSetters, mockIsRunningRef);
      expect(tasks[1].Function).not.toHaveBeenCalled();
    });
  });

  describe('stopAllPipelines', () => {
    it('should stop pipelines and update task statuses', async () => {
      resultsStateRef.current = [
        { ...resultsStateRef.current[0], Status: 'RUNNING' },
        { ...resultsStateRef.current[1], Status: 'PENDING' },
      ];

      await stopAllPipelines(mockSetters);

      expect(mockBenchmarkState.shouldStopPipelines).toBe(true);
      expect(mockCancelActivePipelines).toHaveBeenCalled();
      expect(mockSetters.setResults).toHaveBeenCalled();
    });
  });

  describe('continueMeasurement', () => {
    beforeEach(() => {
      benchmarkConfig.trials = 1;
      initializeResultsState();
    });

    it('should not continue if already running or no tasks need continuation', async () => {
      mockIsRunningRef.current = true;
      await continueMeasurement(
        mockSetters,
        mockIsRunningRef,
        resultsStateRef.current,
      );
      expect(mockSetters.setIsRunning).not.toHaveBeenCalled();

      mockIsRunningRef.current = false;
      resultsStateRef.current = resultsStateRef.current.map((t) => ({
        ...t,
        Status: 'SUCCESS' as const,
      }));
      await continueMeasurement(
        mockSetters,
        mockIsRunningRef,
        resultsStateRef.current,
      );
      expect(mockSetters.setIsRunning).not.toHaveBeenCalled();
    });

    it('should find and continue from first STOPPED or PENDING task', async () => {
      resultsStateRef.current = [
        { ...resultsStateRef.current[0], Status: 'SUCCESS' },
        { ...resultsStateRef.current[1], Status: 'STOPPED' },
      ];

      await continueMeasurement(
        mockSetters,
        mockIsRunningRef,
        resultsStateRef.current,
      );

      expect(mockBenchmarkState.currentMeasurementPromise).not.toBeNull();
      expect(mockSetters.setCurrentExecutions).toHaveBeenCalledWith([]);
      expect(mockSetters.setCurrentTaskIndex).toHaveBeenCalledWith(null);
    });

    it('should preserve completed trials from stopped task', async () => {
      const completedTrial: Trial = {
        'Time Start': new Date(),
        'Time End': new Date(),
        Execution: [],
        Status: 'SUCCESS',
        Error: undefined,
      };
      const stoppedTrial: Trial = {
        'Time Start': new Date(),
        'Time End': undefined,
        Execution: [],
        Status: 'STOPPED',
        Error: undefined,
      };

      resultsStateRef.current = [
        {
          ...resultsStateRef.current[0],
          Status: 'STOPPED',
          Trials: [completedTrial, stoppedTrial],
        },
      ];

      await continueMeasurement(
        mockSetters,
        mockIsRunningRef,
        resultsStateRef.current,
      );
      expect(mockSetters.setResults).toHaveBeenCalled();
    });
  });

  describe('restartMeasurement', () => {
    beforeEach(() => {
      benchmarkConfig.trials = 1;
    });

    it('should cancel pipelines and restore settings', async () => {
      await restartMeasurement(mockSetters, mockIsRunningRef);

      expect(mockCancelActivePipelines).toHaveBeenCalled();
      expect(mockRestoreOriginalSettings).toHaveBeenCalled();
    });

    it('should wait for current measurement promise and reset state', async () => {
      let resolvePromise: () => void = () => {};
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockBenchmarkState.currentMeasurementPromise = pendingPromise;

      const restartPromise = restartMeasurement(mockSetters, mockIsRunningRef);
      resolvePromise();
      await restartPromise;

      expect(mockSetters.setCurrentExecutions).toHaveBeenCalledWith([]);
      expect(mockSetters.setCurrentTaskIndex).toHaveBeenCalledWith(null);
      expect(mockResetTasks).toHaveBeenCalled();
      expect(mockBenchmarkState.currentMeasurementPromise).not.toBeNull();
    });

    it('should not restart if already restarting', async () => {
      const firstRestart = restartMeasurement(mockSetters, mockIsRunningRef);
      const secondRestart = restartMeasurement(mockSetters, mockIsRunningRef);

      await Promise.all([firstRestart, secondRestart]);
      expect(mockCancelActivePipelines).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleBeforeUnload', () => {
    const createMockBackendWithCancel = (cancelFn: jest.Mock) =>
      ({
        getProjectId: jest.fn().mockReturnValue(1),
        api: { cancelPipeline: cancelFn },
      }) as unknown as BackendInterface;

    it('should not do anything if not running or no active pipelines', () => {
      mockIsRunningRef.current = false;
      handleBeforeUnload(mockIsRunningRef);
      expect(mockBenchmarkState.shouldStopPipelines).toBe(false);

      mockIsRunningRef.current = true;
      mockBenchmarkState.activePipelines = [];
      handleBeforeUnload(mockIsRunningRef);
      expect(mockBenchmarkState.shouldStopPipelines).toBe(false);
    });

    it('should stop pipelines and cancel when running with active pipelines', () => {
      mockIsRunningRef.current = true;
      const mockCancelPipeline = jest
        .fn()
        .mockReturnValue({ catch: jest.fn() });
      const mockBackend = createMockBackendWithCancel(mockCancelPipeline);

      mockBenchmarkState.activePipelines = [
        {
          backend: mockBackend,
          pipelineId: 100,
          dtName: 'test',
          config: DEFAULT_CONFIG,
          status: 'running',
          phase: 'parent',
        },
      ];

      handleBeforeUnload(mockIsRunningRef);

      expect(mockBenchmarkState.shouldStopPipelines).toBe(true);
      expect(mockCancelPipeline).toHaveBeenCalledWith(1, 100);
      expect(mockCancelPipeline).toHaveBeenCalledWith(1, 101);
    });

    it('should handle errors gracefully and always restore settings', () => {
      mockIsRunningRef.current = true;
      const mockBackend = {
        getProjectId: jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        }),
        api: { cancelPipeline: jest.fn() },
      } as unknown as BackendInterface;

      mockBenchmarkState.activePipelines = [
        {
          backend: mockBackend,
          pipelineId: 100,
          dtName: 'test',
          config: DEFAULT_CONFIG,
          status: 'running',
          phase: 'parent',
        },
      ];

      expect(() => handleBeforeUnload(mockIsRunningRef)).not.toThrow();

      mockIsRunningRef.current = false;
      handleBeforeUnload(mockIsRunningRef);
      expect(mockRestoreOriginalSettings).toHaveBeenCalled();
    });
  });

  describe('task execution flow', () => {
    it('should run correct number of trials per task and delay between them', async () => {
      benchmarkConfig.trials = 2;
      await startMeasurement(mockSetters, mockIsRunningRef);

      expect(tasks[0].Function).toHaveBeenCalledTimes(2);
      expect(tasks[1].Function).toHaveBeenCalledTimes(2);
      expect(mockDelay).toHaveBeenCalled();
    });

    it('should handle task failure gracefully and continue to next task', async () => {
      benchmarkConfig.trials = 1;
      (tasks[0].Function as jest.Mock).mockRejectedValueOnce(
        new Error('Task failed'),
      );

      await startMeasurement(mockSetters, mockIsRunningRef);

      expect(tasks[1].Function).toHaveBeenCalled();
      expect(mockSetters.setResults).toHaveBeenCalled();
    });
  });

  describe('trial creation', () => {
    beforeEach(() => {
      benchmarkConfig.trials = 1;
    });

    it('should create trials with appropriate status based on execution results', async () => {
      (tasks[0].Function as jest.Mock).mockResolvedValue([
        {
          dtName: 'dt1',
          pipelineId: 1,
          status: 'success',
          config: DEFAULT_CONFIG,
        },
        {
          dtName: 'dt2',
          pipelineId: 2,
          status: 'success',
          config: DEFAULT_CONFIG,
        },
      ]);

      await startMeasurement(mockSetters, mockIsRunningRef);
      expect(mockSetters.setResults).toHaveBeenCalled();

      (tasks[0].Function as jest.Mock).mockResolvedValue([
        {
          dtName: 'dt1',
          pipelineId: 1,
          status: 'success',
          config: DEFAULT_CONFIG,
        },
        {
          dtName: 'dt2',
          pipelineId: 2,
          status: 'failed',
          config: DEFAULT_CONFIG,
        },
      ]);

      await startMeasurement(mockSetters, mockIsRunningRef);
      expect(mockSetters.setResults).toHaveBeenCalled();
    });

    it('should create trial with STOPPED status when stopped by user', async () => {
      (tasks[0].Function as jest.Mock).mockImplementation(async () => {
        mockBenchmarkState.shouldStopPipelines = true;
        throw new Error('Pipeline 123 stopped by user.');
      });

      await startMeasurement(mockSetters, mockIsRunningRef);
      expect(mockSetters.setResults).toHaveBeenCalled();
    });
  });
});
