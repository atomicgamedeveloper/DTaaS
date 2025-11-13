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

export default DB_CONFIG;
