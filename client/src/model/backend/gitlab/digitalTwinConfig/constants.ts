export enum AssetTypes {
  'Functions' = 'functions',
  'Models' = 'models',
  'Tools' = 'tools',
  'Data' = 'data',
  'Digital Twins' = 'digital_twins',
  'Digital Twin' = 'digital_twin',
}

// Digital Twin
export const RUNNER_TAG = 'linux';

// Pipeline
export const MAX_EXECUTION_TIME = 10 * 60 * 1000;
export const PIPELINE_POLL_INTERVAL = 5000; // 5 seconds - for pipeline status checks
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