export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMEOUT = 'timeout',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface JobLog {
  jobName: string;
  log: string;
}

export interface DigitalTwinPipelineState {
  pipelineId: number | null;
  lastExecutionStatus: ExecutionStatus | null;
  jobLogs: JobLog[];
  pipelineLoading: boolean;
  pipelineCompleted: boolean;
}

export type Pipeline = {
  id: number;
  status: string;
};

export type TriggerToken = {
  token: string;
};
