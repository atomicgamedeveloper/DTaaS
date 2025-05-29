import { DTExecutionResult } from '../model/backend/gitlab/types/executionHistory';

/**
 * Represents the schema for the IndexedDB database
 */
export interface IndexedDBSchema {
  executionHistory: {
    key: string; // id
    value: DTExecutionResult;
    indexes: {
      dtName: string;
      timestamp: number;
    };
  };
}

/**
 * Database configuration
 */
export const DB_CONFIG = {
  name: 'DTaaS',
  version: 1,
  stores: {
    executionHistory: {
      keyPath: 'id',
      indexes: [
        { name: 'dtName', keyPath: 'dtName' },
        { name: 'timestamp', keyPath: 'timestamp' },
      ],
    },
  },
};
