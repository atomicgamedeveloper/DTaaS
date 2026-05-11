import { createSlice } from '@reduxjs/toolkit';

export interface EnvironmentState {
  AUTH_AUTHORITY: string;
}

export const loadInitialEnvironment = (): EnvironmentState => {
  const env =
    (globalThis as { env?: Record<string, string | undefined> }).env ?? {};
  return {
    AUTH_AUTHORITY: env.REACT_APP_AUTH_AUTHORITY ?? '',
  };
};

const environmentSlice = createSlice({
  name: 'environment',
  initialState: loadInitialEnvironment(),
  reducers: {},
});

export default environmentSlice.reducer;
