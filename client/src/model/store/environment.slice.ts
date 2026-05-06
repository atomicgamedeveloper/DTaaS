import { createSlice } from '@reduxjs/toolkit';

export interface EnvironmentState {
  REACT_APP_AUTH_AUTHORITY: string;
}

export const loadInitialEnvironment = (): EnvironmentState => {
  const env = (globalThis as { env?: Partial<EnvironmentState> }).env ?? {};
  return {
    REACT_APP_AUTH_AUTHORITY: env.REACT_APP_AUTH_AUTHORITY ?? '',
  };
};

const environmentSlice = createSlice({
  name: 'environment',
  initialState: loadInitialEnvironment(),
  reducers: {},
});

export default environmentSlice.reducer;
