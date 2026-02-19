import { Execution } from 'model/backend/gitlab/measure/benchmark.types';

export interface TaskDefinition {
  name: string;
  description: string;
  executions: () => Execution[];
}
