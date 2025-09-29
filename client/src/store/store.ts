import { combineReducers, Middleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import executionHistorySlice from 'model/backend/gitlab/state/executionHistory.slice';
import digitalTwinSlice from 'model/backend/gitlab/state/digitalTwin.slice';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';
import snackbarSlice from 'store/snackbar.slice';
import assetsSlice from 'preview/store/assets.slice';
import fileSlice from 'preview/store/file.slice';
import cartSlice from 'preview/store/cart.slice';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';
import settingsSlice from './settings.slice';

const loadSettings = () => {
  const serializedSettings = localStorage.getItem('settings');
  return serializedSettings ? JSON.parse(serializedSettings) : undefined;
};

const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  assets: assetsSlice,
  digitalTwin: digitalTwinSlice,
  snackbar: snackbarSlice,
  files: fileSlice,
  cart: cartSlice,
  libraryConfigFiles: libraryConfigFilesSlice,
  settings: settingsSlice,
  executionHistory: executionHistorySlice,
});

const settingsPersistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  if (
    action &&
    typeof action === 'object' &&
    'type' in action &&
    typeof action.type === 'string' &&
    action.type.startsWith('settings/')
  ) {
    const state = store.getState();
    localStorage.setItem('settings', JSON.stringify(state.settings));
  }

  return result;
};

const store = configureStore({
  reducer: rootReducer,
  preloadedState: { settings: loadSettings() },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'digitalTwin/setDigitalTwin',
          'assets/setAsset',
          'assets/setAsset',
          'assets/deleteAsset',
        ],
        ignoredPaths: ['digitalTwin.digitalTwin', 'assets.items'], // Suppress non-serializable check for GitlabAPI
      },
    }).concat(settingsPersistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
