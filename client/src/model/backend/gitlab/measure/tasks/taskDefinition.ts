import type { Execution } from 'model/backend/gitlab/measure/benchmark.execution';

export interface TaskDefinition {
  name: string;
  description: string;
  executions: () => Execution[];
}
