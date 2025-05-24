import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import indexedDBService from 'database/digitalTwins';
import {
  fetchJobLogs,
  updatePipelineStateOnCompletion,
} from 'model/backend/gitlab/execution/pipelineUtils';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { MAX_EXECUTION_TIME } from 'model/backend/gitlab/constants';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import { updateExecutionStatus } from 'model/backend/gitlab/state/executionHistory.slice';
import {
  setPipelineCompleted,
  setPipelineLoading,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import { PipelineStatusParams } from './interfaces';

export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const hasTimedOut = (startTime: number) =>
  Date.now() - startTime > MAX_EXECUTION_TIME;

export const handleTimeout = async (
  DTName: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
) => {
  dispatch(
    showSnackbar({
      message: `Execution timed out for ${formatName(DTName)}`,
      severity: 'error',
    }),
  );

  if (executionId) {
    const execution =
      await indexedDBService.getExecutionHistoryById(executionId);
    if (execution) {
      execution.status = ExecutionStatus.TIMEOUT;
      await indexedDBService.updateExecutionHistory(execution);
    }

    dispatch(
      updateExecutionStatus({
        id: executionId,
        status: ExecutionStatus.TIMEOUT,
      }),
    );
  }

  setButtonText('Start');
  setLogButtonDisabled(false);
};

export const startPipelineStatusCheck = (params: PipelineStatusParams) => {
  const startTime = Date.now();
  checkParentPipelineStatus({ ...params, startTime });
};

export const checkParentPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
  startTime,
  executionId,
}: PipelineStatusParams & {
  startTime: number;
}) => {
  const pipelineId = executionId
    ? (await digitalTwin.getExecutionHistoryById(executionId))?.pipelineId ||
      digitalTwin.pipelineId!
    : digitalTwin.pipelineId!;

  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    pipelineId,
  );

  if (pipelineStatus === 'success') {
    await checkChildPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      executionId,
    });
  } else if (pipelineStatus === 'failed') {
    const jobLogs = await fetchJobLogs(digitalTwin.gitlabInstance, pipelineId);
    await updatePipelineStateOnCompletion(
      digitalTwin,
      jobLogs,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
      ExecutionStatus.FAILED,
    );
  } else if (hasTimedOut(startTime)) {
    handleTimeout(
      digitalTwin.DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );
  } else {
    await delay(5000);
    checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      executionId,
    });
  }
};

export const handlePipelineCompletion = async (
  pipelineId: number,
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  pipelineStatus: 'success' | 'failed',
  executionId?: string,
) => {
  const status =
    pipelineStatus === 'success'
      ? ExecutionStatus.COMPLETED
      : ExecutionStatus.FAILED;

  if (!executionId) {
    // For backward compatibility
    const jobLogs = await fetchJobLogs(digitalTwin.gitlabInstance, pipelineId);
    await updatePipelineStateOnCompletion(
      digitalTwin,
      jobLogs,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      undefined,
      status,
    );
  } else {
    // For concurrent executions, use the new helper function
    const { fetchLogsAndUpdateExecution } = await import('./pipelineUtils');

    // Fetch logs and update execution
    const logsUpdated = await fetchLogsAndUpdateExecution(
      digitalTwin,
      pipelineId,
      executionId,
      status,
      dispatch,
    );

    if (!logsUpdated) {
      await delay(5000);
      await handlePipelineCompletion(
        pipelineId,
        digitalTwin,
        setButtonText,
        setLogButtonDisabled,
        dispatch,
        pipelineStatus,
        executionId,
      );
      return;
    }

    setButtonText('Start');
    setLogButtonDisabled(false);

    // For backward compatibility
    dispatch(
      setPipelineCompleted({
        assetName: digitalTwin.DTName,
        pipelineCompleted: true,
      }),
    );
    dispatch(
      setPipelineLoading({
        assetName: digitalTwin.DTName,
        pipelineLoading: false,
      }),
    );
  }

  if (pipelineStatus === 'failed') {
    dispatch(
      showSnackbar({
        message: `Execution failed for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      }),
    );
  } else {
    dispatch(
      showSnackbar({
        message: `Execution completed successfully for ${formatName(digitalTwin.DTName)}`,
        severity: 'success',
      }),
    );
  }
};

export const checkChildPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
  startTime,
  executionId,
}: PipelineStatusParams & {
  startTime: number;
}) => {
  let pipelineId: number;

  if (executionId) {
    const execution = await digitalTwin.getExecutionHistoryById(executionId);
    pipelineId = execution
      ? execution.pipelineId + 1
      : digitalTwin.pipelineId! + 1;
  } else {
    pipelineId = digitalTwin.pipelineId! + 1;
  }

  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    pipelineId,
  );

  if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
    await handlePipelineCompletion(
      pipelineId,
      digitalTwin,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      pipelineStatus,
      executionId,
    );
  } else if (hasTimedOut(startTime)) {
    handleTimeout(
      digitalTwin.DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );
  } else {
    await delay(5000);
    await checkChildPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      executionId,
    });
  }
};
