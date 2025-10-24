import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
import * as PipelineUtils from 'route/digitaltwins/execution/executionStatusHandlers';
import * as PipelineCore from 'model/backend/gitlab/execution/pipelineCore';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { PipelineStatusParams } from 'route/digitaltwins/execution/executionStatusManager';

jest.mock('model/backend/digitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

jest.mock('route/digitaltwins/execution/executionStatusHandlers', () => ({
  ...jest.requireActual('route/digitaltwins/execution/executionStatusHandlers'),
  fetchJobLogs: jest.fn(),
  updatePipelineStateOnCompletion: jest.fn(),
}));

jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  delay: jest.fn(),
  hasTimedOut: jest.fn(),
  getPollingInterval: jest.fn(() => 5000),
}));

jest.useFakeTimers();

describe('ExecutionStatusManager', () => {
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
  const paramsWithStartTime = { ...params, startTime };
  const pipelineId = 1;

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper functions to reduce code duplication
  const spyOnGetPipelineJobs = () =>
    jest.spyOn(digitalTwin.backend, 'getPipelineJobs').mockResolvedValue([]);
  const spyOnHandleTimeout = () =>
    jest.spyOn(PipelineChecks, 'handleTimeout').mockResolvedValue(undefined);
  const spyOnGetPipelineStatus = (status: string) =>
    jest
      .spyOn(digitalTwin.backend, 'getPipelineStatus')
      .mockResolvedValue(status);
  const spyOnCheckPipelineStatus = () =>
    jest
      .spyOn(PipelineChecks, 'checkChildPipelineStatus')
      .mockResolvedValue(undefined);

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
      .mockResolvedValue(undefined);

    jest.spyOn(global.Date, 'now').mockReturnValue(startTime);

    spyOnGetPipelineStatus('success');
    // Mock getPipelineJobs to return empty array to prevent fetchJobLogs from failing
    spyOnGetPipelineJobs();

    await PipelineChecks.startPipelineStatusCheck(params);

    expect(checkParentPipelineStatus).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns success', async () => {
    const checkChildPipelineStatus = spyOnCheckPipelineStatus();

    spyOnGetPipelineStatus('success');
    spyOnGetPipelineJobs();

    await PipelineChecks.checkParentPipelineStatus(paramsWithStartTime);

    expect(checkChildPipelineStatus).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns failed', async () => {
    const checkChildPipelineStatus = spyOnCheckPipelineStatus();

    spyOnGetPipelineStatus('failed');
    spyOnGetPipelineJobs();

    await PipelineChecks.checkParentPipelineStatus(paramsWithStartTime);

    expect(checkChildPipelineStatus).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns timeout', async () => {
    const handleTimeout = spyOnHandleTimeout();

    spyOnGetPipelineStatus('running');
    jest.spyOn(PipelineCore, 'hasTimedOut').mockReturnValue(true);

    await PipelineChecks.checkParentPipelineStatus(paramsWithStartTime);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('handles pipeline completion with failed status', async () => {
    spyOnGetPipelineJobs();

    const mockFetchJobLogs = jest.spyOn(PipelineUtils, 'fetchJobLogs');
    mockFetchJobLogs.mockResolvedValue([]);

    await PipelineChecks.handlePipelineCompletion(
      pipelineId,
      digitalTwin,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      'failed',
    );

    expect(dispatch).toHaveBeenCalled();
  });

  it('checks child pipeline status and returns timeout', async () => {
    const handleTimeout = spyOnHandleTimeout();
    spyOnGetPipelineStatus('running');
    jest.spyOn(PipelineCore, 'hasTimedOut').mockReturnValue(true);

    await PipelineChecks.checkChildPipelineStatus(paramsWithStartTime);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks child pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineCore, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    const getPipelineStatusMock = jest.spyOn(
      digitalTwin.backend,
      'getPipelineStatus',
    );
    getPipelineStatusMock
      .mockResolvedValueOnce('running')
      .mockResolvedValue('success');

    spyOnGetPipelineJobs();

    jest
      .spyOn(PipelineCore, 'hasTimedOut')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await PipelineChecks.checkChildPipelineStatus(paramsWithStartTime);

    expect(getPipelineStatusMock).toHaveBeenCalled();
  });
});
