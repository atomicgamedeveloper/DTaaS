import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ExecutionCard,
  TrialCard,
  PaginatedTrialCard,
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders primary badge with correct text and tooltip', async () => {
    const { RunnerTagBadge } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    render(<RunnerTagBadge runnerTag="linux" variant="primary" />);
    expect(screen.getByText('linux')).toBeInTheDocument();
  });

  it('renders secondary badge with correct text and tooltip', async () => {
    const { RunnerTagBadge } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    render(<RunnerTagBadge runnerTag="windows" variant="secondary" />);
    expect(screen.getByText('windows')).toBeInTheDocument();
  });

  it('returns primary tag when task has no expected executions', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({ Executions: undefined });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

  it('returns primary tag when task has empty expected executions', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({ Executions: () => [] });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

  it('returns primary tag when execution uses primary runner', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({
      Executions: () => [{ dtName: 'test', config: { 'Runner tag': 'linux' } }],
    });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

  it('returns primary tag only when single execution uses one runner', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({
      Executions: () => [
        { dtName: 'test', config: { 'Runner tag': 'windows' } },
      ],
    });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

  it('returns both tags when execution uses both runners', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({
      Executions: () => [
        { dtName: 'test1', config: { 'Runner tag': 'linux' } },
        { dtName: 'test2', config: { 'Runner tag': 'windows' } },
      ],
    });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({
      primaryTag: 'linux',
      secondaryTag: 'windows',
    });
  });

  it('returns primary tag when no runner tag is specified in config', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({
      Executions: () => [{ dtName: 'test', config: {} }],
    });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

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

  it('shows dash when running with no start/end times', () => {
    const trial = createMockTrial({
      Execution: [],
      Status: 'RUNNING',
      'Time Start': undefined,
      'Time End': undefined,
    });
    render(<TrialCard trial={trial} trialIndex={0} />);
    expect(screen.getByText('—')).toBeInTheDocument();
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
    expect(screen.getByText('Pipeline failed with error')).toBeInTheDocument();
  });

  it('does not show error for "stopped by user" messages in TrialCard', () => {
    const trial = createMockTrial({
      Error: {
        message: 'Pipeline 123 stopped by user.',
        error: new Error('Pipeline 123 stopped by user.'),
      },
    });
    render(<TrialCard trial={trial} trialIndex={0} />);
    expect(screen.queryByText('Error:')).not.toBeInTheDocument();
  });

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

  it('disables back button on first trial', () => {
    const trials = [createMockTrial({ Status: 'SUCCESS' })];
    render(<PaginatedTrialCard trials={trials} />);
    expect(screen.getByLabelText('Previous trial')).toBeDisabled();
  });

  it('disables forward button on last trial', () => {
    const trials = [createMockTrial({ Status: 'SUCCESS' })];
    render(<PaginatedTrialCard trials={trials} />);
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
    render(<PaginatedTrialCard trials={trials} currentTrial={currentTrial} />);
    expect(screen.getByText('Trial 2')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows stopped indicator for stopped trial in PaginatedTrialCard', () => {
    const trials = [createMockTrial({ Status: 'STOPPED' })];
    render(<PaginatedTrialCard trials={trials} />);
    expect(screen.getByText('(stopped)')).toBeInTheDocument();
  });

  it('shows error message when trial has error in PaginatedTrialCard', () => {
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

  it('does not show error for "stopped by user" messages in PaginatedTrialCard', () => {
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

  it('renders execution cards within the visible trial', () => {
    const trials = [
      createMockTrial({
        Execution: [
          createMockExecution({ dtName: 'dt-1', pipelineId: 1 }),
          createMockExecution({ dtName: 'dt-2', pipelineId: 2 }),
        ],
      }),
    ];
    render(<PaginatedTrialCard trials={trials} />);
    expect(screen.getByText(/dt-1/)).toBeInTheDocument();
    expect(screen.getByText(/dt-2/)).toBeInTheDocument();
  });

  it('shows time when trial has start and end times', () => {
    mockSecondsDifference.mockReturnValue(10);
    const trials = [
      createMockTrial({
        'Time Start': new Date('2026-01-01T10:00:00.000Z'),
        'Time End': new Date('2026-01-01T10:00:10.000Z'),
      }),
    ];
    render(<PaginatedTrialCard trials={trials} />);
    expect(screen.getByText('10.0s')).toBeInTheDocument();
    mockSecondsDifference.mockRestore();
  });

  it('shows dash when trial has no times', () => {
    const trials = [
      createMockTrial({
        'Time Start': undefined,
        'Time End': undefined,
      }),
    ];
    render(<PaginatedTrialCard trials={trials} />);
    expect(screen.getByText('—')).toBeInTheDocument();
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
    // One for the trial time dash + two for execution status dashes
    expect(statusElements.length).toBeGreaterThanOrEqual(2);
  });

  it('shows dash when task has no completed trials', () => {
    const task = createMockTask({ Trials: [], ExpectedTrials: 3 });
    render(<TaskControls task={task} onDownloadTask={jest.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows download link when at least one trial is complete and calls handler on click', () => {
    const mockDownload = jest.fn();
    const task = createMockTask({
      Trials: [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'FAILURE' }),
      ],
      ExpectedTrials: 3,
    });
    render(<TaskControls task={task} onDownloadTask={mockDownload} />);
    const downloadLink = screen.getByText('Download Task Results');
    expect(downloadLink).toBeInTheDocument();
    fireEvent.click(downloadLink);
    expect(mockDownload).toHaveBeenCalledWith(task);
  });

  it('shows download when at least one trial is complete even if ExpectedTrials is not reached', () => {
    const task = createMockTask({
      Trials: [createMockTrial({ Status: 'SUCCESS' })],
      ExpectedTrials: 5,
    });
    render(<TaskControls task={task} onDownloadTask={jest.fn()} />);
    expect(screen.getByText('Download Task Results')).toBeInTheDocument();
  });

  it('renders the page title and description', () => {
    render(<BenchmarkPageHeader />);
    expect(screen.getByText('Digital Twin Benchmark')).toBeInTheDocument();
    expect(
      screen.getByText(/Run performance benchmarks for Digital Twin/),
    ).toBeInTheDocument();
  });

  const defaultControlProps = {
    isRunning: false,
    hasStarted: false,
    hasStopped: false,
    iterations: 3,
    completedTasks: 0,
    completedTrials: 0,
    totalTasks: 5,
    onStart: jest.fn(),
    onContinue: jest.fn(),
    onRestart: jest.fn(),
    onStop: jest.fn(),
    onPurge: jest.fn(),
  };

  it.each([
    [false, 0, 0, 5, 3, '0/15'],
    [true, 2, 6, 5, 3, '6/15'],
    [true, 5, 15, 5, 3, '15/15'],
    [true, 0, 0, 3, 3, '0/9'],
    [true, 0, 1, 5, 3, '1/15'],
  ])(
    'shows trial counter (hasStarted=%s, completedTasks=%s, completedTrials=%s, total=%s, iter=%s) as %s',
    (hasStarted, completedTasks, completedTrials, totalTasks, iterations, expected) => {
      render(
        <BenchmarkControls
          {...defaultControlProps}
          hasStarted={hasStarted}
          completedTasks={completedTasks}
          completedTrials={completedTrials}
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
    render(<BenchmarkControls {...defaultControlProps} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('shows Stop button when running', () => {
    render(<BenchmarkControls {...defaultControlProps} isRunning={true} />);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('shows Continue button when stopped', () => {
    render(<BenchmarkControls {...defaultControlProps} hasStopped={true} />);
    expect(
      screen.getByRole('button', { name: 'Continue' }),
    ).toBeInTheDocument();
  });

  it('calls onStart when Start button is clicked', () => {
    const onStart = jest.fn();
    render(<BenchmarkControls {...defaultControlProps} onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalled();
  });

  it('calls onContinue when Continue button is clicked', () => {
    const onContinue = jest.fn();
    render(
      <BenchmarkControls
        {...defaultControlProps}
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
        ...defaultControlProps,
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
        ...defaultControlProps,
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
      <BenchmarkControls {...defaultControlProps} hasStarted={false} />,
    );
    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();

    rerender(
      <BenchmarkControls
        {...defaultControlProps}
        hasStarted={true}
        isRunning={true}
      />,
    );
    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
  });

  it('disables Purge button when running', () => {
    render(<BenchmarkControls {...defaultControlProps} isRunning={true} />);
    expect(screen.getByRole('button', { name: 'Purge' })).toBeDisabled();
  });

  it('disables Start button when all tasks are complete', () => {
    render(
      <BenchmarkControls
        {...defaultControlProps}
        completedTasks={5}
        totalTasks={5}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('enables Start button when not all tasks are complete', () => {
    render(
      <BenchmarkControls
        {...defaultControlProps}
        completedTasks={3}
        totalTasks={5}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
  });

  it('shows "Click Start to generate benchmark data" when benchmark has not started', () => {
    mockGetTotalTime.mockReset();
    mockDownloadResultsJson.mockReset();
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
    mockGetTotalTime.mockReset();
    mockDownloadResultsJson.mockReset();
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
    mockGetTotalTime.mockReset();
    mockDownloadResultsJson.mockReset();
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
    mockGetTotalTime.mockReset();
    mockDownloadResultsJson.mockReset();
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
    mockGetTotalTime.mockReset();
    mockDownloadResultsJson.mockReset();
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
