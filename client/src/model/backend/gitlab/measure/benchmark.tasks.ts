import { TimedTask } from 'model/backend/gitlab/measure/benchmark.types';
import { taskDefinitions } from 'model/backend/gitlab/measure/tasks';

export { default as BenchmarkConfig } from 'model/backend/gitlab/measure/benchmarkConfig';

export const DEFAULT_TASK: TimedTask = {
  'Task Name': '',
  Description: '',
  Trials: [],
  'Time Start': undefined,
  'Time End': undefined,
  'Average Time (s)': undefined,
  Status: 'NOT_STARTED',
};

export const tasks: readonly TimedTask[] = taskDefinitions.map((def) => ({
  ...DEFAULT_TASK,
  'Task Name': def.name,
  Description: def.description,
  Executions: def.executions,
}));

export function resetTasks(): TimedTask[] {
  return tasks.map((task) => ({
    ...task,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'NOT_STARTED' as const,
  }));
}
