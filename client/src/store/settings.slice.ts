import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
} from 'model/backend/gitlab/digitalTwinConfig/constants';

// Filled out from model/backend/gitlab/digitalTwinConfig/constants.ts
export const DEFAULT_SETTINGS = {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
};

interface SettingsState {
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_NAME: string;
  RUNNER_TAG: string;
  BRANCH_NAME: string;
}

export const saveSettingsToLocalStorage = (settings: SettingsState) => {
  localStorage.setItem('settings', JSON.stringify(settings));
};

export const loadInitialSettings = (): SettingsState => {
  const settings = localStorage.getItem('settings');
  if (settings) {
    const parsedSettings = JSON.parse(settings);
    if (parsedSettings && typeof parsedSettings === 'object') {
      return {
        ...DEFAULT_SETTINGS,
        ...parsedSettings,
      };
    }
  }
  return { ...DEFAULT_SETTINGS };
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadInitialSettings(),
  reducers: {
    setGroupName: (state, action: PayloadAction<string>) => {
      state.GROUP_NAME = action.payload;
      saveSettingsToLocalStorage({ ...state });
    },
    setDTDirectory: (state, action: PayloadAction<string>) => {
      state.DT_DIRECTORY = action.payload;
      saveSettingsToLocalStorage({ ...state });
    },
    setCommonLibraryProjectName: (state, action: PayloadAction<string>) => {
      state.COMMON_LIBRARY_PROJECT_NAME = action.payload;
      saveSettingsToLocalStorage({ ...state });
    },
    setRunnerTag: (state, action: PayloadAction<string>) => {
      state.RUNNER_TAG = action.payload;
      saveSettingsToLocalStorage({ ...state });
    },
    setBranchName: (state, action: PayloadAction<string>) => {
      state.BRANCH_NAME = action.payload;
      saveSettingsToLocalStorage({ ...state });
    },
    resetToDefaults: (state) => {
      Object.assign(state, DEFAULT_SETTINGS);
      saveSettingsToLocalStorage({ ...DEFAULT_SETTINGS });
    },
  },
});

export const {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  setBranchName,
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;
