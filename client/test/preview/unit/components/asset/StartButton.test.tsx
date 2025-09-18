import { fireEvent, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';
import { handleStart } from 'route/digitaltwins/execution/executionButtonHandlers';
import StartButton from 'preview/components/asset/StartButton';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import * as redux from 'react-redux';

// Mock dependencies
jest.mock('route/digitaltwins/execution/executionButtonHandlers', () => ({
  handleStart: jest.fn(),
}));

// Mock the digitalTwin adapter to avoid real initialization
jest.mock('route/digitaltwins/execution/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'testAssetName',
    execute: jest.fn().mockResolvedValue(123),
    jobLogs: [],
    pipelineLoading: false,
    pipelineCompleted: false,
    pipelineId: null,
    currentExecutionId: null,
    lastExecutionStatus: null,
  }),
}));

// Mock the initDigitalTwin function to avoid real GitLab initialization
jest.mock('preview/util/init', () => ({
  initDigitalTwin: jest.fn().mockResolvedValue({
    DTName: 'testAssetName',
    pipelineId: null,
    currentExecutionId: null,
    lastExecutionStatus: null,
    jobLogs: [],
    pipelineLoading: false,
    pipelineCompleted: false,
  }),
}));

// Mock CircularProgress component
jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress" />,
}));

// Mock useSelector and useDispatch
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockDispatch = jest.fn();

describe('StartButton', () => {
  const assetName = 'testAssetName';
  const setHistoryButtonDisabled = jest.fn();
  const mockDigitalTwin = {
    DTName: assetName,
    pipelineLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();

    (
      redux.useSelector as jest.MockedFunction<typeof redux.useSelector>
    ).mockImplementation((selector) => {
      // Mock state for default case
      const state = {
        digitalTwin: {
          digitalTwin: {
            [assetName]: mockDigitalTwin,
          },
        },
        executionHistory: {
          entries: [],
        },
      };
      return selector(state);
    });
  });

  const renderComponent = () =>
    act(() => {
      render(
        <StartButton
          assetName={assetName}
          setHistoryButtonDisabled={setHistoryButtonDisabled}
        />,
      );
    });

  it('renders the Start button', () => {
    renderComponent();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('handles button click', async () => {
    // Reset the mock to ensure clean state
    (handleStart as jest.Mock).mockClear();

    renderComponent();
    const startButton = screen.getByText('Start');

    await act(async () => {
      fireEvent.click(startButton);
    });

    // Wait a bit for async operations
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    expect(handleStart).toHaveBeenCalled();
  });

  it('shows loading indicator when pipelineLoading is true', () => {
    (
      redux.useSelector as jest.MockedFunction<typeof redux.useSelector>
    ).mockImplementation((selector) => {
      const state = {
        digitalTwin: {
          digitalTwin: {
            [assetName]: {
              ...mockDigitalTwin,
              pipelineLoading: true,
            },
          },
        },
        executionHistory: {
          entries: [],
        },
      };
      return selector(state);
    });

    renderComponent();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  it('shows loading indicator with count when there are running executions', () => {
    (
      redux.useSelector as jest.MockedFunction<typeof redux.useSelector>
    ).mockImplementation((selector) => {
      const state = {
        digitalTwin: {
          digitalTwin: {
            [assetName]: mockDigitalTwin,
          },
        },
        executionHistory: {
          entries: [
            {
              id: '1',
              dtName: assetName,
              pipelineId: 123,
              timestamp: Date.now(),
              status: ExecutionStatus.RUNNING,
              jobLogs: [],
            },
            {
              id: '2',
              dtName: assetName,
              pipelineId: 456,
              timestamp: Date.now(),
              status: ExecutionStatus.RUNNING,
              jobLogs: [],
            },
          ],
        },
      };
      return selector(state);
    });

    renderComponent();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('does not show loading indicator when there are no running executions', () => {
    (
      redux.useSelector as jest.MockedFunction<typeof redux.useSelector>
    ).mockImplementation((selector) => {
      const state = {
        digitalTwin: {
          digitalTwin: {
            [assetName]: mockDigitalTwin,
          },
        },
        executionHistory: {
          entries: [
            {
              id: '1',
              dtName: assetName,
              pipelineId: 123,
              timestamp: Date.now(),
              status: ExecutionStatus.COMPLETED,
              jobLogs: [],
            },
          ],
        },
      };
      return selector(state);
    });

    renderComponent();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('handles different execution statuses correctly', () => {
    (
      redux.useSelector as jest.MockedFunction<typeof redux.useSelector>
    ).mockImplementation((selector) => {
      const state = {
        digitalTwin: {
          digitalTwin: {
            [assetName]: mockDigitalTwin,
          },
        },
        executionHistory: {
          entries: [
            {
              id: '1',
              dtName: assetName,
              pipelineId: 123,
              timestamp: Date.now(),
              status: ExecutionStatus.RUNNING,
              jobLogs: [],
            },
            {
              id: '2',
              dtName: assetName,
              pipelineId: 456,
              timestamp: Date.now(),
              status: ExecutionStatus.COMPLETED,
              jobLogs: [],
            },
            {
              id: '3',
              dtName: assetName,
              pipelineId: 789,
              timestamp: Date.now(),
              status: ExecutionStatus.FAILED,
              jobLogs: [],
            },
          ],
        },
      };
      return selector(state);
    });

    renderComponent();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument(); // Only one running execution
  });
});
