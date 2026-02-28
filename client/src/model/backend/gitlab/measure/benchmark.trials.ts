/* eslint-disable no-await-in-loop */
import { delay } from 'model/backend/gitlab/execution/pipelineCore';
import { isFailureStatus } from 'model/backend/gitlab/execution/statusChecking';
import {
  ExecutionResult,
  Trial,
  Execution,
} from 'model/backend/gitlab/measure/benchmark.types';
import { benchmarkState } from 'model/backend/gitlab/measure/benchmark.execution';
import { runDigitalTwin } from 'model/backend/gitlab/measure/benchmark.pipeline';

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
    if (benchmarkState.shouldStopPipelines) {
      break;
    }

    if (trialNumber > 0) {
      await delay(250);
    }

    benchmarkState.executionResults = [];
    benchmarkState.activePipelines = [];
    benchmarkState.currentTrialMinPipelineId = null;
    benchmarkState.currentTrialExecutionIndex = 0;
    const trialStart = new Date();

    try {
      const results: ExecutionResult[] = [];
      for (const { dtName, config } of executions) {
        if (benchmarkState.shouldStopPipelines) {
          break;
        }
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
