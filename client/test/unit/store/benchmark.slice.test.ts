import settingsReducer, {
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
  resetToDefaults,
  DEFAULT_SETTINGS,
  DEFAULT_BENCHMARK,
  loadInitialSettings,
} from 'store/settings.slice';

describe('benchmark settings in settings.slice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadInitialSettings – benchmark fields', () => {
    it('returns benchmark defaults when localStorage is empty', () => {
      const result = loadInitialSettings();
      expect(result.trials).toBe(DEFAULT_BENCHMARK.trials);
      expect(result.secondaryRunnerTag).toBe(
        DEFAULT_BENCHMARK.secondaryRunnerTag,
      );
    });

  });

  describe('benchmark reducers', () => {
    const initialState = { ...DEFAULT_SETTINGS, ...DEFAULT_BENCHMARK };

    it('setTrials updates the trial count', () => {
      const result = settingsReducer(initialState, setTrials(7));
      expect(result.trials).toBe(7);
    });

    it('setSecondaryRunnerTag updates the secondary runner tag', () => {
      const result = settingsReducer(
        initialState,
        setSecondaryRunnerTag('macos'),
      );
      expect(result.secondaryRunnerTag).toBe('macos');
    });

    it('setPrimaryDTName updates the primary DT name', () => {
      const result = settingsReducer(initialState, setPrimaryDTName('my-dt'));
      expect(result.primaryDTName).toBe('my-dt');
    });

    it('setSecondaryDTName updates the secondary DT name', () => {
      const result = settingsReducer(
        initialState,
        setSecondaryDTName('other-dt'),
      );
      expect(result.secondaryDTName).toBe('other-dt');
    });

    it('resetToDefaults restores all default values including benchmark', () => {
      const modified = {
        ...initialState,
        trials: 10,
        secondaryRunnerTag: 'custom',
        GROUP_NAME: 'changed',
      };
      const result = settingsReducer(modified, resetToDefaults());
      expect(result.trials).toBe(DEFAULT_BENCHMARK.trials);
      expect(result.secondaryRunnerTag).toBe(
        DEFAULT_BENCHMARK.secondaryRunnerTag,
      );
      expect(result.GROUP_NAME).toBe(DEFAULT_SETTINGS.GROUP_NAME);
    });
  });
});
