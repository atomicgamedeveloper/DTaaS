import { TextEncoder, TextDecoder } from 'node:util';
import { setSettingsStore } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { DEFAULT_SETTINGS, DEFAULT_MEASUREMENT } from 'store/settings.slice';

Object.defineProperty(globalThis, 'TextEncoder', {
  value: TextEncoder,
  writable: true,
});

Object.defineProperty(globalThis, 'TextDecoder', {
  value: TextDecoder,
  writable: true,
});

// jsdom doesn't implement scrollIntoView; stub it so component tests pass.
Element.prototype.scrollIntoView ??= () => {};

// Provide a minimal globalThis.env so modules that read env vars at
// import time (e.g. init.ts calling getAuthority()) don't crash.
globalThis.env ??= {} as typeof globalThis.env;
globalThis.env.REACT_APP_AUTH_AUTHORITY ??= 'https://gitlab.example.com/';

// Initialize the settings store so non-hook getters (getGroupName, getBranchName, etc.)
// work in tests without requiring the full Redux store.
setSettingsStore({
  getState: () =>
    ({ settings: { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT } }) as never,
});
