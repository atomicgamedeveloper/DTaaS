import { useSelector } from 'react-redux';
import store, { RootState } from 'store/store';

// The values below are managed in the settings tab, reading from the store
// util/gitlab.ts
export const useGroupName = (): string => {
  // Reads GROUP_NAME from the Redux store.
  const GROUP_NAME = useSelector(
    (state: RootState) => state.settings.GROUP_NAME,
  );
  return GROUP_NAME;
};

// Non-hook version for use in classes and other non-React contexts
export const getGroupName = (): string => store.getState().settings.GROUP_NAME;

export const useDTDirectory = (): string => {
  // Reads DT_DIRECTORY from the Redux store.
  const DT_DIRECTORY = useSelector(
    (state: RootState) => state.settings.DT_DIRECTORY,
  );
  return DT_DIRECTORY;
};

// Non-hook version for use in classes and other non-React contexts
export const getDTDirectory = (): string =>
  store.getState().settings.DT_DIRECTORY;

export const useCommonLibraryProjectId = (): number => {
  // Reads COMMON_LIBRARY_PROJECT_ID from the Redux store.
  const COMMON_LIBRARY_PROJECT_ID = useSelector(
    (state: RootState) => state.settings.COMMON_LIBRARY_PROJECT_ID,
  );
  return COMMON_LIBRARY_PROJECT_ID;
};

// Non-hook version for use in classes and other non-React contexts
export const getCommonLibraryProjectId = (): number =>
  store.getState().settings.COMMON_LIBRARY_PROJECT_ID;

// util/digitalTwin.ts
export const useRunnerTag = (): string => {
  // Reads RUNNER_TAG from the Redux store.
  const RUNNER_TAG = useSelector(
    (state: RootState) => state.settings.RUNNER_TAG,
  );
  return RUNNER_TAG;
};

// Non-hook version for use in classes and other non-React contexts
export const getRunnerTag = (): string => store.getState().settings.RUNNER_TAG;

export const COMMON_LIBRARY_PROJECT_NAME = 'common';

export enum AssetTypes {
  'Functions' = 'functions',
  'Models' = 'models',
  'Tools' = 'tools',
  'Data' = 'data',
  'Digital Twins' = 'digital_twins',
  'Digital Twin' = 'digital_twin',
}

// Digital Twin
export const RUNNER_TAG = 'linux';

// Pipeline
export const MAX_EXECUTION_TIME = 10 * 60 * 1000;
export const PIPELINE_POLL_INTERVAL = 5000; // 5 seconds - for pipeline status checks
export const defaultFiles = [
  { name: 'description.md', type: 'description' },
  { name: 'README.md', type: 'description' },
  { name: '.gitlab-ci.yml', type: 'config' },
];

export enum FileType {
  DESCRIPTION = 'description',
  CONFIGURATION = 'configuration',
  LIFECYCLE = 'lifecycle',
}
