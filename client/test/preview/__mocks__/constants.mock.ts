/**
 * Mock for the constants getter functions
 * This centralizes all the mocks for the constants module in one place
 * so they can be imported consistently across tests
 */

const DEFAULT_MOCK_VALUES = {
  GROUP_NAME: 'DTaaS',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_ID: 3,
  RUNNER_TAG: 'linux',
};

/**
 * Create a mock for the model/backend/gitlab/constants module
 * @param overrides - Override specific values from the defaults
 * @returns The mock object that can be used with jest.mock
 */
const createConstantsMock = (overrides = {}) => {
  const mockValues = { ...DEFAULT_MOCK_VALUES, ...overrides };

  return {
    // Non-hook getter functions
    getGroupName: jest.fn().mockReturnValue(mockValues.GROUP_NAME),
    getDTDirectory: jest.fn().mockReturnValue(mockValues.DT_DIRECTORY),
    getCommonLibraryProjectId: jest
      .fn()
      .mockReturnValue(mockValues.COMMON_LIBRARY_PROJECT_ID),
    getRunnerTag: jest.fn().mockReturnValue(mockValues.RUNNER_TAG),

    // Hook versions if needed
    useGroupName: jest.fn().mockReturnValue(mockValues.GROUP_NAME),
    useDTDirectory: jest.fn().mockReturnValue(mockValues.DT_DIRECTORY),
    useCommonLibraryProjectId: jest
      .fn()
      .mockReturnValue(mockValues.COMMON_LIBRARY_PROJECT_ID),
    useRunnerTag: jest.fn().mockReturnValue(mockValues.RUNNER_TAG),
  };
};

export default createConstantsMock;
