import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Benchmark from 'route/benchmark/Benchmark';
import { DEFAULT_SETTINGS } from 'store/settings.slice';
import { DEFAULT_BENCHMARK } from 'store/benchmark.slice';
import { useSelector, useDispatch } from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('page/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-layout">{children}</div>
  ),
}));

jest.mock('route/benchmark/BenchmarkComponents', () => ({
  PaginatedTrialCard: ({
    trials,
    currentTrial,
  }: {
    trials: { Status: string }[];
    currentTrial?: { Status: string };
  }) => {
    const all = currentTrial ? [...trials, currentTrial] : trials;
    return (
      <div data-testid="paginated-trial-card">
        {all.map((t, i) => (
          <div key={i} data-testid={`trial-card-${i}`}>
            Trial {i + 1} - {t.Status}
          </div>
        ))}
      </div>
    );
  },
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
  BenchmarkPageHeader: () => (
    <div data-testid="benchmark-header">Digital Twin Benchmark</div>
  ),
  BenchmarkControls: (p: {
    isRunning: boolean;
    hasStarted: boolean;
    hasStopped: boolean;
    iterations: number;
    completedTasks: number;
    completedTrials: number;
    totalTasks: number;
    onStart: () => void;
    onContinue: () => void;
    onRestart: () => void;
    onStop: () => void;
    onPurge: () => void;
  }) => (
    <div data-testid="benchmark-controls">
      <span data-testid="is-running">
        {p.isRunning ? 'running' : 'stopped'}
      </span>
      <span data-testid="has-started">
        {p.hasStarted ? 'started' : 'not-started'}
      </span>
      <span data-testid="has-stopped">
        {p.hasStopped ? 'has-stopped' : 'not-stopped'}
      </span>
      <span data-testid="iterations">{p.iterations}</span>
      <span data-testid="completed-tasks">{p.completedTasks}</span>
      <span data-testid="completed-trials">{p.completedTrials}</span>
      <span data-testid="total-tasks">{p.totalTasks}</span>
      <button data-testid="start-btn" onClick={p.onStart}>
        Start
      </button>
      <button data-testid="continue-btn" onClick={p.onContinue}>
        Continue
      </button>
      <button data-testid="restart-btn" onClick={p.onRestart}>
        Restart
      </button>
      <button data-testid="stop-btn" onClick={p.onStop}>
        Stop
      </button>
      <button data-testid="purge-btn" onClick={p.onPurge}>
        Purge
      </button>
    </div>
  ),
  CompletionSummary: ({ results }: { results: unknown[] }) => (
    <div data-testid="completion-summary">Tasks: {results.length}</div>
  ),
  RunnerTagBadge: ({ runnerTag }: { runnerTag: string }) => (
    <span data-testid="runner-tag-badge">{runnerTag}</span>
  ),
  getRunnerTags: () => ({ primaryTag: null, secondaryTag: null }),
  statusColorMap: {},
  getExecutionStatusColor: jest.fn(() => '#9e9e9e'),
}));

const mockStartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockContinueMeasurement = jest.fn().mockResolvedValue(undefined);
const mockRestartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockStopAllPipelines = jest.fn().mockResolvedValue(undefined);
const mockDownloadTaskResultJson = jest.fn();

jest.mock('model/backend/gitlab/measure/benchmark.lifecycle', () => ({
  continueMeasurement: (...args: unknown[]) => mockContinueMeasurement(...args),
  restartMeasurement: (...args: unknown[]) => mockRestartMeasurement(...args),
  handleBeforeUnload: jest.fn(),
}));

jest.mock('model/backend/gitlab/measure/benchmark.runner', () => ({
  startMeasurement: (...args: unknown[]) => mockStartMeasurement(...args),
  stopAllPipelines: (...args: unknown[]) => mockStopAllPipelines(...args),
  downloadTaskResultJson: (...args: unknown[]) =>
    mockDownloadTaskResultJson(...args),
  tasks: [
    {
      'Task Name': 'Task 1',
      Description: 'First task',
      Trials: [],
      Status: 'NOT_STARTED',
      Executions: () => [{ dtName: 'hello-world', config: {} }],
    },
    {
      'Task Name': 'Task 2',
      Description: 'Second task',
      Trials: [],
      Status: 'NOT_STARTED',
      Executions: () => [{ dtName: 'hello-world', config: {} }],
    },
  ],
}));

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => ({
  benchmarkState: {
    activePipelines: [],
    executionResults: [],
    isRunning: false,
    results: null,
    currentTaskIndexUI: null,
    _componentSetters: null,
  },
  DEFAULT_CONFIG: {},
  attachSetters: jest.fn(),
  detachSetters: jest.fn(),
}));

jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: { purge: jest.fn().mockResolvedValue(undefined) },
}));

describe('Benchmark', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    (useSelector as unknown as jest.Mock).mockImplementation(
      (
        selector: (state: {
          settings: typeof DEFAULT_SETTINGS;
          benchmark: typeof DEFAULT_BENCHMARK;
          snackbar: { open: boolean; message: string; severity: string };
        }) => unknown,
      ) =>
        selector({
          settings: DEFAULT_SETTINGS,
          benchmark: DEFAULT_BENCHMARK,
          snackbar: { open: false, message: '', severity: 'info' },
        }),
    );
    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);
  });

  const renderBenchmark = () => render(<Benchmark />);

  it('renders the Benchmark page with layout and initial state', () => {
    renderBenchmark();
    expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-header')).toBeInTheDocument();
    expect(screen.getByTestId('is-running')).toHaveTextContent('stopped');
    expect(screen.getByTestId('has-started')).toHaveTextContent('not-started');
    expect(screen.getByTestId('iterations')).toHaveTextContent('3');
  });

  it('renders the benchmark table with tasks and headers', () => {
    renderBenchmark();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Average Duration')).toBeInTheDocument();
    expect(screen.getByText('Trials')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('calls startMeasurement when Start is clicked', async () => {
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });
    expect(mockStartMeasurement).toHaveBeenCalled();
  });

  it('calls continueMeasurement when Continue is clicked', async () => {
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId('continue-btn'));
    });
    expect(mockContinueMeasurement).toHaveBeenCalled();
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
    const measurementDBService = jest.requireMock(
      'database/measurementHistoryDB',
    ).default;
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId('purge-btn'));
    });
    expect(measurementDBService.purge).toHaveBeenCalled();
  });

  it('renders task status and completion summary correctly', () => {
    renderBenchmark();
    const statusCells = screen.getAllByText('—');
    expect(statusCells.length).toBeGreaterThanOrEqual(2);
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
