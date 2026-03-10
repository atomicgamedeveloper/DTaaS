import { DEFAULT_SETTINGS } from 'store/settings.slice';
import { DEFAULT_BENCHMARK } from 'model/backend/gitlab/measure/benchmark.execution';
import { useSelector, useDispatch } from 'react-redux';

export const MOCK_TASKS = [
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
];

export const MOCK_BENCHMARK_STATE = {
  activePipelines: [],
  executionResults: [],
  isRunning: false,
  results: null,
  currentTaskIndexUI: null,
  componentSetters: null,
};

export const createResultTask = (
  name: string,
  status: string,
  avgTime?: number,
) => ({
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

export function setupBenchmarkComponentTest() {
  const mockDispatch = jest.fn();

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

  return { mockDispatch };
}
