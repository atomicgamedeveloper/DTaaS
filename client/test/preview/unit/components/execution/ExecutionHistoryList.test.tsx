import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExecutionHistoryList from 'preview/components/execution/ExecutionHistoryList';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  ExecutionHistoryEntry,
  ExecutionStatus,
} from 'preview/model/executionHistory';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import digitalTwinReducer from 'preview/store/digitalTwin.slice';
import { RootState } from 'store/store';
import executionHistoryReducer, {
  setLoading,
  setError,
  setExecutionHistoryEntries,
  addExecutionHistoryEntry,
  updateExecutionHistoryEntry,
  updateExecutionStatus,
  updateExecutionLogs,
  removeExecutionHistoryEntry,
  setSelectedExecutionId,
  selectExecutionHistoryEntries,
  selectExecutionHistoryById,
  selectSelectedExecutionId,
  selectSelectedExecution,
  selectExecutionHistoryByDTName,
  selectExecutionHistoryLoading,
  selectExecutionHistoryError,
} from 'preview/store/executionHistory.slice';

jest.mock('preview/route/digitaltwins/execute/pipelineHandler');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('preview/services/indexedDBService', () => ({
  getExecutionHistoryByDTName: jest.fn(),
  deleteExecutionHistory: jest.fn(),
  updateExecutionHistory: jest.fn(),
  addExecutionHistory: jest.fn(),
}));

const mockExecutions = [
  {
    id: 'exec1',
    dtName: 'test-dt',
    pipelineId: 1001,
    timestamp: 1620000000000,
    status: ExecutionStatus.COMPLETED,
    jobLogs: [],
  },
  {
    id: 'exec2',
    dtName: 'test-dt',
    pipelineId: 1002,
    timestamp: 1620100000000,
    status: ExecutionStatus.FAILED,
    jobLogs: [],
  },
  {
    id: 'exec3',
    dtName: 'test-dt',
    pipelineId: 1003,
    timestamp: 1620200000000,
    status: ExecutionStatus.RUNNING,
    jobLogs: [],
  },
  {
    id: 'exec4',
    dtName: 'test-dt',
    pipelineId: 1004,
    timestamp: 1620300000000,
    status: ExecutionStatus.CANCELED,
    jobLogs: [],
  },
  {
    id: 'exec5',
    dtName: 'test-dt',
    pipelineId: 1005,
    timestamp: 1620400000000,
    status: ExecutionStatus.TIMEOUT,
    jobLogs: [],
  },
];

type TestStore = ReturnType<typeof configureStore>;

const createTestStore = (
  initialEntries: ExecutionHistoryEntry[] = [],
  loading = false,
  error: string | null = null,
): TestStore =>
  configureStore({
    reducer: {
      executionHistory: executionHistoryReducer,
      digitalTwin: digitalTwinReducer,
    },
    preloadedState: {
      executionHistory: {
        entries: initialEntries,
        loading,
        error,
        selectedExecutionId: null,
      },
      digitalTwin: {
        digitalTwin: {
          'test-dt': mockDigitalTwin,
        },
        shouldFetchDigitalTwins: false,
      },
    },
  });

