import {
  benchmarkReducer,
  setTrials,
  setSecondaryRunnerTag,
  resetBenchmarkDefaults,
  DEFAULT_BENCHMARK,
  loadInitialBenchmark,
} from 'store/benchmark.slice';

describe('benchmark.slice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadInitialBenchmark', () => {
    it('returns defaults when localStorage is empty', () => {
      expect(loadInitialBenchmark()).toEqual(DEFAULT_BENCHMARK);
    });

    it('returns saved values merged with defaults from localStorage', () => {
      localStorage.setItem(
        'benchmark',
        JSON.stringify({ trials: 5, secondaryRunnerTag: 'macos' }),
      );
      expect(loadInitialBenchmark()).toEqual({
        trials: 5,
        secondaryRunnerTag: 'macos',
      });
    });

    it('merges partial saved values with defaults', () => {
      localStorage.setItem('benchmark', JSON.stringify({ trials: 10 }));
      expect(loadInitialBenchmark()).toEqual({
        trials: 10,
        secondaryRunnerTag: DEFAULT_BENCHMARK.secondaryRunnerTag,
      });
    });

    it('returns defaults when localStorage contains invalid JSON object', () => {
      localStorage.setItem('benchmark', JSON.stringify(null));
      expect(loadInitialBenchmark()).toEqual(DEFAULT_BENCHMARK);
    });
  });

  describe('reducers', () => {
    const initialState = { ...DEFAULT_BENCHMARK };

    it('setTrials updates the trial count', () => {
      const result = benchmarkReducer(initialState, setTrials(7));
      expect(result.trials).toBe(7);
    });

    it('setSecondaryRunnerTag updates the secondary runner tag', () => {
      const result = benchmarkReducer(
        initialState,
        setSecondaryRunnerTag('macos'),
      );
      expect(result.secondaryRunnerTag).toBe('macos');
    });

    it('resetBenchmarkDefaults restores default values', () => {
      const modified = { trials: 10, secondaryRunnerTag: 'custom' };
      const result = benchmarkReducer(modified, resetBenchmarkDefaults());
      expect(result).toEqual(DEFAULT_BENCHMARK);
    });
  });
});
