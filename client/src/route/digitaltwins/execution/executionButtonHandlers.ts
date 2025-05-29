import { Dispatch, SetStateAction } from 'react';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { fetchExecutionHistory } from 'model/backend/gitlab/state/executionHistory.slice';
import { RootState } from 'store/store';
import {
  startPipeline,
  updatePipelineState,
  updatePipelineStateOnStop,
} from './executionUIHandlers';
import { startPipelineStatusCheck } from './executionStatusManager';

export type PipelineHandlerDispatch = ThunkDispatch<
  RootState,
  unknown,
  Action<string>
>;

/**
 * Main handler for execution button clicks (Start/Stop)
 * @param buttonText Current button text ('Start' or 'Stop')
 * @param setButtonText React state setter for button text
 * @param digitalTwin Digital twin instance
 * @param setLogButtonDisabled React state setter for log button
 * @param dispatch Redux dispatch function
 */
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

/**
 * Handles starting a digital twin execution
 * @param buttonText Current button text
 * @param setButtonText React state setter for button text
 * @param digitalTwin Digital twin instance
 * @param setLogButtonDisabled React state setter for log button
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 */
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

/**
 * Handles stopping a digital twin execution
 * @param digitalTwin Digital twin instance
 * @param setButtonText React state setter for button text
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 */
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

/**
 * Stops both parent and child pipelines for a digital twin
 * @param digitalTwin Digital twin instance
 * @param executionId Optional execution ID for concurrent executions
 */
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
