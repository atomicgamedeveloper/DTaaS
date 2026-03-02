import store from 'store/store';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import type { Configuration as ExternalConfiguration } from 'model/backend/gitlab/execution/executionTypes';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import { taskDefinitions } from 'model/backend/gitlab/measure/tasks';

export type Configuration = ExternalConfiguration;

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
  iterations: number;
  completedTasks: number;
  completedTrials: number;
  totalTasks: number;
  onStart: () => void;
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

export { default as benchmarkConfig } from 'model/backend/gitlab/measure/benchmarkConfig';

export const DEFAULT_CONFIG: Configuration = {
  'Branch name': BRANCH_NAME,
  'Group name': GROUP_NAME,
  'Common Library project name': COMMON_LIBRARY_PROJECT_NAME,
  'DT directory': DT_DIRECTORY,
  'Runner tag': RUNNER_TAG,
};

export const benchmarkState = {
  shouldStopPipelines: false,
  activePipelines: [] as ActivePipeline[],
  executionResults: [] as ExecutionResult[],
  currentMeasurementPromise: null as Promise<void> | null,
  currentTrialMinPipelineId: null as number | null,
  currentTrialExecutionIndex: 0,

  isRunning: false,
  isRunningRef: { current: false } as { current: boolean },
  results: null as TimedTask[] | null,
  currentTaskIndexUI: null as number | null,
  componentSetters: null as BenchmarkSetters | null,
};

// Save the page's update functions so the runner can refresh what the user sees
export function attachSetters(setters: BenchmarkSetters): void {
  benchmarkState.componentSetters = setters;
}

// Forget the page's update functions when the user leaves the page
export function detachSetters(): void {
  benchmarkState.componentSetters = null;
}

// Wraps update functions so every change is saved in memory AND shown on screen.
// If the user navigated away, the screen update is skipped but the data is still saved.
export function wrapSetters(): BenchmarkSetters {
  return {
    setIsRunning: (v: boolean) => {
      benchmarkState.isRunning = v;
      benchmarkState.componentSetters?.setIsRunning(v);
    },
    setCurrentExecutions: (v: ExecutionResult[]) => {
      benchmarkState.componentSetters?.setCurrentExecutions(v);
    },
    setCurrentTaskIndex: (v: number | null) => {
      benchmarkState.currentTaskIndexUI = v;
      benchmarkState.componentSetters?.setCurrentTaskIndex(v);
    },
    setResults: (v: React.SetStateAction<TimedTask[]>) => {
      if (typeof v === 'function') {
        benchmarkState.results = v(benchmarkState.results ?? []);
      } else {
        benchmarkState.results = v;
      }
      benchmarkState.componentSetters?.setResults(v);
    },
  };
}

let originalSettings: {
  RUNNER_TAG: string;
  BRANCH_NAME: string;
} | null = null;

export function saveOriginalSettings(): void {
  if (originalSettings === null) {
    const state = store.getState();
    originalSettings = {
      RUNNER_TAG: state.settings.RUNNER_TAG,
      BRANCH_NAME: state.settings.BRANCH_NAME,
    };
  }
}

export function restoreOriginalSettings(): void {
  if (originalSettings !== null) {
    store.dispatch({
      type: 'settings/setRunnerTag',
      payload: originalSettings.RUNNER_TAG,
    });
    store.dispatch({
      type: 'settings/setBranchName',
      payload: originalSettings.BRANCH_NAME,
    });
    originalSettings = null;
  }
}

export const DEFAULT_TASK: TimedTask = {
  'Task Name': '',
  Description: '',
  Trials: [],
  'Time Start': undefined,
  'Time End': undefined,
  'Average Time (s)': undefined,
  Status: 'NOT_STARTED',
};

export const tasks: readonly TimedTask[] = taskDefinitions.map((def) => ({
  ...DEFAULT_TASK,
  'Task Name': def.name,
  Description: def.description,
  Executions: def.executions,
}));

export function resetTasks(): TimedTask[] {
  return tasks.map((task) => ({
    ...task,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'NOT_STARTED' as const,
  }));
}
