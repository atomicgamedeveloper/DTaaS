import { benchmarkConfig as BenchmarkConfig } from 'model/backend/gitlab/measure/benchmark.execution';
import { TaskDefinition } from './taskDefinition';

const differentRunnersSameDT: TaskDefinition = {
  name: 'Different Runners same Digital Twin',
  description: 'Running the primary Digital Twin twice with 2 runners.',
  executions: () => [
    {
      dtName: BenchmarkConfig.primaryDTName,
      config: { 'Runner tag': BenchmarkConfig.primaryRunnerTag },
    },
    {
      dtName: BenchmarkConfig.primaryDTName,
      config: { 'Runner tag': BenchmarkConfig.secondaryRunnerTag },
    },
  ],
};

export default differentRunnersSameDT;
