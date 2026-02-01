import { TimedTask, Status } from './benchmark.types';

export const statusColorMap: Record<Status, string> = {
  NOT_STARTED: '#9e9e9e',
  PENDING: '#9e9e9e',
  RUNNING: '#1976d2',
  FAILURE: '#d32f2f',
  SUCCESS: '#1976d2',
  STOPPED: '#616161',
};

export function getExecutionStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    success: '#1976d2',
    failed: '#d32f2f',
    cancelled: '#616161',
  };
  return colorMap[status] ?? '#9e9e9e';
}

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

export function downloadResultsJson(results: TimedTask[]): void {
  const totalTime = getTotalTime(results);

  const exportData = results.map((task) => ({
    'Task Name': task['Task Name'],
    Description: task.Description,
    Trials: task.Trials,
    'Time Start': task['Time Start'],
    'Time End': task['Time End'],
    'Average Time (s)': task['Average Time (s)'],
    Status: task.Status,
  }));

  const data = {
    totalTimeSeconds: totalTime,
    tasks: exportData,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `benchmark-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

export function downloadTaskResultJson(task: TimedTask): void {
  const exportData = {
    'Task Name': task['Task Name'],
    Description: task.Description,
    Trials: task.Trials,
    'Time Start': task['Time Start'],
    'Time End': task['Time End'],
    'Average Time (s)': task['Average Time (s)'],
    Status: task.Status,
  };

  const totalTime = secondsDifference(task['Time Start'], task['Time End']);

  const data = {
    totalTimeSeconds: totalTime,
    task: exportData,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const taskNameSlug = task['Task Name'].toLowerCase().replace(/\s+/g, '-');
  link.href = url;
  link.download = `benchmark-${taskNameSlug}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  link.click();

  URL.revokeObjectURL(url);
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
  totalTasks: number;
} {
  const hasStarted = results.some(
    (task) => task.Status !== 'NOT_STARTED' && task.Status !== 'PENDING',
  );
  const completedTasks = results.filter(
    (task) => task.Status === 'SUCCESS' || task.Status === 'FAILURE',
  ).length;
  const totalTasks = results.length;

  return { hasStarted, completedTasks, totalTasks };
}
