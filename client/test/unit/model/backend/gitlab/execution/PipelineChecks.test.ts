import * as PipelineChecks from 'model/backend/gitlab/execution/pipelineChecks';
import * as PipelineUtils from 'model/backend/gitlab/execution/pipelineUtils';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { PipelineStatusParams } from 'model/backend/gitlab/execution/interfaces';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';

jest.mock('preview/util/digitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

jest.mock('model/backend/gitlab/execution/pipelineUtils', () => ({
  fetchJobLogs: jest.fn(),
  updatePipelineStateOnCompletion: jest.fn(),
  fetchLogsAndUpdateExecution: jest.fn(),
}));

jest.useFakeTimers();

describe('PipelineChecks', () => {
  const DTName = 'testName';
  const setButtonText = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const dispatch = jest.fn();
  const startTime = Date.now();
  const digitalTwin = mockDigitalTwin;
  const params: PipelineStatusParams = {
    setButtonText,
    digitalTwin,
    setLogButtonDisabled,
    dispatch,
  };
  const pipelineId = 1;

  // Get the mocked function
  const mockFetchLogsAndUpdateExecution = jest.requireMock(
    'model/backend/gitlab/execution/pipelineUtils',
  ).fetchLogsAndUpdateExecution;

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('handles timeout', () => {
    PipelineChecks.handleTimeout(
      DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );

    expect(setButtonText).toHaveBeenCalled();
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
  });

  it('starts pipeline status check', async () => {
    const checkParentPipelineStatus = jest
      .spyOn(PipelineChecks, 'checkParentPipelineStatus')
      .mockImplementation(() => Promise.resolve());

    jest.spyOn(global.Date, 'now').mockReturnValue(startTime);

    PipelineChecks.startPipelineStatusCheck(params);

    expect(checkParentPipelineStatus).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns success', async () => {
    const checkChildPipelineStatus = jest.spyOn(
      PipelineChecks,
      'checkChildPipelineStatus',
    );

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('success');
    await PipelineChecks.checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    expect(checkChildPipelineStatus).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns failed', async () => {
    const updatePipelineStateOnCompletion = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnCompletion',
    );

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('failed');
    await PipelineChecks.checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    expect(updatePipelineStateOnCompletion).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns timeout', async () => {
    const handleTimeout = jest.spyOn(PipelineChecks, 'handleTimeout');

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest.spyOn(PipelineChecks, 'hasTimedOut').mockReturnValue(true);
    await PipelineChecks.checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    jest.advanceTimersByTime(5000);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineChecks, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest
      .spyOn(PipelineChecks, 'hasTimedOut')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await PipelineChecks.checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    expect(delay).toHaveBeenCalled();
  });

  it('handles pipeline completion with failed status', async () => {
    const fetchJobLogs = jest.spyOn(PipelineUtils, 'fetchJobLogs');
    const updatePipelineStateOnCompletion = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnCompletion',
    );
    await PipelineChecks.handlePipelineCompletion(
      pipelineId,
      digitalTwin,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      'failed',
    );

    expect(fetchJobLogs).toHaveBeenCalled();
    expect(updatePipelineStateOnCompletion).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('checks child pipeline status and returns timeout', async () => {
    const completeParams = {
      setButtonText: jest.fn(),
      digitalTwin,
      setLogButtonDisabled: jest.fn(),
      dispatch: jest.fn(),
      startTime: Date.now(),
    };
    const handleTimeout = jest.spyOn(PipelineChecks, 'handleTimeout');

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest.spyOn(PipelineChecks, 'hasTimedOut').mockReturnValue(true);

    await PipelineChecks.checkChildPipelineStatus(completeParams);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks child pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineChecks, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    const getPipelineStatusMock = jest.spyOn(
      digitalTwin.gitlabInstance,
      'getPipelineStatus',
    );
    getPipelineStatusMock
      .mockResolvedValueOnce('running')
      .mockResolvedValue('success');

    await PipelineChecks.checkChildPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    expect(getPipelineStatusMock).toHaveBeenCalled();
    getPipelineStatusMock.mockRestore();
  });

  describe('concurrent execution scenarios', () => {
    beforeEach(() => {
      mockFetchLogsAndUpdateExecution.mockResolvedValue(true);
    });

    it('handles execution with executionId in checkParentPipelineStatus', async () => {
      const executionId = 'test-execution-123';
      const mockExecution = {
        id: executionId,
        pipelineId: 999,
        dtName: 'test-dt',
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      // Mock getExecutionHistoryById to return our test execution
      jest
        .spyOn(digitalTwin, 'getExecutionHistoryById')
        .mockResolvedValue(mockExecution);
      jest
        .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
        .mockResolvedValue('success');

      const checkChildPipelineStatus = jest.spyOn(
        PipelineChecks,
        'checkChildPipelineStatus',
      );

      await PipelineChecks.checkParentPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
        executionId,
      });

      expect(digitalTwin.getExecutionHistoryById).toHaveBeenCalledWith(
        executionId,
      );
      expect(checkChildPipelineStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId,
        }),
      );
    });

    it('handles missing execution in checkParentPipelineStatus', async () => {
      const executionId = 'non-existent-execution';

      jest
        .spyOn(digitalTwin, 'getExecutionHistoryById')
        .mockResolvedValue(undefined);
      jest
        .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
        .mockResolvedValue('success');

      const checkChildPipelineStatus = jest.spyOn(
        PipelineChecks,
        'checkChildPipelineStatus',
      );

      await PipelineChecks.checkParentPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
        executionId,
      });

      // Should fall back to digitalTwin.pipelineId
      expect(digitalTwin.gitlabInstance.getPipelineStatus).toHaveBeenCalledWith(
        digitalTwin.gitlabInstance.projectId,
        digitalTwin.pipelineId,
      );
      expect(checkChildPipelineStatus).toHaveBeenCalled();
    });

    it('handles execution with executionId in checkChildPipelineStatus', async () => {
      const executionId = 'test-execution-456';
      const mockExecution = {
        id: executionId,
        pipelineId: 888,
        dtName: 'test-dt',
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      jest
        .spyOn(digitalTwin, 'getExecutionHistoryById')
        .mockResolvedValue(mockExecution);
      jest
        .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
        .mockResolvedValue('success');

      const handlePipelineCompletion = jest.spyOn(
        PipelineChecks,
        'handlePipelineCompletion',
      );

      await PipelineChecks.checkChildPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
        executionId,
      });

      expect(digitalTwin.gitlabInstance.getPipelineStatus).toHaveBeenCalledWith(
        digitalTwin.gitlabInstance.projectId,
        889, // mockExecution.pipelineId + 1
      );
      expect(handlePipelineCompletion).toHaveBeenCalledWith(
        889,
        digitalTwin,
        setButtonText,
        setLogButtonDisabled,
        dispatch,
        'success',
        executionId,
      );
    });

    it('handles missing execution in checkChildPipelineStatus', async () => {
      const executionId = 'missing-execution';

      jest
        .spyOn(digitalTwin, 'getExecutionHistoryById')
        .mockResolvedValue(undefined);
      jest
        .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
        .mockResolvedValue('failed');

      const handlePipelineCompletion = jest.spyOn(
        PipelineChecks,
        'handlePipelineCompletion',
      );

      await PipelineChecks.checkChildPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
        executionId,
      });

      expect(digitalTwin.gitlabInstance.getPipelineStatus).toHaveBeenCalledWith(
        digitalTwin.gitlabInstance.projectId,
        digitalTwin.pipelineId! + 1,
      );
      expect(handlePipelineCompletion).toHaveBeenCalledWith(
        digitalTwin.pipelineId! + 1,
        digitalTwin,
        setButtonText,
        setLogButtonDisabled,
        dispatch,
        'failed',
        executionId,
      );
    });
  });

  describe('handlePipelineCompletion edge cases', () => {
    it('handles completion without executionId (backward compatibility)', async () => {
      const testPipelineId = 123;
      const mockJobLogs = [{ jobName: 'test-job', log: 'test log' }];

      jest.spyOn(PipelineUtils, 'fetchJobLogs').mockResolvedValue(mockJobLogs);
      jest
        .spyOn(PipelineUtils, 'updatePipelineStateOnCompletion')
        .mockResolvedValue();

      await PipelineChecks.handlePipelineCompletion(
        testPipelineId,
        digitalTwin,
        setButtonText,
        setLogButtonDisabled,
        dispatch,
        'success',
      );

      expect(PipelineUtils.fetchJobLogs).toHaveBeenCalledWith(
        digitalTwin.gitlabInstance,
        testPipelineId,
      );
      expect(
        PipelineUtils.updatePipelineStateOnCompletion,
      ).toHaveBeenCalledWith(
        digitalTwin,
        mockJobLogs,
        setButtonText,
        setLogButtonDisabled,
        dispatch,
        undefined,
        'completed',
      );
    });

    it('handles completion with executionId when logs are unavailable', async () => {
      const testPipelineId = 456;
      const executionId = 'test-execution-no-logs';

      // Mock fetchLogsAndUpdateExecution to return false (logs unavailable)
      mockFetchLogsAndUpdateExecution.mockResolvedValueOnce(false);

      // Mock digitalTwin methods
      const updateExecutionStatus = jest
        .spyOn(digitalTwin, 'updateExecutionStatus')
        .mockResolvedValue(undefined);

      await PipelineChecks.handlePipelineCompletion(
        testPipelineId,
        digitalTwin,
        setButtonText,
        setLogButtonDisabled,
        dispatch,
        'success',
        executionId,
      );

      // Should call fetchLogsAndUpdateExecution once
      expect(mockFetchLogsAndUpdateExecution).toHaveBeenCalledTimes(1);

      // Should update execution status when logs are unavailable
      expect(updateExecutionStatus).toHaveBeenCalledWith(
        executionId,
        'completed',
      );

      // Should dispatch status update
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'executionHistory/updateExecutionStatus',
          payload: { id: executionId, status: 'completed' },
        }),
      );

      // Should update UI state
      expect(setButtonText).toHaveBeenCalledWith('Start');
      expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
    });
  });

  describe('error scenarios', () => {
    it('handles getPipelineStatus errors gracefully', async () => {
      jest
        .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
        .mockRejectedValue(new Error('API Error'));

      await expect(
        PipelineChecks.checkParentPipelineStatus({
          setButtonText,
          digitalTwin,
          setLogButtonDisabled,
          dispatch,
          startTime,
        }),
      ).rejects.toThrow('API Error');
    });

    it('handles getExecutionHistoryById errors', async () => {
      const executionId = 'error-execution';

      jest
        .spyOn(digitalTwin, 'getExecutionHistoryById')
        .mockRejectedValue(new Error('Database Error'));

      await expect(
        PipelineChecks.checkParentPipelineStatus({
          setButtonText,
          digitalTwin,
          setLogButtonDisabled,
          dispatch,
          startTime,
          executionId,
        }),
      ).rejects.toThrow('Database Error');
    });
  });
});
