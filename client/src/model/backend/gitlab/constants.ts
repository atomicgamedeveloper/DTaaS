// util/gitlab.ts
export const GROUP_NAME = 'DTaaS';
export const DT_DIRECTORY = 'digital_twins';
export const COMMON_LIBRARY_PROJECT_NAME = 'common';

export enum AssetTypes {
  'Functions' = 'functions',
  'Models' = 'models',
  'Tools' = 'tools',
  'Data' = 'data',
  'Digital Twins' = 'digital_twins',
  'Digital Twin' = 'digital_twin',
}

// util/digitalTwin.ts
export const RUNNER_TAG = 'linux';

// route/digitaltwins/execute/pipelineChecks.ts
export const MAX_EXECUTION_TIME = 10 * 60 * 1000;
export const defaultFiles = [
  { name: 'description.md', type: 'description' },
  { name: 'README.md', type: 'description' },
  { name: '.gitlab-ci.yml', type: 'config' },
];
export enum FileType {
  DESCRIPTION = 'description',
  CONFIGURATION = 'configuration',
  LIFECYCLE = 'lifecycle',
}
