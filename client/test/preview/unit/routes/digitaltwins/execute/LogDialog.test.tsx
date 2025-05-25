import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDispatch } from 'react-redux';
import LogDialog from 'preview/route/digitaltwins/execute/LogDialog';

// Mock Redux hooks
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockFetchExecutionHistory = jest.fn((name: string) => ({
  type: 'fetchExecutionHistory',
  payload: name,
}));

jest.mock('model/backend/gitlab/state/executionHistory.slice', () => ({
  fetchExecutionHistory: jest.fn((name: string) =>
    mockFetchExecutionHistory(name),
  ),
}));

jest.mock('preview/components/execution/ExecutionHistoryList', () => {
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
    jest.clearAllMocks();
    mockFetchExecutionHistory.mockClear();

    const executionHistorySlice = jest.requireMock(
      'model/backend/gitlab/state/executionHistory.slice',
    );

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

  afterEach(() => {
    jest.clearAllMocks();
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
});
