import { Dispatch, SetStateAction } from 'react';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'preview/store/snackbar.slice';
import {
  startPipeline,
  updatePipelineState,
  updatePipelineStateOnStop,
} from './pipelineUtils';
import { startPipelineStatusCheck } from './pipelineChecks';

export const handleButtonClick = (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  if (buttonText === 'Start') {
    handleStart(
      buttonText,
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    handleStop(digitalTwin, setButtonText, dispatch);
  }
};

export const handleStart = async (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string, 
) => {
  if (buttonText === 'Start') {
    setButtonText('Stop');

    updatePipelineState(digitalTwin, dispatch);

    const newExecutionId = await startPipeline(
      digitalTwin,
      dispatch,
      setLogButtonDisabled,
    );

    if (newExecutionId) {
      const params = {
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        executionId: newExecutionId,
      };
      startPipelineStatusCheck(params);
    }
  } else {
    setButtonText('Start');

    if (executionId) {
      await handleStop(digitalTwin, setButtonText, dispatch, executionId);
    } else {
      await handleStop(digitalTwin, setButtonText, dispatch);
    }
  }
};

export const handleStop = async (
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string, 
) => {
  try {
    await stopPipelines(digitalTwin, executionId);
    dispatch(
      showSnackbar({
        message: `Execution stopped successfully for ${formatName(
          digitalTwin.DTName,
        )}`,
        severity: 'success',
      }),
    );
  } catch (_error) {
    dispatch(
      showSnackbar({
        message: `Execution stop failed for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      }),
    );
  } finally {
    updatePipelineStateOnStop(
      digitalTwin,
      setButtonText,
      dispatch,
      executionId,
    );
  }
};

export const stopPipelines = async (
  digitalTwin: DigitalTwin,
  executionId?: string, 
) => {
  if (digitalTwin.gitlabInstance.projectId) {
    if (executionId) {
      await digitalTwin.stop(
        digitalTwin.gitlabInstance.projectId,
        'parentPipeline',
        executionId,
      );
      await digitalTwin.stop(
        digitalTwin.gitlabInstance.projectId,
        'childPipeline',
        executionId,
      );
    } else if (digitalTwin.pipelineId) {
      // For backward compatibility, stop the current execution
      await digitalTwin.stop(
        digitalTwin.gitlabInstance.projectId,
        'parentPipeline',
      );
      await digitalTwin.stop(
        digitalTwin.gitlabInstance.projectId,
        'childPipeline',
      );
    }
  }
};
