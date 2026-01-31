import React from 'react';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import {
  TimedTask,
  Trial,
  ExecutionResult,
  Configuration,
  ActivePipeline,
} from 'model/backend/gitlab/measure/benchmark.types';
import { RootState } from 'store/store';

export const DEFAULT_CONFIG: Configuration = {
  'Branch name': 'main',
  'Group name': 'dtaas',
  'Common Library project name': 'common',
  'DT directory': 'digital_twins',
  'Runner tag': 'linux',
};

export function createMockTask(overrides: Partial<TimedTask> = {}): TimedTask {
  return {
    'Task Name': 'Test Task',
    Description: 'Test description',
    Trials: [],
    'Time Start': new Date('2026-01-01T10:00:00.000Z'),
    'Time End': new Date('2026-01-01T10:00:30.000Z'),
    'Average Time (s)': 30,
    Status: 'SUCCESS',
    Function: async () => [],
    ...overrides,
  };
}

export function createMockTaskPending(
  overrides: Partial<TimedTask> = {},
): TimedTask {
  return {
    'Task Name': 'Test Task',
    Description: 'Test task description',
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'PENDING',
    Function: async () => [],
    ...overrides,
  };
}

export function createMockTrial(overrides: Partial<Trial> = {}): Trial {
  return {
    'Time Start': undefined,
    'Time End': undefined,
    Execution: [],
    Status: 'SUCCESS',
    Error: undefined,
    ...overrides,
  };
}

