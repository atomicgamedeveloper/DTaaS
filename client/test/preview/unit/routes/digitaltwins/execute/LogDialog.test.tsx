import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSelector, useDispatch } from 'react-redux';
import LogDialog from 'preview/route/digitaltwins/execute/LogDialog';
import { ExecutionStatus } from 'preview/model/executionHistory';
import { selectSelectedExecution } from 'preview/store/executionHistory.slice';
import { RootState } from 'store/store';

// Mock Redux hooks
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockFetchExecutionHistory = jest.fn((name: string) => ({
  type: 'fetchExecutionHistory',
  payload: name,
}));

const mockSetSelectedExecutionId = jest.fn((id: string) => ({
  type: 'setSelectedExecutionId',
  payload: id,
}));

jest.mock('preview/store/executionHistory.slice', () => ({
  fetchExecutionHistory: jest.fn((name: string) =>
    mockFetchExecutionHistory(name),
  ),
  setSelectedExecutionId: jest.fn((id: string) =>
    mockSetSelectedExecutionId(id),
  ),
  selectSelectedExecution: jest.fn(),
  selectExecutionHistoryByDTName: jest.fn(() => () => []),
  _selectExecutionHistoryByDTName: jest.fn(
    (dtName: string) => (state: RootState) =>
      state.executionHistory.entries.filter((entry) => entry.dtName === dtName),
  ),
}));

jest.mock('preview/store/digitalTwin.slice', () => ({
  selectDigitalTwinByName: jest.fn(() => () => ({
    DTName: 'testDT',
    jobLogs: [{ jobName: 'digitalTwinJob', log: 'digitalTwin log content' }],
  })),
}));

jest.mock('preview/components/execution/ExecutionHistoryList', () => {
  const ExecutionHistoryListMock = ({
    onViewLogs,
  }: {
    onViewLogs: (id: string) => void;
  }) => (
    <div data-testid="execution-history-list">
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
  const mockDigitalTwin = {
    DTName: 'testDT',
    jobLogs: [{ jobName: 'digitalTwinJob', log: 'digitalTwin log content' }],
    // Add other required properties
  };
  const mockExecution = {
    id: 'exec1',
    dtName: 'testDT',
    pipelineId: 1001,
    timestamp: 1620000000000, // May 3, 2021
    status: ExecutionStatus.COMPLETED,
    jobLogs: [{ jobName: 'job1', log: 'execution log content' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchExecutionHistory.mockClear();
    mockSetSelectedExecutionId.mockClear();

    const executionHistorySlice = jest.requireMock(
      'preview/store/executionHistory.slice',
    );

    executionHistorySlice.fetchExecutionHistory.mockImplementation(
      (name: string) => mockFetchExecutionHistory(name),
    );
    executionHistorySlice.setSelectedExecutionId.mockImplementation(
      (id: string) => mockSetSelectedExecutionId(id),
    );

    mockDispatch.mockImplementation((action) => {
      if (typeof action === 'function') {
        return action(mockDispatch, () => ({}), undefined);
      }
      return action;
    });

    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);

    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedExecution) {
        return null;
      }
      return mockDigitalTwin;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the LogDialog with tabs', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(screen.getByRole('tab', { name: /History/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Logs/i })).toBeInTheDocument();
  });

  it('renders the History tab by default', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(screen.getByRole('tab', { name: /History/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('execution-history-list')).toBeInTheDocument();
  });

  it('handles close button click', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    fireEvent.click(screen.getByRole('button', { name: /Close/i }));

    expect(setShowLog).toHaveBeenCalledWith(false);
  });

  it('switches between tabs correctly', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    const historyTab = screen.getByRole('tab', { name: /History/i });
    const logsTab = screen.getByRole('tab', { name: /Logs/i });
    expect(historyTab).toHaveAttribute('aria-selected', 'true');
    expect(logsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('execution-history-list')).toBeInTheDocument();

    fireEvent.click(logsTab);

    expect(historyTab).toHaveAttribute('aria-selected', 'false');
    expect(logsTab).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByText('digitalTwinJob')).toBeInTheDocument();
    expect(screen.getByText('digitalTwin log content')).toBeInTheDocument();

    fireEvent.click(historyTab);

    expect(historyTab).toHaveAttribute('aria-selected', 'true');
    expect(logsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('execution-history-list')).toBeInTheDocument();
  });

  it('fetches execution history when dialog is shown', () => {
    const mockAction = { type: 'fetchExecutionHistory', payload: 'testDT' };
    mockFetchExecutionHistory.mockReturnValue(mockAction);

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(mockDispatch).toHaveBeenCalledWith(mockAction);
  });

  it('handles view logs functionality correctly', () => {
    const mockAction = { type: 'setSelectedExecutionId', payload: 'exec1' };
    mockSetSelectedExecutionId.mockReturnValue(mockAction);

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    fireEvent.click(screen.getByText('View Logs'));

    expect(mockDispatch).toHaveBeenCalledWith(mockAction);

    const logsTab = screen.getByRole('tab', { name: /Logs/i });
    expect(logsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('displays logs for a selected execution', () => {
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedExecution) {
        return mockExecution;
      }
      return mockDigitalTwin;
    });

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    const logsTab = screen.getByRole('tab', { name: /Logs/i });
    fireEvent.click(logsTab);

    expect(screen.getByText('job1')).toBeInTheDocument();
    expect(screen.getByText('execution log content')).toBeInTheDocument();
  });

  it('displays the correct title with no selected execution', () => {
    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(screen.getByText('TestDT log')).toBeInTheDocument();
  });

  it('displays the correct title with a selected execution', () => {
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedExecution) {
        return mockExecution;
      }
      return mockDigitalTwin;
    });

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    expect(screen.getByText(/TestDT - Execution/)).toBeInTheDocument();
  });

  it('does not render the dialog when showLog is false', () => {
    render(<LogDialog name="testDT" showLog={false} setShowLog={setShowLog} />);

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('displays "No logs available" when there are no logs', () => {
    const mockDigitalTwinNoLogs = {
      ...mockDigitalTwin,
      jobLogs: [],
    };

    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedExecution) {
        return null;
      }
      return mockDigitalTwinNoLogs;
    });

    render(<LogDialog name="testDT" showLog={true} setShowLog={setShowLog} />);

    const logsTab = screen.getByRole('tab', { name: /Logs/i });
    fireEvent.click(logsTab);

    expect(screen.getByText('No logs available')).toBeInTheDocument();
  });
});
