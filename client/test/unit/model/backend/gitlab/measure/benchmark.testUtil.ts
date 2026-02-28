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
    Status: 'NOT_STARTED',
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
}

interface MockBackend {
  getProjectId: jest.Mock<number>;
  api: MockBackendApi;
  init?: jest.Mock;
  getPipelineStatus?: jest.Mock;
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
    benchmark: { trials: 3, secondaryRunnerTag: 'windows' },
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
