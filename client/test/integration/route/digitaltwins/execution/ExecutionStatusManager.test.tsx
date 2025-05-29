import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
import * as PipelineUtils from 'route/digitaltwins/execution/executionUIHandlers';
import * as PipelineCore from 'model/backend/gitlab/execution/pipelineCore';
import {
  setDigitalTwin,
  DigitalTwinData,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import { extractDataFromDigitalTwin } from 'route/digitaltwins/execution/digitalTwinAdapter';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { previewStore as store } from 'test/preview/integration/integration.testUtil';
import { PipelineStatusParams } from 'route/digitaltwins/execution/executionStatusManager';

jest.useFakeTimers();

jest.mock('route/digitaltwins/execution/executionUIHandlers', () => ({
  fetchJobLogs: jest.fn(),
  updatePipelineStateOnCompletion: jest.fn(),
}));

describe('PipelineChecks', () => {
  const digitalTwin = mockDigitalTwin;

  const setButtonText = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const dispatch = jest.fn();
  const startTime = Date.now();
  const params: PipelineStatusParams = {
    setButtonText,
    digitalTwin,
    setLogButtonDisabled,
    dispatch,
  };

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  beforeEach(() => {
    const digitalTwinData: DigitalTwinData =
      extractDataFromDigitalTwin(digitalTwin);
    store.dispatch(
      setDigitalTwin({
        assetName: 'mockedDTName',
        digitalTwin: digitalTwinData,
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('handles timeout', () => {
    PipelineChecks.handleTimeout(
      digitalTwin.DTName,
      jest.fn(),
      jest.fn(),
      store.dispatch,
    );

    const snackbarState = store.getState().snackbar;

    const expectedSnackbarState = {
      open: true,
      message: 'Execution timed out for MockedDTName',
      severity: 'error',
    };

    expect(snackbarState).toEqual(expectedSnackbarState);
  });

  it('starts pipeline status check', async () => {
    const checkParentPipelineStatus = jest
      .spyOn(PipelineChecks, 'checkParentPipelineStatus')
      .mockImplementation(() => Promise.resolve());

    jest.spyOn(global.Date, 'now').mockReturnValue(startTime);

    await PipelineChecks.startPipelineStatusCheck(params);

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

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineJobs')
      .mockResolvedValue([]);

    await PipelineChecks.checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch: store.dispatch,
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

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineJobs')
      .mockResolvedValue([]);

    await PipelineChecks.checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch: store.dispatch,
      startTime,
    });

    expect(updatePipelineStateOnCompletion).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns timeout', async () => {
    const handleTimeout = jest.spyOn(PipelineChecks, 'handleTimeout');

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest.spyOn(PipelineCore, 'hasTimedOut').mockReturnValue(true);
    await PipelineChecks.checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch: store.dispatch,
      startTime,
    });

    jest.advanceTimersByTime(5000);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineCore, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest
      .spyOn(PipelineCore, 'hasTimedOut')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await PipelineChecks.checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch: store.dispatch,
      startTime,
    });

    expect(delay).toHaveBeenCalled();
  });

  it('handles pipeline completion with failed status', async () => {
    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineJobs')
      .mockResolvedValue([]);

    await PipelineChecks.handlePipelineCompletion(
      1,
      digitalTwin,
      jest.fn(),
      jest.fn(),
      store.dispatch,
      'failed',
    );

    const snackbarState = store.getState().snackbar;

    const expectedSnackbarState = {
      open: true,
      message: 'Execution failed for MockedDTName',
      severity: 'error',
    };

    expect(snackbarState).toEqual(expectedSnackbarState);
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
    jest.spyOn(PipelineCore, 'hasTimedOut').mockReturnValue(true);

    await PipelineChecks.checkChildPipelineStatus(completeParams);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks child pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineCore, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    const getPipelineStatusMock = jest.spyOn(
      digitalTwin.gitlabInstance,
      'getPipelineStatus',
    );
    getPipelineStatusMock
      .mockResolvedValueOnce('running')
      .mockResolvedValue('success');

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineJobs')
      .mockResolvedValue([]);

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
});
