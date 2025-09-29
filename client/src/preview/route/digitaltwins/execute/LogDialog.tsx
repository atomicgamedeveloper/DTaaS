import * as React from 'react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { formatName } from 'preview/util/digitalTwin';
import {
  fetchExecutionHistory,
  clearExecutionHistoryForDT,
} from 'model/backend/gitlab/state/executionHistory.slice';
import ExecutionHistoryList from 'components/execution/ExecutionHistoryList';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import { showSnackbar } from 'store/snackbar.slice';
import { selectExecutionHistoryByDTName } from 'route/digitaltwins/execution';

interface LogDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
}

interface DeleteAllConfirmationDialogProps {
  open: boolean;
  dtName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAllConfirmationDialog: React.FC<
  DeleteAllConfirmationDialogProps
> = ({ open, dtName, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Confirm Clear All</DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to delete <strong>all</strong> execution history
        entries for <strong>{dtName}</strong>?
        <br />
        <br />
        This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary">
        Cancel
      </Button>
      <Button onClick={onConfirm} color="error">
        Delete All
      </Button>
    </DialogActions>
  </Dialog>
);

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

function LogDialog({ showLog, setShowLog, name }: LogDialogProps) {
  const dispatch =
    useDispatch<ThunkDispatch<RootState, unknown, Action<string>>>();

  const executions = useSelector(selectExecutionHistoryByDTName(name));
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  useEffect(() => {
    if (showLog) {
      // Use the thunk action creator directly
      dispatch(fetchExecutionHistory(name));
    }
  }, [dispatch, name, showLog]);

  const handleViewLogs = () => {};

  const handleClearAllClick = () => {
    if (executions.length === 0) {
      setTimeout(() => {
        dispatch(
          showSnackbar({
            message: 'Execution history is already empty',
            severity: 'info',
          }),
        );
      }, 100);
      return;
    }
    setDeleteAllDialogOpen(true);
  };

  const handleClearAllConfirm = () => {
    dispatch(clearExecutionHistoryForDT(name));
    setDeleteAllDialogOpen(false);
  };

  const handleClearAllCancel = () => {
    setDeleteAllDialogOpen(false);
  };

  const title = `${formatName(name)} Execution History`;

  return (
    <Dialog
      open={showLog}
      maxWidth="md"
      fullWidth
      onClose={() => handleCloseLog(setShowLog)}
    >
      <DeleteAllConfirmationDialog
        open={deleteAllDialogOpen}
        dtName={name}
        onClose={handleClearAllCancel}
        onConfirm={handleClearAllConfirm}
      />
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <ExecutionHistoryList dtName={name} onViewLogs={handleViewLogs} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClearAllClick} color="error">
          Clear All
        </Button>
        <Button onClick={() => handleCloseLog(setShowLog)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LogDialog;
