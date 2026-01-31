import 'fake-indexeddb/auto';
import measurementDBService from 'database/measurementHistoryDB';
import {
  createMockTask,
  clearDatabase,
  setupStructuredClone,
} from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';

setupStructuredClone();

describe('MeasurementDBService (Real Implementation)', () => {
  beforeEach(async () => {
    await measurementDBService.init();
    await clearDatabase(measurementDBService);
  });

  it('should initialize the database', async () => {
    await expect(measurementDBService.init()).resolves.not.toThrow();
  });

  it('should add a measurement record and retrieve it', async () => {
    const task = createMockTask({ 'Task Name': 'Add Test Task' });

    const resultId = await measurementDBService.add(task);
    expect(resultId).toContain('Add Test Task');

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(1);
    expect(allRecords[0].taskName).toBe('Add Test Task');
  });

  it('should retrieve measurements by task name', async () => {
    const taskName = 'Specific Task';
    const task1 = createMockTask({ 'Task Name': taskName });
    const task2 = createMockTask({ 'Task Name': taskName });
    const task3 = createMockTask({ 'Task Name': 'Other Task' });

    await measurementDBService.add(task1);
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    }); // Ensure unique timestamps
    await measurementDBService.add(task2);
    await measurementDBService.add(task3);

    const results = await measurementDBService.getByTaskName(taskName);
    expect(results.length).toBe(2);
    expect(results.every((r) => r.taskName === taskName)).toBe(true);
  });

  it('should return empty array for non-existent task name', async () => {
    const results = await measurementDBService.getByTaskName('Non-existent');
    expect(results).toEqual([]);
  });

  it('should retrieve all measurement records', async () => {
    const task1 = createMockTask({ 'Task Name': 'Task 1' });
    const task2 = createMockTask({ 'Task Name': 'Task 2' });
    const task3 = createMockTask({ 'Task Name': 'Task 3' });

    await measurementDBService.add(task1);
    await measurementDBService.add(task2);
    await measurementDBService.add(task3);

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(3);
  });

  it('should delete a specific measurement record', async () => {
    const task = createMockTask({ 'Task Name': 'Delete Test' });

    const id = await measurementDBService.add(task);

    let allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(1);

    await measurementDBService.delete(id);

    allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(0);
  });

  it('should purge all measurement records', async () => {
    const task1 = createMockTask({ 'Task Name': 'Purge Task 1' });
    const task2 = createMockTask({ 'Task Name': 'Purge Task 2' });
    const task3 = createMockTask({ 'Task Name': 'Purge Task 3' });

    await measurementDBService.add(task1);
    await measurementDBService.add(task2);
    await measurementDBService.add(task3);

    let allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(3);

    await measurementDBService.purge();

    allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(0);
  });

  it('should store complete task data in measurement record', async () => {
    const task = createMockTask({
      'Task Name': 'Complete Data Task',
      Description: 'Complete description',
      Trials: [
        {
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:10.000Z'),
          Execution: [
            {
              dtName: 'hello-world',
              pipelineId: 123,
              status: 'success',
              config: {
                'Branch name': 'master',
                'Group name': 'DTaaS',
                'Common Library project name': 'common',
                'DT directory': 'digital_twins',
                'Runner tag': 'linux',
              },
            },
          ],
          Status: 'SUCCESS',
          Error: undefined,
        },
      ],
      'Average Time (s)': 10,
      Status: 'SUCCESS',
    });

    await measurementDBService.add(task);

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(1);

    const record = allRecords[0];
    expect(record.task['Task Name']).toBe('Complete Data Task');
    expect(record.task.Trials.length).toBe(1);
    expect(record.task.Trials[0].Execution[0].dtName).toBe('hello-world');
  });

  it('should handle multiple init calls gracefully', async () => {
    await expect(measurementDBService.init()).resolves.not.toThrow();
    await expect(measurementDBService.init()).resolves.not.toThrow();
    await expect(measurementDBService.init()).resolves.not.toThrow();
  });

  it('should handle delete on non-existent ID', async () => {
    await expect(
      measurementDBService.delete('non-existent-id'),
    ).resolves.not.toThrow();
  });

  it('should handle concurrent add operations', async () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      createMockTask({ 'Task Name': `Concurrent Task ${i}` }),
    );

    await Promise.all(tasks.map((task) => measurementDBService.add(task)));

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(5);
  });

  it('should generate unique IDs for same task added multiple times', async () => {
    const task = createMockTask({ 'Task Name': 'Same Task' });

    const id1 = await measurementDBService.add(task);
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    const id2 = await measurementDBService.add(task);

    expect(id1).not.toBe(id2);

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(2);
  });

  it('should store timestamp with measurement record', async () => {
    const beforeAdd = Date.now();
    const task = createMockTask({ 'Task Name': 'Timestamp Task' });

    await measurementDBService.add(task);
    const afterAdd = Date.now();

    const allRecords = await measurementDBService.getAll();
    expect(allRecords[0].timestamp).toBeGreaterThanOrEqual(beforeAdd);
    expect(allRecords[0].timestamp).toBeLessThanOrEqual(afterAdd);
  });

  it('should reject add operation when database is not initialized', async () => {
    const { default: MeasurementDBService } = await import(
      'database/measurementHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(MeasurementDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    const task = createMockTask();

    await expect(uninitializedService.add(task)).rejects.toThrow(
      'Database not initialized - init() must be called first',
    );
  });

  it('should reject getAll operation when database is not initialized', async () => {
    const { default: MeasurementDBService } = await import(
      'database/measurementHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(MeasurementDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(uninitializedService.getAll()).rejects.toThrow(
      'Database not initialized',
    );
  });

  it('should reject getByTaskName operation when database is not initialized', async () => {
    const { default: MeasurementDBService } = await import(
      'database/measurementHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(MeasurementDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(uninitializedService.getByTaskName('test')).rejects.toThrow(
      'Database not initialized',
    );
  });

  it('should reject purge operation when database is not initialized', async () => {
    const { default: MeasurementDBService } = await import(
      'database/measurementHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(MeasurementDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(uninitializedService.purge()).rejects.toThrow(
      'Database not initialized',
    );
  });

  it('should reject delete operation when database is not initialized', async () => {
    const { default: MeasurementDBService } = await import(
      'database/measurementHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(MeasurementDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(uninitializedService.delete('test-id')).rejects.toThrow(
      'Database not initialized',
    );
  });
});
