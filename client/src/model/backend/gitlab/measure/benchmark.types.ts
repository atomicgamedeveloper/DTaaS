export type Status =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'RUNNING'
  | 'FAILURE'
  | 'SUCCESS'
  | 'STOPPED';

export type Configuration = {
  'Branch name': string;
  'Group name': string;
  'Common Library project name': string;
  'DT directory': string;
  'Runner tag': string;
};

export type ExecutionResult = {
  dtName: string;
  pipelineId: number | null;
  status: string;
  config: Configuration;
};

export type ActivePipeline = {
  backend: import('model/backend/interfaces/backendInterfaces').BackendInterface;
  pipelineId: number;
  dtName: string;
  config: Configuration;
  status: string;
  phase: 'parent' | 'child';
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

export type TimedTask = {
  'Task Name': string;
  Description: string;
  Trials: Trial[];
  'Time Start': TimeStamp;
  'Time End': TimeStamp;
  'Average Time (s)': number | undefined;
  Status: Status;
  Function: TaskFunction;
  ExpectedTrials?: number;
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
  alternateRunnerTag: string;
  completedTasks: number;
  totalTasks: number;
  onIterationsChange: (value: number) => void;
  onAlternateRunnerTagChange: (value: string) => void;
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
