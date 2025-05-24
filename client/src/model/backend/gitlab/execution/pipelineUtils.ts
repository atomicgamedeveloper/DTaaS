import { Dispatch, SetStateAction } from 'react';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import GitlabInstance from 'preview/util/gitlab';
import cleanLog from 'model/backend/gitlab/cleanLog';
import {
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import {
  updateExecutionLogs,
  updateExecutionStatus,
  setSelectedExecutionId,
} from 'model/backend/gitlab/state/executionHistory.slice';
import { JobLog } from './interfaces';

export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const startPipeline = async (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
): Promise<string | null> => {
  const pipelineId = await digitalTwin.execute();

  if (!pipelineId || !digitalTwin.currentExecutionId) {
    const executionStatusMessage = `Execution ${digitalTwin.lastExecutionStatus} for ${formatName(digitalTwin.DTName)}`;
    dispatch(
      showSnackbar({
        message: executionStatusMessage,
        severity: 'error',
      }),
    );
    return null;
  }

  const executionStatusMessage = `Execution started successfully for ${formatName(digitalTwin.DTName)}. Wait until completion for the logs...`;
  dispatch(
    showSnackbar({
      message: executionStatusMessage,
      severity: 'success',
    }),
  );

  dispatch(setSelectedExecutionId(digitalTwin.currentExecutionId));

  setLogButtonDisabled(false);

  return digitalTwin.currentExecutionId;
};

export const updatePipelineState = (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
) => {
  // For backward compatibility
  dispatch(
    setPipelineCompleted({
      assetName: digitalTwin.DTName,
      pipelineCompleted: false,
    }),
  );
  dispatch(
    setPipelineLoading({
      assetName: digitalTwin.DTName,
      pipelineLoading: true,
    }),
  );

  if (executionId) {
    dispatch(
      updateExecutionStatus({
        id: executionId,
        status: ExecutionStatus.RUNNING,
      }),
    );
  }
};

export const updatePipelineStateOnCompletion = async (
  digitalTwin: DigitalTwin,
  jobLogs: JobLog[],
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
  status: ExecutionStatus = ExecutionStatus.COMPLETED,
) => {
  // For backward compatibility
  dispatch(setJobLogs({ assetName: digitalTwin.DTName, jobLogs }));
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

  if (executionId) {
    await digitalTwin.updateExecutionLogs(executionId, jobLogs);
    await digitalTwin.updateExecutionStatus(executionId, status);

    dispatch(
      updateExecutionLogs({
        id: executionId,
        logs: jobLogs,
      }),
    );
    dispatch(
      updateExecutionStatus({
        id: executionId,
        status,
      }),
    );
  }

  setButtonText('Start');
};

export const updatePipelineStateOnStop = (
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
) => {
  setButtonText('Start');

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

  if (executionId) {
    dispatch(
      updateExecutionStatus({
        id: executionId,
        status: ExecutionStatus.CANCELED,
      }),
    );

    digitalTwin.updateExecutionStatus(executionId, ExecutionStatus.CANCELED);
  }
};

export const fetchJobLogs = async (
  gitlabInstance: GitlabInstance,
  pipelineId: number,
): Promise<JobLog[]> => {
  const { projectId } = gitlabInstance;
  if (!projectId) {
    return [];
  }

  const jobs = await gitlabInstance.getPipelineJobs(projectId, pipelineId);

  const logPromises = jobs.map(async (job) => {
    if (!job || typeof job.id === 'undefined') {
      return { jobName: 'Unknown', log: 'Job ID not available' };
    }

    try {
      let log = await gitlabInstance.getJobTrace(projectId, job.id);

      if (typeof log === 'string') {
        log = cleanLog(log);
      } else {
        log = '';
      }

      return {
        jobName: typeof job.name === 'string' ? job.name : 'Unknown',
        log,
      };
    } catch (_e) {
      return {
        jobName: typeof job.name === 'string' ? job.name : 'Unknown',
        log: 'Error fetching log content',
      };
    }
  });
  return (await Promise.all(logPromises)).reverse();
};

export const fetchLogsAndUpdateExecution = async (
  digitalTwin: DigitalTwin,
  pipelineId: number,
  executionId: string,
  status: ExecutionStatus,
  dispatch: ReturnType<typeof useDispatch>,
): Promise<boolean> => {
  try {
    const jobLogs = await fetchJobLogs(digitalTwin.gitlabInstance, pipelineId);

    if (
      jobLogs.length === 0 ||
      jobLogs.every((log) => !log.log || log.log.trim() === '')
    ) {
      return false;
    }

    await digitalTwin.updateExecutionLogs(executionId, jobLogs);

    await digitalTwin.updateExecutionStatus(executionId, status);

    dispatch(
      updateExecutionLogs({
        id: executionId,
        logs: jobLogs,
      }),
    );

    dispatch(
      updateExecutionStatus({
        id: executionId,
        status,
      }),
    );

    return true;
  } catch (_error) {
    return false;
  }
};
