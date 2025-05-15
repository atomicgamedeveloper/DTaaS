import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';
import { handleStart } from 'preview/route/digitaltwins/execute/pipelineHandler';
import StartStopButton from 'preview/components/asset/StartStopButton';
import { ExecutionStatus } from 'preview/model/executionHistory';
import * as redux from 'react-redux';

// Mock dependencies
jest.mock('preview/route/digitaltwins/execute/pipelineHandler', () => ({
  handleStart: jest.fn(),
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

describe('StartStopButton', () => {
  const assetName = 'testAssetName';
  const setLogButtonDisabled = jest.fn();
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
    render(
      <StartStopButton
        assetName={assetName}
        setLogButtonDisabled={setLogButtonDisabled}
      />,
    );

  it('renders the Start button', () => {
    renderComponent();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('handles button click', () => {
    renderComponent();
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);

    expect(handleStart).toHaveBeenCalled();

    expect(handleStart).toHaveBeenCalledWith(
      'Start',
      expect.any(Function),
      mockDigitalTwin,
      setLogButtonDisabled,
      expect.any(Function),
    );
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
