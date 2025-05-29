export type Timestamp = number;
export type ExecutionId = string;
export type DTName = string;
export type PipelineId = number;
export type JobName = string;
export type LogContent = string;

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMEOUT = 'timeout',
}

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
