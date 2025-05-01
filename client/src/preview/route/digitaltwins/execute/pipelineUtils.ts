import { Dispatch, SetStateAction } from 'react';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import GitlabInstance from 'preview/util/gitlab';
import cleanLog from 'model/backend/gitlab/cleanLog';
import {
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'preview/store/digitalTwin.slice';
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { ExecutionStatus, JobLog } from 'preview/model/executionHistory';
import {
  updateExecutionLogs,
  updateExecutionStatus,
  setSelectedExecutionId,
} from 'preview/store/executionHistory.slice';

/**
 * Start a pipeline execution and create an execution history entry
 * @param digitalTwin The Digital Twin to execute
 * @param dispatch Redux dispatch function
 * @param setLogButtonDisabled Function to set the log button disabled state
 * @returns The execution ID
 */
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

/**
 * Update the pipeline state in the Redux store
 * @param digitalTwin The Digital Twin
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 */
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

/**
 * Update the pipeline state on completion
 * @param digitalTwin The Digital Twin
 * @param jobLogs The job logs
 * @param setButtonText Function to set the button text
 * @param setLogButtonDisabled Function to set the log button disabled state
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 * @param status Optional status for the execution
 */
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

/**
 * Update the pipeline state on stop
 * @param digitalTwin The Digital Twin
 * @param setButtonText Function to set the button text
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 */
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

/**
 * Fetch job logs from GitLab
 * @param gitlabInstance The GitLab instance
 * @param pipelineId The pipeline ID
 * @returns Promise that resolves with an array of job logs
 */
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
