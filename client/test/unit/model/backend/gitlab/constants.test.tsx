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
import * as reactRedux from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = reactRedux.useSelector as unknown as jest.Mock;

describe('Constants', () => {
  describe('hooks', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseSelector.mockImplementation((selector) =>
        selector({ settings: DEFAULT_SETTINGS }),
      );
    });

    const testHook = (
      hook: () => string,
      settingKey: keyof typeof DEFAULT_SETTINGS,
      customValue: string,
    ) => {
      it(`returns default ${settingKey}`, () => {
        const { result } = renderHook(() => hook());
        expect(result.current).toBe(DEFAULT_SETTINGS[settingKey]);
      });

      it(`returns custom ${settingKey}`, () => {
        mockUseSelector.mockImplementationOnce((selector) =>
          selector({
            settings: {
              ...DEFAULT_SETTINGS,
              [settingKey]: customValue,
            },
          }),
        );

        const { result } = renderHook(() => hook());
        expect(result.current).toBe(customValue);
      });
    };

    describe('useRunnerTag', () =>
      testHook(useRunnerTag, 'RUNNER_TAG', 'custom-runner'));

    describe('useCommonLibraryProjectName', () =>
      testHook(
        useCommonLibraryProjectName,
        'COMMON_LIBRARY_PROJECT_NAME',
        'custom-lib',
      ));

    describe('useDTDirectory', () =>
      testHook(useDTDirectory, 'DT_DIRECTORY', '/custom/dir'));

    describe('useGroupName', () =>
      testHook(useGroupName, 'GROUP_NAME', 'Custom Group'));
  });
  describe('getters', () => {
    test('return correct values from global store', () => {
      store.dispatch(setGroupName('group'));
      store.dispatch(setCommonLibraryProjectName('common'));
      store.dispatch(setDTDirectory('DT'));
      store.dispatch(setRunnerTag('runner'));

      expect(getGroupName()).toBe('group');
      expect(getCommonLibraryProjectName()).toBe('common');
      expect(getDTDirectory()).toBe('DT');
      expect(getRunnerTag()).toBe('runner');
    });
  });
});
