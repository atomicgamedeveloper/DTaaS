import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import type { Configuration } from 'model/backend/gitlab/execution/executionTypes';

export type { Configuration } from 'model/backend/gitlab/execution/executionTypes';

export type Status =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'RUNNING'
  | 'FAILURE'
  | 'SUCCESS'
  | 'STOPPED';

export type ExecutionResult = {
  dtName: string;
  pipelineId: number | null;
  status: string;
  config: Configuration;
  executionIndex?: number;
};

export type ActivePipeline = {
  backend: BackendInterface;
  pipelineId: number;
  dtName: string;
  config: Configuration;
  status: string;
  phase: 'parent' | 'child';
  executionIndex?: number;
};

export type TrialError = { message: string; error: Error } | undefined;

export type TimeStamp = Date | undefined;

export type Trial = {
  'Time Start': TimeStamp;
  'Time End': TimeStamp;
  Execution: ExecutionResult[];
  Status: Status;
  Error: TrialError;
};

export type TaskFunction = (
  runDigitalTwin: (
    name: string,
    config?: Partial<Configuration>,
  ) => Promise<ExecutionResult>,
) => Promise<ExecutionResult[]>;

export type Execution = {
  dtName: string;
  config: Partial<Configuration>;
};

export type TimedTask = {
  'Task Name': string;
  Description: string;
  Trials: Trial[];
  'Time Start': TimeStamp;
  'Time End': TimeStamp;
  'Average Time (s)': number | undefined;
  Status: Status;
  ExpectedTrials?: number;
  Executions?: () => Execution[];
};

export type BenchmarkSetters = {
  setIsRunning: (v: boolean) => void;
  setCurrentExecutions: (v: ExecutionResult[]) => void;
  setCurrentTaskIndex: (v: number | null) => void;
  setResults: React.Dispatch<React.SetStateAction<TimedTask[]>>;
};

export interface BenchmarkPageHeaderProps {
  isRunning: boolean;
  hasStarted: boolean;
  hasStopped: boolean;
  iterations: number;
  completedTasks: number;
  completedTrials: number;
  totalTasks: number;
  onStart: () => void;
  onContinue: () => void;
  onRestart: () => void;
  onStop: () => void;
}

export interface CompletionSummaryProps {
  results: TimedTask[];
  isRunning: boolean;
  hasStarted: boolean;
}

export interface ExecutionCardProps {
  execution: ExecutionResult;
}

export interface TrialCardProps {
  trial: Trial;
  trialIndex: number;
}
