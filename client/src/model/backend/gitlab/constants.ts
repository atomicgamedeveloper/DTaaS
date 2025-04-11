// util/gitlab.ts
export const GROUP_NAME = 'DTaaS';
export const DT_DIRECTORY = 'digital_twins';
export const COMMON_LIBRARY_PROJECT_ID = 3;
export const COMMON_LIBRARY_PROJECT_NAME = 'common';

export enum AssetTypes {
  'Functions' = 'functions',
  'Models' = 'models',
  'Tools' = 'tools',
  'Data' = 'data',
  'Digital Twins' = 'digital_twins',
  'Digital twin' = 'digitalTwin',
}

// util/digitalTwin.ts
export const RUNNER_TAG = 'linux';

// route/digitaltwins/execute/pipelineChecks.ts
export const MAX_EXECUTION_TIME = 10 * 60 * 1000;
