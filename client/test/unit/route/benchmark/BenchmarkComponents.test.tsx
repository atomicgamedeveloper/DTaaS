import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ExecutionCard,
  TrialCard,
  TaskControls,
  BenchmarkPageHeader,
  CompletionSummary,
} from 'route/benchmark/BenchmarkComponents';
import {
  createMockExecution,
  createMockTrial,
  createMockTaskPending as createMockTask,
} from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';

jest.mock('model/backend/gitlab/measure/benchmark.runner', () => ({
  statusColorMap: {
    PENDING: '#9e9e9e',
    RUNNING: '#1976d2',
    FAILURE: '#d32f2f',
    SUCCESS: '#1976d2',
    STOPPED: '#616161',
  },
  secondsDifference: jest.fn((start?: Date, end?: Date) => {
    if (!start || !end) return undefined;
    return (end.getTime() - start.getTime()) / 1000;
  }),
  getExecutionStatusColor: jest.fn((status: string) => {
    const colorMap: Record<string, string> = {
      success: '#1976d2',
      failed: '#d32f2f',
      cancelled: '#616161',
    };
    return colorMap[status] ?? '#9e9e9e';
  }),
  getTotalTime: jest.fn(),
  downloadResultsJson: jest.fn(),
}));

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

    it('applies correct status color', () => {
      const execution = createMockExecution({ status: 'failed' });

      render(<ExecutionCard execution={execution} />);

      const statusElement = screen.getByText('failed');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('TrialCard', () => {
    it('renders trial number correctly', () => {
      const trial = createMockTrial();

      render(<TrialCard trial={trial} trialIndex={0} />);

      expect(screen.getByText('Trial 1')).toBeInTheDocument();
    });

    it('renders time difference when both start and end times exist', () => {
      mockSecondsDifference.mockReturnValue(10);
      const trial = createMockTrial({
        'Time Start': new Date('2026-01-01T10:00:00.000Z'),
        'Time End': new Date('2026-01-01T10:00:10.000Z'),
      });

      render(<TrialCard trial={trial} trialIndex={0} />);

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
      const trial = createMockTrial({
        Execution: [],
        Status: 'RUNNING',
      });

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

    it('shows error message when trial has error', () => {
      const trial = createMockTrial({
        Error: {
          message: 'Pipeline failed with error',
          error: new Error('Pipeline failed with error'),
        },
      });

      render(<TrialCard trial={trial} trialIndex={0} />);

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
      const task = createMockTask({
        Trials: [],
        ExpectedTrials: 3,
      });

      render(<TaskControls task={task} onDownloadTask={jest.fn()} />);

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows download link when all expected trials are complete', () => {
      const task = createMockTask({
        Trials: [
          createMockTrial({ Status: 'SUCCESS' }),
          createMockTrial({ Status: 'SUCCESS' }),
          createMockTrial({ Status: 'SUCCESS' }),
        ],
        ExpectedTrials: 3,
      });

      render(<TaskControls task={task} onDownloadTask={jest.fn()} />);

      expect(screen.getByText('Download Task Results')).toBeInTheDocument();
    });

    it('calls onDownloadTask when download link is clicked', () => {
      const mockDownload = jest.fn();
      const task = createMockTask({
        Trials: [
          createMockTrial({ Status: 'SUCCESS' }),
          createMockTrial({ Status: 'FAILURE' }),
        ],
        ExpectedTrials: 2,
      });

      render(<TaskControls task={task} onDownloadTask={mockDownload} />);

      fireEvent.click(screen.getByText('Download Task Results'));

      expect(mockDownload).toHaveBeenCalledWith(task);
    });

    it('allows download when trials include FAILURE status', () => {
      const task = createMockTask({
        Trials: [
          createMockTrial({ Status: 'SUCCESS' }),
          createMockTrial({ Status: 'FAILURE' }),
        ],
        ExpectedTrials: 2,
      });

      render(<TaskControls task={task} onDownloadTask={jest.fn()} />);

      expect(screen.getByText('Download Task Results')).toBeInTheDocument();
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
    const defaultProps = {
      isRunning: false,
      hasStarted: false,
      hasStopped: false,
      iterations: 3,
      alternateRunnerTag: 'windows',
      onIterationsChange: jest.fn(),
      onAlternateRunnerTagChange: jest.fn(),
      onStart: jest.fn(),
      onContinue: jest.fn(),
      onRestart: jest.fn(),
      onStop: jest.fn(),
      onPurge: jest.fn(),
      onSettingsSaved: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders the page title', () => {
      render(<BenchmarkPageHeader {...defaultProps} />);

      expect(screen.getByText('Digital Twin Benchmark')).toBeInTheDocument();
    });

    it('shows Start button when not running and not stopped', () => {
      render(<BenchmarkPageHeader {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });

    it('shows Stop button when running', () => {
      render(<BenchmarkPageHeader {...defaultProps} isRunning={true} />);

      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    });

    it('shows Continue button when stopped', () => {
      render(<BenchmarkPageHeader {...defaultProps} hasStopped={true} />);

      expect(
        screen.getByRole('button', { name: 'Continue' }),
      ).toBeInTheDocument();
    });

    it('calls onStart when Start button is clicked', () => {
      const onStart = jest.fn();
      render(<BenchmarkPageHeader {...defaultProps} onStart={onStart} />);

      fireEvent.click(screen.getByRole('button', { name: 'Start' }));

      expect(onStart).toHaveBeenCalled();
    });

    it('calls onContinue when Continue button is clicked', () => {
      const onContinue = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          hasStopped={true}
          onContinue={onContinue}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(onContinue).toHaveBeenCalled();
    });

    it('shows stop confirmation dialog when Stop is clicked', () => {
      render(<BenchmarkPageHeader {...defaultProps} isRunning={true} />);

      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

      expect(screen.getByText('Stop Benchmark?')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to stop the benchmark/),
      ).toBeInTheDocument();
    });

    it('calls onStop when stop is confirmed', () => {
      const onStop = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          isRunning={true}
          onStop={onStop}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

      const dialog = screen.getByRole('dialog');
      const confirmButton = within(dialog).getByRole('button', {
        name: 'Stop',
      });
      fireEvent.click(confirmButton);

      expect(onStop).toHaveBeenCalled();
    });

    it('does not call onStop when dialog is cancelled', () => {
      const onStop = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          isRunning={true}
          onStop={onStop}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onStop).not.toHaveBeenCalled();
    });

    it('shows restart confirmation dialog when Restart is clicked', () => {
      render(<BenchmarkPageHeader {...defaultProps} hasStarted={true} />);

      fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

      expect(screen.getByText('Restart Benchmark?')).toBeInTheDocument();
    });

    it('calls onRestart when restart is confirmed', () => {
      const onRestart = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          hasStarted={true}
          onRestart={onRestart}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

      const dialog = screen.getByRole('dialog');
      const confirmButton = within(dialog).getByRole('button', {
        name: 'Restart',
      });
      fireEvent.click(confirmButton);

      expect(onRestart).toHaveBeenCalled();
    });

    it('does not call onRestart when dialog is cancelled', () => {
      const onRestart = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          hasStarted={true}
          onRestart={onRestart}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onRestart).not.toHaveBeenCalled();
    });

    it('disables Restart button when not started', () => {
      render(<BenchmarkPageHeader {...defaultProps} hasStarted={false} />);

      expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
    });

    it('disables Restart button when running', () => {
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          hasStarted={true}
          isRunning={true}
        />,
      );

      expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
    });

    it('calls onPurge when Purge button is clicked', () => {
      const onPurge = jest.fn();
      render(<BenchmarkPageHeader {...defaultProps} onPurge={onPurge} />);

      fireEvent.click(screen.getByRole('button', { name: 'Purge' }));

      expect(onPurge).toHaveBeenCalled();
    });

    it('disables Purge button when running', () => {
      render(<BenchmarkPageHeader {...defaultProps} isRunning={true} />);

      expect(screen.getByRole('button', { name: 'Purge' })).toBeDisabled();
    });

    it('updates iterations and calls onSettingsSaved', () => {
      const onIterationsChange = jest.fn();
      const onSettingsSaved = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          onIterationsChange={onIterationsChange}
          onSettingsSaved={onSettingsSaved}
        />,
      );

      const iterationsInput = screen.getByLabelText('Iterations');
      fireEvent.change(iterationsInput, { target: { value: '5' } });

      expect(onIterationsChange).toHaveBeenCalledWith(5);
      expect(onSettingsSaved).toHaveBeenCalled();
    });

    it('does not update iterations when value is less than 1', () => {
      const onIterationsChange = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          onIterationsChange={onIterationsChange}
        />,
      );

      const iterationsInput = screen.getByLabelText('Iterations');
      fireEvent.change(iterationsInput, { target: { value: '0' } });

      expect(onIterationsChange).not.toHaveBeenCalled();
    });

    it('calls onAlternateRunnerTagChange when runner tag is changed', () => {
      const onAlternateRunnerTagChange = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          onAlternateRunnerTagChange={onAlternateRunnerTagChange}
        />,
      );

      const runnerTagInput = screen.getByLabelText('Secondary Runner Tag');
      fireEvent.change(runnerTagInput, { target: { value: 'custom-runner' } });

      expect(onAlternateRunnerTagChange).toHaveBeenCalledWith('custom-runner');
    });

    it('does not call onSettingsSaved on blur when value unchanged', () => {
      const onSettingsSaved = jest.fn();
      render(
        <BenchmarkPageHeader
          {...defaultProps}
          alternateRunnerTag="windows"
          onSettingsSaved={onSettingsSaved}
        />,
      );

      const runnerTagInput = screen.getByLabelText('Secondary Runner Tag');
      fireEvent.blur(runnerTagInput);

      // Should not call onSettingsSaved since value hasn't changed
      expect(onSettingsSaved).not.toHaveBeenCalled();
    });

    it('disables inputs when running', () => {
      render(<BenchmarkPageHeader {...defaultProps} isRunning={true} />);

      expect(screen.getByLabelText('Iterations')).toBeDisabled();
      expect(screen.getByLabelText('Secondary Runner Tag')).toBeDisabled();
    });
  });

  describe('CompletionSummary', () => {
    beforeEach(() => {
      mockGetTotalTime.mockReset();
      mockDownloadResultsJson.mockReset();
    });

    it('returns null when not all tasks are successful', () => {
      mockGetTotalTime.mockReturnValue(null);
      const results = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'FAILURE' }),
      ];

      const { container } = render(<CompletionSummary results={results} />);

      expect(container.firstChild).toBeNull();
    });

    it('returns null when total time is null', () => {
      mockGetTotalTime.mockReturnValue(null);

      const results = [createMockTask({ Status: 'SUCCESS' })];

      const { container } = render(<CompletionSummary results={results} />);

      expect(container.firstChild).toBeNull();
    });

    it('renders completion summary when all tasks are successful', () => {
      mockGetTotalTime.mockReturnValue(45.5);
      const results = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'SUCCESS' }),
      ];

      render(<CompletionSummary results={results} />);

      expect(screen.getByText(/Completed in 45.5s/)).toBeInTheDocument();
      expect(screen.getByText('Download JSON')).toBeInTheDocument();
    });

    it('calls downloadResultsJson when download link is clicked', () => {
      mockGetTotalTime.mockReturnValue(45.5);
      const results = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'SUCCESS' }),
      ];

      render(<CompletionSummary results={results} />);

      fireEvent.click(screen.getByText('Download JSON'));

      expect(mockDownloadResultsJson).toHaveBeenCalledWith(results);
    });
  });
});
