import DigitalTwin from 'preview/util/digitalTwin';
import FileHandler from 'preview/util/fileHandler';
import DTAssets from 'preview/util/DTAssets';
import LibraryManager from 'preview/util/libraryManager';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import 'test/preview/__mocks__/constants.mock';
import { DigitalTwinData } from 'model/backend/gitlab/state/digitalTwin.slice';

export const mockAppURL = 'https://example.com/';
export const mockURLforDT = 'https://example.com/URL_DT';
export const mockURLforLIB = 'https://example.com/URL_LIB';
export const mockURLforWorkbench = 'https://example.com/URL_WORKBENCH';
export const mockClientID = 'mockedClientID';
export const mockAuthority = 'https://example.com/AUTHORITY';
export const mockRedirectURI = 'https://example.com/REDIRECT_URI';
export const mockLogoutRedirectURI = 'https://example.com/LOGOUT_REDIRECT_URI';
export const mockGitLabScopes = 'example scopes';

export type mockUserType = {
  access_token: string;
  profile: {
    groups: string[] | string | undefined;
    picture: string | undefined;
    preferred_username: string | undefined;
    profile: string | undefined;
  };
};

export const mockUser: mockUserType = {
  access_token: 'example_token',
  profile: {
    groups: 'group-one',
    picture: 'pfp.jpg',
    preferred_username: 'username',
    profile: 'example/username',
  },
};

export type mockAuthStateType = {
  user?: mockUserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeNavigator?: string;
  error?: Error;
};

export const mockAuthState: mockAuthStateType = {
  isAuthenticated: true,
  isLoading: false,
  user: mockUser,
};

export type mockGitlabInstanceType = {
  projectId: number;
  triggerToken: string;
  getPipelineStatus: jest.Mock;
};

export const mockFileHandler: FileHandler = {
  name: 'mockedName',
  backend: mockBackendInstance,
  createFile: jest.fn(),
  updateFile: jest.fn(),
  deleteDT: jest.fn(),
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getLibraryFileNames: jest.fn(),
  getLibraryConfigFileNames: jest.fn(),
  getFolders: jest.fn(),
};

export const mockDTAssets: DTAssets = {
  DTName: 'mockedDTName',
  backend: mockBackendInstance,
  fileHandler: mockFileHandler,
  createFiles: jest.fn(),
  getFilesFromAsset: jest.fn(),
  updateFileContent: jest.fn(),
  updateLibraryFileContent: jest.fn(),
  appendTriggerToPipeline: jest.fn(),
  removeTriggerFromPipeline: jest.fn(),
  delete: jest.fn(),
  getFileContent: jest.fn(),
  getLibraryFileContent: jest.fn(),
  getFileNames: jest.fn(),
  getLibraryConfigFileNames: jest.fn(),
  getFolders: jest.fn(),
};

export const mockLibraryManager: LibraryManager = {
  assetName: 'mockedAssetName',
  backend: mockBackendInstance,
  fileHandler: mockFileHandler,
  getFileContent: jest.fn(),
  getFileNames: jest.fn(),
};

export const mockDigitalTwin: DigitalTwin = {
  DTName: 'mockedDTName',
  description: 'mockedDescription',
  fullDescription: 'mockedFullDescription',
  backend: mockBackendInstance,
  DTAssets: mockDTAssets,
  pipelineId: 1,
  lastExecutionStatus: 'mockedStatus',
  jobLogs: [{ jobName: 'job1', log: 'log1' }],
  pipelineLoading: false,
  pipelineCompleted: false,
  descriptionFiles: ['descriptionFile'],
  configFiles: ['configFile'],
  lifecycleFiles: ['lifecycleFile'],
  assetFiles: [
    { assetPath: 'assetPath', fileNames: ['assetFileName1', 'assetFileName2'] },
  ],
  currentExecutionId: 'test-execution-id',

  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  triggerPipeline: jest.fn(),
  execute: jest.fn().mockResolvedValue(123),
  stop: jest.fn(),
  create: jest.fn().mockResolvedValue('Success'),
  delete: jest.fn(),
  getDescriptionFiles: jest.fn().mockResolvedValue(['descriptionFile']),
  getLifecycleFiles: jest.fn().mockResolvedValue(['lifecycleFile']),
  getConfigFiles: jest.fn().mockResolvedValue(['configFile']),
  prepareAllAssetFiles: jest.fn(),
  getAssetFiles: jest.fn(),
  updateExecutionStatus: jest.fn(),
  updateExecutionLogs: jest.fn(),
  getExecutionHistoryById: jest.fn(),
  getExecutionHistoryByDTName: jest.fn(),
} as unknown as DigitalTwin;

export const mockLibraryAsset = {
  name: 'Asset 1',
  path: 'path',
  type: 'Digital Twins',
  isPrivate: true,
  backend: mockBackendInstance,
  description: 'description',
  fullDescription: 'fullDescription',
  libraryManager: mockLibraryManager,
  configFiles: [],

  getDescription: jest.fn(),
  getFullDescription: jest.fn(),
  getConfigFiles: jest.fn(),
};

// Mock for execution history entries
export const mockExecutionHistoryEntry = {
  id: 'test-execution-id',
  dtName: 'mockedDTName',
  pipelineId: 123,
  timestamp: Date.now(),
  status: 'RUNNING',
  jobLogs: [],
};

// Mock for indexedDBService
export const mockIndexedDBService = {
  init: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockImplementation((entry) => Promise.resolve(entry.id)),
  update: jest.fn().mockResolvedValue(undefined),
  getByDTName: jest.fn().mockResolvedValue([]),
  getAll: jest.fn().mockResolvedValue([]),
  getById: jest.fn().mockImplementation((id) =>
    Promise.resolve({
      ...mockExecutionHistoryEntry,
      id,
    }),
  ),
  delete: jest.fn().mockResolvedValue(undefined),
  deleteByDTName: jest.fn().mockResolvedValue(undefined),
};

// Helper function to reset all indexedDBService mocks
export const resetIndexedDBServiceMocks = () => {
  Object.values(mockIndexedDBService).forEach((mock) => {
    if (typeof mock === 'function' && typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
};

/**
 * Creates mock DigitalTwinData for Redux state following the adapter pattern
 * This creates clean serializable data for Redux, not DigitalTwin instances
 */
export const createMockDigitalTwinData = (dtName: string): DigitalTwinData => ({
  DTName: dtName,
  description: 'Test Digital Twin Description',
  jobLogs: [],
  pipelineCompleted: false,
  pipelineLoading: false,
  pipelineId: undefined,
  currentExecutionId: undefined,
  lastExecutionStatus: undefined,
  // Store only serializable data
  gitlabProjectId: 123,
});

// Mock sessionStorage for tests
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn((key: string) => {
      const mockValues: { [key: string]: string } = {
        username: 'testuser',
        access_token: 'test_token',
      };
      return mockValues[key] || null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Mock the initDigitalTwin function
jest.mock('preview/util/init', () => ({
  ...jest.requireActual('preview/util/init'),
  initDigitalTwin: jest.fn().mockResolvedValue(mockDigitalTwin),
  fetchLibraryAssets: jest.fn(),
  fetchDigitalTwins: jest.fn(),
}));
