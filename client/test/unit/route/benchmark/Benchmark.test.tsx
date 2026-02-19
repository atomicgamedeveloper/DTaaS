import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Benchmark from 'route/benchmark/Benchmark';
import { DEFAULT_SETTINGS } from 'store/settings.slice';
import { DEFAULT_BENCHMARK } from 'store/benchmark.slice';
import * as reactRedux from 'react-redux';

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
    const allTrials = currentTrial ? [...trials, currentTrial] : trials;
    return (
      <div data-testid="paginated-trial-card">
        {allTrials.map((trial, i) => (
          <div key={i} data-testid={`trial-card-${i}`}>
            Trial {i + 1} - {trial.Status}
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
  BenchmarkControls: (props: {
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
        {props.isRunning ? 'running' : 'stopped'}
      </span>
      <span data-testid="has-started">
        {props.hasStarted ? 'started' : 'not-started'}
      </span>
      <span data-testid="has-stopped">
        {props.hasStopped ? 'has-stopped' : 'not-stopped'}
      </span>
      <span data-testid="iterations">{props.iterations}</span>
      <span data-testid="completed-tasks">{props.completedTasks}</span>
      <span data-testid="completed-trials">{props.completedTrials}</span>
      <span data-testid="total-tasks">{props.totalTasks}</span>
      <button data-testid="start-btn" onClick={props.onStart}>
        Start
      </button>
      <button data-testid="continue-btn" onClick={props.onContinue}>
        Continue
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
  RunnerTagBadge: ({ runnerTag }: { runnerTag: string }) => (
    <span data-testid="runner-tag-badge">{runnerTag}</span>
  ),
  getRunnerTags: () => ({ primaryTag: null, secondaryTag: null }),
  statusColorMap: {
    NOT_STARTED: '#9e9e9e',
    PENDING: '#9e9e9e',
    RUNNING: '#1976d2',
    FAILURE: '#d32f2f',
    SUCCESS: '#1976d2',
    STOPPED: '#616161',
  },
  getExecutionStatusColor: jest.fn((status: string) => {
    const colorMap: Record<string, string> = {
      success: '#1976d2',
      failed: '#d32f2f',
      cancelled: '#616161',
    };
    return colorMap[status] ?? '#9e9e9e';
  }),
}));

const mockStartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockContinueMeasurement = jest.fn().mockResolvedValue(undefined);
const mockRestartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockStopAllPipelines = jest.fn().mockResolvedValue(undefined);
const mockDownloadTaskResultJson = jest.fn();

jest.mock('model/backend/gitlab/measure/benchmark.runner', () => ({
  startMeasurement: (...args: unknown[]) => mockStartMeasurement(...args),
  continueMeasurement: (...args: unknown[]) => mockContinueMeasurement(...args),
  restartMeasurement: (...args: unknown[]) => mockRestartMeasurement(...args),
  stopAllPipelines: (...args: unknown[]) => mockStopAllPipelines(...args),
  handleBeforeUnload: jest.fn(),
  downloadTaskResultJson: (...args: unknown[]) =>
    mockDownloadTaskResultJson(...args),
  tasks: [
    {
      'Task Name': 'Task 1',
      Description: 'First task',
      Trials: [],
      'Time Start': undefined,
      'Time End': undefined,
      'Average Time (s)': undefined,
      Status: 'NOT_STARTED',
      Executions: () => [{ dtName: 'hello-world', config: {} }],
    },
    {
      'Task Name': 'Task 2',
      Description: 'Second task',
      Trials: [],
      'Time Start': undefined,
      'Time End': undefined,
      'Average Time (s)': undefined,
      Status: 'NOT_STARTED',
      Executions: () => [{ dtName: 'hello-world', config: {} }],
    },
  ],
}));

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => ({
  benchmarkState: { activePipelines: [], executionResults: [] },
}));

jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: { purge: jest.fn().mockResolvedValue(undefined) },
}));

const createResultTask = (name: string, status: string, avgTime?: number) => ({
  'Task Name': name,
  Description: `${name} description`,
  Trials: [],
  'Time Start':
    status !== 'NOT_STARTED' && status !== 'STOPPED' ? new Date() : undefined,
  'Time End':
    status !== 'NOT_STARTED' && status !== 'STOPPED' ? new Date() : undefined,
  'Average Time (s)': avgTime,
  Status: status,
});

