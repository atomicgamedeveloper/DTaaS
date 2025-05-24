/**
 * Represents the status of a Digital Twin execution
 */
export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMEOUT = 'timeout',
}

/**
 * Represents a job log entry
 */
export interface JobLog {
  jobName: string;
  log: string;
}

/**
 * Represents an execution history entry
 */
export interface ExecutionHistoryEntry {
  id: string; // Unique identifier for the execution
  dtName: string; // Name of the Digital Twin
  pipelineId: number; // GitLab pipeline ID
  timestamp: number; // Timestamp when the execution was started
  status: ExecutionStatus; // Current status of the execution
  jobLogs: JobLog[]; // Logs from the execution
}

/**
 * Represents the schema for the IndexedDB database
 */
export interface IndexedDBSchema {
  executionHistory: {
    key: string; // id
    value: ExecutionHistoryEntry;
    indexes: {
      dtName: string;
      timestamp: number;
    };
  };
}

/**
 * Database configuration
 */
export const DB_CONFIG = {
  name: 'DTaaS',
  version: 1,
  stores: {
    executionHistory: {
      keyPath: 'id',
      indexes: [
        { name: 'dtName', keyPath: 'dtName' },
        { name: 'timestamp', keyPath: 'timestamp' },
      ],
    },
  },
};
