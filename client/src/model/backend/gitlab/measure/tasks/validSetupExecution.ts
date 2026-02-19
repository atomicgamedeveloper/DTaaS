import { TaskDefinition } from './taskDefinition';

const validSetupExecution: TaskDefinition = {
  name: 'Valid Setup Digital Twin Execution',
  description: 'Running the Hello World Digital Twin with current setup.',
  executions: () => [{ dtName: 'hello-world', config: {} }],
};

export default validSetupExecution;
