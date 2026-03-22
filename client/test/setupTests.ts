import { TextEncoder, TextDecoder } from 'node:util';
import { setSettingsStore } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { DEFAULT_SETTINGS } from 'store/settings.slice';
import { DEFAULT_BENCHMARK } from 'store/benchmark.slice';

Object.defineProperty(globalThis, 'TextEncoder', {
  value: TextEncoder,
  writable: true,
});

Object.defineProperty(globalThis, 'TextDecoder', {
  value: TextDecoder,
  writable: true,
});

// Provide a minimal globalThis.env so modules that read env vars at
// import time (e.g. init.ts calling getAuthority()) don't crash.
globalThis.env ??= {} as typeof globalThis.env;
globalThis.env.REACT_APP_AUTH_AUTHORITY ??= 'https://gitlab.example.com/';

// Initialize the settings store so non-hook getters (getGroupName, getBranchName, etc.)
// work in tests without requiring the full Redux store.
setSettingsStore({
  getState: () =>
    ({ settings: DEFAULT_SETTINGS, benchmark: DEFAULT_BENCHMARK }) as never,
});
