import { useSelector } from 'react-redux';
import { RootState } from 'store/store';

// The values below are managed in the settings tab, reading from the store
export const useGroupName = (): string => {
  // Reads GROUP_NAME from the Redux store.
  const GROUP_NAME = useSelector(
    (state: RootState) => state.settings.GROUP_NAME,
  );
  return GROUP_NAME;
};

export const useDTDirectory = (): string => {
  // Reads DT_DIRECTORY from the Redux store.
  const DT_DIRECTORY = useSelector(
    (state: RootState) => state.settings.DT_DIRECTORY,
  );
  return DT_DIRECTORY;
};

export const useCommonLibraryProjectName = (): string => {
  // Reads COMMON_LIBRARY_PROJECT_NAME from the Redux store.
  const COMMON_LIBRARY_PROJECT_NAME = useSelector(
    (state: RootState) => state.settings.COMMON_LIBRARY_PROJECT_NAME,
  );
  return COMMON_LIBRARY_PROJECT_NAME;
};

export const useRunnerTag = (): string => {
  // Reads RUNNER_TAG from the Redux store.
  const RUNNER_TAG = useSelector(
    (state: RootState) => state.settings.RUNNER_TAG,
  );
  return RUNNER_TAG;
};

export const useBranchName = (): string => {
  // Reads BRANCH_NAME from the Redux store.
  const BRANCH_NAME = useSelector(
    (state: RootState) => state.settings.BRANCH_NAME,
  );
  return BRANCH_NAME;
};
