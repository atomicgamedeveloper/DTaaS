import * as React from 'react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchAllExecutionHistory,
  checkRunningExecutions,
} from 'model/backend/gitlab/state/executionHistory.slice';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

/**
 * Component that loads execution history when the application starts
 * This component doesn't render anything, it just loads data
 */
const ExecutionHistoryLoader: React.FC = () => {
  const dispatch =
    useDispatch<ThunkDispatch<RootState, unknown, Action<string>>>();

  useEffect(() => {
    dispatch(fetchAllExecutionHistory());

    const intervalId = setInterval(() => {
      dispatch(checkRunningExecutions());
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch]);

  return null;
};

export default ExecutionHistoryLoader;
