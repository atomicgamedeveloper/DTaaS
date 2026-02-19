import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Link,
} from '@mui/material';
import {
  TimedTask,
  Trial,
  BenchmarkPageHeaderProps,
  CompletionSummaryProps,
  ExecutionCardProps,
  TrialCardProps,
  Execution,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  secondsDifference,
  getTotalTime,
  downloadResultsJson,
} from 'model/backend/gitlab/measure/benchmark.runner';
import { DEFAULT_CONFIG } from 'model/backend/gitlab/measure/benchmark.execution';
import {
  statusColorMap,
  getExecutionStatusColor,
  runnerTagColors,
  runnerTagBadge,
  executionCard,
  bold,
  trialCard,
  trialHeaderRow,
  trialHeaderLeft,
  paginationNav,
  paginationButton,
  errorBox,
  downloadLink,
  pageHeaderBox,
  pageHeaderRow,
  controlsBar,
  controlsButtonGroup,
  trialsProgress,
  completionSummary,
  clickableLink,
} from 'route/benchmark/benchmark.styles';

export { statusColorMap, getExecutionStatusColor } from 'route/benchmark/benchmark.styles';

export function RunnerTagBadge({
  runnerTag,
  variant,
}: Readonly<{
  runnerTag: string;
  variant: 'primary' | 'secondary';
}>) {
  const color = runnerTagColors[variant];
  const tooltipText =
    variant === 'primary' ? 'Primary runner tag' : 'Secondary runner tag';

  return (
    <Tooltip title={tooltipText} arrow>
      <Box
        component="span"
        sx={runnerTagBadge(color)}
      >
        {runnerTag}
      </Box>
    </Tooltip>
  );
}

export function getRunnerTags(
  task: TimedTask,
  primaryRunnerTag: string,
  secondaryRunnerTag: string,
): {
  primaryTag: string | null;
  secondaryTag: string | null;
} {
  const executions = task.Executions?.() ?? [];

  if (executions.length === 0) {
    return { primaryTag: primaryRunnerTag, secondaryTag: null };
  }

  const runnerTags = executions
    .map((exec) => exec.config['Runner tag'])
    .filter((tag): tag is string => tag !== undefined);

  if (runnerTags.length === 0) {
    return { primaryTag: primaryRunnerTag, secondaryTag: null };
  }

  const uniqueTags = new Set(runnerTags);
  const usesMultipleRunners = uniqueTags.size > 1;

  return {
    primaryTag: primaryRunnerTag,
    secondaryTag: usesMultipleRunners ? secondaryRunnerTag : null,
  };
}

