import GitlabInstance from 'model/backend/gitlab/instance';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import * as dtUtils from 'preview/util/digitalTwinUtils';
import {
  getBranchName,
  getGroupName,
  getRunnerTag,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import * as envUtil from 'util/envUtil';

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
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
    mockGitlabInstance.getCommonProjectId = jest.fn().mockReturnValue(2);
    mockGitlabInstance.startPipeline = jest.fn().mockResolvedValue({ id: 123 });
    dt = new DigitalTwin('test-DTName', mockGitlabInstance);

    (envUtil.getAuthority as jest.Mock).mockReturnValue(
      'https://example.com/AUTHORITY',
    );

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
      getBranchName(),
    );
  });

  it('should return empty description if no description file exists', async () => {
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockRejectedValue(
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

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe(
      `Test README content with an image ![alt text](https://example.com/AUTHORITY/${getGroupName()}/testUser/-/raw/main/digital_twins/test-DTName/image.png)`,
    );

    expect(mockBackendAPI.getRepositoryFileContent).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/README.md',
      getBranchName(),
    );
  });

  it('should return error message if no README.md file exists', async () => {
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockRejectedValue(
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
    expect(mockGitlabInstance.startPipeline).toHaveBeenCalledWith(
      1,
      getBranchName(),
      {
        DTName: 'test-DTName',
        RunnerTag: getRunnerTag(),
      },
    );
  });

  it('should log error and return null when projectId or triggerToken is missing', async () => {
    (dt.backend.getProjectId as jest.Mock).mockReturnValue(null);
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
    (mockGitlabInstance.startPipeline as jest.Mock).mockRejectedValue(
      errorMessage,
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
  });

  it('should handle non-Error thrown during pipeline execution', async () => {
    (mockGitlabInstance.startPipeline as jest.Mock).mockRejectedValue(
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
      getBranchName(),
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
    (mockBackendAPI.createRepositoryFile as jest.Mock).mockResolvedValue({});
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
