import {
  DEFAULT_CONFIG,
  benchmarkState,
  saveOriginalSettings,
  restoreOriginalSettings,
  cancelActivePipelines,
  runDigitalTwin,
} from 'model/backend/gitlab/measure/benchmark.execution';
import store from 'store/store';
import { getAuthority } from 'util/envUtil';
import createGitlabInstance from 'model/backend/gitlab/gitlabFactory';
import DigitalTwin from 'model/backend/digitalTwin';
import {
  isPipelineCompleted,
  delay,
  hasTimedOut,
} from 'model/backend/gitlab/execution/pipelineCore';
import {
  BRANCH_NAME,
  GROUP_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
  DT_DIRECTORY,
  RUNNER_TAG,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import {
  createMockRootState,
  createMockBackend,
  createMockActivePipeline,
  setupSessionStorage,
  setupSessionStorageAuth,
} from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';

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
jest.mock('model/backend/gitlab/gitlabFactory', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('model/backend/digitalTwin');
jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  isPipelineCompleted: jest.fn(),
  delay: jest.fn().mockResolvedValue(undefined),
  hasTimedOut: jest.fn(),
}));

describe('benchmark.execution', () => {
  const mockStore = store as jest.Mocked<typeof store>;
  const mockGetAuthority = getAuthority as jest.MockedFunction<
    typeof getAuthority
  >;
  const mockCreateGitlabInstance = createGitlabInstance as jest.MockedFunction<
    typeof createGitlabInstance
  >;
  const mockDigitalTwin = DigitalTwin as jest.MockedClass<typeof DigitalTwin>;
  const mockIsPipelineCompleted = isPipelineCompleted as jest.MockedFunction<
    typeof isPipelineCompleted
  >;
  const mockDelay = delay as jest.MockedFunction<typeof delay>;
  const mockHasTimedOut = hasTimedOut as jest.MockedFunction<
    typeof hasTimedOut
  >;

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
    mockGetAuthority.mockReturnValue('https://gitlab.example.com');
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
    it('should have Branch name from constants', () => {
      expect(DEFAULT_CONFIG['Branch name']).toBe(BRANCH_NAME);
    });

    it('should have Group name from constants', () => {
      expect(DEFAULT_CONFIG['Group name']).toBe(GROUP_NAME);
    });

    it('should have Common Library project name from constants', () => {
      expect(DEFAULT_CONFIG['Common Library project name']).toBe(
        COMMON_LIBRARY_PROJECT_NAME,
      );
    });

    it('should have DT directory from constants', () => {
      expect(DEFAULT_CONFIG['DT directory']).toBe(DT_DIRECTORY);
    });

    it('should have Runner tag from constants', () => {
      expect(DEFAULT_CONFIG['Runner tag']).toBe(RUNNER_TAG);
    });
  });

  describe('benchmarkState', () => {
    it('should have shouldStopPipelines initially false', () => {
      expect(benchmarkState.shouldStopPipelines).toBe(false);
    });

    it('should have empty activePipelines array', () => {
      expect(benchmarkState.activePipelines).toEqual([]);
    });

    it('should have empty executionResults array', () => {
      expect(benchmarkState.executionResults).toEqual([]);
    });

    it('should have null currentMeasurementPromise', () => {
      expect(benchmarkState.currentMeasurementPromise).toBeNull();
    });

    it('should allow modifying shouldStopPipelines', () => {
      benchmarkState.shouldStopPipelines = true;
      expect(benchmarkState.shouldStopPipelines).toBe(true);
    });

    it('should allow adding to activePipelines', () => {
      const mockPipeline = createMockActivePipeline({ pipelineId: 123 });
      benchmarkState.activePipelines.push(mockPipeline);
      expect(benchmarkState.activePipelines).toHaveLength(1);
      expect(benchmarkState.activePipelines[0].pipelineId).toBe(123);
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

  describe('cancelActivePipelines', () => {
    it('should cancel all active pipelines', async () => {
      const mockBackend = createMockBackend(1);

      benchmarkState.activePipelines = [
        createMockActivePipeline({
          backend: mockBackend,
          pipelineId: 100,
          dtName: 'test-dt-1',
          phase: 'parent',
        }),
        createMockActivePipeline({
          backend: mockBackend,
          pipelineId: 200,
          dtName: 'test-dt-2',
          phase: 'child',
        }),
      ];

      await cancelActivePipelines();

      expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 100);
      expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 101);
      expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 200);
      expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 201);
    });

    it('should handle errors gracefully when cancelling pipelines', async () => {
      const mockBackend = createMockBackend(1);
      mockBackend.api.cancelPipeline.mockRejectedValue(
        new Error('Cancel failed'),
      );

      benchmarkState.activePipelines = [
        createMockActivePipeline({
          backend: mockBackend,
          pipelineId: 100,
        }),
      ];

      await expect(cancelActivePipelines()).resolves.not.toThrow();
    });

    it('should handle empty activePipelines array', async () => {
      benchmarkState.activePipelines = [];

      await expect(cancelActivePipelines()).resolves.not.toThrow();
    });
  });

  describe('runDigitalTwin', () => {
    let mockBackendInstance: ReturnType<typeof createMockBackend>;

    beforeEach(() => {
      mockBackendInstance = createMockBackend(1);

      mockCreateGitlabInstance.mockReturnValue(
        mockBackendInstance as unknown as ReturnType<
          typeof createGitlabInstance
        >,
      );

      setupSessionStorageAuth();

      mockDigitalTwin.mockImplementation(
        () =>
          ({
            execute: jest.fn().mockResolvedValue(123),
          }) as unknown as DigitalTwin,
      );

      mockIsPipelineCompleted.mockReturnValueOnce(false).mockReturnValue(true);

      mockBackendInstance.getPipelineStatus?.mockResolvedValue('success');
      mockHasTimedOut.mockReturnValue(false);
    });

    it('should throw error if not authenticated', async () => {
      (sessionStorage.getItem as jest.Mock).mockReturnValue(null);

      await expect(runDigitalTwin('test-dt')).rejects.toThrow(
        'Not authenticated. Missing access_token or username.',
      );
    });

    it('should throw error if access_token is missing', async () => {
      (sessionStorage.getItem as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'username') return 'test-user';
          return null;
        },
      );

      await expect(runDigitalTwin('test-dt')).rejects.toThrow(
        'Not authenticated. Missing access_token or username.',
      );
    });

    it('should throw error if username is missing', async () => {
      (sessionStorage.getItem as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === 'access_token') return 'test-token';
          return null;
        },
      );

      await expect(runDigitalTwin('test-dt')).rejects.toThrow(
        'Not authenticated. Missing access_token or username.',
      );
    });

    it('should create gitlab instance with correct parameters', async () => {
      await runDigitalTwin('test-dt');

      expect(mockCreateGitlabInstance).toHaveBeenCalledWith(
        'test-user',
        'test-token',
        'https://gitlab.example.com',
      );
    });

    it('should initialize backend', async () => {
      await runDigitalTwin('test-dt');

      expect(mockBackendInstance.init).toHaveBeenCalled();
    });

    it('should dispatch runner tag when provided in config', async () => {
      await runDigitalTwin('test-dt', { 'Runner tag': 'custom-runner' });

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'settings/setRunnerTag',
        payload: 'custom-runner',
      });
    });

    it('should dispatch branch name when provided in config', async () => {
      await runDigitalTwin('test-dt', { 'Branch name': 'feature-branch' });

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'settings/setBranchName',
        payload: 'feature-branch',
      });
    });

    it('should create DigitalTwin instance with correct name', async () => {
      await runDigitalTwin('hello-world');

      expect(mockDigitalTwin).toHaveBeenCalledWith(
        'hello-world',
        mockBackendInstance,
      );
    });

    it('should throw error if pipeline fails to start', async () => {
      mockDigitalTwin.mockImplementation(
        () =>
          ({
            execute: jest.fn().mockResolvedValue(null),
          }) as unknown as DigitalTwin,
      );

      await expect(runDigitalTwin('test-dt')).rejects.toThrow(
        'Failed to start pipeline for test-dt.',
      );
    });

    it('should return execution result with dtName', async () => {
      const result = await runDigitalTwin('hello-world');

      expect(result.dtName).toBe('hello-world');
    });

    it('should return execution result with pipelineId', async () => {
      const result = await runDigitalTwin('hello-world');

      expect(result.pipelineId).toBe(123);
    });

    it('should return execution result with config', async () => {
      const result = await runDigitalTwin('hello-world', {
        'Runner tag': 'test-runner',
      });

      expect(result.config['Runner tag']).toBe('test-runner');
    });

    it('should merge provided config with DEFAULT_CONFIG', async () => {
      const result = await runDigitalTwin('hello-world', {
        'Runner tag': 'custom',
      });

      expect(result.config['Branch name']).toBe(DEFAULT_CONFIG['Branch name']);
      expect(result.config['Runner tag']).toBe('custom');
    });

    it('should add pipeline to activePipelines during execution', async () => {
      await runDigitalTwin('hello-world');

      expect(benchmarkState.executionResults).toHaveLength(1);
      expect(benchmarkState.executionResults[0].pipelineId).toBe(123);
    });

    it('should remove pipeline from activePipelines after completion', async () => {
      await runDigitalTwin('hello-world');

      expect(benchmarkState.activePipelines).toHaveLength(0);
    });

    it('should stop polling when shouldStopPipelines is true', async () => {
      mockIsPipelineCompleted.mockReturnValue(false);

      mockDelay.mockImplementation(async () => {
        benchmarkState.shouldStopPipelines = true;
      });

      await expect(runDigitalTwin('hello-world')).rejects.toThrow(
        'stopped by user',
      );
    });

    it('should throw timeout error when pipeline exceeds max time', async () => {
      mockIsPipelineCompleted.mockReturnValue(false);
      mockHasTimedOut.mockReturnValue(true);

      await expect(runDigitalTwin('hello-world')).rejects.toThrow('timed out');
    });
  });
});
