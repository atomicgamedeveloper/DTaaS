import { benchmarkConfig as BenchmarkConfig } from 'model/backend/gitlab/measure/benchmark.execution';
import { TaskDefinition } from './taskDefinition';

const differentRunnersDifferentDTs: TaskDefinition = {
  name: 'Different Runners different Digital Twins',
  description:
    'Running the Hello World and Mass spring damper Digital Twins with 2 runners.',
  executions: () => [
    {
      dtName: 'hello-world',
      config: { 'Runner tag': BenchmarkConfig.runnerTag1 },
    },
    {
      dtName: 'mass-spring-damper',
      config: { 'Runner tag': BenchmarkConfig.runnerTag2 },
    },
  ],
};

export default differentRunnersDifferentDTs;
