import reducer, {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  resetToDefaults,
  DEFAULT_SETTINGS,
} from 'store/settings.slice';

describe('settingsSlice', () => {
  const initialState = { ...DEFAULT_SETTINGS };

  beforeEach(() => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('should handle setGroupName', () => {
    const action = setGroupName('testGroup');
    const state = reducer(initialState, action);
    expect(state.GROUP_NAME).toBe('testGroup');
  });

  it('should handle setDTDirectory', () => {
    const action = setDTDirectory('testDTDirectory');
    const state = reducer(initialState, action);
    expect(state.DT_DIRECTORY).toBe('testDTDirectory');
  });

  it('should handle setCommonLibraryProjectName', () => {
    const action = setCommonLibraryProjectName('testCommonLibraryProjectName');
    const state = reducer(initialState, action);
    expect(state.COMMON_LIBRARY_PROJECT_NAME).toBe(
      'testCommonLibraryProjectName',
    );
  });

  it('should handle setRunnerTag', () => {
    const action = setRunnerTag('testRunnerTag');
    const state = reducer(initialState, action);
    expect(state.RUNNER_TAG).toBe('testRunnerTag');
  });

  it('should handle resetToDefaults', () => {
    const modified = {
      GROUP_NAME: 'testGroup',
      DT_DIRECTORY: 'testDTDirectory',
      COMMON_LIBRARY_PROJECT_NAME: 'testCommonLibraryProjectName',
      RUNNER_TAG: 'testRunnerTag',
    };
    const state = reducer(modified, resetToDefaults());
    expect(state).toEqual(DEFAULT_SETTINGS);
  });
});
