import * as React from 'react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Paper,
  Box,
  Tooltip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { ExecutionStatus } from 'preview/model/executionHistory';
import {
  fetchExecutionHistory,
  removeExecution,
  selectExecutionHistoryByDTName,
  selectExecutionHistoryLoading,
  setSelectedExecutionId,
} from 'preview/store/executionHistory.slice';
import { selectDigitalTwinByName } from 'preview/store/digitalTwin.slice';
import { handleStop } from 'preview/route/digitaltwins/execute/pipelineHandler';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

interface ExecutionHistoryListProps {
  dtName: string;
  onViewLogs: (executionId: string) => void;
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const getStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return <CheckCircleIcon color="success" />;
    case ExecutionStatus.FAILED:
      return <ErrorIcon color="error" />;
    case ExecutionStatus.CANCELED:
      return <CancelIcon color="warning" />;
    case ExecutionStatus.TIMEOUT:
      return <HourglassEmptyIcon color="warning" />;
    case ExecutionStatus.RUNNING:
      return <CircularProgress size={20} />;
    default:
      return <AccessTimeIcon />;
  }
};

const getStatusText = (status: ExecutionStatus): string => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return 'Completed';
    case ExecutionStatus.FAILED:
      return 'Failed';
    case ExecutionStatus.CANCELED:
      return 'Canceled';
    case ExecutionStatus.TIMEOUT:
      return 'Timed out';
    case ExecutionStatus.RUNNING:
      return 'Running';
    default:
      return 'Unknown';
  }
};

const ExecutionHistoryList: React.FC<ExecutionHistoryListProps> = ({
  dtName,
  onViewLogs,
}) => {
  // Use typed dispatch for thunk actions
  const dispatch =
    useDispatch<ThunkDispatch<RootState, unknown, Action<string>>>();
  const executions = useSelector(selectExecutionHistoryByDTName(dtName));
  const loading = useSelector(selectExecutionHistoryLoading);
  const digitalTwin = useSelector(selectDigitalTwinByName(dtName));

  useEffect(() => {
    // Use the thunk action creator directly
    dispatch(fetchExecutionHistory(dtName));
  }, [dispatch, dtName]);

  const handleDelete = (executionId: string) => {
    // Use the thunk action creator directly
    dispatch(removeExecution(executionId));
  };

  const handleViewLogs = (executionId: string) => {
    dispatch(setSelectedExecutionId(executionId));
    onViewLogs(executionId);
  };

  const handleStopExecution = (executionId: string) => {
    if (digitalTwin) {
      // Dummy function since we don't need to change button text
      const setButtonText = () => {};
      handleStop(digitalTwin, setButtonText, dispatch, executionId);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <div data-testid="circular-progress">
          <CircularProgress data-testid="progress-indicator" />
        </div>
      </Box>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="body1" align="center">
          No execution history found. Start an execution to see it here.
        </Typography>
      </Paper>
    );
  }

  const sortedExecutions = [...executions].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  return (
    <Paper elevation={2} sx={{ mt: 2 }}>
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Execution History
        </Typography>
        <List>
          {sortedExecutions.map((execution) => (
            <React.Fragment key={execution.id}>
              <ListItem
                secondaryAction={
                  <Box display="flex">
                    <Tooltip title="View Logs">
                      <IconButton
                        edge="end"
                        aria-label="view"
                        onClick={() => handleViewLogs(execution.id)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    {execution.status === ExecutionStatus.RUNNING && (
                      <Tooltip title="Stop Execution">
                        <IconButton
                          edge="end"
                          aria-label="stop"
                          onClick={() => handleStopExecution(execution.id)}
                        >
                          <StopIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDelete(execution.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <Box display="flex" alignItems="center" mr={2}>
                  {getStatusIcon(execution.status)}
                </Box>
                <ListItemText
                  primary={formatTimestamp(execution.timestamp)}
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Status: {getStatusText(execution.status)}
                    </Typography>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default ExecutionHistoryList;
