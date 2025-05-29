import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import executionHistorySlice from 'model/backend/gitlab/state/executionHistory.slice';
import digitalTwinSlice from 'model/backend/gitlab/state/digitalTwin.slice';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import assetsSlice from 'preview/store/assets.slice';
import fileSlice from 'preview/store/file.slice';
import cartSlice from 'preview/store/cart.slice';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';

const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  assets: assetsSlice,
  digitalTwin: digitalTwinSlice,
  snackbar: snackbarSlice,
  files: fileSlice,
  cart: cartSlice,
  libraryConfigFiles: libraryConfigFilesSlice,
  executionHistory: executionHistorySlice,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Asset actions that contain LibraryAsset class instances
          'assets/setAssets',
          'assets/setAsset',
          'assets/deleteAsset',
        ],
        ignoredPaths: [
          // Ignore the entire assets state as it contains LibraryAsset class instances
          'assets.items',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
