/**
 * Runtime state, setters, session persistence, and task helpers.
 *
 * Central module for mutable benchmark state. benchmark.runner.ts drives
 * execution; benchmark.pipeline.ts handles individual pipeline operations.
 */
import { taskDefinitions } from 'model/backend/gitlab/measure/tasks';
import type {
  BenchmarkSetters,
  ActivePipeline,
  ExecutionResult,
  TimedTask,
  Status,
} from './benchmark.types';
import {
  saveOriginalSettings as _saveOriginalSettings,
  restoreOriginalSettings as _restoreOriginalSettings,
} from './benchmark.settings';

export type {
  BenchmarkSetters,
  BenchmarkStoreState,
  ActivePipeline,
  ExecutionResult,
  TimedTask,
  Status,
  Configuration,
  TrialError,
  TimeStamp,
  Trial,
  TaskFunction,
  Execution,
  BenchmarkStore,
} from './benchmark.types';
export {
  setBenchmarkStore,
  getStore,
  DEFAULT_CONFIG,
  benchmarkConfig,
  getDefaultConfig,
} from './benchmark.settings';

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
  originalPrimaryRunnerTag: null as string | null,
  originalSecondaryRunnerTag: null as string | null,
  restoredAfterRefresh: false,
};

// Restore results from sessionStorage so completed progress survives a page refresh.
// Running tasks are marked STOPPED because the execution context (promises, pipelines) is lost.
try {
  const saved = sessionStorage.getItem('benchmarkResults');
  if (saved) {
    const DATE_KEYS = new Set(['Time Start', 'Time End']);
    const parsed: TimedTask[] = JSON.parse(saved, (key, value) =>
      DATE_KEYS.has(key) && typeof value === 'string' ? new Date(value) : value,
    );
    const tasksByName = new Map(
      taskDefinitions.map((def) => [def.name, def.executions]),
    );
    const isActive = (s: Status) => s === 'RUNNING' || s === 'PENDING';
    const markStopped = (s: Status): Status => (isActive(s) ? 'STOPPED' : s);
    const hadRunningTasks = parsed.some((task) => isActive(task.Status));
    benchmarkState.results = parsed.map((task) => ({
      ...task,
      Status: markStopped(task.Status),
      Trials: task.Trials.map((trial) => ({
        ...trial,
        Status: markStopped(trial.Status),
      })),
      Executions: tasksByName.has(task['Task Name'])
        ? tasksByName.get(task['Task Name'])
        : undefined,
    }));
    benchmarkState.isRunning = false;
    benchmarkState.restoredAfterRefresh = hadRunningTasks;
  }
} catch {
  // ignore parse errors — start fresh
}

// Save the page's update functions so the runner can refresh what the user sees
export function attachSetters(setters: BenchmarkSetters): void {
  benchmarkState.componentSetters = setters;
}

// Forget the page's update functions when the user leaves the page
export function detachSetters(): void {
  benchmarkState.componentSetters = null;
}

const RESULTS_STORAGE_KEY = 'benchmarkResults';

function persistResults(): void {
  try {
    if (!benchmarkState.results) return;
    const serializable = benchmarkState.results.map(
      ({ Executions: _Executions, ...rest }) => rest,
    );
    sessionStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // ignore quota errors
  }
}

export function clearPersistedResults(): void {
  sessionStorage.removeItem(RESULTS_STORAGE_KEY);
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
    setResults: (v: TimedTask[] | ((prev: TimedTask[]) => TimedTask[])) => {
      if (typeof v === 'function') {
        benchmarkState.results = v(benchmarkState.results ?? []);
      } else {
        benchmarkState.results = v;
      }
      benchmarkState.componentSetters?.setResults(v);
      persistResults();
    },
  };
}

export function saveOriginalSettings(): void {
  const tags = _saveOriginalSettings();
  if (tags) {
    benchmarkState.originalPrimaryRunnerTag = tags.primaryRunnerTag;
    benchmarkState.originalSecondaryRunnerTag = tags.secondaryRunnerTag;
  }
}

export function restoreOriginalSettings(): void {
  _restoreOriginalSettings();
  benchmarkState.originalPrimaryRunnerTag = null;
  benchmarkState.originalSecondaryRunnerTag = null;
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

let tasks: readonly TimedTask[] | undefined;
export function getTasks(): readonly TimedTask[] {
  tasks ??= taskDefinitions.map((def) => ({
    ...DEFAULT_TASK,
    'Task Name': def.name,
    Description: def.description,
    Executions: def.executions,
  }));
  return tasks;
}

export function resetTasks(): TimedTask[] {
  return getTasks().map((task) => ({
    ...task,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'NOT_STARTED' as const,
  }));
}
