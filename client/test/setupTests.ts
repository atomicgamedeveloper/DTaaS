import { TextEncoder, TextDecoder } from 'util';

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
