import { benchmarkConfig as BenchmarkConfig } from 'model/backend/gitlab/measure/benchmark.execution';
import { TaskDefinition } from './taskDefinition';

const differentRunnersDifferentDTs: TaskDefinition = {
  name: 'Different Runners different Digital Twins',
  description:
    'Running the primary and secondary Digital Twins with 2 runners.',
  executions: () => [
    {
      dtName: BenchmarkConfig.primaryDTName,
      config: { 'Runner tag': BenchmarkConfig.primaryRunnerTag },
    },
    {
      dtName: BenchmarkConfig.secondaryDTName,
      config: { 'Runner tag': BenchmarkConfig.secondaryRunnerTag },
    },
  ],
};

export default differentRunnersDifferentDTs;
