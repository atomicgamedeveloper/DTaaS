import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ExecutionCard,
  TrialCard,
  PaginatedTrialCard,
} from 'route/benchmark/BenchmarkTrialCards';
import {
  createMockExecution,
  createMockTrial,
} from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';

jest.mock('model/backend/gitlab/measure/benchmark.utils', () => {
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/benchmark.utils',
  );
  return {
    ...actual,
    secondsDifference: jest.fn((start?: Date, end?: Date) => {
      if (!start || !end) return undefined;
      return (end.getTime() - start.getTime()) / 1000;
    }),
  };
});

const mockUtils = jest.requireMock(
  'model/backend/gitlab/measure/benchmark.utils',
);
const mockSecondsDifference = mockUtils.secondsDifference as jest.Mock;

describe('BenchmarkTrialCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ExecutionCard', () => {
    it('renders execution details correctly', () => {
      const execution = createMockExecution({
        dtName: 'test-dt',
        pipelineId: 456,
        status: 'success',
      });
      render(<ExecutionCard execution={execution} />);
      expect(screen.getByText(/test-dt/)).toBeInTheDocument();
      expect(screen.getByText(/Pipeline: 456/)).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
      expect(screen.getByText(/Runner: linux/)).toBeInTheDocument();
    });

    it('renders execution without pipeline ID', () => {
      const execution = createMockExecution({
        dtName: 'test-dt',
        pipelineId: null,
        status: 'running',
      });
      render(<ExecutionCard execution={execution} />);
      expect(screen.getByText('test-dt')).toBeInTheDocument();
      expect(screen.queryByText(/Pipeline:/)).not.toBeInTheDocument();
    });
  });

  describe('TrialCard', () => {
    it('renders trial number and time correctly', () => {
      mockSecondsDifference.mockReturnValue(10);
      const trial = createMockTrial({
        'Time Start': new Date('2026-01-01T10:00:00.000Z'),
        'Time End': new Date('2026-01-01T10:00:10.000Z'),
      });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText('Trial 1')).toBeInTheDocument();
      expect(screen.getByText('10.0s')).toBeInTheDocument();
      mockSecondsDifference.mockRestore();
    });

    it('renders dash when times are not available', () => {
      const trial = createMockTrial({
        'Time Start': undefined,
        'Time End': undefined,
      });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows stopped indicator when trial is stopped', () => {
      const trial = createMockTrial({ Status: 'STOPPED' });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText('(stopped)')).toBeInTheDocument();
    });

    it('renders execution cards for each execution', () => {
      const trial = createMockTrial({
        Execution: [
          createMockExecution({ dtName: 'dt-1', pipelineId: 1 }),
          createMockExecution({ dtName: 'dt-2', pipelineId: 2 }),
        ],
      });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText(/dt-1/)).toBeInTheDocument();
      expect(screen.getByText(/dt-2/)).toBeInTheDocument();
    });

    it('shows error message when trial has error', () => {
      const trialWithError = createMockTrial({
        Error: {
          message: 'Pipeline failed with error',
          error: new Error('Pipeline failed with error'),
        },
      });
      render(<TrialCard trial={trialWithError} trialIndex={0} />);
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(
        screen.getByText('Pipeline failed with error'),
      ).toBeInTheDocument();
    });

    it('does not show error for "stopped by user" messages', () => {
      const trial = createMockTrial({
        Error: {
          message: 'Pipeline 123 stopped by user.',
          error: new Error('Pipeline 123 stopped by user.'),
        },
      });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.queryByText('Error:')).not.toBeInTheDocument();
    });
  });

  describe('PaginatedTrialCard', () => {
    it('renders nothing when there are no trials', () => {
      const { container } = render(<PaginatedTrialCard trials={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('shows the last trial by default', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      render(<PaginatedTrialCard trials={trials} />);
      expect(screen.getByText('Trial 2')).toBeInTheDocument();
    });

    it('navigates back and forward between trials', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      render(<PaginatedTrialCard trials={trials} />);
      expect(screen.getByText('Trial 2')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Previous trial'));
      expect(screen.getByText('Trial 1')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Next trial'));
      expect(screen.getByText('Trial 2')).toBeInTheDocument();
    });

    it('disables navigation buttons at boundaries', () => {
      const trials = [createMockTrial({ Status: 'SUCCESS' })];
      render(<PaginatedTrialCard trials={trials} />);
      expect(screen.getByLabelText('Previous trial')).toBeDisabled();
      expect(screen.getByLabelText('Next trial')).toBeDisabled();
    });

    it('includes currentTrial as the last trial', () => {
      const trials = [createMockTrial({ Status: 'SUCCESS' })];
      const currentTrial = createMockTrial({
        Status: 'RUNNING',
        Execution: [],
        'Time Start': undefined,
        'Time End': undefined,
      });
      render(
        <PaginatedTrialCard trials={trials} currentTrial={currentTrial} />,
      );
      expect(screen.getByText('Trial 2')).toBeInTheDocument();
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows stopped indicator for stopped trial', () => {
      const trials = [createMockTrial({ Status: 'STOPPED' })];
      render(<PaginatedTrialCard trials={trials} />);
      expect(screen.getByText('(stopped)')).toBeInTheDocument();
    });

    it('shows error message when trial has error', () => {
      const trials = [
        createMockTrial({
          Error: {
            message: 'Pipeline failed',
            error: new Error('Pipeline failed'),
          },
        }),
      ];
      render(<PaginatedTrialCard trials={trials} />);
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Pipeline failed')).toBeInTheDocument();
    });

    it('does not show error for "stopped by user" messages', () => {
      const trials = [
        createMockTrial({
          Error: {
            message: 'Pipeline 123 stopped by user.',
            error: new Error('Pipeline 123 stopped by user.'),
          },
        }),
      ];
      render(<PaginatedTrialCard trials={trials} />);
      expect(screen.queryByText('Error:')).not.toBeInTheDocument();
    });

    it('renders template placeholder cards with em-dash status', () => {
      const templateExecutions = [
        createMockExecution({
          dtName: 'hello-world',
          pipelineId: null,
          status: '—',
          executionIndex: 0,
        }),
        createMockExecution({
          dtName: 'hello-world',
          pipelineId: null,
          status: '—',
          executionIndex: 1,
        }),
      ];
      const currentTrial = createMockTrial({
        Status: 'RUNNING',
        Execution: templateExecutions,
      });
      render(<PaginatedTrialCard trials={[]} currentTrial={currentTrial} />);
      const statusElements = screen.getAllByText('—');
      expect(statusElements.length).toBeGreaterThanOrEqual(2);
    });
  });
});
