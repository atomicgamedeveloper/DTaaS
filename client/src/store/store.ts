import { combineReducers } from 'redux';
import { configureStore, Middleware } from '@reduxjs/toolkit';
import digitalTwinSlice from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import assetsSlice from 'preview/store/assets.slice';
import fileSlice from 'preview/store/file.slice';
import cartSlice from 'preview/store/cart.slice';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';
import settingsSlice from './settings.slice';

const loadSettings = () => {
  try {
    const serializedSettings = localStorage.getItem('settings');
    return serializedSettings ? JSON.parse(serializedSettings) : undefined;
  } catch (_error) {
    return undefined;
  }
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
        ignoredActions: ['digitalTwin/setDigitalTwin', 'assets/setAsset'],
        ignoredPaths: ['digitalTwin.digitalTwin', 'assets.items'], // Suppress non-serializable check for GitlabAPI
      },
    }).concat(settingsPersistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
