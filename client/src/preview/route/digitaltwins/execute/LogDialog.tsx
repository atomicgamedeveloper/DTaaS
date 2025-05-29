import * as React from 'react';
import { Dispatch, SetStateAction, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { formatName } from 'preview/util/digitalTwin';
import { fetchExecutionHistory } from 'model/backend/gitlab/state/executionHistory.slice';
import ExecutionHistoryList from 'components/execution/ExecutionHistoryList';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

interface LogDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
}

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

function LogDialog({ showLog, setShowLog, name }: LogDialogProps) {
  const dispatch =
    useDispatch<ThunkDispatch<RootState, unknown, Action<string>>>();

  useEffect(() => {
    if (showLog) {
      // Use the thunk action creator directly
      dispatch(fetchExecutionHistory(name));
    }
  }, [dispatch, name, showLog]);

  const handleViewLogs = () => {};

  const title = `${formatName(name)} Execution History`;

  return (
    <Dialog open={showLog} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <ExecutionHistoryList dtName={name} onViewLogs={handleViewLogs} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleCloseLog(setShowLog)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LogDialog;
