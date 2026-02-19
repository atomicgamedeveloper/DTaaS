/* eslint-disable no-await-in-loop */
import store from 'store/store';
import { getAuthority } from 'util/envUtil';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import DigitalTwin from 'model/backend/digitalTwin';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import createGitlabInstance from 'model/backend/gitlab/gitlabFactory';
import {
  delay,
  getChildPipelineId,
} from 'model/backend/gitlab/execution/pipelineCore';
import { pollPipelineStatus } from 'model/backend/gitlab/execution/pipelinePolling';
import {
  Configuration,
  ExecutionResult,
  ActivePipeline,
} from 'model/backend/gitlab/measure/benchmark.types';

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
  currentTrialExecutionIndex: 0,
};

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

/**
 * Benchmark execution is intentionally separate from DT DevOps execution.
 * Benchmark adds batch orchestration, timing, temporary settings overrides,
 * and fresh backend initialization per execution — requirements that differ
 * fundamentally from the single-pipeline DT DevOps flow.
 * Pipeline polling itself is shared via pipelinePolling.ts.
 */
const abortOptions = { shouldAbort: () => benchmarkState.shouldStopPipelines };

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
  for (const { backend, pipelineId } of benchmarkState.activePipelines) {
    try {
      const projectId = backend.getProjectId();
      await backend.api.cancelPipeline(projectId, pipelineId);
      await backend.api
        .cancelPipeline(projectId, getChildPipelineId(pipelineId))
        .catch(() => { });
    } catch {
      // continue with others
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
  const executionIndex = benchmarkState.currentTrialExecutionIndex;
  benchmarkState.currentTrialExecutionIndex += 1;

  const digitalTwin = new DigitalTwin(dtName, backend);
  const pipelineId = await digitalTwin.execute(true);

  if (!pipelineId) {
    throw new Error(`Failed to start pipeline for ${dtName}.`);
  }

  benchmarkState.currentTrialMinPipelineId ??= pipelineId;

  const startTime = Date.now();
  benchmarkState.activePipelines.push({
    backend,
    pipelineId,
    dtName,
    config,
    status: 'pending',
    phase: 'parent',
    executionIndex,
  });

  const parentGenerator = pollPipelineStatus(
    backend,
    pipelineId,
    startTime,
    abortOptions,
  );
  await consumeStatusGenerator(parentGenerator, pipelineId, 'parent');
  await delay(250);

  const childPipelineId = getChildPipelineId(pipelineId);
  const childGenerator = pollPipelineStatus(
    backend,
    childPipelineId,
    startTime,
    abortOptions,
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
    executionIndex,
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
