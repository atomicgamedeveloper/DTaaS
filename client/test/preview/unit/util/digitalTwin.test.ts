import GitlabInstance from 'preview/util/gitlab';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import * as dtUtils from 'preview/util/digitalTwinUtils';
import { getRunnerTag } from 'model/backend/gitlab/constants';
import * as envUtil from 'util/envUtil';

// Mock the constants module
jest.mock('model/backend/gitlab/constants', () => {
  // Import the mock factory using import-like syntax to maintain ESLint compliance
  const { default: createConstantsMock } = jest.requireActual(
    '../../../preview/__mocks__/constants.mock',
  );
  return createConstantsMock();
});

// Mock the envUtil module
jest.mock('util/envUtil', () => ({
  __esModule: true,
  ...jest.requireActual('util/envUtil'),
  getAuthority: jest.fn().mockReturnValue('https://example.com/AUTHORITY'),
}));

const mockApi = {
  RepositoryFiles: {
    show: jest.fn(),
    remove: jest.fn(),
    edit: jest.fn(),
    create: jest.fn(),
  },
  Repositories: {
    allRepositoryTrees: jest.fn(),
  },
  PipelineTriggerTokens: {
    trigger: jest.fn(),
  },
  Pipelines: {
    cancel: jest.fn(),
  },
};