export function ExecutionCard({ execution }: Readonly<ExecutionCardProps>) {
  const statusColor = getExecutionStatusColor(execution.status);

  return (
    <Box sx={executionCard}>
      <Typography variant="body2" sx={bold}>
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

export function TrialCard({
  trial,
  trialIndex,
  executions,
}: Readonly<TrialCardProps & { executions?: Execution[] }>) {
  return (
    <Box sx={trialCard}>
      <Box sx={trialHeaderRow}>
        <Box sx={trialHeaderLeft}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={bold}
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
      {trial.Execution.length > 0
        ? trial.Execution.map((execution) => (
          <ExecutionCard
            key={`execution-${execution.dtName}-${execution.pipelineId ?? execution.executionIndex ?? 'pending'}`}
            execution={execution}
          />
        ))
        : (executions ?? []).map((exp, i) => (
          <ExecutionCard
            key={`expected-${exp.dtName}-${i}`}
            execution={{
              dtName: exp.dtName,
              pipelineId: null,
              status: '—',
              config: { ...DEFAULT_CONFIG, ...exp.config },
              executionIndex: i,
            }}
          />
        ))}
      {trial.Error && !trial.Error.message.includes('stopped by user') && (
        <Box sx={errorBox}>
          <Typography variant="caption" color="error.dark">
            <Typography
              component="span"
              variant="caption"
              sx={bold}
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

export function PaginatedTrialCard({
  trials,
  currentTrial,
  executions,
}: Readonly<{
  trials: Trial[];
  currentTrial?: Trial;
  executions?: Execution[];
}>) {
  const allTrials = currentTrial ? [...trials, currentTrial] : trials;
  const [viewIndex, setViewIndex] = useState(allTrials.length - 1);
  const isFollowing = useRef(true);
  const prevLength = useRef(allTrials.length);

  useEffect(() => {
    if (allTrials.length !== prevLength.current) {
      prevLength.current = allTrials.length;
      if (isFollowing.current) {
        setViewIndex(allTrials.length - 1);
      }
    }
  }, [allTrials.length]);

  useEffect(() => {
    if (allTrials.length === 0) return;
    const clamped = Math.min(viewIndex, allTrials.length - 1);
    if (clamped !== viewIndex) {
      setViewIndex(clamped);
    }
  }, [allTrials.length, viewIndex]);

  if (allTrials.length === 0) {
    return null;
  }

  const safeIndex = Math.max(0, Math.min(viewIndex, allTrials.length - 1));
  const trial = allTrials[safeIndex];
  const canGoBack = safeIndex > 0;
  const canGoForward = safeIndex < allTrials.length - 1;

  const handleBack = () => {
    setViewIndex((i) => i - 1);
    isFollowing.current = false;
  };

  const handleForward = () => {
    const nextIndex = safeIndex + 1;
    setViewIndex(nextIndex);
    if (nextIndex === allTrials.length - 1) {
      isFollowing.current = true;
    }
  };

  return (
    <Box sx={trialCard}>
      <Box sx={trialHeaderRow}>
        <Box sx={paginationNav}>
          <IconButton
            size="small"
            disabled={!canGoBack}
            onClick={handleBack}
            sx={paginationButton}
            aria-label="Previous trial"
          >
            ◀
          </IconButton>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ...bold, mx: 0.5 } as const}
          >
            Trial {safeIndex + 1}
          </Typography>
          <IconButton
            size="small"
            disabled={!canGoForward}
            onClick={handleForward}
            sx={paginationButton}
            aria-label="Next trial"
          >
            ▶
          </IconButton>
          {trial.Status === 'STOPPED' && (
            <Typography
              variant="caption"
              sx={{ color: statusColorMap.STOPPED, ml: 0.5 }}
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
      {trial.Execution.length > 0
        ? trial.Execution.map((execution) => (
          <ExecutionCard
            key={`execution-${execution.dtName}-${execution.pipelineId ?? execution.executionIndex ?? 'pending'}`}
            execution={execution}
          />
        ))
        : (executions ?? []).map((exp, i) => (
          <ExecutionCard
            key={`expected-${exp.dtName}-${i}`}
            execution={{
              dtName: exp.dtName,
              pipelineId: null,
              status: '—',
              config: { ...DEFAULT_CONFIG, ...exp.config },
              executionIndex: i,
            }}
          />
        ))}
      {trial.Error && !trial.Error.message.includes('stopped by user') && (
        <Box sx={errorBox}>
          <Typography variant="caption" color="error.dark">
            <Typography
              component="span"
              variant="caption"
              sx={bold}
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
}: Readonly<{
  task: TimedTask;
  onDownloadTask: (task: TimedTask) => void;
}>) {
  const completedTrials = task.Trials.filter(
    (trial) => trial.Status === 'SUCCESS' || trial.Status === 'FAILURE',
  );
  const canDownload = completedTrials.length > 0;

  if (!canDownload) {
    return (
      <Typography variant="body1" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Tooltip title="Download task results as JSON" arrow>
      <Typography
        variant="caption"
        sx={downloadLink}
        onClick={() => onDownloadTask(task)}
      >
        Download Task Results
      </Typography>
    </Tooltip>
  );
}

export function BenchmarkPageHeader() {
  return (
    <Box sx={pageHeaderBox}>
      <Box sx={pageHeaderRow}>
        <Typography variant="h5">Digital Twin Benchmark</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        Run performance benchmarks for Digital Twin executions. Each task runs a
        number of trials to calculate average time per task. Click{' '}
        <strong>Start</strong> to begin the benchmark suite,{' '}
        <strong>Stop</strong> to cancel running executions, or{' '}
        <strong>Purge</strong> to permanently delete all benchmark data from
        storage. After all tasks are through as well as after each trial completes,
        you will be able to download a summary.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        You can change the number of trials and secondary benchmark runner tag
        in the{' '}
        <Link href="/account" underline="hover" color="primary">
          settings
        </Link>
        .
      </Typography>
    </Box>
  );
}

export function BenchmarkControls({
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
          Trials Completed: {completedTrials}/
          {totalTasks * iterations}
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

export function CompletionSummary({
  results,
  isRunning,
  hasStarted,
}: Readonly<CompletionSummaryProps>) {
  const totalTime = getTotalTime(results);
  const allComplete = results.every(
    (task) => task.Status === 'SUCCESS' || task.Status === 'FAILURE',
  );

  if (allComplete && totalTime !== null) {
    return (
      <Box sx={completionSummary}>
        <Typography variant="body2">
          Completed in {totalTime.toFixed(1)}s |{' '}
          <Typography
            component="span"
            variant="body2"
            sx={clickableLink}
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
      <Box sx={completionSummary}>
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
