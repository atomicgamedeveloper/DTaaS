// Benchmark action buttons (start, stop, download, clear) and confirmation dialogs
import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { TimedTask } from 'model/backend/gitlab/measure/benchmark.execution';
import {
  getTotalTime,
  downloadResultsJson,
  isTaskComplete,
} from 'model/backend/gitlab/measure/benchmark.utils';

interface BenchmarkPageHeaderProps {
  isRunning: boolean;
  hasStarted: boolean;
  iterations: number;
  completedTasks: number;
  completedTrials: number;
  totalTasks: number;
  onStart: () => void;
  onRestart: () => void;
  onStop: () => void;
}

interface CompletionSummaryProps {
  results: TimedTask[];
  isRunning: boolean;
  hasStarted: boolean;
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
}>) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="primary" variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function BenchmarkControls({
  isRunning,
  hasStarted,
  iterations,
  completedTasks,
  completedTrials,
  totalTasks,
  onStart,
  onRestart,
  onStop,
  onPurge,
}: BenchmarkPageHeaderProps & {
  onPurge: () => void;
}) {
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);

  const getPrimaryButton = () => {
    if (isRunning) {
      return (
        <Button
          variant="contained"
          color="primary"
          onClick={() => setStopDialogOpen(true)}
          size="small"
        >
          Stop
        </Button>
      );
    }
    const isComplete = completedTasks === totalTasks && totalTasks > 0;
    return (
      <Button
        variant="contained"
        color="primary"
        onClick={onStart}
        size="small"
        disabled={isComplete || hasStarted}
      >
        Start
      </Button>
    );
  };

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Typography variant="body1" sx={{ color: 'primary.main' }}>
          Trials Completed: {completedTrials}/{totalTasks * iterations}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getPrimaryButton()}

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setRestartDialogOpen(true)}
            disabled={!hasStarted || isRunning}
            size="small"
          >
            Restart
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setPurgeDialogOpen(true)}
            disabled={isRunning}
            size="small"
          >
            Purge
          </Button>
        </Box>
      </Box>
      <ConfirmDialog
        open={stopDialogOpen}
        onClose={() => setStopDialogOpen(false)}
        onConfirm={() => {
          setStopDialogOpen(false);
          onStop();
        }}
        title="Stop Benchmark?"
        description="Are you sure you want to stop the benchmark? This will cancel all running executions and mark the current task as stopped."
        confirmLabel="Stop"
      />
      <ConfirmDialog
        open={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onConfirm={() => {
          setRestartDialogOpen(false);
          onRestart();
        }}
        title="Restart Benchmark?"
        description="Are you sure you want to restart the benchmark? This will discard all current results and start from the beginning."
        confirmLabel="Restart"
      />
      <ConfirmDialog
        open={purgeDialogOpen}
        onClose={() => setPurgeDialogOpen(false)}
        onConfirm={() => {
          setPurgeDialogOpen(false);
          onPurge();
        }}
        title="Purge Benchmark Data?"
        description="Are you sure you want to purge all benchmark data? This will permanently delete all results and cannot be undone."
        confirmLabel="Purge"
      />
    </Box>
  );
}

export function CompletionSummary({
  results,
  isRunning,
  hasStarted,
}: Readonly<CompletionSummaryProps>) {
  const totalTime = getTotalTime(results);
  const allComplete = results.every(isTaskComplete);

  if (allComplete && totalTime !== null) {
    return (
      <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">
          Completed in {totalTime.toFixed(1)}s |{' '}
          <Typography
            component="span"
            variant="body2"
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => downloadResultsJson(results)}
          >
            Download JSON
          </Typography>
        </Typography>
      </Box>
    );
  }

  if (isRunning || hasStarted) {
    return (
      <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">
          Benchmark data generation in progress
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="body2">
        Click Start to generate benchmark data
      </Typography>
    </Box>
  );
}
