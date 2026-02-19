import { TaskDefinition } from './taskDefinition';
import BenchmarkConfig from 'model/backend/gitlab/measure/benchmarkConfig';

const differentRunnersSameDT: TaskDefinition = {
  name: 'Different Runners same Digital Twin',
  description: 'Running the Hello World Digital Twin twice with 2 runners.',
  executions: () => [
    {
      dtName: 'hello-world',
      config: { 'Runner tag': BenchmarkConfig.runnerTag1 },
    },
    {
      dtName: 'hello-world',
      config: { 'Runner tag': BenchmarkConfig.runnerTag2 },
    },
  ],
};

export default differentRunnersSameDT;
