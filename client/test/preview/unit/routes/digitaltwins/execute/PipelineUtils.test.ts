import {
  fetchJobLogs,
  startPipeline,
  updatePipelineStateOnCompletion,
  updatePipelineStateOnStop,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { stopPipelines } from 'preview/route/digitaltwins/execute/pipelineHandler';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { JobSchema } from '@gitbeaker/rest';
import GitlabInstance from 'preview/util/gitlab';
import { ExecutionStatus } from 'preview/model/executionHistory';

describe('PipelineUtils', () => {
  const digitalTwin = mockDigitalTwin;
  const dispatch = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const setButtonText = jest.fn();
  const { gitlabInstance } = digitalTwin;
  const pipelineId = 1;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('starts pipeline and handles success', async () => {
    const mockExecute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = 'success';
    digitalTwin.currentExecutionId = 'test-execution-id';

    dispatch.mockReset();
    setLogButtonDisabled.mockReset();

    setLogButtonDisabled.mockImplementation(() => {});

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(mockExecute).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
    setLogButtonDisabled(false);
    expect(setLogButtonDisabled).toHaveBeenCalled();
  });

  it('starts pipeline and handles failed', async () => {
    const mockExecute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = 'failed';
    digitalTwin.currentExecutionId = null;

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(mockExecute).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: expect.stringContaining('Execution'),
          severity: 'error',
        },
      }),
    );
  });

  it('updates pipeline state on completion', async () => {
    const executionId = 'test-execution-id';
    jest.spyOn(digitalTwin, 'getExecutionHistoryById').mockResolvedValue({
      id: executionId,
      dtName: digitalTwin.DTName,
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    });
    jest.spyOn(digitalTwin, 'updateExecutionLogs').mockResolvedValue();
    jest.spyOn(digitalTwin, 'updateExecutionStatus').mockResolvedValue();

    dispatch.mockReset();

    await updatePipelineStateOnCompletion(
      digitalTwin,
      [{ jobName: 'job1', log: 'log1' }],
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );

    expect(dispatch).toHaveBeenCalled();
    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('updates pipeline state on stop', async () => {
    const executionId = 'test-execution-id';
    jest.spyOn(digitalTwin, 'getExecutionHistoryById').mockResolvedValue({
      id: executionId,
      dtName: digitalTwin.DTName,
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    });
    jest.spyOn(digitalTwin, 'updateExecutionStatus').mockResolvedValue();

    dispatch.mockReset();

    await updatePipelineStateOnStop(
      digitalTwin,
      setButtonText,
      dispatch,
      executionId,
    );

    expect(dispatch).toHaveBeenCalled();
    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('stops pipelines for a specific execution', async () => {
    const executionId = 'test-execution-id';
    jest.spyOn(digitalTwin, 'getExecutionHistoryById').mockResolvedValue({
      id: executionId,
      dtName: digitalTwin.DTName,
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    });
    const mockStop = jest.spyOn(digitalTwin, 'stop');
    mockStop.mockResolvedValue(undefined);

    await stopPipelines(digitalTwin, executionId);

    expect(mockStop).toHaveBeenCalledTimes(2);
    expect(mockStop).toHaveBeenCalledWith(
      digitalTwin.gitlabInstance.projectId,
      'parentPipeline',
      executionId,
    );
    expect(mockStop).toHaveBeenCalledWith(
      digitalTwin.gitlabInstance.projectId,
      'childPipeline',
      executionId,
    );
  });

  it('stops all pipelines when no execution ID is provided', async () => {
    digitalTwin.pipelineId = 123;

    const mockStop = jest.spyOn(digitalTwin, 'stop');
    mockStop.mockResolvedValue(undefined);

    await stopPipelines(digitalTwin);

    expect(mockStop).toHaveBeenCalledTimes(2);
    expect(mockStop).toHaveBeenCalledWith(
      digitalTwin.gitlabInstance.projectId,
      'parentPipeline',
    );
    expect(mockStop).toHaveBeenCalledWith(
      digitalTwin.gitlabInstance.projectId,
      'childPipeline',
    );
  });

  describe('fetchJobLogs', () => {
    it('fetches job logs', async () => {
      const mockJob = { id: 1, name: 'job1' } as JobSchema;

      const mockGetPipelineJobs = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      mockGetPipelineJobs.mockResolvedValue([mockJob]);

      const mockGetJobTrace = jest.spyOn(gitlabInstance, 'getJobTrace');
      mockGetJobTrace.mockResolvedValue('log1');

      const result = await fetchJobLogs(gitlabInstance, pipelineId);

      expect(mockGetPipelineJobs).toHaveBeenCalledWith(
        gitlabInstance.projectId,
        pipelineId,
      );
      expect(mockGetJobTrace).toHaveBeenCalledWith(gitlabInstance.projectId, 1);
      expect(result).toEqual([{ jobName: 'job1', log: 'log1' }]);
    });

    it('returns empty array if projectId is falsy', async () => {
      const mockGitlabInstance = {
        ...gitlabInstance,
        projectId: undefined,
        getPipelineJobs: jest.fn(),
        getJobTrace: jest.fn(),
      } as unknown as GitlabInstance;

      const result = await fetchJobLogs(mockGitlabInstance, pipelineId);
      expect(result).toEqual([]);
    });

    it('handles error when fetching job trace', async () => {
      const mockJob = { id: 1, name: 'job1' } as JobSchema;

      const mockGetPipelineJobs = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      mockGetPipelineJobs.mockResolvedValue([mockJob]);

      const mockGetJobTrace = jest.spyOn(gitlabInstance, 'getJobTrace');
      mockGetJobTrace.mockRejectedValue(new Error('Error fetching trace'));

      const result = await fetchJobLogs(gitlabInstance, pipelineId);

      expect(result).toEqual([
        { jobName: 'job1', log: 'Error fetching log content' },
      ]);
    });

    it('handles job with missing name', async () => {
      const mockJob = { id: 1 } as JobSchema;

      const mockGetPipelineJobs = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      mockGetPipelineJobs.mockResolvedValue([mockJob]);

      const mockGetJobTrace = jest.spyOn(gitlabInstance, 'getJobTrace');
      mockGetJobTrace.mockResolvedValue('log content');

      const result = await fetchJobLogs(gitlabInstance, pipelineId);

      expect(result).toEqual([{ jobName: 'Unknown', log: 'log content' }]);
    });

    it('handles non-string log content', async () => {
      const mockJob = { id: 1, name: 'job1' } as JobSchema;

      const mockGetPipelineJobs = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      mockGetPipelineJobs.mockResolvedValue([mockJob]);

      const mockGetJobTrace = jest.spyOn(gitlabInstance, 'getJobTrace');
      mockGetJobTrace.mockResolvedValue('');

      const result = await fetchJobLogs(gitlabInstance, pipelineId);

      expect(result).toEqual([{ jobName: 'job1', log: '' }]);
    });
  });
});
