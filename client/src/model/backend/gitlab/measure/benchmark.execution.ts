import store from 'store/store';
import {
  Configuration,
  ExecutionResult,
  ActivePipeline,
  TimedTask,
  BenchmarkSetters,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
} from 'model/backend/gitlab/digitalTwinConfig/constants';

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
  _componentSetters: null as BenchmarkSetters | null,
};

export function attachSetters(setters: BenchmarkSetters): void {
  benchmarkState._componentSetters = setters;
}

export function detachSetters(): void {
  benchmarkState._componentSetters = null;
}

export function wrapSetters(): BenchmarkSetters {
  return {
    setIsRunning: (v: boolean) => {
      benchmarkState.isRunning = v;
      benchmarkState._componentSetters?.setIsRunning(v);
    },
    setCurrentExecutions: (v: ExecutionResult[]) => {
      benchmarkState._componentSetters?.setCurrentExecutions(v);
    },
    setCurrentTaskIndex: (v: number | null) => {
      benchmarkState.currentTaskIndexUI = v;
      benchmarkState._componentSetters?.setCurrentTaskIndex(v);
    },
    setResults: (v: React.SetStateAction<TimedTask[]>) => {
      if (typeof v === 'function') {
        benchmarkState.results = v(benchmarkState.results ?? []);
      } else {
        benchmarkState.results = v;
      }
      benchmarkState._componentSetters?.setResults(v);
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
