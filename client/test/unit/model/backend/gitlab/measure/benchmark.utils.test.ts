import {
  secondsDifference,
  getTotalTime,
  computeAverageTime,
  computeFinalStatus,
} from 'model/backend/gitlab/measure/benchmark.utils';
import {
  statusColorMap,
  getExecutionStatusColor,
} from 'route/benchmark/BenchmarkComponents';
import {
  createMockTask,
  createMockTrial,
} from 'test/unit/model/backend/gitlab/measure/benchmark.testUtil';

describe('benchmark.utils', () => {
  describe('statusColorMap', () => {
    it('should have colors for all status types', () => {
      expect(statusColorMap.PENDING).toBeDefined();
      expect(statusColorMap.RUNNING).toBeDefined();
      expect(statusColorMap.FAILURE).toBeDefined();
      expect(statusColorMap.SUCCESS).toBeDefined();
      expect(statusColorMap.STOPPED).toBeDefined();
    });
  });

  describe('getExecutionStatusColor', () => {
    it('should return correct color for success status', () => {
      expect(getExecutionStatusColor('success')).toBe('#1976d2');
    });

    it('should return correct color for failed status', () => {
      expect(getExecutionStatusColor('failed')).toBe('#d32f2f');
    });

    it('should return correct color for cancelled status', () => {
      expect(getExecutionStatusColor('cancelled')).toBe('#616161');
    });

    it('should return default color for unknown status', () => {
      expect(getExecutionStatusColor('unknown')).toBe('#9e9e9e');
    });
  });

  describe('secondsDifference', () => {
    it('should return undefined when startTime is undefined', () => {
      const endTime = new Date('2026-01-01T10:00:10.000Z');
      expect(secondsDifference(undefined, endTime)).toBeUndefined();
    });

    it('should return undefined when endTime is undefined', () => {
      const startTime = new Date('2026-01-01T10:00:00.000Z');
      expect(secondsDifference(startTime, undefined)).toBeUndefined();
    });

    it('should return undefined when both times are undefined', () => {
      expect(secondsDifference(undefined, undefined)).toBeUndefined();
    });

    it('should return correct seconds difference', () => {
      const startTime = new Date('2026-01-01T10:00:00.000Z');
      const endTime = new Date('2026-01-01T10:00:10.000Z');
      expect(secondsDifference(startTime, endTime)).toBe(10);
    });

    it('should handle fractional seconds', () => {
      const startTime = new Date('2026-01-01T10:00:00.000Z');
      const endTime = new Date('2026-01-01T10:00:05.500Z');
      expect(secondsDifference(startTime, endTime)).toBe(5.5);
    });
  });

  describe('getTotalTime', () => {
    it('should return null when no tasks have start times', () => {
      const results = [
        createMockTask({ 'Time Start': undefined, 'Time End': undefined }),
      ];
      expect(getTotalTime(results)).toBeNull();
    });

    it('should return null when no tasks have end times', () => {
      const results = [
        createMockTask({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': undefined,
        }),
      ];
      expect(getTotalTime(results)).toBeNull();
    });

    it('should return correct total time for single task', () => {
      const results = [createMockTask()];
      expect(getTotalTime(results)).toBe(30);
    });

    it('should return correct total time across multiple tasks', () => {
      const results = [
        createMockTask({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:20.000Z'),
        }),
        createMockTask({
          'Time Start': new Date('2026-01-01T10:00:10.000Z'),
          'Time End': new Date('2026-01-01T10:00:45.000Z'),
        }),
      ];
      expect(getTotalTime(results)).toBe(45);
    });
  });

  describe('computeAverageTime', () => {
    it('should return undefined for empty trials array', () => {
      expect(computeAverageTime([])).toBeUndefined();
    });

    it('should return undefined when no trials have complete times', () => {
      const trials = [
        createMockTrial({ 'Time Start': undefined, 'Time End': undefined }),
        createMockTrial({
          'Time Start': new Date(),
          'Time End': undefined,
        }),
      ];
      expect(computeAverageTime(trials)).toBeUndefined();
    });

    it('should return correct average for single trial', () => {
      const trials = [
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:10.000Z'),
        }),
      ];
      expect(computeAverageTime(trials)).toBe(10);
    });

    it('should return correct average for multiple trials', () => {
      const trials = [
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:10.000Z'),
        }),
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:01:00.000Z'),
          'Time End': new Date('2026-01-01T10:01:20.000Z'),
        }),
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:02:00.000Z'),
          'Time End': new Date('2026-01-01T10:02:15.000Z'),
        }),
      ];
      expect(computeAverageTime(trials)).toBe(15);
    });

    it('should ignore trials without complete times', () => {
      const trials = [
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:10.000Z'),
        }),
        createMockTrial({
          'Time Start': undefined,
          'Time End': undefined,
        }),
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:01:00.000Z'),
          'Time End': new Date('2026-01-01T10:01:20.000Z'),
        }),
      ];
      expect(computeAverageTime(trials)).toBe(15);
    });
  });

  describe('computeFinalStatus', () => {
    it('should return STOPPED when wasStopped and trials incomplete', () => {
      const trials = [createMockTrial({ Status: 'SUCCESS' })];
      expect(computeFinalStatus(trials, 3, true)).toBe('STOPPED');
    });

    it('should return STOPPED when any trial has STOPPED status', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'STOPPED' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      expect(computeFinalStatus(trials, 3, false)).toBe('STOPPED');
    });

    it('should return FAILURE when any trial has FAILURE status', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'FAILURE' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      expect(computeFinalStatus(trials, 3, false)).toBe('FAILURE');
    });

    it('should return SUCCESS when all trials succeeded', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      expect(computeFinalStatus(trials, 3, false)).toBe('SUCCESS');
    });

    it('should return SUCCESS when expected trials complete even with wasStopped', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      expect(computeFinalStatus(trials, 3, true)).toBe('SUCCESS');
    });
  });
});
