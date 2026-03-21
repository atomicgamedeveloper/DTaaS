// GitLab pipeline lifecycle (trigger, poll, cancel, collect results)
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
import { isFailureStatus } from 'model/backend/gitlab/execution/statusChecking';
import {
  Configuration,
  ExecutionResult,
  Trial,
  Execution,
  benchmarkState,
  getDefaultConfig,
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
  const username = sessionStorage.getItem('username');
  const oauthToken = sessionStorage.getItem('access_token');
  if (!oauthToken || !username) {
    throw new Error('Not authenticated. Missing access_token or username.');
  }

  const backend = createGitlabInstance(username, oauthToken, getAuthority());
  const savedBranchName = store.getState().settings.BRANCH_NAME;
  if (config?.['Branch name'])
    store.dispatch({
      type: 'settings/setBranchName',
      payload: config['Branch name'],
    });
  await backend.init();
  store.dispatch({
    type: 'settings/setBranchName',
    payload: savedBranchName,
  });
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
  const pipelineId = await digitalTwin.execute(true, config['Runner tag']);

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
  const usedConfig: Configuration = { ...getDefaultConfig(), ...config };
  const backend = await initializeBackend(usedConfig);
  return executeDigitalTwinPipeline(dtName, backend, usedConfig);
}

export function createTrialFromExecution(
  trialStart: Date,
  executions: ExecutionResult[],
): Trial {
  const hasFailure = executions.some((exec) => isFailureStatus(exec.status));
  return {
    'Time Start': trialStart,
    'Time End': new Date(),
    Execution: executions,
    Status: hasFailure ? 'FAILURE' : 'SUCCESS',
    Error: undefined,
  };
}

export function createTrialFromError(
  trialStart: Date,
  caughtError: unknown,
  wasStopped: boolean,
): Trial {
  const errorMessage =
    caughtError instanceof Error ? caughtError.message : String(caughtError);
  const error =
    caughtError instanceof Error ? caughtError : new Error(String(caughtError));
  const minPipelineId = benchmarkState.currentTrialMinPipelineId ?? 0;

  const capturedExecutions: ExecutionResult[] = [
    ...benchmarkState.executionResults.filter(
      (result) =>
        result.pipelineId !== null && result.pipelineId >= minPipelineId,
    ),
    ...benchmarkState.activePipelines
      .filter((pipeline) => pipeline.pipelineId >= minPipelineId)
      .map((pipeline) => ({
        dtName: pipeline.dtName,
        pipelineId: pipeline.pipelineId,
        status: 'cancelled',
        config: pipeline.config,
      })),
  ];

  return {
    'Time Start': trialStart,
    'Time End': wasStopped ? undefined : new Date(),
    Execution: capturedExecutions,
    Status: wasStopped ? 'STOPPED' : 'FAILURE',
    Error: wasStopped ? undefined : { message: errorMessage, error },
  };
}

export async function runTrials(
  executions: Execution[],
  targetTrials: number,
  existingTrials: Trial[],
  updateTrials: (trials: Trial[]) => void,
): Promise<Trial[]> {
  const trials: Trial[] = [...existingTrials];
  const startTrialNumber = existingTrials.length;

  for (
    let trialNumber = startTrialNumber;
    trialNumber < targetTrials;
    trialNumber += 1
  ) {
    if (benchmarkState.shouldStopPipelines) break;
    if (trialNumber > 0) await delay(250);

    benchmarkState.executionResults = [];
    benchmarkState.activePipelines = [];
    benchmarkState.currentTrialMinPipelineId = null;
    benchmarkState.currentTrialExecutionIndex = 0;
    const trialStart = new Date();

    try {
      const results: ExecutionResult[] = [];
      for (const { dtName, config } of executions) {
        if (benchmarkState.shouldStopPipelines) break;
        results.push(await runDigitalTwin(dtName, config));
      }
      trials.push(createTrialFromExecution(trialStart, results));
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError);
      const wasStopped =
        benchmarkState.shouldStopPipelines ||
        errorMessage.includes('stopped by user');
      trials.push(createTrialFromError(trialStart, caughtError, wasStopped));
    }

    benchmarkState.executionResults = [];
    updateTrials([...trials]);
  }

  return trials;
}
