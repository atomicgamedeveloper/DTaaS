import { Dispatch, SetStateAction } from 'react';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { fetchExecutionHistory } from 'model/backend/gitlab/state/executionHistory.slice';
import {
  startPipeline,
  updatePipelineState,
  updatePipelineStateOnStop,
} from './pipelineUtils';
import { startPipelineStatusCheck } from './pipelineChecks';
import { PipelineHandlerDispatch } from './interfaces';

export const handleButtonClick = (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: PipelineHandlerDispatch,
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
  dispatch: PipelineHandlerDispatch,
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
      dispatch(fetchExecutionHistory(digitalTwin.DTName));

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
  dispatch: PipelineHandlerDispatch,
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
      //  backward compatibility, stop the current execution
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