describe('ExecutionHistoryList', () => {
  const dtName = 'test-dt';
  const mockOnViewLogs = jest.fn();
  const mockDispatch = jest.fn();
  let testStore: TestStore;

  const mockExecutionsWithSameTimestamp = [
    {
      id: 'exec6',
      dtName: 'test-dt',
      pipelineId: 1006,
      timestamp: 1620500000000, // Same timestamp
      status: ExecutionStatus.COMPLETED,
      jobLogs: [],
    },
    {
      id: 'exec7',
      dtName: 'test-dt',
      pipelineId: 1007,
      timestamp: 1620500000000, // Same timestamp
      status: ExecutionStatus.FAILED,
      jobLogs: [],
    },
  ];

  beforeEach(() => {
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );

    testStore = createTestStore();

    jest.clearAllMocks();

    (useSelector as jest.MockedFunction<typeof useSelector>).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockOnViewLogs.mockClear();
    testStore = createTestStore([]);
  });

  it('renders loading state correctly', () => {
    testStore = createTestStore([], true);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    const circularProgressElements = screen.getAllByTestId('circular-progress');
    expect(circularProgressElements.length).toBeGreaterThan(0);
  });

  it('renders empty state when no executions exist', () => {
    testStore = createTestStore([]);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getByText(/No execution history found/i)).toBeInTheDocument();
  });

  it('renders execution list with all status types', () => {
    testStore = createTestStore(mockExecutions);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Running/i)).toBeInTheDocument();
    expect(screen.getByText(/Canceled/i)).toBeInTheDocument();
    expect(screen.getByText(/Timed out/i)).toBeInTheDocument();

    expect(screen.getAllByLabelText(/view/i).length).toBe(5);
    expect(screen.getAllByLabelText(/delete/i).length).toBe(5);
    expect(screen.getByLabelText(/stop/i)).toBeInTheDocument(); // Only one running execution
  });

  it('calls fetchExecutionHistory on mount', () => {
    testStore = createTestStore([]);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('handles delete execution correctly', () => {
    mockDispatch.mockClear();

    testStore = createTestStore(mockExecutions);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    fireEvent.click(screen.getAllByLabelText(/delete/i)[0]);

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('handles view logs correctly', () => {
    mockDispatch.mockClear();
    mockOnViewLogs.mockClear();

    testStore = createTestStore(mockExecutions);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    fireEvent.click(screen.getAllByLabelText(/view/i)[0]);

    expect(mockDispatch).toHaveBeenCalled();
    expect(mockOnViewLogs).toHaveBeenCalledWith('exec5');
  });

  it('handles stop execution correctly', () => {
    mockDispatch.mockClear();

    const mockRunningExecution = {
      id: 'exec3',
      dtName: 'test-dt',
      pipelineId: 1003,
      timestamp: 1620600000000,
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    testStore = createTestStore([mockRunningExecution]);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getByText(/Running/i)).toBeInTheDocument();

    const stopButton = screen.getByLabelText('stop');
    expect(stopButton).toBeInTheDocument();

    fireEvent.click(stopButton);

    expect(mockDispatch).toHaveBeenCalled();

  });

  it('sorts executions by timestamp in descending order', () => {
    testStore = createTestStore(mockExecutions);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    const listItems = screen.getAllByRole('listitem');

    const timeoutIndex = listItems.findIndex((item) =>
      item.textContent?.includes('Timed out'),
    );
    const completedIndex = listItems.findIndex((item) =>
      item.textContent?.includes('Completed'),
    );

    expect(timeoutIndex).toBeLessThan(completedIndex);
  });

  it('handles executions with the same timestamp correctly', () => {
    testStore = createTestStore(mockExecutionsWithSameTimestamp);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getAllByRole('listitem').length).toBe(2);
    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed/i)).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    testStore = createTestStore([], false, 'Failed to fetch execution history');

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getByText(/No execution history found/i)).toBeInTheDocument();
  });

  it('dispatches removeExecution thunk when delete button is clicked', () => {
    mockDispatch.mockClear();

    testStore = createTestStore(mockExecutions);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    fireEvent.click(screen.getAllByLabelText(/delete/i)[0]);

    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
  });

  it('dispatches setSelectedExecutionId when view logs button is clicked', () => {
    mockDispatch.mockClear();
    mockOnViewLogs.mockClear();

    testStore = createTestStore(mockExecutions);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    // Click the view logs button for the first execution (which is exec5 due to sorting by timestamp)
    fireEvent.click(screen.getAllByLabelText(/view/i)[0]);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining(
          'executionHistory/setSelectedExecutionId',
        ),
        payload: 'exec5',
      }),
    );
  });

  it('handles a large number of executions correctly', () => {
    const largeExecutionList = Array.from({ length: 50 }, (_, i) => ({
      id: `exec-large-${i}`,
      dtName: 'test-dt',
      pipelineId: 2000 + i,
      timestamp: 1620000000000 + i * 10000,
      status: ExecutionStatus.COMPLETED,
      jobLogs: [],
    }));

    testStore = createTestStore(largeExecutionList);

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => selector(testStore.getState()),
    );

    render(
      <Provider store={testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getAllByRole('listitem').length).toBe(50);
    expect(screen.getAllByLabelText(/view/i).length).toBe(50);
    expect(screen.getAllByLabelText(/delete/i).length).toBe(50);
  });
});

