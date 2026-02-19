import {
  TimedTask,
  Status,
  Configuration,
  ExecutionResult,
} from 'model/backend/gitlab/measure/benchmark.types';

export function secondsDifference(
  startTime: Date | undefined,
  endTime: Date | undefined,
): number | undefined {
  if (!startTime || !endTime) return undefined;
  return (endTime.getTime() - startTime.getTime()) / 1000;
}

export function getTotalTime(results: TimedTask[]): number | null {
  const startTimes = results
    .map((task) => task['Time Start'])
    .filter((x): x is Date => x != null);
  const endTimes = results
    .map((task) => task['Time End'])
    .filter((x): x is Date => x != null);

  if (startTimes.length === 0 || endTimes.length === 0) {
    return null;
  }

  const firstStart = Math.min(
    ...startTimes.map((duration) => duration.getTime()),
  );
  const lastEnd = Math.max(...endTimes.map((duration) => duration.getTime()));

  return (lastEnd - firstStart) / 1000;
}

function timestampSlug(): string {
  return new Date().toISOString().slice(0, 19).split(':').join('-');
}

function triggerJsonDownload(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function splitConfigs(executions: ExecutionResult[]): {
  sharedConfig: Partial<Configuration>;
  perExecution: { executionIndex: number | undefined; dtName: string; config?: Partial<Configuration> }[];
} {
  if (executions.length === 0) {
    return { sharedConfig: {}, perExecution: [] };
  }

  const allKeys = Object.keys(executions[0].config) as (keyof Configuration)[];

  const sharedConfig: Partial<Configuration> = {};
  const varyingKeys: (keyof Configuration)[] = [];

  for (const key of allKeys) {
    const firstValue = executions[0].config[key];
    if (executions.every((e) => e.config[key] === firstValue)) {
      sharedConfig[key] = firstValue;
    } else {
      varyingKeys.push(key);
    }
  }

  const perExecution = executions.map(({ executionIndex, dtName, config }) => {
    if (varyingKeys.length === 0) {
      return { executionIndex, dtName };
    }
    const specificConfig = Object.fromEntries(
      varyingKeys.map((key) => [key, config[key]]),
    ) as Partial<Configuration>;
    return { executionIndex, dtName, config: specificConfig };
  });

  return { sharedConfig, perExecution };
}

function serializeTask(task: TimedTask) {
  const { sharedConfig, perExecution } = splitConfigs(
    task.Trials[0]?.Execution ?? [],
  );
  return {
    'Task Name': task['Task Name'],
    Description: task.Description,
    sharedConfig,
    Executions: perExecution.length > 0 ? perExecution : undefined,
    Trials: task.Trials.map((trial) => ({
      'Time Start': trial['Time Start'],
      'Time End': trial['Time End'],
      Status: trial.Status,
      Error: trial.Error,
      Execution: trial.Execution.map(({ executionIndex, pipelineId, status }) => ({
        executionIndex,
        pipelineId,
        status,
      })),
    })),
    'Time Start': task['Time Start'],
    'Time End': task['Time End'],
    'Average Time (s)': task['Average Time (s)'],
    Status: task.Status,
  };
}

export function downloadResultsJson(results: TimedTask[]): void {
  const data = {
    totalTimeSeconds: getTotalTime(results),
    tasks: results.map(serializeTask),
  };
  triggerJsonDownload(data, `benchmark-${timestampSlug()}.json`);
}

export function downloadTaskResultJson(task: TimedTask): void {
  const data = {
    totalTimeSeconds: secondsDifference(task['Time Start'], task['Time End']),
    task: serializeTask(task),
  };
  const taskNameSlug = task['Task Name'].toLowerCase().split(/\s+/).join('-');
  triggerJsonDownload(data, `benchmark-${taskNameSlug}-${timestampSlug()}.json`);
}

export function computeAverageTime(
  trials: TimedTask['Trials'],
): number | undefined {
  const durations = trials
    .map((trial) => secondsDifference(trial['Time Start'], trial['Time End']))
    .filter((duration): duration is number => duration != null);

  return durations.length > 0
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    : undefined;
}

export function computeFinalStatus(
  trials: TimedTask['Trials'],
  expectedTrialCount: number,
  wasStopped: boolean,
): Status {
  const hasAnyStopped = trials.some((trial) => trial.Status === 'STOPPED');

  if (wasStopped && trials.length < expectedTrialCount) {
    return 'STOPPED';
  }
  if (hasAnyStopped) {
    return 'STOPPED';
  }

  const hasAnyFailures = trials.some((trial) => trial.Status === 'FAILURE');
  return hasAnyFailures ? 'FAILURE' : 'SUCCESS';
}

export function getBenchmarkStatus(results: TimedTask[]): {
  hasStarted: boolean;
  completedTasks: number;
  completedTrials: number;
  totalTasks: number;
} {
  const hasStarted = results.some(
    (task) => task.Status !== 'NOT_STARTED' && task.Status !== 'PENDING',
  );
  const completedTasks = results.filter(
    (task) => task.Status === 'SUCCESS' || task.Status === 'FAILURE',
  ).length;
  const completedTrials = results.reduce(
    (sum, task) =>
      sum +
      task.Trials.filter(
        (trial) => trial.Status === 'SUCCESS' || trial.Status === 'FAILURE',
      ).length,
    0,
  );
  const totalTasks = results.length;

  return { hasStarted, completedTasks, completedTrials, totalTasks };
}
