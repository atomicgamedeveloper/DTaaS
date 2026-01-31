import {
  benchmarkConfig,
  setTrials,
  setAlternateRunnerTag,
  DEFAULT_TASK,
  tasks,
  addTask,
  resetTasks,
} from 'model/backend/gitlab/measure/benchmark.tasks';

describe('benchmark.tasks', () => {
  let originalTrials: number;
  let originalRunnerTag1: string;
  let originalRunnerTag2: string;
  let originalTasksLength: number;

  beforeEach(() => {
    originalTrials = benchmarkConfig.trials;
    originalRunnerTag1 = benchmarkConfig.runnerTag1;
    originalRunnerTag2 = benchmarkConfig.runnerTag2;
    originalTasksLength = tasks.length;
  });

  afterEach(() => {
    benchmarkConfig.trials = originalTrials;
    benchmarkConfig.runnerTag1 = originalRunnerTag1;
    benchmarkConfig.runnerTag2 = originalRunnerTag2;
    tasks.length = originalTasksLength;
  });

  describe('benchmarkConfig', () => {
    it('should have default trials value of 3', () => {
      expect(benchmarkConfig.trials).toBe(3);
    });

    it('should have default runnerTag1 value of linux', () => {
      expect(benchmarkConfig.runnerTag1).toBe('linux');
    });

    it('should have default runnerTag2 value of windows', () => {
      expect(benchmarkConfig.runnerTag2).toBe('windows');
    });
  });

  describe('setTrials', () => {
    it('should update the trials value in config', () => {
      setTrials(5);
      expect(benchmarkConfig.trials).toBe(5);
    });

    it('should accept zero as a valid value', () => {
      setTrials(0);
      expect(benchmarkConfig.trials).toBe(0);
    });

    it('should accept large values', () => {
      setTrials(100);
      expect(benchmarkConfig.trials).toBe(100);
    });
  });

  describe('setAlternateRunnerTag', () => {
    it('should update the runnerTag2 value in config', () => {
      setAlternateRunnerTag('macos');
      expect(benchmarkConfig.runnerTag2).toBe('macos');
    });

    it('should accept empty string', () => {
      setAlternateRunnerTag('');
      expect(benchmarkConfig.runnerTag2).toBe('');
    });

    it('should accept complex runner tags', () => {
      setAlternateRunnerTag('docker-runner-gpu');
      expect(benchmarkConfig.runnerTag2).toBe('docker-runner-gpu');
    });
  });

  describe('DEFAULT_TASK', () => {
    it('should have empty Task Name', () => {
      expect(DEFAULT_TASK['Task Name']).toBe('');
    });

    it('should have empty Description', () => {
      expect(DEFAULT_TASK.Description).toBe('');
    });

    it('should have empty Trials array', () => {
      expect(DEFAULT_TASK.Trials).toEqual([]);
    });

    it('should have undefined Time Start', () => {
      expect(DEFAULT_TASK['Time Start']).toBeUndefined();
    });

    it('should have undefined Time End', () => {
      expect(DEFAULT_TASK['Time End']).toBeUndefined();
    });

    it('should have undefined Average Time', () => {
      expect(DEFAULT_TASK['Average Time (s)']).toBeUndefined();
    });

    it('should have PENDING status', () => {
      expect(DEFAULT_TASK.Status).toBe('PENDING');
    });

    it('should have a Function that returns empty array', async () => {
      const mockExecuteDT = jest.fn();
      const result = await DEFAULT_TASK.Function(mockExecuteDT);
      expect(result).toEqual([]);
    });
  });

  describe('tasks array', () => {
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
        expect(task.Function).toBeDefined();
        expect(typeof task.Function).toBe('function');
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
  });

  describe('addTask', () => {
    it('should add a new task to the tasks array', () => {
      const initialLength = tasks.length;
      addTask({
        'Task Name': 'Test Task',
        Description: 'A test task',
      });
      expect(tasks.length).toBe(initialLength + 1);
    });

    it('should merge provided properties with DEFAULT_TASK', () => {
      const initialLength = tasks.length;
      addTask({
        'Task Name': 'Custom Task',
        Description: 'Custom description',
      });
      const addedTask = tasks[initialLength];
      expect(addedTask['Task Name']).toBe('Custom Task');
      expect(addedTask.Description).toBe('Custom description');
      expect(addedTask.Status).toBe('PENDING');
      expect(addedTask.Trials).toEqual([]);
    });

    it('should allow custom Function to be provided', async () => {
      const mockFn = jest.fn().mockResolvedValue([{ result: 'test' }]);
      const initialLength = tasks.length;
      addTask({
        'Task Name': 'Function Test',
        Description: 'Test function',
        Function: mockFn,
      });
      const addedTask = tasks[initialLength];
      const mockExecuteDT = jest.fn();
      await addedTask.Function(mockExecuteDT);
      expect(mockFn).toHaveBeenCalled();
    });

    it('should add task with all default values when called with empty object', () => {
      const initialLength = tasks.length;
      addTask({});
      const addedTask = tasks[initialLength];
      expect(addedTask['Task Name']).toBe('');
      expect(addedTask.Description).toBe('');
      expect(addedTask.Status).toBe('PENDING');
    });
  });

  describe('resetTasks', () => {
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

    it('should return tasks with PENDING status', () => {
      const resetResults = resetTasks();
      resetResults.forEach((task) => {
        expect(task.Status).toBe('PENDING');
      });
    });

    it('should preserve Task Name and Description', () => {
      const resetResults = resetTasks();
      resetResults.forEach((task, index) => {
        expect(task['Task Name']).toBe(tasks[index]['Task Name']);
        expect(task.Description).toBe(tasks[index].Description);
      });
    });

    it('should preserve Function references', () => {
      const resetResults = resetTasks();
      resetResults.forEach((task, index) => {
        expect(task.Function).toBe(tasks[index].Function);
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
  });

  describe('task Function execution', () => {
    it('Valid Setup task should call executeDT once with hello-world', async () => {
      const setupTask = tasks.find(
        (t) => t['Task Name'] === 'Valid Setup Digital Twin Execution',
      );
      const mockExecuteDT = jest
        .fn()
        .mockResolvedValue({ dtName: 'hello-world' });

      await setupTask?.Function(mockExecuteDT);

      expect(mockExecuteDT).toHaveBeenCalledTimes(1);
      expect(mockExecuteDT).toHaveBeenCalledWith('hello-world');
    });

    it('Multiple Identical task should call executeDT twice with hello-world', async () => {
      const multiTask = tasks.find(
        (t) =>
          t['Task Name'] === 'Multiple Identical Digital Twins Simultaneously',
      );
      const mockExecuteDT = jest
        .fn()
        .mockResolvedValue({ dtName: 'hello-world' });

      await multiTask?.Function(mockExecuteDT);

      expect(mockExecuteDT).toHaveBeenCalledTimes(2);
      expect(mockExecuteDT).toHaveBeenNthCalledWith(1, 'hello-world');
      expect(mockExecuteDT).toHaveBeenNthCalledWith(2, 'hello-world');
    });

    it('Multiple different task should call executeDT with hello-world and mass-spring-damper', async () => {
      const diffTask = tasks.find(
        (t) =>
          t['Task Name'] === 'Multiple different Digital Twins Simultaneously',
      );
      const mockExecuteDT = jest.fn().mockResolvedValue({ dtName: 'test' });

      await diffTask?.Function(mockExecuteDT);

      expect(mockExecuteDT).toHaveBeenCalledTimes(2);
      expect(mockExecuteDT).toHaveBeenCalledWith('hello-world');
      expect(mockExecuteDT).toHaveBeenCalledWith('mass-spring-damper');
    });

    it('Different Runners same DT task should use runner tags from config', async () => {
      const runnerTask = tasks.find(
        (t) => t['Task Name'] === 'Different Runners same Digital Twin',
      );
      const mockExecuteDT = jest.fn().mockResolvedValue({ dtName: 'test' });

      await runnerTask?.Function(mockExecuteDT);

      expect(mockExecuteDT).toHaveBeenCalledTimes(2);
      expect(mockExecuteDT).toHaveBeenCalledWith('hello-world', {
        'Runner tag': benchmarkConfig.runnerTag1,
      });
      expect(mockExecuteDT).toHaveBeenCalledWith('hello-world', {
        'Runner tag': benchmarkConfig.runnerTag2,
      });
    });

    it('Different Runners different DTs task should use both DTs and runner tags', async () => {
      const runnerDiffTask = tasks.find(
        (t) => t['Task Name'] === 'Different Runners different Digital Twins',
      );
      const mockExecuteDT = jest.fn().mockResolvedValue({ dtName: 'test' });

      await runnerDiffTask?.Function(mockExecuteDT);

      expect(mockExecuteDT).toHaveBeenCalledTimes(2);
      expect(mockExecuteDT).toHaveBeenCalledWith('hello-world', {
        'Runner tag': benchmarkConfig.runnerTag1,
      });
      expect(mockExecuteDT).toHaveBeenCalledWith('mass-spring-damper', {
        'Runner tag': benchmarkConfig.runnerTag2,
      });
    });
  });
});
