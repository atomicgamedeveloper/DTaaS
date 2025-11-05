import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDispatch, useSelector } from 'react-redux';
import LogDialog from 'model/backend/LogDialog';

// Mock Redux hooks
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockFetchExecutionHistory = jest.fn((name: string) => ({
  type: 'fetchExecutionHistory',
  payload: name,
}));

jest.mock('model/backend/state/executionHistory.slice', () => ({
  fetchExecutionHistory: jest.fn((name: string) =>
    mockFetchExecutionHistory(name),
  ),
}));

jest.mock('components/execution/ExecutionHistoryList', () => {
  const ExecutionHistoryListMock = ({
    dtName,
    onViewLogs,
  }: {
    dtName: string;
    onViewLogs: (id: string) => void;
  }) => (
    <div data-testid="execution-history-list">
      <div data-testid="dt-name">{dtName}</div>
      <button onClick={() => onViewLogs('exec1')}>View Logs</button>
    </div>
  );
  return {
    __esModule: true,
    default: ExecutionHistoryListMock,
  };
});

describe('LogDialog', () => {
  const mockDispatch = jest.fn().mockImplementation((action) => {
    if (typeof action === 'function') {
      return action(mockDispatch);
    }
    return action;
  });
  const setShowLog = jest.fn();

  beforeEach(() => {
    mockFetchExecutionHistory.mockClear();
  });
  const executionHistorySlice = jest.requireMock(
    'model/backend/state/executionHistory.slice',
  );
  it('renders the LogDialog with logs available', () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue({
      jobLogs: [{ jobName: 'job', log: 'testLog' }],
    });
    executionHistorySlice.fetchExecutionHistory.mockImplementation(
      (name: string) => mockFetchExecutionHistory(name),
    );

    mockDispatch.mockImplementation((action) => {
      if (typeof action === 'function') {
        return action(mockDispatch, () => ({}), undefined);
      }
      return action;
    });

    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);
  });

  it('renders the LogDialog with execution history', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(screen.getByTestId('execution-history-list')).toBeInTheDocument();
    expect(screen.getByTestId('dt-name')).toHaveTextContent('testDT');
  });

  it('renders the execution history list by default', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(screen.getByTestId('execution-history-list')).toBeInTheDocument();
  });

  it('handles close button click', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    fireEvent.click(screen.getByRole('button', { name: /Close/i }));

    expect(setShowLog).toHaveBeenCalledWith(false);
  });

  it('fetches execution history when dialog is shown', () => {
    const mockAction = { type: 'fetchExecutionHistory', payload: 'testDT' };
    mockFetchExecutionHistory.mockReturnValue(mockAction);

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(mockDispatch).toHaveBeenCalledWith(mockAction);
  });

  it('handles view logs functionality correctly', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    fireEvent.click(screen.getByText('View Logs'));

    expect(screen.getByText('View Logs')).toBeInTheDocument();
  });

  it('displays the correct title', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(screen.getByText('TestDT Execution History')).toBeInTheDocument();
  });

  it('does not render the dialog when showLog is false', () => {
    render(<LogDialog name="testDT" showLog={false} setShowLog={setShowLog} />);

    expect(
      screen.queryByTestId('execution-history-list'),
    ).not.toBeInTheDocument();
  });

  it('passes the correct dtName to ExecutionHistoryList', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(screen.getByTestId('dt-name')).toHaveTextContent('testDT');
  });

  it('does not fetch execution history when dialog is not shown', () => {
    mockDispatch.mockClear();

    render(<LogDialog name="testDT" showLog={false} setShowLog={setShowLog} />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('handles clear all button click when executions exist', () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue([
      { id: 'exec1', name: 'execution1' },
      { id: 'exec2', name: 'execution2' },
    ]);
    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllButton);

    expect(screen.getByText('Confirm Clear All')).toBeInTheDocument();
  });

  it('shows info notification when clear all is clicked with empty execution history', () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue(
      [],
    );
    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'snackbar/showSnackbar',
      payload: {
        message: 'Execution history is already empty',
        severity: 'info',
      },
    });
  });

  it('handles clear all confirmation', () => {
    const mockClearAction = {
      type: 'clearExecutionHistoryForDT',
      payload: 'testDT',
    };

    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue([
      { id: 'exec1', name: 'execution1' },
    ]);
    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);

    executionHistorySlice.clearExecutionHistoryForDT = jest.fn(
      () => mockClearAction,
    );

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllButton);

    const confirmButton = screen.getByRole('button', { name: /delete all/i });
    fireEvent.click(confirmButton);

    expect(mockDispatch).toHaveBeenCalledWith(mockClearAction);
  });

  it('handles clear all cancellation', () => {
    const mockClearAction = {
      type: 'clearExecutionHistoryForDT',
      payload: 'testDT',
    };

    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue([
      { id: 'exec1', name: 'execution1' },
    ]);
    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);

    executionHistorySlice.clearExecutionHistoryForDT = jest.fn(
      () => mockClearAction,
    );

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllButton);

    expect(screen.getByText('Confirm Clear All')).toBeInTheDocument();

    mockDispatch.mockClear();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockDispatch).not.toHaveBeenCalledWith(mockClearAction);
  });
});
