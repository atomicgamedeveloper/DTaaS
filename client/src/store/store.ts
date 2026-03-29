import { Middleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import { setStorageService } from 'model/backend/state/executionHistory.slice';
import indexedDBService from 'database/executionHistoryDB';
import measurementDBService from 'database/measurementHistoryDB';
import { rootReducer } from 'store/storeTypes';
import {
  setRunnerTag,
  setBranchName,
  setSecondaryRunnerTag,
} from 'store/settings.slice';
import { setSettingsStore } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { setBenchmarkStore } from 'model/backend/gitlab/measure/benchmark.execution';
import { setExecutionHistoryDB } from 'model/backend/util/digitalTwinExecutionHistory';
import { setPipelineExecutionDB } from 'model/backend/util/digitalTwinPipelineExecution';
import { setMeasurementDB } from 'model/backend/gitlab/measure/benchmark.runner';

setStorageService(indexedDBService);

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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'digitalTwin/setDigitalTwin',
          'assets/setAsset',
          'assets/deleteAsset',
        ],
        ignoredPaths: ['digitalTwin.digitalTwin', 'assets.items'], // Suppress non-serializable check for GitlabAPI
      },
    }).concat(settingsPersistMiddleware),
});

// Dependency injection: wire store and services into model modules
setSettingsStore(store);
setBenchmarkStore({
  getState: store.getState,
  restoreRunnerTag: (v) => store.dispatch(setRunnerTag(v)),
  restoreBranchName: (v) => store.dispatch(setBranchName(v)),
  restoreSecondaryRunnerTag: (v) => store.dispatch(setSecondaryRunnerTag(v)),
});
setExecutionHistoryDB(indexedDBService);
setPipelineExecutionDB(indexedDBService);
setMeasurementDB(measurementDBService);

export type { RootState } from 'store/storeTypes';

export default store;
