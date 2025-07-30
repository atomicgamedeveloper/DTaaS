import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const DEFAULT_SETTINGS = {
  GROUP_NAME: 'DTaaS',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_NAME: 'common',
  RUNNER_TAG: 'linux',
};

interface SettingsState {
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_NAME: string;
  RUNNER_TAG: string;
}

const saveSettingsToLocalStorage = (settings: SettingsState) => {
  localStorage.setItem('dtaas_settings', JSON.stringify(settings));
};

const loadInitialSettings = (): SettingsState => {
  const settings = localStorage.getItem('dtaas_settings');
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
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;
