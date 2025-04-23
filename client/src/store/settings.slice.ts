import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const DEFAULT_SETTINGS = {
  GROUP_NAME: 'DTaaS',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_ID: 3,
  RUNNER_TAG: 'linux',
};

interface SettingsState {
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_ID: number;
  RUNNER_TAG: string;
}

const saveSettingsToLocalStorage = (settings: SettingsState) => {
  try {
    localStorage.setItem('dtaas_settings', JSON.stringify(settings));
  } catch (_error) {
    /* empty */
  }
};

const loadInitialSettings = (): SettingsState => {
  try {
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
  } catch (_error) {
    /* empty */
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
    setCommonLibraryProjectId: (state, action: PayloadAction<number>) => {
      state.COMMON_LIBRARY_PROJECT_ID = action.payload;
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
  setCommonLibraryProjectId,
  setRunnerTag,
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;
