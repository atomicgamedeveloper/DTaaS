import { screen, render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoryButton from 'components/asset/HistoryButton';
import * as React from 'react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import executionHistoryReducer, {
  addExecutionHistoryEntry,
} from 'model/backend/gitlab/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';

const createTestStore = () =>
  configureStore({
    reducer: combineReducers({
      executionHistory: executionHistoryReducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

describe('HistoryButton Integration Test', () => {
  const assetName = 'test-asset';
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  const renderHistoryButton = (
    setShowLog: jest.Mock = jest.fn(),
    historyButtonDisabled = false,
    testAssetName = assetName,
  ) =>
    act(() => {
      render(
        <Provider store={store}>
          <HistoryButton
            setShowLog={setShowLog}
            historyButtonDisabled={historyButtonDisabled}
            assetName={testAssetName}
          />
        </Provider>,
      );
    });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the History button', () => {
    renderHistoryButton();
    expect(
      screen.getByRole('button', { name: /History/i }),
    ).toBeInTheDocument();
  });

  it('handles button click when enabled', () => {
    const setShowLog = jest.fn((callback) => callback(false));
    renderHistoryButton(setShowLog);

    const historyButton = screen.getByRole('button', { name: /History/i });
    act(() => {
      fireEvent.click(historyButton);
    });

    expect(setShowLog).toHaveBeenCalled();
  });

  it('does not handle button click when disabled and no executions', () => {
    renderHistoryButton(jest.fn(), true); // historyButtonDisabled = true

    const historyButton = screen.getByRole('button', { name: /History/i });
    expect(historyButton).toBeDisabled();
  });

  it('toggles setShowLog value correctly', () => {
    let toggleValue = false;
    const mockSetShowLog = jest.fn((callback) => {
      toggleValue = callback(toggleValue);
    });

    renderHistoryButton(mockSetShowLog);

    const historyButton = screen.getByRole('button', { name: /History/i });

    act(() => {
      fireEvent.click(historyButton);
    });
    expect(toggleValue).toBe(true);

    act(() => {
      fireEvent.click(historyButton);
    });
    expect(toggleValue).toBe(false);
  });

  it('shows badge with execution count when executions exist', async () => {
    await act(async () => {
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

      store.dispatch(
        addExecutionHistoryEntry({
          id: '2',
          dtName: assetName,
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        }),
      );
    });

    renderHistoryButton();

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('enables button when historyButtonDisabled is true but executions exist', async () => {
    await act(async () => {
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
    });

    renderHistoryButton(jest.fn(), true);

    const historyButton = screen.getByRole('button', { name: /History/i });
    expect(historyButton).toBeEnabled();
  });

  it('filters executions by assetName', async () => {
    await act(async () => {
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

      store.dispatch(
        addExecutionHistoryEntry({
          id: '2',
          dtName: 'different-asset',
          pipelineId: 456,
          timestamp: Date.now(),
          status: ExecutionStatus.COMPLETED,
          jobLogs: [],
        }),
      );

      store.dispatch(
        addExecutionHistoryEntry({
          id: '3',
          dtName: assetName,
          pipelineId: 789,
          timestamp: Date.now(),
          status: ExecutionStatus.RUNNING,
          jobLogs: [],
        }),
      );
    });

    renderHistoryButton();

    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
