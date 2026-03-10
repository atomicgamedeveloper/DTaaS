import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Benchmark from 'route/benchmark/Benchmark';
import { setupBenchmarkComponentTest } from './benchmark.testSetup';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; to: string }) => (
    <a {...props}>{children}</a>
  ),
}));

jest.mock('page/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-layout">{children}</div>
  ),
}));

jest.mock('route/benchmark/BenchmarkComponents', () => ({
  TrialCard: ({
    trial,
    trialIndex,
  }: {
    trial: { Status: string };
    trialIndex: number;
  }) => (
    <div data-testid="trial-card">
      Trial {trialIndex + 1} - {trial.Status}
    </div>
  ),
  RunnerTagBadge: ({ runnerTag }: { runnerTag: string }) => (
    <span data-testid="runner-tag-badge">{runnerTag}</span>
  ),
  statusColorMap: {},
  getExecutionStatusColor: jest.fn(() => '#9e9e9e'),
}));

jest.mock('route/benchmark/BenchmarkTable', () => ({
  __esModule: true,
  default: (props: {
    results: unknown[];
    currentTaskIndex: number | null;
    currentExecutions: unknown[];
    onDownloadTask: (t: unknown) => void;
    primaryRunnerTag: string;
    secondaryRunnerTag: string;
  }) => (
    <div data-testid="benchmark-table">
      {(props.results as { 'Task Name': string }[]).map((task) => (
        <div key={task['Task Name']}>
          <span>{task['Task Name']}</span>
          <button onClick={() => props.onDownloadTask(task)}>Download</button>
        </div>
      ))}
    </div>
  ),
  TaskControls: ({
    task,
    onDownloadTask,
  }: {
    task: unknown;
    onDownloadTask: (t: unknown) => void;
  }) => (
    <div data-testid="task-controls">
      <button onClick={() => onDownloadTask(task)}>Download</button>
    </div>
  ),
}));

jest.mock('route/benchmark/BenchmarkControls', () => ({
  __esModule: true,
  default: (props: {
    isRunning: boolean;
    hasStarted: boolean;
    iterations: number;
    completedTasks: number;
    completedTrials: number;
    totalTasks: number;
    onStart: () => void;
    onRestart: () => void;
    onStop: () => void;
    onPurge: () => void;
  }) => (
    <div data-testid="benchmark-controls">
      <span data-testid="is-running">
        {props.isRunning ? 'running' : 'stopped'}
      </span>
      <span data-testid="has-started">
        {props.hasStarted ? 'started' : 'not-started'}
      </span>
      <span data-testid="iterations">{props.iterations}</span>
      <span data-testid="completed-tasks">{props.completedTasks}</span>
      <span data-testid="completed-trials">{props.completedTrials}</span>
      <span data-testid="total-tasks">{props.totalTasks}</span>
      <button data-testid="start-btn" onClick={props.onStart}>
        Start
      </button>
      <button data-testid="restart-btn" onClick={props.onRestart}>
        Restart
      </button>
      <button data-testid="stop-btn" onClick={props.onStop}>
        Stop
      </button>
      <button data-testid="purge-btn" onClick={props.onPurge}>
        Purge
      </button>
    </div>
  ),
  CompletionSummary: ({ results }: { results: unknown[] }) => (
    <div data-testid="completion-summary">Tasks: {results.length}</div>
  ),
}));

const mockStartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockRestartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockStopAllPipelines = jest.fn().mockResolvedValue(undefined);
const mockDownloadTaskResultJson = jest.fn();
const mockPurgeBenchmarkData = jest.fn().mockResolvedValue(undefined);

jest.mock('model/backend/gitlab/measure/benchmark.runner', () => ({
  startMeasurement: (...args: unknown[]) => mockStartMeasurement(...args),
  stopAllPipelines: (...args: unknown[]) => mockStopAllPipelines(...args),
  restartMeasurement: (...args: unknown[]) => mockRestartMeasurement(...args),
  handleBeforeUnload: jest.fn(),
  purgeBenchmarkData: (...args: unknown[]) => mockPurgeBenchmarkData(...args),
}));

jest.mock('model/backend/gitlab/measure/benchmark.utils', () => ({
  getBenchmarkStatus: jest.fn(() => ({
    hasStarted: false,
    completedTasks: 0,
    completedTrials: 0,
    totalTasks: 2,
  })),
  mergeExecutionStatus: jest.fn(() => []),
  areAllBenchmarksComplete: jest.fn(() => false),
  downloadTaskResultJson: (...args: unknown[]) =>
    mockDownloadTaskResultJson(...args),
}));

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => {
  const setup = jest.requireActual('./benchmark.testSetup');
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/benchmark.execution',
  );
  return {
    benchmarkState: { ...setup.MOCK_BENCHMARK_STATE },
    DEFAULT_CONFIG: {},
    DEFAULT_BENCHMARK: actual.DEFAULT_BENCHMARK,
    attachSetters: jest.fn(),
    detachSetters: jest.fn(),
    getTasks: () => setup.MOCK_TASKS,
  };
});

describe('Benchmark', () => {
  beforeEach(() => {
    setupBenchmarkComponentTest();
  });

  const renderBenchmark = () => render(<Benchmark />);

  it('renders the Benchmark page with layout and initial state', () => {
    renderBenchmark();
    expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
    expect(screen.getByText('Digital Twin Benchmark')).toBeInTheDocument();
    expect(screen.getByTestId('is-running')).toHaveTextContent('stopped');
    expect(screen.getByTestId('has-started')).toHaveTextContent('not-started');
    expect(screen.getByTestId('iterations')).toHaveTextContent('3');
  });

  it('renders the benchmark table with tasks', () => {
    renderBenchmark();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-table')).toBeInTheDocument();
  });

  it('calls startMeasurement when Start is clicked', async () => {
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });
    expect(mockStartMeasurement).toHaveBeenCalled();
  });

  it('calls restartMeasurement when Restart is clicked', async () => {
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId('restart-btn'));
    });
    expect(mockRestartMeasurement).toHaveBeenCalled();
  });

  it('calls stopAllPipelines when Stop is clicked', async () => {
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId('stop-btn'));
    });
    expect(mockStopAllPipelines).toHaveBeenCalled();
  });

  it('purges data when Purge is clicked', async () => {
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId('purge-btn'));
    });
    expect(mockPurgeBenchmarkData).toHaveBeenCalled();
  });

  it('renders task status and completion summary correctly', () => {
    renderBenchmark();
    expect(screen.getByTestId('completion-summary')).toBeInTheDocument();
    expect(screen.getByText('Tasks: 2')).toBeInTheDocument();
    expect(screen.getByTestId('completed-tasks')).toHaveTextContent('0');
    expect(screen.getByTestId('total-tasks')).toHaveTextContent('2');
  });

  it('adds and removes beforeunload event listener', () => {
    const addSpy = jest.spyOn(globalThis, 'addEventListener');
    const removeSpy = jest.spyOn(globalThis, 'removeEventListener');
    const { unmount } = renderBenchmark();
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('calls downloadTaskResultJson when download is triggered', async () => {
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getAllByText('Download')[0]);
    });
    expect(mockDownloadTaskResultJson).toHaveBeenCalled();
  });
});
