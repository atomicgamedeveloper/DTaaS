import GitlabInstance from 'model/backend/gitlab/instance';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import * as dtUtils from 'preview/util/digitalTwinUtils';
import { getGroupName, getRunnerTag } from 'model/backend/gitlab/constants';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import * as envUtil from 'util/envUtil';

// Mock the constants module
jest.mock('model/backend/gitlab/constants', () => ({
  ...jest.requireActual('model/backend/gitlab/constants'),
  getGroupName: jest.fn().mockReturnValue('testGroup'),
}));

// Mock the envUtil module
jest.mock('util/envUtil', () => ({
  __esModule: true,
  ...jest.requireActual('util/envUtil'),
  getAuthority: jest.fn().mockReturnValue('https://example.com/AUTHORITY'),
}));

const mockGitlabInstance = {
  api: mockBackendAPI,
  triggerToken: 'test-token',
  logs: [] as { jobName: string; log: string }[],
  setProjectIds: jest.fn(),
  getProjectId: jest.fn().mockReturnValue(1),
  getCommonProjectId: jest.fn().mockReturnValue(2),
  startPipeline: jest.fn().mockResolvedValue({ id: 123 }),
} as unknown as GitlabInstance;

const files = [
  {
    name: 'fileName',
    content: 'fileContent',
    isNew: true,
    isModified: false,
  },
];

describe('DigitalTwin', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    // Clear mock calls but preserve mock implementations
    jest.clearAllMocks();
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
    mockGitlabInstance.getCommonProjectId = jest.fn().mockReturnValue(2);
    dt = new DigitalTwin('test-DTName', mockGitlabInstance);

    // Re-apply the mock for getAuthority - without using require()
    (envUtil.getAuthority as jest.Mock).mockReturnValue(
      'https://example.com/AUTHORITY',
    );

    // Mock sessionStorage for tests that need it
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => 'testUser'),
        setItem: jest.fn(),
        clear: jest.fn(),
        removeItem: jest.fn(),
        length: 0,
        key: jest.fn(),
      },
      writable: true,
    });
  });

  it('should get description', async () => {
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockResolvedValue({
      content: 'Test description content',
    });

    await dt.getDescription();

    expect(dt.description).toBe('Test description content');
    expect(mockBackendAPI.getRepositoryFileContent).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/description.md',
      'master',
    );
  });

  it('should return empty description if no description file exists', async () => {
    (mockBackendAPI.listRepositoryFiles as jest.Mock).mockRejectedValue(
      new Error('File not found'),
    );

    await dt.getDescription();

    expect(dt.description).toBe('There is no description.md file');
  });

  it('should return full description with updated image URLs if projectId exists', async () => {
    const mockContent =
      'Test README content with an image ![alt text](image.png)';

    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockResolvedValue({
      content: mockContent,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => 'testUser'),
        setItem: jest.fn(),
      },
      writable: true,
    });

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe(
      `Test README content with an image ![alt text](https://example.com/AUTHORITY/${getGroupName()}/testUser/-/raw/main/digital_twins/test-DTName/image.png)`,
    );

    expect(mockBackendAPI.getRepositoryFileContent).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/README.md',
      'master',
    );
  });

  it('should return error message if no README.md file exists', async () => {
    (mockBackendAPI.listRepositoryFiles as jest.Mock).mockRejectedValue(
      new Error('File not found'),
    );

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe('There is no README.md file');
  });

  it('should execute pipeline and return the pipeline ID', async () => {
    const mockResponse = { id: 123 };
    (mockGitlabInstance.startPipeline as jest.Mock).mockResolvedValue(
      mockResponse,
    );
    (mockBackendAPI.getTriggerToken as jest.Mock).mockResolvedValue(
      'test-token',
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBe(123);
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.SUCCESS);
    expect(mockGitlabInstance.startPipeline).toHaveBeenCalledWith(1, 'master', {
      DTName: 'test-DTName',
      RunnerTag: getRunnerTag(),
    });
  });

  it('should log error and return null when projectId or triggerToken is missing', async () => {
    (dt.backend.getProjectId as jest.Mock).mockReturnValue(null);
    (mockBackendAPI.getTriggerToken as jest.Mock).mockResolvedValue(
      'test-token',
    );

    jest.spyOn(dtUtils, 'isValidInstance').mockReturnValue(false);

    (mockBackendAPI.getTriggerToken as jest.Mock).mockResolvedValue(null);

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe('error');
    expect(mockBackendAPI.getTriggerToken).not.toHaveBeenCalled();
  });

  it('should log success and update status', () => {
    dtUtils.logSuccess(dt, getRunnerTag());

    expect(dt.backend.logs).toContainEqual({
      status: 'success',
      DTName: 'test-DTName',
      runnerTag: getRunnerTag(),
    });
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.SUCCESS);
  });

  it('should log error when triggering pipeline fails', async () => {
    jest.spyOn(dtUtils, 'isValidInstance').mockReturnValue(true);
    const errorMessage = 'Trigger failed';
    (mockBackendAPI.startPipeline as jest.Mock).mockRejectedValue(errorMessage);

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
  });

  it('should handle non-Error thrown during pipeline execution', async () => {
    (mockBackendAPI.startPipeline as jest.Mock).mockRejectedValue(
      'String error message',
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
  });

  it('should stop the parent pipeline and update status', async () => {
    (mockBackendAPI.cancelPipeline as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'parentPipeline');

    expect(mockBackendAPI.cancelPipeline).toHaveBeenCalled();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.CANCELED);
  });

  it('should stop the child pipeline and update status', async () => {
    (mockBackendAPI.cancelPipeline as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'childPipeline');

    expect(mockBackendAPI.cancelPipeline).toHaveBeenCalled();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.CANCELED);
  });

  it('should handle stop error', async () => {
    (mockBackendAPI.cancelPipeline as jest.Mock).mockRejectedValue(
      new Error('Stop failed'),
    );

    await dt.stop(1, 'parentPipeline');

    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
  });

  it('should format the name correctly', () => {
    const testCases = [{ input: 'digital-twin', expected: 'Digital twin' }];

    testCases.forEach(({ input, expected }) => {
      expect(formatName(input)).toBe(expected);
    });
  });

  it('should delete the digital twin', async () => {
    (mockBackendAPI.removeRepositoryFile as jest.Mock).mockResolvedValue({});

    await dt.delete();

    expect(mockBackendAPI.removeRepositoryFile).toHaveBeenCalled();
  });

  it('should delete the digital twin and return success message', async () => {
    (mockBackendAPI.removeRepositoryFile as jest.Mock).mockResolvedValue({});

    const result = await dt.delete();

    expect(result).toBe('test-DTName deleted successfully');
    expect(mockBackendAPI.removeRepositoryFile).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName',
      'master',
      'Removing test-DTName digital twin',
    );
  });

  it('should return error message when deletion fails', async () => {
    (mockBackendAPI.removeRepositoryFile as jest.Mock).mockRejectedValue(
      new Error('Delete failed'),
    );

    const result = await dt.delete();

    expect(result).toBe('Error deleting test-DTName digital twin');
  });

  it('should create digital twin with files', async () => {
    const result = await dt.create(files, [], []);

    expect(result).toBe(
      'test-DTName digital twin files initialized successfully.',
    );
  });

  it('should return error message when creating digital twin fails', async () => {
    (mockBackendAPI.createRepositoryFile as jest.Mock).mockRejectedValue(
      new Error('Create failed'),
    );

    const result = await dt.create(files, [], []);

    expect(result).toBe(
      'Error initializing test-DTName digital twin files: Error: Create failed',
    );
  });
});
