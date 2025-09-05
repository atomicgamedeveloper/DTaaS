import store from 'store/store';

/**
 * Non-hook getters for settings stored in the Redux store.
 *
 * - Default values are defined in ./constants.ts
 * - Hook variants are in util/settingsUseHooks.ts
 * - Settings can be overridden by the user in the Settings tab
 */
export const getGroupName = (): string => store.getState().settings.GROUP_NAME;
export const getDTDirectory = (): string =>
  store.getState().settings.DT_DIRECTORY;
export const getCommonLibraryProjectName = (): string =>
  store.getState().settings.COMMON_LIBRARY_PROJECT_NAME;
export const getRunnerTag = (): string => store.getState().settings.RUNNER_TAG;
export const getBranchName = (): string =>
  store.getState().settings.BRANCH_NAME;
