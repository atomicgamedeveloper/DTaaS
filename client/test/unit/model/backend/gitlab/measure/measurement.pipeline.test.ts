import {
  measurementState,
  setMeasurementStore,
} from 'model/backend/gitlab/measure/measurement.execution';
import { runDigitalTwin } from 'model/backend/gitlab/measure/measurement.pipeline';
import { getAuthority } from 'util/envUtil';
import createGitlabInstance from 'model/backend/gitlab/gitlabFactory';
import DigitalTwin from 'model/backend/digitalTwin';
import {
  isPipelineCompleted,
  delay,
  hasTimedOut,
  getChildPipelineId,
} from 'model/backend/gitlab/execution/pipelineCore';
import {
  createMockStoreState,
  createMockBackend,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';
import {
  setupSessionStorage,
  setupSessionStorageAuth,
} from 'test/unit/model/backend/gitlab/measure/measurement.envSetup';

jest.mock('util/envUtil', () => ({
  getAuthority: jest.fn(),
}));
jest.mock('model/backend/gitlab/gitlabFactory', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('model/backend/digitalTwin', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  isPipelineCompleted: jest.fn(),
  delay: jest.fn().mockResolvedValue(undefined),
  hasTimedOut: jest.fn(),
  getChildPipelineId: jest.fn((id: number) => id + 1),
}));

describe('measurement.pipeline', () => {
  const mockGetState = jest.fn();
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
  const mockGetChildPipelineId = getChildPipelineId as jest.MockedFunction<
    typeof getChildPipelineId
  >;

  let originalMeasurementState: typeof measurementState;
  let mockBackendInstance: ReturnType<typeof createMockBackend>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChildPipelineId.mockImplementation((id: number) => id + 1);
    originalMeasurementState = { ...measurementState };
    measurementState.shouldStopPipelines = false;
    measurementState.activePipelines = [];
    measurementState.executionResults = [];
    measurementState.currentMeasurementPromise = null;
    measurementState.currentTrialMinPipelineId = null;

    setupSessionStorage();

    mockGetState.mockReturnValue(
      createMockStoreState({
        RUNNER_TAG: 'linux',
        BRANCH_NAME: 'main',
      }),
    );
    setMeasurementStore({
      getState: mockGetState,
      restoreRunnerTag: jest.fn(),
      restoreBranchName: jest.fn(),
      restoreSecondaryRunnerTag: jest.fn(),
      showSnackbar: jest.fn(),
    });
    mockGetAuthority.mockReturnValue('https://gitlab.example.com');

    mockBackendInstance = createMockBackend(1);
    mockCreateGitlabInstance.mockReturnValue(
      mockBackendInstance as unknown as ReturnType<typeof createGitlabInstance>,
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

  afterEach(() => {
    measurementState.shouldStopPipelines =
      originalMeasurementState.shouldStopPipelines;
    measurementState.activePipelines = originalMeasurementState.activePipelines;
    measurementState.executionResults =
      originalMeasurementState.executionResults;
    measurementState.currentMeasurementPromise =
      originalMeasurementState.currentMeasurementPromise;
  });

  it('should throw error if not authenticated', async () => {
    (sessionStorage.getItem as jest.Mock).mockReturnValue(null);

    await expect(runDigitalTwin('test-dt')).rejects.toThrow(
      'Not authenticated. Missing access_token or username.',
    );
  });

  it('should throw error if access_token is missing', async () => {
    (sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'username') return 'test-user';
      return null;
    });

    await expect(runDigitalTwin('test-dt')).rejects.toThrow(
      'Not authenticated. Missing access_token or username.',
    );
  });

  it('should throw error if username is missing', async () => {
    (sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'access_token') return 'test-token';
      return null;
    });

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

  it('should pass runner tag to digitalTwin.execute when provided in config', async () => {
    await runDigitalTwin('test-dt', { 'Runner tag': 'custom-runner' });

    const dtInstance = mockDigitalTwin.mock.results[0].value;
    expect(dtInstance.execute).toHaveBeenCalledWith(
      true,
      'custom-runner',
      'main',
    );
  });

  it('should pass branch name to digitalTwin.execute when provided in config', async () => {
    await runDigitalTwin('test-dt', { 'Branch name': 'feature-branch' });

    const dtInstance = mockDigitalTwin.mock.results[0].value;
    expect(dtInstance.execute).toHaveBeenCalledWith(
      true,
      'linux',
      'feature-branch',
    );
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

  it('should return execution result with dtName and pipelineId', async () => {
    const result = await runDigitalTwin('hello-world');

    expect(result.dtName).toBe('hello-world');
    expect(result.pipelineId).toBe(123);
  });

  it('should merge provided config with current settings from Redux', async () => {
    const result = await runDigitalTwin('hello-world', {
      'Runner tag': 'custom',
    });

    expect(result.config['Branch name']).toBe('main');
    expect(result.config['Runner tag']).toBe('custom');
  });

  it('should track pipeline in executionResults and clear activePipelines', async () => {
    await runDigitalTwin('hello-world');

    expect(measurementState.executionResults).toHaveLength(1);
    expect(measurementState.executionResults[0].pipelineId).toBe(123);
    expect(measurementState.activePipelines).toHaveLength(0);
  });

  it('should stop polling when shouldStopPipelines is true', async () => {
    mockIsPipelineCompleted.mockReturnValue(false);

    mockDelay.mockImplementation(async () => {
      measurementState.shouldStopPipelines = true;
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
