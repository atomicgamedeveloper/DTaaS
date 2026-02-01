import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ExecutionCard,
  TrialCard,
  TaskControls,
  BenchmarkPageHeader,
  BenchmarkControls,
  CompletionSummary,
} from 'route/benchmark/BenchmarkComponents';
import {
  createMockExecution,
  createMockTrial,
  createMockTaskPending as createMockTask,
} from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';

jest.mock('model/backend/gitlab/measure/benchmark.runner', () => {
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/benchmark.runner',
  );
  return {
    ...actual,
    secondsDifference: jest.fn((start?: Date, end?: Date) => {
      if (!start || !end) return undefined;
      return (end.getTime() - start.getTime()) / 1000;
    }),
    getTotalTime: jest.fn(),
    downloadResultsJson: jest.fn(),
  };
});

const mockRunner = jest.requireMock(
  'model/backend/gitlab/measure/benchmark.runner',
);
const mockGetTotalTime = mockRunner.getTotalTime as jest.Mock;
const mockDownloadResultsJson = mockRunner.downloadResultsJson as jest.Mock;
const mockSecondsDifference = mockRunner.secondsDifference as jest.Mock;

describe('BenchmarkComponents', () => {
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

    it('shows "Starting..." when running with no executions', () => {
      const trial = createMockTrial({ Execution: [], Status: 'RUNNING' });
      render(<TrialCard trial={trial} trialIndex={0} />);
      expect(screen.getByText('Starting...')).toBeInTheDocument();
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

    it('shows error message when trial has error (but not for stopped by user)', () => {
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

  describe('TaskControls', () => {
    it('shows dash when task cannot be downloaded', () => {
      const task = createMockTask({ Trials: [], ExpectedTrials: 3 });
      render(<TaskControls task={task} onDownloadTask={jest.fn()} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows download link when all expected trials are complete and calls handler on click', () => {
      const mockDownload = jest.fn();
      const task = createMockTask({
        Trials: [
          createMockTrial({ Status: 'SUCCESS' }),
          createMockTrial({ Status: 'FAILURE' }),
        ],
        ExpectedTrials: 2,
      });
      render(<TaskControls task={task} onDownloadTask={mockDownload} />);
      const downloadLink = screen.getByText('Download Task Results');
      expect(downloadLink).toBeInTheDocument();
      fireEvent.click(downloadLink);
      expect(mockDownload).toHaveBeenCalledWith(task);
    });

    it('does not show download when ExpectedTrials is 0', () => {
      const task = createMockTask({
        Trials: [createMockTrial({ Status: 'SUCCESS' })],
        ExpectedTrials: 0,
      });
      render(<TaskControls task={task} onDownloadTask={jest.fn()} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('BenchmarkPageHeader', () => {
    it('renders the page title and description', () => {
      render(<BenchmarkPageHeader />);
      expect(screen.getByText('Digital Twin Benchmark')).toBeInTheDocument();
      expect(
        screen.getByText(/Run performance benchmarks for Digital Twin/),
      ).toBeInTheDocument();
    });
  });

  describe('BenchmarkControls', () => {
    const defaultProps = {
      isRunning: false,
      hasStarted: false,
      hasStopped: false,
      iterations: 3,
      alternateRunnerTag: 'windows',
      completedTasks: 0,
      totalTasks: 5,
      onIterationsChange: jest.fn(),
      onAlternateRunnerTagChange: jest.fn(),
      onStart: jest.fn(),
      onContinue: jest.fn(),
      onRestart: jest.fn(),
      onStop: jest.fn(),
      onPurge: jest.fn(),
    };

    beforeEach(() => jest.clearAllMocks());

    it.each([
      [false, 0, 5, 3, '0/15'],
      [true, 2, 5, 3, '6/15'],
      [true, 5, 5, 3, '15/15'],
      [true, 0, 3, 3, '0/9'],
    ])(
      'shows trial counter (hasStarted=%s, completed=%s, total=%s, iter=%s) as %s',
      (hasStarted, completedTasks, totalTasks, iterations, expected) => {
        render(
          <BenchmarkControls
            {...defaultProps}
            hasStarted={hasStarted}
            completedTasks={completedTasks}
            totalTasks={totalTasks}
            iterations={iterations}
          />,
        );
        expect(
          screen.getByText(`Trials Completed: ${expected}`),
        ).toBeInTheDocument();
      },
    );

    it('shows Start button when not running and not stopped', () => {
      render(<BenchmarkControls {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });

    it('shows Stop button when running', () => {
      render(<BenchmarkControls {...defaultProps} isRunning={true} />);
      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    });

    it('shows Continue button when stopped', () => {
      render(<BenchmarkControls {...defaultProps} hasStopped={true} />);
      expect(
        screen.getByRole('button', { name: 'Continue' }),
      ).toBeInTheDocument();
    });

    it('calls onStart when Start button is clicked', () => {
      const onStart = jest.fn();
      render(<BenchmarkControls {...defaultProps} onStart={onStart} />);
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      expect(onStart).toHaveBeenCalled();
    });

    it('calls onContinue when Continue button is clicked', () => {
      const onContinue = jest.fn();
      render(
        <BenchmarkControls
          {...defaultProps}
          hasStopped={true}
          onContinue={onContinue}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(onContinue).toHaveBeenCalled();
    });

    it.each([
      [
        'Stop',
        'isRunning',
        'Stop Benchmark?',
        /Are you sure you want to stop the benchmark/,
        'onStop',
      ],
      ['Restart', 'hasStarted', 'Restart Benchmark?', /restart/, 'onRestart'],
      [
        'Purge',
        'none',
        'Purge Benchmark Data?',
        /Are you sure you want to purge all benchmark data/,
        'onPurge',
      ],
    ])(
      'shows %s confirmation dialog and calls handler on confirm',
      (btnName, propKey, dialogTitle, dialogText, handlerKey) => {
        const handler = jest.fn();
        const props = {
          ...defaultProps,
          [handlerKey]: handler,
          ...(propKey === 'none' ? {} : { [propKey]: true }),
        };
        render(<BenchmarkControls {...props} />);

        fireEvent.click(screen.getByRole('button', { name: btnName }));
        expect(screen.getByText(dialogTitle)).toBeInTheDocument();
        expect(screen.getByText(dialogText)).toBeInTheDocument();

        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: btnName }));
        expect(handler).toHaveBeenCalled();
      },
    );

    it.each([
      ['Stop', 'isRunning', 'onStop'],
      ['Restart', 'hasStarted', 'onRestart'],
      ['Purge', 'none', 'onPurge'],
    ])(
      'does not call %s handler when dialog is cancelled',
      (btnName, propKey, handlerKey) => {
        const handler = jest.fn();
        const props = {
          ...defaultProps,
          [handlerKey]: handler,
          ...(propKey === 'none' ? {} : { [propKey]: true }),
        };
        render(<BenchmarkControls {...props} />);

        fireEvent.click(screen.getByRole('button', { name: btnName }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it('disables Restart button when not started or when running', () => {
      const { rerender } = render(
        <BenchmarkControls {...defaultProps} hasStarted={false} />,
      );
      expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();

      rerender(
        <BenchmarkControls
          {...defaultProps}
          hasStarted={true}
          isRunning={true}
        />,
      );
      expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
    });

    it('disables Purge button when running', () => {
      render(<BenchmarkControls {...defaultProps} isRunning={true} />);
      expect(screen.getByRole('button', { name: 'Purge' })).toBeDisabled();
    });

    it('disables Start button when all tasks are complete', () => {
      render(
        <BenchmarkControls
          {...defaultProps}
          completedTasks={5}
          totalTasks={5}
        />,
      );
      expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    });

    it('enables Start button when not all tasks are complete', () => {
      render(
        <BenchmarkControls
          {...defaultProps}
          completedTasks={3}
          totalTasks={5}
        />,
      );
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    it('updates iterations when changed (but not for values < 1)', () => {
      const onIterationsChange = jest.fn();
      render(
        <BenchmarkControls
          {...defaultProps}
          onIterationsChange={onIterationsChange}
        />,
      );
      const iterationsInput = screen.getByLabelText('Trials');

      fireEvent.change(iterationsInput, { target: { value: '5' } });
      expect(onIterationsChange).toHaveBeenCalledWith(5);

      onIterationsChange.mockClear();
      fireEvent.change(iterationsInput, { target: { value: '0' } });
      expect(onIterationsChange).not.toHaveBeenCalled();
    });

    it('calls onAlternateRunnerTagChange when runner tag is changed', () => {
      const onAlternateRunnerTagChange = jest.fn();
      render(
        <BenchmarkControls
          {...defaultProps}
          onAlternateRunnerTagChange={onAlternateRunnerTagChange}
        />,
      );
      fireEvent.change(screen.getByLabelText('Secondary Runner Tag'), {
        target: { value: 'custom-runner' },
      });
      expect(onAlternateRunnerTagChange).toHaveBeenCalledWith('custom-runner');
    });

    it('disables inputs when running', () => {
      render(<BenchmarkControls {...defaultProps} isRunning={true} />);
      expect(screen.getByLabelText('Trials')).toBeDisabled();
      expect(screen.getByLabelText('Secondary Runner Tag')).toBeDisabled();
    });
  });

  describe('CompletionSummary', () => {
    beforeEach(() => {
      mockGetTotalTime.mockReset();
      mockDownloadResultsJson.mockReset();
    });

    it('shows "Click Start to generate benchmark data" when benchmark has not started', () => {
      mockGetTotalTime.mockReturnValue(null);
      const results = [createMockTask({ Status: 'NOT_STARTED' })];
      render(
        <CompletionSummary
          results={results}
          isRunning={false}
          hasStarted={false}
        />,
      );
      expect(
        screen.getByText('Click Start to generate benchmark data'),
      ).toBeInTheDocument();
    });

    it('shows "Benchmark data generation in progress" when benchmark is running', () => {
      mockGetTotalTime.mockReturnValue(null);
      const results = [createMockTask({ Status: 'RUNNING' })];
      render(
        <CompletionSummary
          results={results}
          isRunning={true}
          hasStarted={true}
        />,
      );
      expect(
        screen.getByText('Benchmark data generation in progress'),
      ).toBeInTheDocument();
    });

    it('shows "Benchmark data generation in progress" when benchmark has started but not complete', () => {
      mockGetTotalTime.mockReturnValue(null);
      const results = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'PENDING' }),
      ];
      render(
        <CompletionSummary
          results={results}
          isRunning={false}
          hasStarted={true}
        />,
      );
      expect(
        screen.getByText('Benchmark data generation in progress'),
      ).toBeInTheDocument();
    });

    it('renders completion summary and download link when all tasks are complete', () => {
      mockGetTotalTime.mockReturnValue(45.5);
      const results = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'SUCCESS' }),
      ];
      render(
        <CompletionSummary
          results={results}
          isRunning={false}
          hasStarted={true}
        />,
      );
      expect(screen.getByText(/Completed in 45.5s/)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Download JSON'));
      expect(mockDownloadResultsJson).toHaveBeenCalledWith(results);
    });

    it('renders completion summary when all tasks are complete (mix of SUCCESS and FAILURE)', () => {
      mockGetTotalTime.mockReturnValue(30);
      const results = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'FAILURE' }),
      ];
      render(
        <CompletionSummary
          results={results}
          isRunning={false}
          hasStarted={true}
        />,
      );
      expect(screen.getByText(/Completed in 30.0s/)).toBeInTheDocument();
      expect(screen.getByText('Download JSON')).toBeInTheDocument();
    });
  });
});
