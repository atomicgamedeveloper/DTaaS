import {
  DEFAULT_CONFIG,
  benchmarkState,
  saveOriginalSettings,
  restoreOriginalSettings,
  wrapSetters,
  attachSetters,
  detachSetters,
  getTasks,
  resetTasks,
  benchmarkConfig,
  TimedTask,
} from 'model/backend/gitlab/measure/benchmark.execution';
import store from 'store/store';
import {
  BRANCH_NAME,
  GROUP_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
  DT_DIRECTORY,
  RUNNER_TAG,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import {
  createMockRootState,
  createMockSetters,
} from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';
import { setupSessionStorage } from 'test/unit/model/backend/gitlab/measure/benchmark.envSetup';

jest.mock('store/store', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(),
    dispatch: jest.fn(),
  },
}));
jest.mock('util/envUtil', () => ({
  getAuthority: jest.fn(),
}));

describe('benchmark.execution', () => {
  const mockStore = store as jest.Mocked<typeof store>;

  let originalBenchmarkState: typeof benchmarkState;

  beforeEach(() => {
    jest.clearAllMocks();
    originalBenchmarkState = { ...benchmarkState };
    benchmarkState.shouldStopPipelines = false;
    benchmarkState.activePipelines = [];
    benchmarkState.executionResults = [];
    benchmarkState.currentMeasurementPromise = null;
    benchmarkState.currentTrialMinPipelineId = null;

    setupSessionStorage();

    mockStore.getState.mockReturnValue(
      createMockRootState({
        RUNNER_TAG: 'linux',
        BRANCH_NAME: 'main',
      }),
    );
  });

  afterEach(() => {
    benchmarkState.shouldStopPipelines =
      originalBenchmarkState.shouldStopPipelines;
    benchmarkState.activePipelines = originalBenchmarkState.activePipelines;
    benchmarkState.executionResults = originalBenchmarkState.executionResults;
    benchmarkState.currentMeasurementPromise =
      originalBenchmarkState.currentMeasurementPromise;
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct values from constants', () => {
      expect(DEFAULT_CONFIG['Branch name']).toBe(BRANCH_NAME);
      expect(DEFAULT_CONFIG['Group name']).toBe(GROUP_NAME);
      expect(DEFAULT_CONFIG['Common Library project name']).toBe(
        COMMON_LIBRARY_PROJECT_NAME,
      );
      expect(DEFAULT_CONFIG['DT directory']).toBe(DT_DIRECTORY);
      expect(DEFAULT_CONFIG['Runner tag']).toBe(RUNNER_TAG);
    });
  });

  describe('benchmarkState', () => {
    it('should have correct initial values', () => {
      expect(benchmarkState.shouldStopPipelines).toBe(false);
      expect(benchmarkState.activePipelines).toEqual([]);
      expect(benchmarkState.executionResults).toEqual([]);
      expect(benchmarkState.currentMeasurementPromise).toBeNull();
    });

    it('should allow modifying shouldStopPipelines', () => {
      benchmarkState.shouldStopPipelines = true;
      expect(benchmarkState.shouldStopPipelines).toBe(true);
    });
  });

  describe('saveOriginalSettings', () => {
    it('should save settings from store state', () => {
      mockStore.getState.mockReturnValue(
        createMockRootState({
          RUNNER_TAG: 'custom-runner',
          BRANCH_NAME: 'develop',
        }),
      );

      restoreOriginalSettings();
      saveOriginalSettings();

      expect(mockStore.getState).toHaveBeenCalled();
    });

    it('should only save settings once if called multiple times', () => {
      restoreOriginalSettings();

      mockStore.getState.mockReturnValue(
        createMockRootState({
          RUNNER_TAG: 'first-runner',
          BRANCH_NAME: 'first-branch',
        }),
      );

      saveOriginalSettings();
      const firstCallCount = mockStore.getState.mock.calls.length;

      mockStore.getState.mockReturnValue(
        createMockRootState({
          RUNNER_TAG: 'second-runner',
          BRANCH_NAME: 'second-branch',
        }),
      );

      saveOriginalSettings();

      expect(mockStore.getState.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('restoreOriginalSettings', () => {
    it('should dispatch actions to restore settings', () => {
      restoreOriginalSettings();

      mockStore.getState.mockReturnValue(
        createMockRootState({
          RUNNER_TAG: 'saved-runner',
          BRANCH_NAME: 'saved-branch',
        }),
      );

      saveOriginalSettings();
      jest.clearAllMocks();

      restoreOriginalSettings();

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'settings/setRunnerTag',
        payload: 'saved-runner',
      });
      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'settings/setBranchName',
        payload: 'saved-branch',
      });
    });

    it('should not dispatch if no settings were saved', () => {
      restoreOriginalSettings();
      jest.clearAllMocks();

      restoreOriginalSettings();

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('wrapSetters', () => {
    let wrapped: ReturnType<typeof wrapSetters>;

    beforeEach(() => {
      benchmarkState.isRunning = false;
      benchmarkState.currentTaskIndexUI = null;
      benchmarkState.results = null;
      benchmarkState.componentSetters = null;
      wrapped = wrapSetters();
    });

    it('setIsRunning updates benchmarkState.isRunning and calls componentSetters', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);
      benchmarkState.componentSetters = mockSetters;

      wrapped.setIsRunning(true);

      expect(benchmarkState.isRunning).toBe(true);
      expect(mockSetters.setIsRunning).toHaveBeenCalledWith(true);
    });

    it('setCurrentTaskIndex updates benchmarkState.currentTaskIndexUI and calls componentSetters', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);
      benchmarkState.componentSetters = mockSetters;

      wrapped.setCurrentTaskIndex(2);

      expect(benchmarkState.currentTaskIndexUI).toBe(2);
      expect(mockSetters.setCurrentTaskIndex).toHaveBeenCalledWith(2);
    });

    it('setResults with direct value updates benchmarkState.results', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);
      benchmarkState.componentSetters = mockSetters;

      const tasks: TimedTask[] = [
        {
          'Task Name': 'T1',
          Description: 'desc',
          Trials: [],
          'Time Start': undefined,
          'Time End': undefined,
          'Average Time (s)': undefined,
          Status: 'NOT_STARTED',
        },
      ];

      wrapped.setResults(tasks);

      expect(benchmarkState.results).toEqual(tasks);
      expect(mockSetters.setResults).toHaveBeenCalledWith(tasks);
    });

    it('setResults with function updater applies updater to current results', () => {
      benchmarkState.results = [];

      const updater = (prev: TimedTask[]) => [
        ...prev,
        {
          'Task Name': 'New',
          Description: 'new',
          Trials: [],
          'Time Start': undefined,
          'Time End': undefined,
          'Average Time (s)': undefined,
          Status: 'NOT_STARTED' as const,
        },
      ];

      wrapped.setResults(updater);

      expect(benchmarkState.results).toHaveLength(1);
      expect(benchmarkState.results[0]['Task Name']).toBe('New');
    });

    it('methods work without componentSetters (no error thrown)', () => {
      benchmarkState.componentSetters = null;

      expect(() => wrapped.setIsRunning(true)).not.toThrow();
      expect(() => wrapped.setCurrentExecutions([])).not.toThrow();
      expect(() => wrapped.setCurrentTaskIndex(0)).not.toThrow();
      expect(() => wrapped.setResults([])).not.toThrow();
    });
  });

  describe('attachSetters / detachSetters', () => {
    it('attachSetters sets componentSetters on benchmarkState', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);

      attachSetters(mockSetters);

      expect(benchmarkState.componentSetters).toBe(mockSetters);
    });

    it('detachSetters clears componentSetters on benchmarkState', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);
      benchmarkState.componentSetters = mockSetters;

      detachSetters();

      expect(benchmarkState.componentSetters).toBeNull();
    });
  });

  describe('getTasks / resetTasks', () => {
    it('getTasks returns an array of tasks', () => {
      const tasks = getTasks();

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]).toHaveProperty('Task Name');
      expect(tasks[0]).toHaveProperty('Description');
      expect(tasks[0]).toHaveProperty('Status');
    });

    it('resetTasks returns tasks with NOT_STARTED status', () => {
      const reset = resetTasks();

      expect(reset.length).toBeGreaterThan(0);
      reset.forEach((task) => {
        expect(task.Status).toBe('NOT_STARTED');
      });
    });

    it('resetTasks clears time fields', () => {
      const reset = resetTasks();

      reset.forEach((task) => {
        expect(task['Time Start']).toBeUndefined();
        expect(task['Time End']).toBeUndefined();
        expect(task['Average Time (s)']).toBeUndefined();
        expect(task.Trials).toEqual([]);
      });
    });
  });

  describe('benchmarkConfig', () => {
    it('trials getter returns store value', () => {
      expect(benchmarkConfig.trials).toBe(3);
    });

    it('runnerTag1 getter returns store value', () => {
      expect(benchmarkConfig.runnerTag1).toBe('linux');
    });

    it('runnerTag2 getter returns store value', () => {
      expect(benchmarkConfig.runnerTag2).toBe('windows');
    });
  });
});
