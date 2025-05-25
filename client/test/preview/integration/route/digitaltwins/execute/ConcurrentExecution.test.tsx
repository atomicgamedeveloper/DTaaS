import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import StartStopButton from 'preview/components/asset/StartStopButton';
import LogButton from 'preview/components/asset/LogButton';
import LogDialog from 'preview/route/digitaltwins/execute/LogDialog';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import executionHistoryReducer, {
  addExecutionHistoryEntry,
  clearEntries,
} from 'model/backend/gitlab/state/executionHistory.slice';
import { handleStart } from 'model/backend/gitlab/execution/pipelineHandler';
import { v4 as uuidv4 } from 'uuid';
import DigitalTwin from 'preview/util/digitalTwin';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import '@testing-library/jest-dom';

// Mock the dependencies
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('model/backend/gitlab/execution/pipelineHandler', () => ({
  handleStart: jest.fn(),
  handleStop: jest.fn(),
}));

// Mock the CircularProgress component
jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress" />,
}));

// Mock the indexedDBService
jest.mock('database/digitalTwins', () => ({
  __esModule: true,
  default: {
    init: jest.fn().mockResolvedValue(undefined),
    addExecutionHistory: jest.fn().mockResolvedValue('mock-id'),
    updateExecutionHistory: jest.fn().mockResolvedValue(undefined),
    getExecutionHistoryByDTName: jest.fn().mockResolvedValue([]),
    getExecutionHistoryById: jest.fn().mockResolvedValue(null),
    getAllExecutionHistory: jest.fn().mockResolvedValue([]),
    deleteExecutionHistory: jest.fn().mockResolvedValue(undefined),
    deleteExecutionHistoryByDTName: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Concurrent Execution Integration', () => {
  const assetName = 'test-dt';
  // Create a mock that satisfies the DigitalTwin type
  const mockDigitalTwin = {
    DTName: assetName,
    description: 'Mock Digital Twin',
    fullDescription: 'Mock Digital Twin Description',
    gitlabInstance: {
      projectId: 123,
      triggerToken: 'mock-token',
      getPipelineStatus: jest.fn(),
    },
    DTAssets: {
      DTName: assetName,
      gitlabInstance: {},
      fileHandler: {},
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
    },
    pipelineId: 123,
    lastExecutionStatus: 'success',
    jobLogs: [],
    pipelineLoading: false,
    pipelineCompleted: false,
    descriptionFiles: [],
    configFiles: [],
    lifecycleFiles: [],
    assetFiles: [],
    getDescription: jest.fn(),
    getFullDescription: jest.fn(),
    triggerPipeline: jest.fn(),
    execute: jest.fn().mockResolvedValue(123),
    stop: jest.fn().mockResolvedValue(undefined),
    create: jest.fn(),
    delete: jest.fn(),
    getDescriptionFiles: jest.fn(),
    getLifecycleFiles: jest.fn(),
    getConfigFiles: jest.fn(),
    prepareAllAssetFiles: jest.fn(),
    getAssetFiles: jest.fn(),
  } as unknown as DigitalTwin;

  // Create a test store with middleware configuration that matches the application
  const store = configureStore({
    reducer: {
      digitalTwin: digitalTwinReducer,
      executionHistory: executionHistoryReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore the same actions that the actual application ignores
          ignoredActions: [
            'digitalTwin/setDigitalTwin',
            'executionHistory/addExecutionHistoryEntry',
            'executionHistory/updateExecutionHistoryEntry',
            'executionHistory/clearEntries',
          ],
          // Ignore paths that contain non-serializable values (functions)
          ignoredPaths: [
            'digitalTwin.digitalTwin.test-dt.gitlabInstance.getPipelineStatus',
            'digitalTwin.digitalTwin.test-dt.DTAssets',
            'digitalTwin.digitalTwin.test-dt.getDescription',
            'digitalTwin.digitalTwin.test-dt.getFullDescription',
            'digitalTwin.digitalTwin.test-dt.triggerPipeline',
            'digitalTwin.digitalTwin.test-dt.execute',
            'digitalTwin.digitalTwin.test-dt.stop',
            'digitalTwin.digitalTwin.test-dt.create',
            'digitalTwin.digitalTwin.test-dt.delete',
            'digitalTwin.digitalTwin.test-dt.getDescriptionFiles',
            'digitalTwin.digitalTwin.test-dt.getLifecycleFiles',
            'digitalTwin.digitalTwin.test-dt.getConfigFiles',
            'digitalTwin.digitalTwin.test-dt.prepareAllAssetFiles',
            'digitalTwin.digitalTwin.test-dt.getAssetFiles',
          ],
        },
      }),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear any existing entries
    store.dispatch(clearEntries());

    // Set up the mock digital twin
    store.dispatch(
      setDigitalTwin({
        assetName,
        digitalTwin: mockDigitalTwin,
      }),
    );

    // Mock UUID generation
    (uuidv4 as jest.Mock).mockReturnValue('mock-execution-id');
  });

  const renderComponents = () => {
    const setLogButtonDisabled = jest.fn();
    const setShowLog = jest.fn();
    const showLog = false;

    render(
      <Provider store={store}>
        <StartStopButton
          assetName={assetName}
          setLogButtonDisabled={setLogButtonDisabled}
        />
        <LogButton
          assetName={assetName}
          setShowLog={setShowLog}
          logButtonDisabled={false}
        />
        <LogDialog name={assetName} showLog={showLog} setShowLog={setShowLog} />
      </Provider>,
    );

    return { setLogButtonDisabled, setShowLog };
  };

  it('should start a new execution when Start button is clicked', async () => {
    const { setLogButtonDisabled } = renderComponents();

    // Find and click the Start button
    const startButton = screen.getByRole('button', { name: /Start/i });
    fireEvent.click(startButton);

    // Verify handleStart was called with the correct parameters
    expect(handleStart).toHaveBeenCalledWith(
      'Start',
      expect.any(Function),
      mockDigitalTwin,
      setLogButtonDisabled,
      expect.any(Function),
    );
  });

  it('should show execution count in the LogButton badge', async () => {
    // Add two executions to the store
    store.dispatch(
      addExecutionHistoryEntry({
        id: '1',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      }),
    );

    store.dispatch(
      addExecutionHistoryEntry({
        id: '2',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      }),
    );

    renderComponents();

    // Verify the badge shows the correct count
    await waitFor(() => {
      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
    });
  });

  it('should show running executions count in the StartStopButton', async () => {
    // Add three executions to the store, two running and one completed
    store.dispatch(
      addExecutionHistoryEntry({
        id: '1',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      }),
    );

    store.dispatch(
      addExecutionHistoryEntry({
        id: '2',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      }),
    );

    store.dispatch(
      addExecutionHistoryEntry({
        id: '3',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      }),
    );

    renderComponents();

    // Verify the progress indicator shows the correct count
    await waitFor(() => {
      const progressIndicator = screen.getByTestId('circular-progress');
      expect(progressIndicator).toBeInTheDocument();

      // Get the text content of the running count element
      // The text might be split across multiple elements, so we need to find it by its container
      const runningCountContainer =
        screen.getByTestId('circular-progress').parentElement;
      expect(runningCountContainer).toHaveTextContent('(2)');
    });
  });

  it('should enable LogButton even when logButtonDisabled is true if executions exist', async () => {
    // Add one completed execution to the store
    store.dispatch(
      addExecutionHistoryEntry({
        id: '1',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      }),
    );

    // Render the LogButton with logButtonDisabled=true
    const setShowLog = jest.fn();

    render(
      <Provider store={store}>
        <LogButton
          assetName={assetName}
          setShowLog={setShowLog}
          logButtonDisabled={true}
        />
      </Provider>,
    );

    // Verify the LogButton is enabled
    await waitFor(() => {
      const logButton = screen.getByRole('button', { name: /History/i });
      expect(logButton).not.toBeDisabled();
    });
  });

  it('should debounce rapid clicks on Start button', async () => {
    jest.useFakeTimers();
    renderComponents();

    const startButton = screen.getByRole('button', { name: /Start/i });

    fireEvent.click(startButton);
    fireEvent.click(startButton);
    fireEvent.click(startButton);

    expect(handleStart).toHaveBeenCalledTimes(1);

    expect(startButton).toBeDisabled();

    jest.advanceTimersByTime(250);

    await waitFor(() => {
      expect(startButton).not.toBeDisabled();
    });

    fireEvent.click(startButton);
    expect(handleStart).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