describe('Benchmark', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(reactRedux, 'useSelector').mockImplementation((selector) =>
      selector({
        settings: DEFAULT_SETTINGS,
        benchmark: DEFAULT_BENCHMARK,
        snackbar: { open: false, message: '', severity: 'info' },
      }),
    );
    jest.spyOn(reactRedux, 'useDispatch').mockReturnValue(mockDispatch);
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

  it.each([
    ['start-btn', 'Benchmark started', 'info'],
    ['continue-btn', 'Benchmark resumed', 'info'],
    ['restart-btn', 'Benchmark restarted', 'info'],
    ['stop-btn', 'Stopping benchmark...', 'warning'],
  ])('shows snackbar when %s is clicked', async (btnId, message, severity) => {
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId(btnId));
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: { message, severity },
      }),
    );
  });

  it.each([
    [['SUCCESS', 'SUCCESS'], true, 'All benchmarks completed'],
    [['FAILURE', 'FAILURE'], true, 'All benchmarks completed'],
    [['SUCCESS', 'FAILURE'], true, 'All benchmarks completed'],
    [['SUCCESS', 'STOPPED'], false, 'Benchmark started'],
    [['SUCCESS', 'NOT_STARTED'], false, 'Benchmark started'],
  ])(
    'completion snackbar for statuses %s shows completion: %s',
    async (statuses, _, expectedMessage) => {
      mockStartMeasurement.mockImplementationOnce((setters) => {
        setters.setResults([
          createResultTask(
            'Task 1',
            statuses[0],
            statuses[0] === 'SUCCESS' ? 10 : undefined,
          ),
          createResultTask(
            'Task 2',
            statuses[1],
            statuses[1] === 'SUCCESS' ? 15 : undefined,
          ),
        ]);
        return Promise.resolve();
      });
      renderBenchmark();
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-btn'));
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'snackbar/showSnackbar',
          payload: { message: expectedMessage, severity: expect.any(String) },
        }),
      );
    },
  );

  it('resets completion snackbar flag on restart', async () => {
    mockStartMeasurement.mockImplementationOnce((setters) => {
      setters.setResults([
        createResultTask('Task 1', 'SUCCESS', 10),
        createResultTask('Task 2', 'SUCCESS', 15),
      ]);
      return Promise.resolve();
    });
    renderBenchmark();
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: 'All benchmarks completed',
          severity: expect.any(String),
        },
      }),
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('restart-btn'));
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: 'Benchmark restarted',
          severity: expect.any(String),
        },
      }),
    );
  });

  it('updates currentExecutions from benchmarkState when running', async () => {
    jest.useFakeTimers();

    const benchmarkStateMock = jest.requireMock(
      'model/backend/gitlab/measure/benchmark.execution',
    ).benchmarkState;

    benchmarkStateMock.activePipelines = [
      {
        dtName: 'test-dt',
        pipelineId: 123,
        config: { 'Runner tag': 'linux' },
        status: 'running',
        phase: 'parent',
      },
    ];
    benchmarkStateMock.executionResults = [
      {
        dtName: 'completed-dt',
        pipelineId: 100,
        status: 'success',
        config: { 'Runner tag': 'linux' },
      },
    ];

    mockStartMeasurement.mockImplementationOnce((setters) => {
      setters.setIsRunning(true);
      return new Promise(() => {});
    });

    renderBenchmark();

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    benchmarkStateMock.activePipelines = [];
    benchmarkStateMock.executionResults = [];

    jest.useRealTimers();
  });

  it('renders running trial card when currentTaskIndex matches', async () => {
    mockStartMeasurement.mockImplementationOnce((setters) => {
      setters.setCurrentTaskIndex(0);
      setters.setCurrentExecutions([
        {
          dtName: 'running-dt',
          pipelineId: 999,
          status: 'running',
          config: { 'Runner tag': 'linux' },
        },
      ]);
      return Promise.resolve();
    });

    renderBenchmark();

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });
  });
});
