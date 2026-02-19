import { TaskDefinition } from './taskDefinition';

const multipleDifferentDTs: TaskDefinition = {
  name: 'Multiple different Digital Twins Simultaneously',
  description:
    'Running the Hello World and Mass spring damper Digital Twins at once.',
  executions: () => [
    { dtName: 'hello-world', config: {} },
    { dtName: 'mass-spring-damper', config: {} },
  ],
};

export default multipleDifferentDTs;
