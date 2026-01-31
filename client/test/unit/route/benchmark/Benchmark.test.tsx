import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider, useDispatch } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Benchmark from 'route/benchmark/Benchmark';
import { TimedTask, Trial } from 'model/backend/gitlab/measure/benchmark.types';

jest.mock('page/Layout', () => {
  const MockLayout = ({
    children,
  }: {
    children: React.ReactNode;
    sx?: Record<string, unknown>;
  }) => <div data-testid="mock-layout">{children}</div>;
  return { __esModule: true, default: MockLayout };
});

jest.mock('route/benchmark/BenchmarkComponents', () => ({
  TrialCard: ({ trialIndex }: { trial: Trial; trialIndex: number }) => (
    <div data-testid={`trial-card-${trialIndex}`}>Trial {trialIndex + 1}</div>
  ),
  TaskControls: ({
    task,
    onDownloadTask,
  }: {
    task: TimedTask;
    onDownloadTask: (task: TimedTask) => void;
  }) => (
    <div data-testid="task-controls">
      <button onClick={() => onDownloadTask(task)}>Download</button>
    </div>
  ),
  BenchmarkPageHeader: ({
    isRunning,
    hasStarted,
    hasStopped,
    iterations,
    alternateRunnerTag,
    onIterationsChange,
    onAlternateRunnerTagChange,
    onStart,
    onContinue,
    onRestart,
    onStop,
    onPurge,
    onSettingsSaved,
  }: {
    isRunning: boolean;
    hasStarted: boolean;
    hasStopped: boolean;
    iterations: number;
    alternateRunnerTag: string;
    onIterationsChange: (v: number) => void;
    onAlternateRunnerTagChange: (v: string) => void;
    onStart: () => void;
    onContinue: () => void;
    onRestart: () => void;
    onStop: () => void;
    onPurge: () => void;
    onSettingsSaved: () => void;
  }) => (
    <div data-testid="benchmark-header">
      <span data-testid="is-running">{isRunning ? 'running' : 'stopped'}</span>
      <span data-testid="has-started">
        {hasStarted ? 'started' : 'not-started'}
      </span>
      <span data-testid="has-stopped">
        {hasStopped ? 'has-stopped' : 'not-stopped'}
      </span>
      <span data-testid="iterations">{iterations}</span>
      <span data-testid="runner-tag">{alternateRunnerTag}</span>
      <button data-testid="start-btn" onClick={onStart}>
        Start
      </button>
      <button data-testid="continue-btn" onClick={onContinue}>
        Continue
      </button>
      <button data-testid="restart-btn" onClick={onRestart}>
        Restart
      </button>
      <button data-testid="stop-btn" onClick={onStop}>
        Stop
      </button>
      <button data-testid="purge-btn" onClick={onPurge}>
        Purge
      </button>
      <button data-testid="settings-btn" onClick={onSettingsSaved}>
        Save Settings
      </button>
      <input
        data-testid="iterations-input"
        type="number"
        value={iterations}
        onChange={(e) => onIterationsChange(parseInt(e.target.value, 10))}
      />
      <input
        data-testid="runner-tag-input"
        value={alternateRunnerTag}
        onChange={(e) => onAlternateRunnerTagChange(e.target.value)}
      />
    </div>
  ),
  CompletionSummary: ({ results }: { results: TimedTask[] }) => (
    <div data-testid="completion-summary">Tasks: {results.length}</div>
  ),
}));

const mockStartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockContinueMeasurement = jest.fn().mockResolvedValue(undefined);
const mockRestartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockStopAllPipelines = jest.fn().mockResolvedValue(undefined);
const mockHandleBeforeUnload = jest.fn();
const mockDownloadTaskResultJson = jest.fn();
const mockSetTrials = jest.fn();
const mockSetAlternateRunnerTag = jest.fn();

jest.mock('model/backend/gitlab/measure/benchmark.runner', () => ({
  statusColorMap: {
    PENDING: '#9e9e9e',
    RUNNING: '#1976d2',
    FAILURE: '#d32f2f',
    SUCCESS: '#1976d2',
    STOPPED: '#616161',
  },
  startMeasurement: (...args: unknown[]) => mockStartMeasurement(...args),
  continueMeasurement: (...args: unknown[]) => mockContinueMeasurement(...args),
  restartMeasurement: (...args: unknown[]) => mockRestartMeasurement(...args),
  stopAllPipelines: (...args: unknown[]) => mockStopAllPipelines(...args),
  handleBeforeUnload: (...args: unknown[]) => mockHandleBeforeUnload(...args),
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
      Status: 'PENDING',
      Function: jest
        .fn()
        .mockResolvedValue([
          {
            dtName: 'hello-world',
            pipelineId: 1,
            status: 'success',
            config: {},
          },
        ]),
    },
    {
      'Task Name': 'Task 2',
      Description: 'Second task',
      Trials: [],
      'Time Start': undefined,
      'Time End': undefined,
      'Average Time (s)': undefined,
      Status: 'PENDING',
      Function: jest
        .fn()
        .mockResolvedValue([
          {
            dtName: 'hello-world',
            pipelineId: 1,
            status: 'success',
            config: {},
          },
        ]),
    },
  ],
  setTrials: (...args: unknown[]) => mockSetTrials(...args),
  setAlternateRunnerTag: (...args: unknown[]) =>
    mockSetAlternateRunnerTag(...args),
}));

