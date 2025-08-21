import store from 'store/store';

// The values below are managed in the settings tab, reading from the store

// Front end hooks
export {
  useGroupName,
  useDTDirectory,
  useCommonLibraryProjectName,
  useRunnerTag,
  useBranchName,
} from 'util/settingsUseHooks';

// Non-hook version for use in classes and other non-React contexts
export const getGroupName = (): string => store.getState().settings.GROUP_NAME;
export const getDTDirectory = (): string =>
  store.getState().settings.DT_DIRECTORY;
export const getCommonLibraryProjectName = (): string =>
  store.getState().settings.COMMON_LIBRARY_PROJECT_NAME;
export const getRunnerTag = (): string => store.getState().settings.RUNNER_TAG;
export const getBranchName = (): string =>
  store.getState().settings.BRANCH_NAME;
