import {
  DEFAULT_CONFIG,
  benchmarkState,
  saveOriginalSettings,
  restoreOriginalSettings,
} from 'model/backend/gitlab/measure/benchmark.execution';
import store from 'store/store';
import {
  BRANCH_NAME,
  GROUP_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
  DT_DIRECTORY,
  RUNNER_TAG,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import { createMockRootState } from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';
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
});
