import { benchmarkConfig as BenchmarkConfig } from 'model/backend/gitlab/measure/benchmark.execution';
import { TaskDefinition } from './taskDefinition';

const multipleDifferentDTs: TaskDefinition = {
  name: 'Multiple different Digital Twins Simultaneously',
  description:
    'Running the primary and secondary Digital Twins at once.',
  executions: () => [
    { dtName: BenchmarkConfig.primaryDTName, config: {} },
    { dtName: BenchmarkConfig.secondaryDTName, config: {} },
  ],
};

export default multipleDifferentDTs;
