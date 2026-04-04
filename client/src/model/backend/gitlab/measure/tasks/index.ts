import { TaskDefinition } from './taskDefinition';
import validSetupExecution from './validSetupExecution';
import multipleIdenticalDTs from './multipleIdenticalDTs';
import multipleDifferentDTs from './multipleDifferentDTs';
import differentRunnersSameDT from './differentRunnersSameDT';
import differentRunnersDifferentDTs from './differentRunnersDifferentDTs';

export const taskDefinitions: readonly TaskDefinition[] = [
  validSetupExecution,
  multipleIdenticalDTs,
  multipleDifferentDTs,
  differentRunnersSameDT,
  differentRunnersDifferentDTs,
];

export type { TaskDefinition } from './taskDefinition';
