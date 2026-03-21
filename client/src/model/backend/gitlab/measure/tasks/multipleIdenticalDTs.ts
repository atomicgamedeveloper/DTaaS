import { benchmarkConfig as BenchmarkConfig } from 'model/backend/gitlab/measure/benchmark.execution';
import { TaskDefinition } from './taskDefinition';

const multipleIdenticalDTs: TaskDefinition = {
  name: 'Multiple Identical Digital Twins Simultaneously',
  description: 'Running the primary Digital Twin twice at once.',
  executions: () => [
    { dtName: BenchmarkConfig.primaryDTName, config: {} },
    { dtName: BenchmarkConfig.primaryDTName, config: {} },
  ],
};

export default multipleIdenticalDTs;
