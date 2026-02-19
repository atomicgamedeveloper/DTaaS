import {
  BenchmarkConfig,
  DEFAULT_TASK,
  tasks,
  resetTasks,
} from 'model/backend/gitlab/measure/benchmark.tasks';

const mockStoreState = {
  benchmark: { trials: 3, secondaryRunnerTag: 'windows' },
  settings: { RUNNER_TAG: 'linux' },
};

jest.mock('store/store', () => ({
  __esModule: true,
  default: {
    getState: () => mockStoreState,
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  },
}));

describe('benchmark.tasks', () => {
  it('should read trials from store', () => {
    expect(BenchmarkConfig.trials).toBe(3);
  });

  it('should read runnerTag1 from store settings', () => {
    expect(BenchmarkConfig.runnerTag1).toBe('linux');
  });

  it('should read runnerTag2 from store benchmark', () => {
    expect(BenchmarkConfig.runnerTag2).toBe('windows');
  });

  it('should have empty Task Name in DEFAULT_TASK', () => {
    expect(DEFAULT_TASK['Task Name']).toBe('');
  });

  it('should have empty Description in DEFAULT_TASK', () => {
    expect(DEFAULT_TASK.Description).toBe('');
  });

  it('should have empty Trials array in DEFAULT_TASK', () => {
    expect(DEFAULT_TASK.Trials).toEqual([]);
  });

  it('should have undefined Time Start in DEFAULT_TASK', () => {
    expect(DEFAULT_TASK['Time Start']).toBeUndefined();
  });

  it('should have undefined Time End in DEFAULT_TASK', () => {
    expect(DEFAULT_TASK['Time End']).toBeUndefined();
  });

  it('should have undefined Average Time in DEFAULT_TASK', () => {
    expect(DEFAULT_TASK['Average Time (s)']).toBeUndefined();
  });

  it('should have NOT_STARTED status in DEFAULT_TASK', () => {
    expect(DEFAULT_TASK.Status).toBe('NOT_STARTED');
  });

  it('should have undefined Executions in DEFAULT_TASK', () => {
    expect(DEFAULT_TASK.Executions).toBeUndefined();
  });

  it('should be an array', () => {
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('should contain pre-defined benchmark tasks', () => {
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('should have tasks with required properties', () => {
    tasks.forEach((task) => {
      expect(task['Task Name']).toBeDefined();
      expect(task.Description).toBeDefined();
      expect(task.Executions).toBeDefined();
      expect(typeof task.Executions).toBe('function');
    });
  });

  it('should include Valid Setup Digital Twin Execution task', () => {
    const setupTask = tasks.find(
      (t) => t['Task Name'] === 'Valid Setup Digital Twin Execution',
    );
    expect(setupTask).toBeDefined();
    expect(setupTask?.Description).toContain('Hello World Digital Twin');
  });

  it('should include Multiple Identical Digital Twins task', () => {
    const multiTask = tasks.find(
      (t) =>
        t['Task Name'] === 'Multiple Identical Digital Twins Simultaneously',
    );
    expect(multiTask).toBeDefined();
  });

  it('should include Multiple different Digital Twins task', () => {
    const diffTask = tasks.find(
      (t) =>
        t['Task Name'] === 'Multiple different Digital Twins Simultaneously',
    );
    expect(diffTask).toBeDefined();
  });

  it('should include Different Runners same Digital Twin task', () => {
    const runnerTask = tasks.find(
      (t) => t['Task Name'] === 'Different Runners same Digital Twin',
    );
    expect(runnerTask).toBeDefined();
  });

  it('should include Different Runners different Digital Twins task', () => {
    const runnerDiffTask = tasks.find(
      (t) => t['Task Name'] === 'Different Runners different Digital Twins',
    );
    expect(runnerDiffTask).toBeDefined();
  });

  it('should have exactly 5 pre-defined tasks', () => {
    expect(tasks.length).toBe(5);
  });

  it('should return tasks with cleared Trials', () => {
    const resetResults = resetTasks();
    resetResults.forEach((task) => {
      expect(task.Trials).toEqual([]);
    });
  });

  it('should return tasks with undefined Time Start', () => {
    const resetResults = resetTasks();
    resetResults.forEach((task) => {
      expect(task['Time Start']).toBeUndefined();
    });
  });

  it('should return tasks with undefined Time End', () => {
    const resetResults = resetTasks();
    resetResults.forEach((task) => {
      expect(task['Time End']).toBeUndefined();
    });
  });

  it('should return tasks with undefined Average Time', () => {
    const resetResults = resetTasks();
    resetResults.forEach((task) => {
      expect(task['Average Time (s)']).toBeUndefined();
    });
  });

  it('should return tasks with NOT_STARTED status', () => {
    const resetResults = resetTasks();
    resetResults.forEach((task) => {
      expect(task.Status).toBe('NOT_STARTED');
    });
  });

  it('should preserve Task Name and Description', () => {
    const resetResults = resetTasks();
    resetResults.forEach((task, index) => {
      expect(task['Task Name']).toBe(tasks[index]['Task Name']);
      expect(task.Description).toBe(tasks[index].Description);
    });
  });

  it('should preserve Executions references', () => {
    const resetResults = resetTasks();
    resetResults.forEach((task, index) => {
      expect(task.Executions).toBe(tasks[index].Executions);
    });
  });

  it('should return same number of tasks', () => {
    const resetResults = resetTasks();
    expect(resetResults.length).toBe(tasks.length);
  });

  it('should not modify original tasks array', () => {
    const originalTaskName = tasks[0]['Task Name'];
    resetTasks();
    expect(tasks[0]['Task Name']).toBe(originalTaskName);
  });

  it('Valid Setup task should have correct executions', () => {
    const setupTask = tasks.find(
      (t) => t['Task Name'] === 'Valid Setup Digital Twin Execution',
    );
    const executions = setupTask?.Executions?.();

    expect(executions).toEqual([{ dtName: 'hello-world', config: {} }]);
  });

  it('Multiple Identical task should have two hello-world executions', () => {
    const multiTask = tasks.find(
      (t) =>
        t['Task Name'] === 'Multiple Identical Digital Twins Simultaneously',
    );
    const executions = multiTask?.Executions?.();

    expect(executions).toEqual([
      { dtName: 'hello-world', config: {} },
      { dtName: 'hello-world', config: {} },
    ]);
  });

  it('Multiple different task should have hello-world and mass-spring-damper executions', () => {
    const diffTask = tasks.find(
      (t) =>
        t['Task Name'] === 'Multiple different Digital Twins Simultaneously',
    );
    const executions = diffTask?.Executions?.();

    expect(executions).toEqual([
      { dtName: 'hello-world', config: {} },
      { dtName: 'mass-spring-damper', config: {} },
    ]);
  });

  it('Different Runners same DT task should use runner tags from config', () => {
    const runnerTask = tasks.find(
      (t) => t['Task Name'] === 'Different Runners same Digital Twin',
    );
    const executions = runnerTask?.Executions?.();

    expect(executions).toEqual([
      {
        dtName: 'hello-world',
        config: { 'Runner tag': BenchmarkConfig.runnerTag1 },
      },
      {
        dtName: 'hello-world',
        config: { 'Runner tag': BenchmarkConfig.runnerTag2 },
      },
    ]);
  });

  it('Different Runners different DTs task should use both DTs and runner tags', () => {
    const runnerDiffTask = tasks.find(
      (t) => t['Task Name'] === 'Different Runners different Digital Twins',
    );
    const executions = runnerDiffTask?.Executions?.();

    expect(executions).toEqual([
      {
        dtName: 'hello-world',
        config: { 'Runner tag': BenchmarkConfig.runnerTag1 },
      },
      {
        dtName: 'mass-spring-damper',
        config: { 'Runner tag': BenchmarkConfig.runnerTag2 },
      },
    ]);
  });
});
