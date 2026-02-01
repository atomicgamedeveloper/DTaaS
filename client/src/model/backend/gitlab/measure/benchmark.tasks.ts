import { TimedTask } from './benchmark.types';

export const benchmarkConfig = {
  trials: 3,
  runnerTag1: 'linux',
  runnerTag2: 'windows',
};

export function setTrials(value: number): void {
  benchmarkConfig.trials = value;
}

export function setAlternateRunnerTag(value: string): void {
  benchmarkConfig.runnerTag2 = value;
}

export const DEFAULT_TASK: TimedTask = {
  'Task Name': '',
  Description: '',
  Trials: [],
  'Time Start': undefined,
  'Time End': undefined,
  'Average Time (s)': undefined,
  Status: 'NOT_STARTED',
  Function: async () => [],
};

export const tasks: TimedTask[] = [];

export function addTask(taskDefinition: Partial<TimedTask>): void {
  tasks.push({
    ...DEFAULT_TASK,
    ...taskDefinition,
  });
}

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

addTask({
  'Task Name': 'Valid Setup Digital Twin Execution',
  Description: 'Running the Hello World Digital Twin with current setup.',
  Function: async (executeDT) => {
    const result = await executeDT('hello-world');
    return [result];
  },
});

addTask({
  'Task Name': 'Multiple Identical Digital Twins Simultaneously',
  Description: 'Running the Hello World Digital Twin twice at once.',
  Function: async (executeDT) => {
    const results = await Promise.all([
      executeDT('hello-world'),
      executeDT('hello-world'),
    ]);
    return results;
  },
});

addTask({
  'Task Name': 'Multiple different Digital Twins Simultaneously',
  Description:
    'Running the Hello World and Mass spring damper Digital Twins at once.',
  Function: async (executeDT) => {
    const results = await Promise.all([
      executeDT('hello-world'),
      executeDT('mass-spring-damper'),
    ]);
    return results;
  },
});

addTask({
  'Task Name': 'Different Runners same Digital Twin',
  Description: 'Running the Hello World Digital Twin twice with 2 runners.',
  Function: async (executeDT) => {
    const results = await Promise.all([
      executeDT('hello-world', { 'Runner tag': benchmarkConfig.runnerTag1 }),
      executeDT('hello-world', { 'Runner tag': benchmarkConfig.runnerTag2 }),
    ]);
    return results;
  },
});

addTask({
  'Task Name': 'Different Runners different Digital Twins',
  Description:
    'Running the Hello World and Mass spring damper Digital Twins with 2 runners.',
  Function: async (executeDT) => {
    const results = await Promise.all([
      executeDT('hello-world', { 'Runner tag': benchmarkConfig.runnerTag1 }),
      executeDT('mass-spring-damper', {
        'Runner tag': benchmarkConfig.runnerTag2,
      }),
    ]);
    return results;
  },
});
