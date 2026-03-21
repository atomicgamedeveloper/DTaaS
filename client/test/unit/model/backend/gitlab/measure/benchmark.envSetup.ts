// Factory for creating the jest.mock return value for benchmark.execution./
export function createBenchmarkExecutionMock(
  extras: Record<string, unknown> = {},
) {
  const bs = {
    shouldStopPipelines: false,
    activePipelines: [] as unknown[],
    executionResults: [] as unknown[],
    currentMeasurementPromise: null as Promise<void> | null,
    currentTrialMinPipelineId: null as number | null,
    currentTrialExecutionIndex: 0,
    isRunning: false,
    results: null as unknown[] | null,
    currentTaskIndexUI: null as number | null,
    componentSetters: null as Record<
      string,
      (...args: unknown[]) => unknown
    > | null,
  };

  const createTask = (name: string, desc: string) => ({
    'Task Name': name,
    Description: desc,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'PENDING' as const,
    Executions: () => [{ dtName: 'hello-world', config: {} }],
  });

  const tasksArray = [
    createTask('Task 1', 'First'),
    createTask('Task 2', 'Second'),
  ];

  return {
    benchmarkState: bs,
    saveOriginalSettings: jest.fn(),
    restoreOriginalSettings: jest.fn(),
    attachSetters: jest.fn(
      (s: Record<string, (...args: unknown[]) => unknown>) => {
        bs.componentSetters = s;
      },
    ),
    wrapSetters: () => ({
      setIsRunning: (v: boolean) => {
        bs.isRunning = v;
        bs.componentSetters?.setIsRunning(v);
      },
      setCurrentExecutions: (v: unknown[]) => {
        bs.componentSetters?.setCurrentExecutions(v);
      },
      setCurrentTaskIndex: (v: number | null) => {
        bs.currentTaskIndexUI = v;
        bs.componentSetters?.setCurrentTaskIndex(v);
      },
      setResults: (v: unknown) => {
        bs.results = typeof v === 'function' ? v(bs.results ?? []) : v;
        bs.componentSetters?.setResults(v);
      },
    }),
    DEFAULT_CONFIG: {
      'Branch name': 'main',
      'Group name': 'dtaas',
      'Common Library project name': 'common',
      'DT directory': 'digital_twins',
      'Runner tag': 'linux',
    },
    getTasks: () => tasksArray,
    benchmarkConfig: { trials: 3, runnerTag1: 'linux', runnerTag2: 'windows' },
    resetTasks: jest.fn(() =>
      tasksArray.map((t) => ({
        ...t,
        Trials: [],
        'Time Start': undefined,
        'Time End': undefined,
        'Average Time (s)': undefined,
        Status: 'PENDING' as const,
      })),
    ),
    DEFAULT_TASK: createTask('', ''),
    clearPersistedResults: jest.fn(),
    ...extras,
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