describe('ExecutionHistory Redux Slice', () => {
  describe('reducers', () => {
    it('should handle setLoading', () => {
      const initialState = {
        entries: [],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const nextState = executionHistoryReducer(initialState, setLoading(true));
      expect(nextState.loading).toBe(true);
    });

    it('should handle setError', () => {
      const initialState = {
        entries: [],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const errorMessage = 'Test error message';
      const nextState = executionHistoryReducer(
        initialState,
        setError(errorMessage),
      );
      expect(nextState.error).toBe(errorMessage);
    });

    it('should handle setExecutionHistoryEntries', () => {
      const initialState = {
        entries: [],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const nextState = executionHistoryReducer(
        initialState,
        setExecutionHistoryEntries(mockExecutions),
      );
      expect(nextState.entries).toEqual(mockExecutions);
    });

    it('should handle addExecutionHistoryEntry', () => {
      const initialState = {
        entries: [],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const newEntry = mockExecutions[0];
      const nextState = executionHistoryReducer(
        initialState,
        addExecutionHistoryEntry(newEntry),
      );
      expect(nextState.entries).toHaveLength(1);
      expect(nextState.entries[0]).toEqual(newEntry);
    });

    it('should handle updateExecutionHistoryEntry', () => {
      const initialState = {
        entries: [mockExecutions[0]],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const updatedEntry = {
        ...mockExecutions[0],
        status: ExecutionStatus.FAILED,
      };
      const nextState = executionHistoryReducer(
        initialState,
        updateExecutionHistoryEntry(updatedEntry),
      );
      expect(nextState.entries[0].status).toBe(ExecutionStatus.FAILED);
    });

    it('should handle updateExecutionStatus', () => {
      const initialState = {
        entries: [mockExecutions[0]],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const nextState = executionHistoryReducer(
        initialState,
        updateExecutionStatus({
          id: mockExecutions[0].id,
          status: ExecutionStatus.FAILED,
        }),
      );
      expect(nextState.entries[0].status).toBe(ExecutionStatus.FAILED);
    });

    it('should handle updateExecutionLogs', () => {
      const initialState = {
        entries: [mockExecutions[0]],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const newLogs = [{ jobName: 'test-job', log: 'test log content' }];
      const nextState = executionHistoryReducer(
        initialState,
        updateExecutionLogs({ id: mockExecutions[0].id, logs: newLogs }),
      );
      expect(nextState.entries[0].jobLogs).toEqual(newLogs);
    });

    it('should handle removeExecutionHistoryEntry', () => {
      const initialState = {
        entries: [...mockExecutions],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const nextState = executionHistoryReducer(
        initialState,
        removeExecutionHistoryEntry(mockExecutions[0].id),
      );
      expect(nextState.entries).toHaveLength(mockExecutions.length - 1);
      expect(
        nextState.entries.find((e) => e.id === mockExecutions[0].id),
      ).toBeUndefined();
    });

    it('should handle setSelectedExecutionId', () => {
      const initialState = {
        entries: [],
        selectedExecutionId: null,
        loading: false,
        error: null,
      };
      const nextState = executionHistoryReducer(
        initialState,
        setSelectedExecutionId('test-id'),
      );
      expect(nextState.selectedExecutionId).toBe('test-id');
    });
  });

  // Test selectors
  describe('selectors', () => {
    it('should select all execution history entries', () => {
      const state = { executionHistory: { entries: mockExecutions } };

      const result = selectExecutionHistoryEntries(
        state as unknown as RootState,
      );
      expect(result).toEqual(mockExecutions);
    });

    it('should select execution history by DT name', () => {
      const state = { executionHistory: { entries: mockExecutions } };

      const result = selectExecutionHistoryByDTName('test-dt')(
        state as unknown as RootState,
      );
      expect(result).toEqual(mockExecutions);

      const emptyResult = selectExecutionHistoryByDTName('non-existent')(
        state as unknown as RootState,
      );
      expect(emptyResult).toEqual([]);
    });

    it('should select execution history by ID', () => {
      const state = { executionHistory: { entries: mockExecutions } };

      const result = selectExecutionHistoryById('exec1')(
        state as unknown as RootState,
      );
      expect(result).toEqual(mockExecutions[0]);

      const nullResult = selectExecutionHistoryById('non-existent')(
        state as unknown as RootState,
      );
      expect(nullResult).toBeUndefined();
    });

    it('should select selected execution ID', () => {
      const state = { executionHistory: { selectedExecutionId: 'exec1' } };

      const result = selectSelectedExecutionId(state as unknown as RootState);
      expect(result).toBe('exec1');
    });

    it('should select selected execution', () => {
      const state = {
        executionHistory: {
          entries: mockExecutions,
          selectedExecutionId: 'exec1',
        },
      };

      const result = selectSelectedExecution(state as unknown as RootState);
      expect(result).toEqual(mockExecutions[0]);

      const stateWithNoSelection = {
        executionHistory: {
          entries: mockExecutions,
          selectedExecutionId: null,
        },
      };
      const nullResult = selectSelectedExecution(
        stateWithNoSelection as unknown as RootState,
      );
      expect(nullResult).toBeNull();
    });

    it('should select execution history loading state', () => {
      const state = { executionHistory: { loading: false } };

      const result = selectExecutionHistoryLoading(
        state as unknown as RootState,
      );
      expect(result).toBe(false);

      const loadingState = { executionHistory: { loading: true } };
      const loadingResult = selectExecutionHistoryLoading(
        loadingState as unknown as RootState,
      );
      expect(loadingResult).toBe(true);
    });

    it('should select execution history error', () => {
      const state = { executionHistory: { error: null } };

      const result = selectExecutionHistoryError(state as unknown as RootState);
      expect(result).toBeNull();

      const errorState = { executionHistory: { error: 'Test error' } };
      const errorResult = selectExecutionHistoryError(
        errorState as unknown as RootState,
      );
      expect(errorResult).toBe('Test error');
    });
  });
});
