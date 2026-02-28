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
import { BenchmarkPageHeaderProps } from 'model/backend/gitlab/measure/benchmark.types';
import {
  controlsBar,
  controlsButtonGroup,
  trialsProgress,
} from 'route/benchmark/benchmark.styles';

export default function BenchmarkControls({
  isRunning,
  hasStarted,
  hasStopped,
  iterations,
  completedTasks,
  completedTrials,
  totalTasks,
  onStart,
  onContinue,
  onRestart,
  onStop,
  onPurge,
}: BenchmarkPageHeaderProps & {
  onPurge: () => void;
}) {
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);

  const handleStopClick = () => {
    setStopDialogOpen(true);
  };

  const handleStopConfirm = () => {
    setStopDialogOpen(false);
    onStop();
  };

  const handleRestartClick = () => {
    setRestartDialogOpen(true);
  };

  const handleRestartConfirm = () => {
    setRestartDialogOpen(false);
    onRestart();
  };

  const handlePurgeClick = () => {
    setPurgeDialogOpen(true);
  };

  const handlePurgeConfirm = () => {
    setPurgeDialogOpen(false);
    onPurge();
  };

  const getPrimaryButton = () => {
    if (isRunning) {
      return (
        <Button
          variant="contained"
          color="primary"
          onClick={handleStopClick}
          size="small"
        >
          Stop
        </Button>
      );
    }
    if (hasStopped) {
      return (
        <Button
          variant="contained"
          color="primary"
          onClick={onContinue}
          size="small"
        >
          Continue
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
        disabled={isComplete}
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
        sx={controlsBar}
      >
        <Typography variant="body1" sx={trialsProgress}>
          Trials Completed: {completedTrials}/{totalTasks * iterations}
        </Typography>

        <Box sx={controlsButtonGroup}>
          {getPrimaryButton()}

          <Button
            variant="outlined"
            color="primary"
            onClick={handleRestartClick}
            disabled={!hasStarted || isRunning}
            size="small"
          >
            Restart
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={handlePurgeClick}
            disabled={isRunning}
            size="small"
          >
            Purge
          </Button>
        </Box>
      </Box>
      <Dialog open={stopDialogOpen} onClose={() => setStopDialogOpen(false)}>
        <DialogTitle>Stop Benchmark?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to stop the benchmark? This will cancel all
            running executions and mark the current task as stopped.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStopDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStopConfirm}
            color="primary"
            variant="contained"
          >
            Stop
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
      >
        <DialogTitle>Restart Benchmark?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to restart the benchmark? This will discard
            all current results and start from the beginning.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestartDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRestartConfirm}
            color="primary"
            variant="contained"
          >
            Restart
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={purgeDialogOpen} onClose={() => setPurgeDialogOpen(false)}>
        <DialogTitle>Purge Benchmark Data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to purge all benchmark data? This will
            permanently delete all results and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurgeDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handlePurgeConfirm}
            color="primary"
            variant="contained"
          >
            Purge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
