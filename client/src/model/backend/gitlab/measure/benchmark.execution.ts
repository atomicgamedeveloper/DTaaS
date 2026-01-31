/* eslint-disable no-await-in-loop */
import store from 'store/store';
import { getAuthority } from 'util/envUtil';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
  MAX_EXECUTION_TIME,
  PIPELINE_POLL_INTERVAL,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import DigitalTwin from 'model/backend/digitalTwin';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import createGitlabInstance from 'model/backend/gitlab/gitlabFactory';
import {
  isPipelineCompleted,
  delay,
  hasTimedOut,
} from 'model/backend/gitlab/execution/pipelineCore';
import {
  Configuration,
  ExecutionResult,
  ActivePipeline,
} from './benchmark.types';

export const DEFAULT_CONFIG: Configuration = {
  'Branch name': BRANCH_NAME,
  'Group name': GROUP_NAME,
  'Common Library project name': COMMON_LIBRARY_PROJECT_NAME,
  'DT directory': DT_DIRECTORY,
  'Runner tag': RUNNER_TAG,
};

export const benchmarkState = {
  shouldStopPipelines: false,
  activePipelines: [] as ActivePipeline[],
  executionResults: [] as ExecutionResult[],
  currentMeasurementPromise: null as Promise<void> | null,
  currentTrialMinPipelineId: null as number | null,
};

function getChildPipelineId(parentPipelineId: number): number {
  return parentPipelineId + 1;
}

// Store original settings to restore after benchmark
let originalSettings: {
  RUNNER_TAG: string;
  BRANCH_NAME: string;
} | null = null;

export function saveOriginalSettings(): void {
  if (originalSettings === null) {
    const state = store.getState();
    originalSettings = {
      RUNNER_TAG: state.settings.RUNNER_TAG,
      BRANCH_NAME: state.settings.BRANCH_NAME,
    };
  }
}

export function restoreOriginalSettings(): void {
  if (originalSettings !== null) {
    store.dispatch({
      type: 'settings/setRunnerTag',
      payload: originalSettings.RUNNER_TAG,
    });
    store.dispatch({
      type: 'settings/setBranchName',
      payload: originalSettings.BRANCH_NAME,
    });
    originalSettings = null;
  }
}

async function* pollPipelineUntilComplete(
  backend: BackendInterface,
  pipelineId: number,
  startTime: number,
): AsyncGenerator<string, string, unknown> {
  let status = 'pending';
  yield status;

  while (!isPipelineCompleted(status)) {
    if (benchmarkState.shouldStopPipelines) {
      throw new Error(`Pipeline ${pipelineId} stopped by user.`);
    }
    if (hasTimedOut(startTime, MAX_EXECUTION_TIME)) {
      throw new Error(`Pipeline ${pipelineId} timed out.`);
    }
    await delay(PIPELINE_POLL_INTERVAL);
    try {
      const newStatus = await backend.getPipelineStatus(
        backend.getProjectId(),
        pipelineId,
      );
      if (newStatus && newStatus !== status) {
        status = newStatus;
        yield status;
      }
    } catch {
      // Error polling pipeline. Continue polling
    }
  }
  return status;
}

function updatePipelineStatus(
  pipelineId: number,
  status: string,
  phase: 'parent' | 'child',
): void {
  const pipeline = benchmarkState.activePipelines.find(
    (p) => p.pipelineId === pipelineId,
  );
  if (pipeline) {
    pipeline.status = status;
    pipeline.phase = phase;
  }
}

export async function cancelActivePipelines(): Promise<void> {
  for (const { backend, pipelineId } of [...benchmarkState.activePipelines]) {
    try {
      const projectId = backend.getProjectId();
      await backend.api.cancelPipeline(projectId, pipelineId);
      await backend.api
        .cancelPipeline(projectId, getChildPipelineId(pipelineId))
        .catch(() => {});
    } catch {
      // Error cancelling pipeline. Continue with others
    }
  }
}

async function initializeBackend(
  config?: Configuration,
): Promise<BackendInterface> {
  const oauthToken = sessionStorage.getItem('access_token');
  const username = sessionStorage.getItem('username');

  if (!oauthToken || !username) {
    throw new Error('Not authenticated. Missing access_token or username.');
  }

  const backend = createGitlabInstance(
    sessionStorage.getItem('username') || '',
    sessionStorage.getItem('access_token') || '',
    getAuthority(),
  );
  if (config) {
    if (config['Runner tag']) {
      store.dispatch({
        type: 'settings/setRunnerTag',
        payload: config['Runner tag'],
      });
    }
    if (config['Branch name']) {
      store.dispatch({
        type: 'settings/setBranchName',
        payload: config['Branch name'],
      });
    }
  }

  await backend.init();
  return backend;
}

async function consumeStatusGenerator(
  generator: AsyncGenerator<string, string, unknown>,
  pipelineId: number,
  phase: 'parent' | 'child',
): Promise<string> {
  let finalStatus = '';
  for await (const status of generator) {
    updatePipelineStatus(pipelineId, status, phase);
    finalStatus = status;
  }
  return finalStatus;
}

async function executeDigitalTwinPipeline(
  dtName: string,
  backend: BackendInterface,
  config: Configuration,
): Promise<ExecutionResult> {
  const digitalTwin = new DigitalTwin(dtName, backend);
  const pipelineId = await digitalTwin.execute();

  if (!pipelineId) {
    throw new Error(`Failed to start pipeline for ${dtName}.`);
  }

  if (benchmarkState.currentTrialMinPipelineId === null) {
    benchmarkState.currentTrialMinPipelineId = pipelineId;
  }

  const startTime = Date.now();
  benchmarkState.activePipelines.push({
    backend,
    pipelineId,
    dtName,
    config,
    status: 'pending',
    phase: 'parent',
  });

  const parentGenerator = pollPipelineUntilComplete(
    backend,
    pipelineId,
    startTime,
  );
  await consumeStatusGenerator(parentGenerator, pipelineId, 'parent');
  await delay(1000);

  const childPipelineId = getChildPipelineId(pipelineId);
  const childGenerator = pollPipelineUntilComplete(
    backend,
    childPipelineId,
    startTime,
  );
  const childStatus = await consumeStatusGenerator(
    childGenerator,
    pipelineId,
    'child',
  );

  const result: ExecutionResult = {
    dtName,
    pipelineId,
    status: childStatus,
    config,
  };

  benchmarkState.executionResults.push(result);
  benchmarkState.activePipelines = benchmarkState.activePipelines.filter(
    (pipeline) => pipeline.pipelineId !== pipelineId,
  );

  return result;
}

export async function runDigitalTwin(
  dtName: string,
  config?: Partial<Configuration>,
): Promise<ExecutionResult> {
  const usedConfig: Configuration = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  const backend = await initializeBackend(usedConfig);
  return executeDigitalTwinPipeline(dtName, backend, usedConfig);
}