export function createMockExecution(
  overrides: Partial<ExecutionResult> = {},
): ExecutionResult {
  return {
    dtName: 'hello-world',
    pipelineId: 123,
    status: 'success',
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

interface MockBackendApi {
  cancelPipeline: jest.Mock;
  startPipeline?: jest.Mock;
  createRepositoryFile?: jest.Mock;
  editRepositoryFile?: jest.Mock;
  removeRepositoryFile?: jest.Mock;
  getRepositoryFileContent?: jest.Mock;
  listRepositoryFiles?: jest.Mock;
  getGroupByName?: jest.Mock;
  listGroupProjects?: jest.Mock;
  listPipelineJobs?: jest.Mock;
  getJobLog?: jest.Mock;
  getPipelineStatus?: jest.Mock;
  getTriggerToken?: jest.Mock;
}

interface MockBackend {
  getProjectId: jest.Mock<number>;
  api: MockBackendApi;
  init?: jest.Mock;
  getPipelineStatus?: jest.Mock;
  projectName?: string;
  logs?: unknown[];
  getCommonProjectId?: jest.Mock;
  getExecutionLogs?: jest.Mock;
  getPipelineJobs?: jest.Mock;
  startPipeline?: jest.Mock;
  getJobTrace?: jest.Mock;
}

export function createMockBackend(projectId: number = 1): MockBackend {
  return {
    getProjectId: jest.fn().mockReturnValue(projectId),
    api: {
      cancelPipeline: jest.fn().mockResolvedValue(undefined),
    } as MockBackendApi,
    init: jest.fn().mockResolvedValue(undefined),
    getPipelineStatus: jest.fn(),
  };
}

export function createMockRootState(settings: {
  RUNNER_TAG: string;
  BRANCH_NAME: string;
  GROUP_NAME?: string;
  DT_DIRECTORY?: string;
  COMMON_LIBRARY_PROJECT_NAME?: string;
}): RootState {
  return {
    settings: {
      RUNNER_TAG: settings.RUNNER_TAG,
      BRANCH_NAME: settings.BRANCH_NAME,
      GROUP_NAME: settings.GROUP_NAME ?? 'dtaas',
      DT_DIRECTORY: settings.DT_DIRECTORY ?? 'digital_twins',
      COMMON_LIBRARY_PROJECT_NAME:
        settings.COMMON_LIBRARY_PROJECT_NAME ?? 'common',
    },
    menu: { isOpen: false },
    auth: { userName: '' },
    assets: { items: [] },
    digitalTwin: { digitalTwin: null },
    snackbar: { open: false, message: '', severity: 'info' },
    files: { files: [] },
    cart: { items: [] },
    libraryConfigFiles: { files: [] },
    executionHistory: { executions: [], loading: false },
  } as unknown as RootState;
}

export function createMockActivePipeline(
  overrides: Partial<{
    backend: MockBackend;
    pipelineId: number;
    dtName: string;
    status: string;
    phase: 'parent' | 'child';
  }> = {},
): ActivePipeline {
  const mockBackend = overrides.backend ?? createMockBackend();
  return {
    backend: mockBackend as unknown as BackendInterface,
    pipelineId: overrides.pipelineId ?? 100,
    dtName: overrides.dtName ?? 'test-dt',
    config: DEFAULT_CONFIG,
    status: overrides.status ?? 'running',
    phase: overrides.phase ?? 'parent',
  };
}

export function setupStructuredClone() {
  if (typeof globalThis.structuredClone !== 'function') {
    globalThis.structuredClone = <T>(obj: T): T =>
      JSON.parse(JSON.stringify(obj)) as T;
  }
}

export function setupSessionStorage() {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
}

export function setupSessionStorageAuth(
  token = 'test-token',
  username = 'test-user',
) {
  (sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
    if (key === 'access_token') return token;
    if (key === 'username') return username;
    return null;
  });
}

export async function clearDatabase(measurementDBService: {
  getAll: () => Promise<Array<{ id: string }>>;
  delete: (id: string) => Promise<void>;
}) {
  try {
    const entries = await measurementDBService.getAll();
    await Promise.all(
      entries.map((entry) => measurementDBService.delete(entry.id)),
    );
  } catch (error) {
    throw new Error(`Failed to clear database: ${error}`);
  }
}

export function setupMockDownload() {
  const mockClick = jest.fn();
  const mockLink = { href: '', download: '', click: mockClick };
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalCreateElement = document.createElement.bind(document);

  (URL as { createObjectURL: typeof URL.createObjectURL }).createObjectURL =
    jest.fn().mockReturnValue('blob:test-url');
  (URL as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL =
    jest.fn();

  jest
    .spyOn(document, 'createElement')
    .mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });

  return {
    mockClick,
    mockLink,
    restore: () => {
      (URL as { createObjectURL: typeof URL.createObjectURL }).createObjectURL =
        originalCreateObjectURL;
      (URL as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL =
        originalRevokeObjectURL;
      jest.restoreAllMocks();
    },
  };
}

export function createMockTaskForRunner(
  name: string,
  description: string,
): TimedTask {
  return {
    'Task Name': name,
    Description: description,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'PENDING' as const,
    Function: jest.fn().mockResolvedValue([
      {
        dtName: 'hello-world',
        pipelineId: 1,
        status: 'success',
        config: DEFAULT_CONFIG,
      },
    ]),
  };
}

export const STATUS_COLOR_MAP = {
  PENDING: '#9e9e9e',
  RUNNING: '#1976d2',
  FAILURE: '#d32f2f',
  SUCCESS: '#1976d2',
  STOPPED: '#616161',
};

export const EXECUTION_STATUS_COLORS: Record<string, string> = {
  success: '#1976d2',
  failed: '#d32f2f',
  cancelled: '#616161',
};

export function mockSecondsDifference(
  start: Date | undefined,
  end: Date | undefined,
): number | undefined {
  if (!start || !end) return undefined;
  return (end.getTime() - start.getTime()) / 1000;
}

export function mockGetExecutionStatusColor(status: string): string {
  return EXECUTION_STATUS_COLORS[status] ?? '#9e9e9e';
}

export function createBenchmarkRunnerMock(
  overrides: Record<string, unknown> = {},
) {
  return {
    statusColorMap: STATUS_COLOR_MAP,
    secondsDifference: jest.fn(mockSecondsDifference),
    getExecutionStatusColor: jest.fn(mockGetExecutionStatusColor),
    getTotalTime: jest.fn(),
    downloadResultsJson: jest.fn(),
    downloadTaskResultJson: jest.fn(),
    startMeasurement: jest.fn().mockResolvedValue(undefined),
    continueMeasurement: jest.fn().mockResolvedValue(undefined),
    restartMeasurement: jest.fn().mockResolvedValue(undefined),
    stopAllPipelines: jest.fn().mockResolvedValue(undefined),
    handleBeforeUnload: jest.fn(),
    tasks: [],
    setTrials: jest.fn(),
    setAlternateRunnerTag: jest.fn(),
    ...overrides,
  };
}

export function createBenchmarkExecutionMock(
  overrides: Record<string, unknown> = {},
) {
  return {
    benchmarkState: {
      shouldStopPipelines: false,
      activePipelines: [],
      executionResults: [],
      currentMeasurementPromise: null,
      currentTrialMinPipelineId: null,
    },
    runDigitalTwin: jest.fn(),
    cancelActivePipelines: jest.fn().mockResolvedValue(undefined),
    saveOriginalSettings: jest.fn(),
    restoreOriginalSettings: jest.fn(),
    DEFAULT_CONFIG,
    ...overrides,
  };
}

export function createMeasurementDBMock() {
  return {
    __esModule: true,
    default: {
      purge: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      getAll: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    },
  };
}

export interface MockBenchmarkSetters {
  setIsRunning: jest.Mock;
  setCurrentExecutions: jest.Mock;
  setCurrentTaskIndex: jest.Mock;
  setResults: jest.Mock;
}

export function createMockSetters(resultsStateRef: {
  current: TimedTask[];
}): MockBenchmarkSetters {
  return {
    setIsRunning: jest.fn(),
    setCurrentExecutions: jest.fn(),
    setCurrentTaskIndex: jest.fn(),
    setResults: jest.fn((updater: React.SetStateAction<TimedTask[]>) => {
      if (typeof updater === 'function') {
        resultsStateRef.current = updater(resultsStateRef.current || []);
      } else {
        resultsStateRef.current = updater;
      }
    }),
  };
}

export function createBenchmarkTasksMock() {
  const createTask = (name: string, description: string): TimedTask => ({
    'Task Name': name,
    Description: description,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'PENDING' as const,
    Function: jest.fn().mockResolvedValue([
      {
        dtName: 'hello-world',
        pipelineId: 1,
        status: 'success',
        config: DEFAULT_CONFIG,
      },
    ]),
  });

  const tasksArray: TimedTask[] = [
    createTask('Test Task 1', 'First test task'),
    createTask('Test Task 2', 'Second test task'),
  ];

  return {
    tasks: tasksArray,
    benchmarkConfig: {
      trials: 3,
      runnerTag1: 'linux',
      runnerTag2: 'windows',
    },
    setTrials: jest.fn(),
    setAlternateRunnerTag: jest.fn(),
    resetTasks: jest.fn(() =>
      tasksArray.map((task) => ({
        ...task,
        Trials: [],
        'Time Start': undefined,
        'Time End': undefined,
        'Average Time (s)': undefined,
        Status: 'PENDING' as const,
      })),
    ),
    DEFAULT_TASK: createTask('', ''),
    addTask: jest.fn(),
  };
}