jest.mock('model/backend/gitlab/measure/benchmark.execution', () => ({
  benchmarkState: {
    activePipelines: [],
    executionResults: [],
  },
}));

jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: {
    purge: jest.fn().mockResolvedValue(undefined),
  },
}));

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
};

type SnackbarAction =
  | {
      type: 'snackbar/showSnackbar';
      payload: { message: string; severity: SnackbarState['severity'] };
    }
  | { type: 'snackbar/hideSnackbar' }
  | { type: string };

const initialSnackbarState: SnackbarState = {
  open: false,
  message: '',
  severity: 'info',
};

const createMockStore = () =>
  configureStore({
    reducer: {
      snackbar: (
        state: SnackbarState | undefined,
        action: SnackbarAction,
      ): SnackbarState => {
        const currentState = state ?? initialSnackbarState;
        if (action.type === 'snackbar/showSnackbar' && 'payload' in action) {
          return { ...currentState, open: true, ...action.payload };
        }
        if (action.type === 'snackbar/hideSnackbar') {
          return { ...currentState, open: false };
        }
        return currentState;
      },
    },
  });

describe('Benchmark', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore();
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      store.dispatch,
    );
  });

  const renderBenchmark = () =>
    render(
      <Provider store={store}>
        <Benchmark />
      </Provider>,
    );

  it('renders the Benchmark page with layout', () => {
    renderBenchmark();

    expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
  });

  it('renders the benchmark header with initial props', () => {
    renderBenchmark();

    expect(screen.getByTestId('benchmark-header')).toBeInTheDocument();
    expect(screen.getByTestId('is-running')).toHaveTextContent('stopped');
    expect(screen.getByTestId('has-started')).toHaveTextContent('not-started');
    expect(screen.getByTestId('iterations')).toHaveTextContent('3');
    expect(screen.getByTestId('runner-tag')).toHaveTextContent('windows');
  });

  it('renders the benchmark table with tasks', () => {
    renderBenchmark();

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderBenchmark();

    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Average Duration')).toBeInTheDocument();
    expect(screen.getByText('Executions')).toBeInTheDocument();
  });

  it('calls startMeasurement when Start is clicked', async () => {
    renderBenchmark();

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });

    expect(mockSetTrials).toHaveBeenCalledWith(3);
    expect(mockSetAlternateRunnerTag).toHaveBeenCalledWith('windows');
    expect(mockStartMeasurement).toHaveBeenCalled();
  });

  it('calls continueMeasurement when Continue is clicked', async () => {
    renderBenchmark();

    await act(async () => {
      fireEvent.click(screen.getByTestId('continue-btn'));
    });

    expect(mockSetTrials).toHaveBeenCalledWith(3);
    expect(mockSetAlternateRunnerTag).toHaveBeenCalledWith('windows');
    expect(mockContinueMeasurement).toHaveBeenCalled();
  });

  it('calls restartMeasurement when Restart is clicked', async () => {
    renderBenchmark();

    await act(async () => {
      fireEvent.click(screen.getByTestId('restart-btn'));
    });

    expect(mockSetTrials).toHaveBeenCalledWith(3);
    expect(mockSetAlternateRunnerTag).toHaveBeenCalledWith('windows');
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

  it('updates iterations when changed', () => {
    renderBenchmark();

    const iterationsInput = screen.getByTestId('iterations-input');
    fireEvent.change(iterationsInput, { target: { value: '5' } });

    expect(screen.getByTestId('iterations')).toHaveTextContent('5');
  });

  it('updates alternate runner tag when changed', () => {
    renderBenchmark();

    const runnerTagInput = screen.getByTestId('runner-tag-input');
    fireEvent.change(runnerTagInput, { target: { value: 'linux' } });

    expect(screen.getByTestId('runner-tag')).toHaveTextContent('linux');
  });

  it('renders task status correctly', () => {
    renderBenchmark();

    // Both tasks should show PENDING status
    const pendingStatuses = screen.getAllByText('PENDING');
    expect(pendingStatuses.length).toBe(2);
  });

  it('renders dash for average time when undefined', () => {
    renderBenchmark();

    // Tasks without average time should show dashes
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders completion summary', () => {
    renderBenchmark();

    expect(screen.getByTestId('completion-summary')).toBeInTheDocument();
    expect(screen.getByText('Tasks: 2')).toBeInTheDocument();
  });

  it('adds beforeunload event listener on mount', () => {
    const addEventListenerSpy = jest.spyOn(globalThis, 'addEventListener');

    renderBenchmark();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
  });

  it('removes beforeunload event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(
      globalThis,
      'removeEventListener',
    );

    const { unmount } = renderBenchmark();
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  it('calls downloadTaskResultJson when download is triggered', async () => {
    renderBenchmark();

    // Find and click the download button in task controls
    const downloadButtons = screen.getAllByText('Download');
    await act(async () => {
      fireEvent.click(downloadButtons[0]);
    });

    expect(mockDownloadTaskResultJson).toHaveBeenCalled();
  });
});
