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

jest.mock('model/backend/gitlab/measure/benchmark.lifecycle', () => ({
  restartMeasurement: jest.fn().mockResolvedValue(undefined),
  handleBeforeUnload: jest.fn(),
  purgeBenchmarkData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('route/benchmark/BenchmarkComponents', () => ({
  TrialCard: ({ trial, trialIndex }: { trial: { Status: string }; trialIndex: number }) => (
    <div data-testid="trial-card">Trial {trialIndex + 1} - {trial.Status}</div>
  ),
  TaskControls: () => <div data-testid="task-controls" />,
  BenchmarkPageHeader: () => <div data-testid="benchmark-header" />,
  BenchmarkControls: (p: {
    isRunning: boolean;
    onStart: () => void;
    onRestart: () => void;
    onStop: () => void;
    onPurge: () => void;
  }) => (
    <div data-testid="benchmark-controls">
      <span data-testid="is-running">
        {p.isRunning ? 'running' : 'stopped'}
      </span>
      <button data-testid="start-btn" onClick={p.onStart}>
        Start
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
  CompletionSummary: () => <div data-testid="completion-summary" />,
  RunnerTagBadge: () => <span />,
  statusColorMap: {},
  getExecutionStatusColor: jest.fn(() => '#9e9e9e'),
}));

const mockStartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockStopAllPipelines = jest.fn().mockResolvedValue(undefined);

jest.mock('model/backend/gitlab/measure/benchmark.runner', () => ({
  startMeasurement: (...args: unknown[]) => mockStartMeasurement(...args),
  stopAllPipelines: (...args: unknown[]) => mockStopAllPipelines(...args),
  downloadTaskResultJson: jest.fn(),
}));

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => ({
  benchmarkState: {
    activePipelines: [],
    executionResults: [],
    isRunning: false,
    results: null,
    currentTaskIndexUI: null,
    componentSetters: null,
  },
  DEFAULT_CONFIG: {},
  attachSetters: jest.fn(),
  detachSetters: jest.fn(),
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

describe('Benchmark snackbar and polling', () => {
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

  type SnackbarClickCase = [btnId: string, message: string, severity: string];

  const snackbarClickCases: SnackbarClickCase[] = [
    ['start-btn', 'Benchmark started', 'info'],
    ['restart-btn', 'Benchmark restarted', 'info'],
    ['stop-btn', 'Stopping benchmark...', 'warning'],
  ];

  it.each(snackbarClickCases)(
    'shows snackbar when %s is clicked',
    async (btnId, message, severity) => {
    render(<Benchmark />);
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

  type CompletionSnackbarCase = [statuses: string[], expectedMessage: string];

  const completionSnackbarCases: CompletionSnackbarCase[] = [
    [['SUCCESS', 'SUCCESS'], 'All benchmarks completed'],
    [['FAILURE', 'FAILURE'], 'All benchmarks completed'],
    [['SUCCESS', 'FAILURE'], 'All benchmarks completed'],
    [['SUCCESS', 'STOPPED'], 'Benchmark started'],
    [['SUCCESS', 'NOT_STARTED'], 'Benchmark started'],
  ];

  it.each(completionSnackbarCases)(
    'completion snackbar for statuses %s shows: %s',
    async (statuses, expectedMessage) => {
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
      render(<Benchmark />);
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
    render(<Benchmark />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });
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

    render(<Benchmark />);
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

    render(<Benchmark />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });
  });
});