const mockGitlabInstance = {
  api: mockApi as unknown as GitlabInstance['api'],
  projectId: 1,
  triggerToken: 'test-token',
  logs: [] as { jobName: string; log: string }[],
  getProjectId: jest.fn(),
  getTriggerToken: jest.fn(),
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

    // Re-initialize the instance for the test
    mockGitlabInstance.projectId = 1;
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
    (mockApi.RepositoryFiles.show as jest.Mock).mockResolvedValue({
      content: btoa('Test description content'),
    });

    await dt.getDescription();

    expect(dt.description).toBe('Test description content');
    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/description.md',
      'master',
    );
  });

  it('should return empty description if no description file exists', async () => {
    (mockApi.RepositoryFiles.show as jest.Mock).mockRejectedValue(
      new Error('File not found'),
    );

    await dt.getDescription();

    expect(dt.description).toBe('There is no description.md file');
  });

  it('should return full description with updated image URLs if projectId exists', async () => {
    const mockContent = btoa(
      'Test README content with an image ![alt text](image.png)',
    );

    // Mock for RepositoryFiles.show specific to this test
    (mockApi.RepositoryFiles.show as jest.Mock).mockImplementation(
      async (projectId, filePath, ref) => {
        if (
          projectId === 1 &&
          filePath === 'digital_twins/test-DTName/README.md' &&
          ref === 'master'
        ) {
          return { content: mockContent };
        }
        throw new Error(`File not found: ${filePath}`);
      },
    );

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe(
      'Test README content with an image ![alt text](https://example.com/AUTHORITY/dtaas/testUser/-/raw/main/digital_twins/test-DTName/image.png)',
    );

    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/README.md',
      'master',
    );
  });

  it('should return error message if no README.md file exists', async () => {
    (mockApi.RepositoryFiles.show as jest.Mock).mockRejectedValue(
      new Error('File not found'),
    );

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe('There is no README.md file');
  });

  it('should return error message when projectId is missing', async () => {
    dt.gitlabInstance.projectId = null;
    await dt.getFullDescription();
    expect(dt.fullDescription).toBe('Error fetching description, retry.');
  });

  it('should execute pipeline and return the pipeline ID', async () => {
    const mockResponse = { id: 123 };
    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockResolvedValue(
      mockResponse,
    );
    (mockGitlabInstance.getProjectId as jest.Mock).mockResolvedValue(1);
    (mockGitlabInstance.getTriggerToken as jest.Mock).mockResolvedValue(
      'test-token',
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBe(123);
    expect(dt.lastExecutionStatus).toBe('success');
    expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
      1,
      'master',
      'test-token',
      { variables: { DTName: 'test-DTName', RunnerTag: getRunnerTag() } },
    );
  });

  it('should log error and return null when projectId or triggerToken is missing', async () => {
    dt.gitlabInstance.projectId = null;
    dt.gitlabInstance.triggerToken = null;

    jest.spyOn(dtUtils, 'isValidInstance').mockReturnValue(false);

    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockReset();

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe('error');
    expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled();
  });

  it('should log success and update status', () => {
    dtUtils.logSuccess(dt, getRunnerTag());

    expect(dt.gitlabInstance.logs).toContainEqual({
      status: 'success',
      DTName: 'test-DTName',
      runnerTag: getRunnerTag(),
    });
    expect(dt.lastExecutionStatus).toBe('success');
  });

  it('should log error when triggering pipeline fails', async () => {
    jest.spyOn(dtUtils, 'isValidInstance').mockReturnValue(true);
    const errorMessage = 'Trigger failed';
    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockRejectedValue(
      errorMessage,
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe('error');
  });

  it('should handle non-Error thrown during pipeline execution', async () => {
    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockRejectedValue(
      'String error message',
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe('error');
  });

  it('should stop the parent pipeline and update status', async () => {
    (mockApi.Pipelines.cancel as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'parentPipeline');

    expect(mockApi.Pipelines.cancel).toHaveBeenCalled();
    expect(dt.lastExecutionStatus).toBe('canceled');
  });

  it('should stop the child pipeline and update status', async () => {
    (mockApi.Pipelines.cancel as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'childPipeline');

    expect(mockApi.Pipelines.cancel).toHaveBeenCalled();
    expect(dt.lastExecutionStatus).toBe('canceled');
  });

  it('should handle stop error', async () => {
    (mockApi.Pipelines.cancel as jest.Mock).mockRejectedValue(
      new Error('Stop failed'),
    );

    await dt.stop(1, 'parentPipeline');

    expect(dt.lastExecutionStatus).toBe('error');
  });

  it('should format the name correctly', () => {
    const testCases = [{ input: 'digital-twin', expected: 'Digital twin' }];

    testCases.forEach(({ input, expected }) => {
      expect(formatName(input)).toBe(expected);
    });
  });

  it('should delete the digital twin', async () => {
    (mockApi.RepositoryFiles.remove as jest.Mock).mockResolvedValue({});

    await dt.delete();

    expect(mockApi.RepositoryFiles.remove).toHaveBeenCalled();
  });

  it('should delete the digital twin and return success message', async () => {
    (mockApi.RepositoryFiles.remove as jest.Mock).mockResolvedValue({});

    const result = await dt.delete();

    expect(result).toBe('test-DTName deleted successfully');
    expect(mockApi.RepositoryFiles.remove).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName',
      'master',
      'Removing test-DTName digital twin',
    );
  });

  it('should return error message when deletion fails', async () => {
    (mockApi.RepositoryFiles.remove as jest.Mock).mockRejectedValue(
      new Error('Delete failed'),
    );

    const result = await dt.delete();

    expect(result).toBe('Error deleting test-DTName digital twin');
  });

  it('should return error message when projectId is missing during deletion', async () => {
    dt.gitlabInstance.projectId = null;

    const result = await dt.delete();

    expect(result).toBe(
      'Error deleting test-DTName digital twin: no project id',
    );
  });

  it('should create digital twin with files', async () => {
    const result = await dt.create(files, [], []);

    expect(result).toBe(
      'test-DTName digital twin files initialized successfully.',
    );
  });

  it('should return error message when creating digital twin fails', async () => {
    (mockApi.RepositoryFiles.create as jest.Mock).mockRejectedValue(
      new Error('Create failed'),
    );

    const result = await dt.create(files, [], []);

    expect(result).toBe(
      'Error initializing test-DTName digital twin files: Error: Create failed',
    );
  });

  it('should return error message when projectId is missing during creation', async () => {
    dt.gitlabInstance.projectId = null;

    const result = await dt.create(files, [], []);

    expect(result).toBe(
      'Error creating test-DTName digital twin: no project id',
    );
  });
});
