/* eslint-disable no-await-in-loop */
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import {
  isPipelineCompleted,
  delay,
  hasTimedOut,
} from 'model/backend/gitlab/execution/pipelineCore';
import {
  MAX_EXECUTION_TIME,
  PIPELINE_POLL_INTERVAL,
} from 'model/backend/gitlab/digitalTwinConfig/constants';

export interface PollOptions {
  shouldAbort?: () => boolean;
}

/**
 * Polls a GitLab pipeline until it completes, times out, or is aborted.
 * Yields status strings as the pipeline progresses.
 *
 * This is a shared utility used by both the benchmark execution layer and
 * (in future) the DT DevOps execution layer.
 */
export async function* pollPipelineStatus(
  backend: BackendInterface,
  pipelineId: number,
  startTime: number,
  options?: PollOptions,
): AsyncGenerator<string, string, unknown> {
  let status = 'pending';
  yield status;

  while (!isPipelineCompleted(status)) {
    if (options?.shouldAbort?.()) {
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
      // continue polling
    }
  }
  return status;
}
