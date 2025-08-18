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

export const useCommonLibraryProjectName = (): string => {
  // Reads COMMON_LIBRARY_PROJECT_NAME from the Redux store.
  const COMMON_LIBRARY_PROJECT_NAME = useSelector(
    (state: RootState) => state.settings.COMMON_LIBRARY_PROJECT_NAME,
  );
  return COMMON_LIBRARY_PROJECT_NAME;
};

// Non-hook version for use in classes and other non-React contexts
export const getCommonLibraryProjectName = (): string =>
  store.getState().settings.COMMON_LIBRARY_PROJECT_NAME;

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