import { Dispatch, SetStateAction } from 'react';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import DigitalTwin from 'preview/util/digitalTwin';

export interface PipelineStatusParams {
  setButtonText: Dispatch<SetStateAction<string>>;
  digitalTwin: DigitalTwin;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
  dispatch: ReturnType<typeof import('react-redux').useDispatch>;
  executionId?: string;
}

export type PipelineHandlerDispatch = ThunkDispatch<
  RootState,
  unknown,
  Action<string>
>;

export interface JobLog {
  jobName: string;
  log: string;
}
