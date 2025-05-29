import {
  DTExecutionResult,
  ExecutionStatus,
} from 'model/backend/gitlab/types/executionHistory';
import { DigitalTwinData } from 'model/backend/gitlab/state/digitalTwin.slice';
import { createDigitalTwinFromData } from 'route/digitaltwins/execution/digitalTwinAdapter';
import indexedDBService from 'database/digitalTwins';

class ExecutionStatusService {
  static async checkRunningExecutions(
    runningExecutions: DTExecutionResult[],
    digitalTwinsData: { [key: string]: DigitalTwinData },
  ): Promise<DTExecutionResult[]> {
    if (runningExecutions.length === 0) {
      return [];
    }

    const { fetchJobLogs } = await import(
      'model/backend/gitlab/execution/logFetching'
    );
    const { mapGitlabStatusToExecutionStatus } = await import(
      'model/backend/gitlab/execution/statusChecking'
    );

    const updatedExecutions: DTExecutionResult[] = [];

    await Promise.all(
      runningExecutions.map(async (execution) => {
        try {
          const digitalTwinData = digitalTwinsData[execution.dtName];
          if (!digitalTwinData || !digitalTwinData.gitlabProjectId) {
            return;
          }

          const digitalTwin = await createDigitalTwinFromData(
            digitalTwinData,
            execution.dtName,
          );

          const parentPipelineStatus =
            await digitalTwin.gitlabInstance.getPipelineStatus(
              digitalTwin.gitlabInstance.projectId!,
              execution.pipelineId,
            );

          if (parentPipelineStatus === 'failed') {
            const updatedExecution = {
              ...execution,
              status: ExecutionStatus.FAILED,
            };
            await indexedDBService.update(updatedExecution);
            updatedExecutions.push(updatedExecution);
            return;
          }

          if (parentPipelineStatus !== 'success') {
            return;
          }

          const childPipelineId = execution.pipelineId + 1;
          try {
            const childPipelineStatus =
              await digitalTwin.gitlabInstance.getPipelineStatus(
                digitalTwin.gitlabInstance.projectId!,
                childPipelineId,
              );

            if (
              childPipelineStatus === 'success' ||
              childPipelineStatus === 'failed'
            ) {
              const newStatus =
                mapGitlabStatusToExecutionStatus(childPipelineStatus);

              const jobLogs = await fetchJobLogs(
                digitalTwin.gitlabInstance,
                childPipelineId,
              );

              const updatedExecution = {
                ...execution,
                status: newStatus,
                jobLogs,
              };

              await indexedDBService.update(updatedExecution);
              updatedExecutions.push(updatedExecution);
            }
          } catch (_error) {
            // Child pipeline might not exist yet or other error - silently ignore
          }
        } catch (_error) {
          // Silently ignore errors for individual executions
        }
      }),
    );

    return updatedExecutions;
  }
}
export default ExecutionStatusService;
