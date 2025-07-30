import {
  getGroupName,
  getCommonLibraryProjectName,
  getDTDirectory,
  getRunnerTag,
  useGroupName,
  useCommonLibraryProjectName,
  useDTDirectory,
  useRunnerTag,
} from 'model/backend/gitlab/constants';
import store from 'store/store';
import {
  setGroupName,
  setCommonLibraryProjectName,
  setDTDirectory,
  setRunnerTag,
  DEFAULT_SETTINGS,
} from 'store/settings.slice';
import { renderHook } from '@testing-library/react';
import { useSelector } from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

function updateSettingsMock(
  key: keyof typeof DEFAULT_SETTINGS,
  value: string,
) {
  mockedUseSelector.mockImplementationOnce((selector) =>
    selector({
      settings: {
        ...DEFAULT_SETTINGS,
        [key]: value,
      },
    }),
  );
}

const mockedUseSelector = useSelector as unknown as jest.Mock;

describe('Constants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSelector.mockImplementation((selector) =>
      selector({ settings: DEFAULT_SETTINGS }),
    );
  });

  it('useGroupName returns custom', () => {
    updateSettingsMock('GROUP_NAME', 'testGroup1');
    updateSettingsMock('COMMON_LIBRARY_PROJECT_NAME', 'testCommon1');
    updateSettingsMock('DT_DIRECTORY', 'testDT1');
    updateSettingsMock('RUNNER_TAG', 'testRunner1');

    const groupName = renderHook(() => useGroupName()).result.current;
    const commonLib = renderHook(() => useCommonLibraryProjectName()).result.current;
    const dtDir = renderHook(() => useDTDirectory()).result.current;
    const runnerTag = renderHook(() => useRunnerTag()).result.current;

    expect(groupName).toBe('testGroup1');
    expect(commonLib).toBe('testCommon1');
    expect(dtDir).toBe('testDT1');
    expect(runnerTag).toBe('testRunner1');
  });

  it('return correct default values from hooks', () => {
    const groupName = renderHook(() => useGroupName()).result.current;
    const commonLib = renderHook(() => useCommonLibraryProjectName()).result.current;
    const dtDir = renderHook(() => useDTDirectory()).result.current;
    const runnerTag = renderHook(() => useRunnerTag()).result.current;

    expect(groupName).toBe(DEFAULT_SETTINGS.GROUP_NAME);
    expect(commonLib).toBe(DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_NAME);
    expect(dtDir).toBe(DEFAULT_SETTINGS.DT_DIRECTORY);
    expect(runnerTag).toBe(DEFAULT_SETTINGS.RUNNER_TAG);
  });


  it('return correct values from global store', () => {
    store.dispatch(setGroupName('testGroup'));
    store.dispatch(setCommonLibraryProjectName('testCommon'));
    store.dispatch(setDTDirectory('testDT'));
    store.dispatch(setRunnerTag('testRunner'));

    expect(getGroupName()).toBe('testGroup');
    expect(getCommonLibraryProjectName()).toBe('testCommon');
    expect(getDTDirectory()).toBe('testDT');
    expect(getRunnerTag()).toBe('testRunner');
  });
});
