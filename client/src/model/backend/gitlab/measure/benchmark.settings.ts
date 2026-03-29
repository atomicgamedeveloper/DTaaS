/**
 * Store wiring, frozen settings snapshot, and config accessors.
 *
 * Reads persisted settings from store/settings.slice.ts and exposes a
 * Configuration object consumed by benchmark.execution.ts and
 * benchmark.pipeline.ts.
 */
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import type { BenchmarkStore, Configuration } from './benchmark.types';

export type { BenchmarkStore } from './benchmark.types';

let _store: BenchmarkStore | null = null;

export function setBenchmarkStore(store: BenchmarkStore): void {
  _store = store;
}

export function getStore(): BenchmarkStore {
  if (!_store)
    throw new Error(
      'Benchmark store not initialized. Call setBenchmarkStore() first.',
    );
  return _store;
}

/** @deprecated Use getDefaultConfig() for current Redux values */
export const DEFAULT_CONFIG: Configuration = {
  'Branch name': BRANCH_NAME,
  'Group name': GROUP_NAME,
  'Common Library project name': COMMON_LIBRARY_PROJECT_NAME,
  'DT directory': DT_DIRECTORY,
  'Runner tag': RUNNER_TAG,
};

// Snapshot of settings captured when the benchmark starts.
// While non-null, benchmarkConfig and getDefaultConfig() return these frozen values
// so that mid-benchmark settings changes don't affect running executions.
let frozenSettings: {
  RUNNER_TAG: string;
  BRANCH_NAME: string;
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_NAME: string;
  SECONDARY_RUNNER_TAG: string;
  TRIALS: number;
  PRIMARY_DT_NAME: string;
  SECONDARY_DT_NAME: string;
} | null = null;

export const benchmarkConfig = {
  get trials(): number {
    return frozenSettings?.TRIALS ?? getStore().getState().settings.trials;
  },
  get primaryRunnerTag(): string {
    return (
      frozenSettings?.RUNNER_TAG ?? getStore().getState().settings.RUNNER_TAG
    );
  },
  get secondaryRunnerTag(): string {
    return (
      frozenSettings?.SECONDARY_RUNNER_TAG ??
      getStore().getState().settings.secondaryRunnerTag
    );
  },
  get primaryDTName(): string {
    return (
      frozenSettings?.PRIMARY_DT_NAME ??
      getStore().getState().settings.primaryDTName
    );
  },
  get secondaryDTName(): string {
    return (
      frozenSettings?.SECONDARY_DT_NAME ??
      getStore().getState().settings.secondaryDTName
    );
  },
};

export function getDefaultConfig(): Configuration {
  if (frozenSettings) {
    return {
      'Branch name': frozenSettings.BRANCH_NAME,
      'Group name': frozenSettings.GROUP_NAME,
      'Common Library project name': frozenSettings.COMMON_LIBRARY_PROJECT_NAME,
      'DT directory': frozenSettings.DT_DIRECTORY,
      'Runner tag': frozenSettings.RUNNER_TAG,
    };
  }
  const state = getStore().getState().settings;
  return {
    'Branch name': state.BRANCH_NAME,
    'Group name': state.GROUP_NAME,
    'Common Library project name': state.COMMON_LIBRARY_PROJECT_NAME,
    'DT directory': state.DT_DIRECTORY,
    'Runner tag': state.RUNNER_TAG,
  };
}

/** Returns the captured runner tags so the caller can store them on benchmarkState. */
export function saveOriginalSettings(): {
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
} | null {
  if (frozenSettings !== null) return null;
  const state = getStore().getState();
  frozenSettings = {
    RUNNER_TAG: state.settings.RUNNER_TAG,
    BRANCH_NAME: state.settings.BRANCH_NAME,
    GROUP_NAME: state.settings.GROUP_NAME,
    DT_DIRECTORY: state.settings.DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME: state.settings.COMMON_LIBRARY_PROJECT_NAME,
    SECONDARY_RUNNER_TAG: state.settings.secondaryRunnerTag,
    TRIALS: state.settings.trials,
    PRIMARY_DT_NAME: state.settings.primaryDTName,
    SECONDARY_DT_NAME: state.settings.secondaryDTName,
  };
  return {
    primaryRunnerTag: state.settings.RUNNER_TAG,
    secondaryRunnerTag: state.settings.secondaryRunnerTag,
  };
}

export function restoreOriginalSettings(): void {
  if (frozenSettings === null) return;
  const current = getStore().getState();
  // Only restore fields the user hasn't changed since the benchmark started.
  if (current.settings.RUNNER_TAG === frozenSettings.RUNNER_TAG) {
    getStore().restoreRunnerTag(frozenSettings.RUNNER_TAG);
  }
  if (current.settings.BRANCH_NAME === frozenSettings.BRANCH_NAME) {
    getStore().restoreBranchName(frozenSettings.BRANCH_NAME);
  }
  if (
    current.settings.secondaryRunnerTag === frozenSettings.SECONDARY_RUNNER_TAG
  ) {
    getStore().restoreSecondaryRunnerTag(frozenSettings.SECONDARY_RUNNER_TAG);
  }
  frozenSettings = null;
}
