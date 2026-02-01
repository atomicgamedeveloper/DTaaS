import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  TimedTask,
  BenchmarkPageHeaderProps,
  CompletionSummaryProps,
  ExecutionCardProps,
  TrialCardProps,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  statusColorMap,
  secondsDifference,
  getExecutionStatusColor,
  getTotalTime,
  downloadResultsJson,
} from 'model/backend/gitlab/measure/benchmark.runner';

export function ExecutionCard({ execution }: ExecutionCardProps) {
  const statusColor = getExecutionStatusColor(execution.status);

  return (
    <Box
      sx={{
        mb: 0.5,
        p: 1,
        bgcolor: 'grey.100',
        borderRadius: 1,
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
        {execution.dtName}
        {execution.pipelineId && ` (Pipeline: ${execution.pipelineId})`}
      </Typography>
      <Typography variant="caption" sx={{ color: statusColor }}>
        {execution.status}
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary">
        Runner: {execution.config['Runner tag']}
      </Typography>
    </Box>
  );
}

export function TrialCard({ trial, trialIndex }: TrialCardProps) {
  return (
    <Box
      sx={{
        mb: 1.5,
        p: 1,
        border: 1,
        borderColor: 'grey.300',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 'bold' }}
          >
            Trial {trialIndex + 1}
          </Typography>
          {trial.Status === 'STOPPED' && (
            <Typography
              variant="caption"
              sx={{ color: statusColorMap.STOPPED }}
            >
              (stopped)
            </Typography>
          )}
        </Box>
        <Typography
          variant="caption"
          color={
            trial['Time Start'] && trial['Time End']
              ? 'text.secondary'
              : 'text.disabled'
          }
        >
          {trial['Time Start'] && trial['Time End']
            ? `${secondsDifference(trial['Time Start'], trial['Time End'])?.toFixed(1)}s`
            : '—'}
        </Typography>
      </Box>
      {trial.Execution.length === 0 && trial.Status === 'RUNNING' && (
        <Typography variant="caption" color="text.secondary">
          Starting...
        </Typography>
      )}
      {trial.Execution.map((execution, executionIndex) => (
        <ExecutionCard
          key={`execution-${executionIndex}`}
          execution={execution}
        />
      ))}
      {trial.Error && !trial.Error.message.includes('stopped by user') && (
        <Box sx={{ mt: 0.5, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="caption" color="error.dark">
            <Typography
              component="span"
              variant="caption"
              sx={{ fontWeight: 'bold' }}
            >
              Error:
            </Typography>{' '}
            {trial.Error.message}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export function TaskControls({
  task,
  onDownloadTask,
}: {
  task: TimedTask;
  onDownloadTask: (task: TimedTask) => void;
}) {
  const expectedTrials = task.ExpectedTrials ?? 0;
  const completedTrials = task.Trials.filter(
    (trial) => trial.Status === 'SUCCESS' || trial.Status === 'FAILURE',
  );
  const canDownload =
    completedTrials.length >= expectedTrials && expectedTrials > 0;

  if (!canDownload) {
    return (
      <Typography variant="body1" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Typography
      variant="caption"
      sx={{
        color: 'primary.main',
        cursor: 'pointer',
        textDecoration: 'underline',
        fontSize: '0.7rem',
      }}
      onClick={() => onDownloadTask(task)}
    >
      Download Task Results
    </Typography>
  );
}

export function BenchmarkPageHeader() {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="h5">Digital Twin Benchmark</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        Run performance benchmarks for Digital Twin executions. Each task runs
        multiple a number of trials to calculate average time per task. Click
        Start to begin the benchmark suite, or Stop to cancel running
        executions. After all tasks are through, you will be able to download a
        summary.
      </Typography>
    </Box>
  );
}

export function BenchmarkControls({
  isRunning,
  hasStarted,
  hasStopped,
  iterations,
  alternateRunnerTag,
  completedTasks,
  totalTasks,
  onIterationsChange,
  onAlternateRunnerTagChange,
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

  const handleIterationsChange = (newValue: number) => {
    if (newValue >= 1) {
      onIterationsChange(newValue);
    }
  };

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
        sx={{ mb: 3 }}
      >
        <Typography variant="body1" sx={{ color: 'primary.main' }}>
          Trials Completed: {completedTasks * iterations}/
          {totalTasks * iterations}
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Number of times each task is repeated to calculate average execution time">
            <TextField
              label="Trials"
              type="number"
              size="small"
              value={iterations}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                handleIterationsChange(val);
              }}
              disabled={isRunning}
              slotProps={{
                htmlInput: { min: 1 },
                inputLabel: { shrink: true },
              }}
              sx={{ width: 80 }}
            />
          </Tooltip>

          <Tooltip title="Runner tag used for multi-runner tests. The primary runner tag is configured in Account Settings.">
            <TextField
              label="Secondary Runner Tag"
              size="small"
              value={alternateRunnerTag}
              onChange={(e) => onAlternateRunnerTagChange(e.target.value)}
              disabled={isRunning}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 170 }}
            />
          </Tooltip>

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

export function CompletionSummary({
  results,
  isRunning,
  hasStarted,
}: CompletionSummaryProps) {
  const totalTime = getTotalTime(results);
  const allComplete = results.every(
    (task) => task.Status === 'SUCCESS' || task.Status === 'FAILURE',
  );

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
