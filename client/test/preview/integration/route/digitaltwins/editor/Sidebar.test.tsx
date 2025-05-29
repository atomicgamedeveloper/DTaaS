import { combineReducers, configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import Sidebar from 'preview/route/digitaltwins/editor/Sidebar';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import * as React from 'react';
import {
  mockGitlabInstance,
  mockLibraryAsset,
  createMockDigitalTwinData,
} from 'test/preview/__mocks__/global_mocks';
import DigitalTwin from 'preview/util/digitalTwin';
import * as SidebarFunctions from 'preview/route/digitaltwins/editor/sidebarFunctions';
import cartSlice, { addToCart } from 'preview/store/cart.slice';
import '@testing-library/jest-dom';

jest.mock('route/digitaltwins/execution/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'Asset 1',
    descriptionFiles: ['file1.md', 'file2.md'],
    configFiles: ['config1.json', 'config2.json'],
    lifecycleFiles: ['lifecycle1.txt', 'lifecycle2.txt'],
    getDescriptionFiles: jest.fn().mockResolvedValue(['file1.md', 'file2.md']),
    getConfigFiles: jest
      .fn()
      .mockResolvedValue(['config1.json', 'config2.json']),
    getLifecycleFiles: jest
      .fn()
      .mockResolvedValue(['lifecycle1.txt', 'lifecycle2.txt']),
    DTAssets: {
      getFileContent: jest.fn().mockResolvedValue('mock file content'),
    },
  }),
  extractDataFromDigitalTwin: jest.fn().mockReturnValue({
    DTName: 'Asset 1',
    description: 'Test Digital Twin Description',
    jobLogs: [],
    pipelineCompleted: false,
    pipelineLoading: false,
    pipelineId: undefined,
    currentExecutionId: undefined,
    lastExecutionStatus: undefined,
    gitlabInstance: undefined,
  }),
}));

// Mock the init module to prevent real GitLab initialization
jest.mock('preview/util/init', () => ({
  initDigitalTwin: jest.fn().mockResolvedValue({
    DTName: 'Asset 1',
    descriptionFiles: ['file1.md', 'file2.md'],
    configFiles: ['config1.json', 'config2.json'],
    lifecycleFiles: ['lifecycle1.txt', 'lifecycle2.txt'],
    getDescriptionFiles: jest.fn().mockResolvedValue(['file1.md', 'file2.md']),
    getConfigFiles: jest
      .fn()
      .mockResolvedValue(['config1.json', 'config2.json']),
    getLifecycleFiles: jest
      .fn()
      .mockResolvedValue(['lifecycle1.txt', 'lifecycle2.txt']),
    DTAssets: {
      getFileContent: jest.fn().mockResolvedValue('mock file content'),
    },
  }),
}));

jest.mock('preview/util/gitlab', () => ({
  GitlabInstance: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    getProjectId: jest.fn().mockResolvedValue(123),
    show: jest.fn().mockResolvedValue({}),
  })),
}));

describe('Sidebar', () => {
  const setFileNameMock = jest.fn();
  const setFileContentMock = jest.fn();
  const setFileTypeMock = jest.fn();
  const setFilePrivacyMock = jest.fn();
  const setIsLibraryFileMock = jest.fn();
  const setLibraryAssetPathMock = jest.fn();

  let store: ReturnType<typeof configureStore>;
  let digitalTwin: DigitalTwin;

  const setupDigitalTwin = (assetName: string) => {
    digitalTwin = new DigitalTwin(assetName, mockGitlabInstance);
    digitalTwin.descriptionFiles = ['file1.md', 'file2.md'];
    digitalTwin.configFiles = ['config1.json', 'config2.json'];
    digitalTwin.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];
    digitalTwin.getDescriptionFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.descriptionFiles);
    digitalTwin.getConfigFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.configFiles);
    digitalTwin.getLifecycleFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.lifecycleFiles);
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    store = configureStore({
      reducer: combineReducers({
        cart: cartSlice,
        digitalTwin: digitalTwinReducer,
        files: fileSlice,
      }),
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
    });

    store.dispatch(addToCart(mockLibraryAsset));

    const files = [
      { name: 'Asset 1', content: 'content1', isNew: false, isModified: false },
    ];
    store.dispatch(addOrUpdateFile(files[0]));

    setupDigitalTwin('Asset 1');

    const digitalTwinData = createMockDigitalTwinData('Asset 1');
    store.dispatch(
      setDigitalTwin({ assetName: 'Asset 1', digitalTwin: digitalTwinData }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls handleFileClick when a file type is clicked', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={'Asset 1'}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={'reconfigure'}
            fileName="file1.md"
            isLibraryFile={false}
          />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle')).toBeInTheDocument();
    });

    const descriptionCategory = screen.getByText('Description');
    await act(async () => {
      fireEvent.click(descriptionCategory);
    });

    expect(descriptionCategory).toBeInTheDocument();
  });

  it('calls handle addFileCkick when add file is clicked', async () => {
    const handleAddFileClick = jest.spyOn(
      SidebarFunctions,
      'handleAddFileClick',
    );

    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={'Asset 1'}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={'create'}
            fileName="file1.md"
            isLibraryFile={false}
          />
        </Provider>,
      );
    });

    const addFile = screen.getByText('Add new file');
    await act(async () => {
      fireEvent.click(addFile);
    });

    await waitFor(() => {
      expect(handleAddFileClick).toHaveBeenCalled();
    });
  });

  it('should open the sidebar dialog when a new file is added', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={'Asset 1'}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={'create'}
            fileName="file1.md"
            isLibraryFile={false}
          />
        </Provider>,
      );
    });

    const addFile = screen.getByText('Add new file');
    act(() => {
      fireEvent.click(addFile);
    });

    waitFor(() => {
      expect(screen.getByText('Enter the file name')).toBeInTheDocument();
    });
  });

  it('renders file section when no digital twin is selected', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={''}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={'create'}
            fileName="file1.md"
            isLibraryFile={false}
          />
        </Provider>,
      );
    });

    const lifecycle = screen.getByText('Lifecycle');
    act(() => {
      fireEvent.click(lifecycle);
    });

    waitFor(() => {
      expect(screen.getByText('Asset 1')).toBeInTheDocument();
    });
  });
});
