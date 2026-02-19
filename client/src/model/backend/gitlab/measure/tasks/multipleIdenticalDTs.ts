import { TaskDefinition } from './taskDefinition';

const multipleIdenticalDTs: TaskDefinition = {
  name: 'Multiple Identical Digital Twins Simultaneously',
  description: 'Running the Hello World Digital Twin twice at once.',
  executions: () => [
    { dtName: 'hello-world', config: {} },
    { dtName: 'hello-world', config: {} },
  ],
};

export default multipleIdenticalDTs;
