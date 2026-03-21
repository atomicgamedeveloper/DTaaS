import { Middleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import { setStorageService } from 'model/backend/state/executionHistory.slice';
import indexedDBService from 'database/executionHistoryDB';
import measurementDBService from 'database/measurementHistoryDB';
import { rootReducer } from 'store/storeTypes';
import { setSettingsStore } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { setBenchmarkStore } from 'model/backend/gitlab/measure/benchmark.execution';
import { setPipelineStore } from 'model/backend/gitlab/measure/benchmark.pipeline';
import { setExecutionHistoryDB } from 'model/backend/util/digitalTwinExecutionHistory';
import { setPipelineExecutionDB } from 'model/backend/util/digitalTwinPipelineExecution';
import { setMeasurementDB } from 'model/backend/gitlab/measure/benchmark.runner';

setStorageService(indexedDBService);

const loadSettings = () => {
  const serializedSettings = localStorage.getItem('settings');
  return serializedSettings ? JSON.parse(serializedSettings) : undefined;
};

const loadBenchmark = () => {
  const serializedBenchmark = localStorage.getItem('benchmark');
  return serializedBenchmark ? JSON.parse(serializedBenchmark) : undefined;
};

const settingsPersistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  if (
    action &&
    typeof action === 'object' &&
    'type' in action &&
    typeof action.type === 'string' &&
    (action.type.startsWith('settings/') ||
      action.type.startsWith('benchmark/'))
  ) {
    const state = store.getState();
    if (action.type.startsWith('settings/')) {
      localStorage.setItem('settings', JSON.stringify(state.settings));
    }
    if (action.type.startsWith('benchmark/')) {
      localStorage.setItem('benchmark', JSON.stringify(state.benchmark));
    }
  }

  return result;
};

const store = configureStore({
  reducer: rootReducer,
  preloadedState: { settings: loadSettings(), benchmark: loadBenchmark() },
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
setBenchmarkStore(store);
setPipelineStore(store);
setExecutionHistoryDB(indexedDBService);
setPipelineExecutionDB(indexedDBService);
setMeasurementDB(measurementDBService);

export type { RootState } from 'store/storeTypes';

export default store;
