import { taskDefinitions } from 'model/backend/gitlab/measure/tasks';

jest.mock('store/store', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      benchmark: { trials: 3, secondaryRunnerTag: 'windows' },
      settings: { RUNNER_TAG: 'linux' },
    }),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  },
}));

describe('Task Registry', () => {
  it('should export exactly 5 task definitions', () => {
    expect(taskDefinitions).toHaveLength(5);
  });

  it('should have unique task names', () => {
    const names = taskDefinitions.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(taskDefinitions.map((t) => [t.name, t]))(
    '%s has required fields',
    (_, task) => {
      expect(task.name).toBeTruthy();
      expect(task.description).toBeTruthy();
      expect(typeof task.executions).toBe('function');
      expect(Array.isArray(task.executions())).toBe(true);
      expect(task.executions().length).toBeGreaterThan(0);
    },
  );

  it('Valid Setup task returns 1 hello-world execution', () => {
    const task = taskDefinitions.find(
      (t) => t.name === 'Valid Setup Digital Twin Execution',
    )!;
    expect(task.executions()).toEqual([{ dtName: 'hello-world', config: {} }]);
  });

  it('Multiple Identical task returns 2 hello-world executions', () => {
    const task = taskDefinitions.find(
      (t) => t.name === 'Multiple Identical Digital Twins Simultaneously',
    )!;
    expect(task.executions()).toEqual([
      { dtName: 'hello-world', config: {} },
      { dtName: 'hello-world', config: {} },
    ]);
  });

  it('Multiple different task returns hello-world and mass-spring-damper', () => {
    const task = taskDefinitions.find(
      (t) => t.name === 'Multiple different Digital Twins Simultaneously',
    )!;
    expect(task.executions()).toEqual([
      { dtName: 'hello-world', config: {} },
      { dtName: 'mass-spring-damper', config: {} },
    ]);
  });

  it('Different Runners same DT uses runner tags from store', () => {
    const task = taskDefinitions.find(
      (t) => t.name === 'Different Runners same Digital Twin',
    )!;
    expect(task.executions()).toEqual([
      { dtName: 'hello-world', config: { 'Runner tag': 'linux' } },
      { dtName: 'hello-world', config: { 'Runner tag': 'windows' } },
    ]);
  });

  it('Different Runners different DTs uses runner tags from store', () => {
    const task = taskDefinitions.find(
      (t) => t.name === 'Different Runners different Digital Twins',
    )!;
    expect(task.executions()).toEqual([
      { dtName: 'hello-world', config: { 'Runner tag': 'linux' } },
      { dtName: 'mass-spring-damper', config: { 'Runner tag': 'windows' } },
    ]);
  });

  it('tasks are in expected order', () => {
    const names = taskDefinitions.map((t) => t.name);
    expect(names).toEqual([
      'Valid Setup Digital Twin Execution',
      'Multiple Identical Digital Twins Simultaneously',
      'Multiple different Digital Twins Simultaneously',
      'Different Runners same Digital Twin',
      'Different Runners different Digital Twins',
    ]);
  });
});
