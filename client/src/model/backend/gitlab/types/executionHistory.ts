import { ExecutionStatus } from 'model/backend/interfaces/execution';

export type Timestamp = number;
export type ExecutionId = string;
export type DTName = string;
export type PipelineId = number;
export type JobName = string;
export type LogContent = string;

export interface JobLog {
  jobName: JobName;
  log: LogContent;
}

export interface DTExecutionResult {
  id: ExecutionId;
  dtName: DTName;
  pipelineId: PipelineId;
  timestamp: Timestamp;
  status: ExecutionStatus;
  jobLogs: JobLog[];
}

export type ExecutionHistoryEntry = DTExecutionResult;
