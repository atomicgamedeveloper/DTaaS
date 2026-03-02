/* eslint-disable no-await-in-loop */
import store from 'store/store';
import { getAuthority } from 'util/envUtil';
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
  benchmarkState,
  DEFAULT_CONFIG,
} from 'model/backend/gitlab/measure/benchmark.execution';

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
        .catch(() => {});
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
