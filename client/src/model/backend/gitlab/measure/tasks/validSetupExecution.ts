import { benchmarkConfig as BenchmarkConfig } from 'model/backend/gitlab/measure/benchmark.execution';
import { TaskDefinition } from './taskDefinition';

const validSetupExecution: TaskDefinition = {
  name: 'Valid Setup Digital Twin Execution',
  description: 'Running the primary Digital Twin with current setup.',
  executions: () => [{ dtName: BenchmarkConfig.primaryDTName, config: {} }],
};

export default validSetupExecution;
