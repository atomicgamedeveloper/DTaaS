import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import {
  TaskControls,
  BenchmarkPageHeader,
  CompletionSummary,
} from 'route/benchmark/BenchmarkComponents';
import {
  createMockTrial,
  createMockTaskPending as createMockTask,
} from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';

jest.mock('model/backend/gitlab/measure/benchmark.utils', () => {
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/benchmark.utils',
  );
  return {
    ...actual,
    getTotalTime: jest.fn(),
    downloadResultsJson: jest.fn(),
  };
});

const mockUtils = jest.requireMock(
  'model/backend/gitlab/measure/benchmark.utils',
);
const mockGetTotalTime = mockUtils.getTotalTime as jest.Mock;
const mockDownloadResultsJson = mockUtils.downloadResultsJson as jest.Mock;

describe('BenchmarkComponents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders primary badge with correct text', async () => {
    const { RunnerTagBadge } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    render(<RunnerTagBadge runnerTag="linux" variant="primary" />);
    expect(screen.getByText('linux')).toBeInTheDocument();
  });

  it('renders secondary badge with correct text', async () => {
    const { RunnerTagBadge } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    render(<RunnerTagBadge runnerTag="windows" variant="secondary" />);
    expect(screen.getByText('windows')).toBeInTheDocument();
  });

  it('returns only primary tag when task has no explicit runner configs', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({ Executions: undefined });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

  it('returns both tags when task executions have explicit Runner tag configs', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({
      Executions: () => [
        { dtName: 'hello-world', config: { 'Runner tag': 'linux' } },
        { dtName: 'hello-world', config: { 'Runner tag': 'windows' } },
      ],
    });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: 'windows' });
  });

  it('returns both tags even when they have the same value', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({
      Executions: () => [{ dtName: 'test', config: { 'Runner tag': 'linux' } }],
    });
    const result = getRunnerTags(task, 'linux', 'linux');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: 'linux' });
  });

  it('returns null secondary tag when secondary tag is empty', async () => {
    const { getRunnerTags } = await import(
      'route/benchmark/BenchmarkComponents'
    );
    const task = createMockTask({ Executions: () => [] });
    const result = getRunnerTags(task, 'linux', '');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

  it('shows dash when task has no completed trials', () => {
    const task = createMockTask({ Trials: [], ExpectedTrials: 3 });
    render(<TaskControls task={task} onDownloadTask={jest.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows download link when at least one trial is complete', () => {
    const mockDownload = jest.fn();
    const task = createMockTask({
      Trials: [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'FAILURE' }),
      ],
      ExpectedTrials: 3,
    });
    render(<TaskControls task={task} onDownloadTask={mockDownload} />);
    const link = screen.getByText('Download Task Results');
    expect(link).toBeInTheDocument();
    fireEvent.click(link);
    expect(mockDownload).toHaveBeenCalledWith(task);
  });

  it('renders the page title and description', () => {
    render(<MemoryRouter><BenchmarkPageHeader /></MemoryRouter>);
    expect(screen.getByText('Digital Twin Benchmark')).toBeInTheDocument();
    expect(
      screen.getByText(/Run performance benchmarks for Digital Twin/),
    ).toBeInTheDocument();
  });

  it('shows "Click Start" when benchmark has not started', () => {
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

  it('shows "in progress" when benchmark is running', () => {
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

  it('shows "in progress" when started but not complete', () => {
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

  it('shows completion summary with download link when all complete', () => {
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

  it('shows completion summary for mix of SUCCESS and FAILURE', () => {
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
