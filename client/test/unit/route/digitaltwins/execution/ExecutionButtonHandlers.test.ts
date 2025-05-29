import * as PipelineHandlers from 'route/digitaltwins/execution/executionButtonHandlers';
import * as PipelineUtils from 'route/digitaltwins/execution/executionUIHandlers';
import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { PipelineHandlerDispatch } from 'route/digitaltwins/execution/executionButtonHandlers';

jest.mock('route/digitaltwins/execution/executionStatusManager', () => ({
  startPipelineStatusCheck: jest.fn(),
}));

describe('ExecutionButtonHandlers', () => {
  const setButtonText = jest.fn();
  const digitalTwin = mockDigitalTwin;
  const setLogButtonDisabled = jest.fn();
  const dispatch: PipelineHandlerDispatch = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles button click when button text is Start', async () => {
    const handleStart = jest.spyOn(PipelineHandlers, 'handleStart');
    await PipelineHandlers.handleButtonClick(
      'Start',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(handleStart).toHaveBeenCalled();

    handleStart.mockRestore();
  });

  it('handles button click when button text is Stop', async () => {
    const handleStop = jest.spyOn(PipelineHandlers, 'handleStop');
    await PipelineHandlers.handleButtonClick(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(handleStop).toHaveBeenCalled();

    handleStop.mockRestore();
  });

  it('handles start when button text is Start', async () => {
    const updatePipelineState = jest.spyOn(
      PipelineUtils,
      'updatePipelineState',
    );
    const startPipeline = jest.spyOn(PipelineUtils, 'startPipeline');

    const startPipelineStatusCheck =
      PipelineChecks.startPipelineStatusCheck as jest.Mock;

    startPipeline.mockResolvedValue('test-execution-id');

    await PipelineHandlers.handleStart(
      'Start',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(updatePipelineState).toHaveBeenCalledWith(digitalTwin, dispatch);
    expect(startPipeline).toHaveBeenCalledWith(
      digitalTwin,
      dispatch,
      setLogButtonDisabled,
    );
    expect(startPipelineStatusCheck).toHaveBeenCalled();

    updatePipelineState.mockRestore();
    startPipeline.mockRestore();
  });

  it('handles start when button text is Stop', async () => {
    await PipelineHandlers.handleStart(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('handles stop and catches error', async () => {
    const updatePipelineStateOnStop = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnStop',
    );

    const stopPipelines = jest
      .spyOn(PipelineHandlers, 'stopPipelines')
      .mockRejectedValueOnce(new Error('error'));
    await PipelineHandlers.handleStop(digitalTwin, setButtonText, dispatch);

    expect(dispatch).toHaveBeenCalled();
    expect(updatePipelineStateOnStop).toHaveBeenCalled();

    updatePipelineStateOnStop.mockRestore();
    stopPipelines.mockRestore();
  });

  it('handles stop with execution ID', async () => {
    const updatePipelineStateOnStop = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnStop',
    );

    const stopPipelines = jest.spyOn(PipelineHandlers, 'stopPipelines');
    const executionId = '123';
    await PipelineHandlers.handleStop(
      digitalTwin,
      setButtonText,
      dispatch,
      executionId,
    );

    expect(dispatch).toHaveBeenCalled();
    expect(updatePipelineStateOnStop).toHaveBeenCalled();
    expect(stopPipelines).toHaveBeenCalled();

    updatePipelineStateOnStop.mockRestore();
    stopPipelines.mockRestore();
  });
});
