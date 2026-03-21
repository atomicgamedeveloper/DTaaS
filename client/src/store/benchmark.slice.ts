// Persisted benchmark settings (trial count, secondary runner tag)
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const DEFAULT_BENCHMARK = {
  trials: 3,
  secondaryRunnerTag: 'windows',
  primaryDTName: 'hello-world',
  secondaryDTName: 'mass-spring-damper',
};

interface BenchmarkSliceState {
  trials: number;
  secondaryRunnerTag: string;
  primaryDTName: string;
  secondaryDTName: string;
}

export const loadInitialBenchmark = (): BenchmarkSliceState => {
  const saved = localStorage.getItem('benchmark');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') {
      return { ...DEFAULT_BENCHMARK, ...parsed };
    }
  }
  return { ...DEFAULT_BENCHMARK };
};

export const benchmarkSlice = createSlice({
  name: 'benchmark',
  initialState: loadInitialBenchmark(),
  reducers: {
    setTrials: (state, action: PayloadAction<number>) => {
      state.trials = action.payload;
    },
    setSecondaryRunnerTag: (state, action: PayloadAction<string>) => {
      state.secondaryRunnerTag = action.payload;
    },
    setPrimaryDTName: (state, action: PayloadAction<string>) => {
      state.primaryDTName = action.payload;
    },
    setSecondaryDTName: (state, action: PayloadAction<string>) => {
      state.secondaryDTName = action.payload;
    },
    resetBenchmarkDefaults: (state) => {
      Object.assign(state, DEFAULT_BENCHMARK);
    },
  },
});

export const {
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
  resetBenchmarkDefaults,
} = benchmarkSlice.actions;

export const benchmarkReducer = benchmarkSlice.reducer;
