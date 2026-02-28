import { Box, Typography, Tooltip } from '@mui/material';
import { Link } from 'react-router-dom';
import {
  TimedTask,
  CompletionSummaryProps,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  getTotalTime,
  downloadResultsJson,
} from 'model/backend/gitlab/measure/benchmark.utils';
import {
  runnerTagColors,
  runnerTagBadge,
  downloadLink,
  pageHeaderBox,
  pageHeaderRow,
  completionSummary,
  clickableLink,
} from 'route/benchmark/benchmark.styles';

export {
  statusColorMap,
  getExecutionStatusColor,
} from 'route/benchmark/benchmark.styles';
export {
  ExecutionCard,
  TrialCard,
  PaginatedTrialCard,
} from 'route/benchmark/BenchmarkTrialCards';
export { default as BenchmarkControls } from 'route/benchmark/BenchmarkControls';

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
      <Box component="span" sx={runnerTagBadge(color)}>
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
  const usesMultipleRunners = executions.some((e) => 'Runner tag' in e.config);

  return {
    primaryTag: primaryRunnerTag,
    secondaryTag: usesMultipleRunners ? secondaryRunnerTag || null : null,
  };
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
        storage. After all tasks are through as well as after each trial
        completes, you will be able to download a summary.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        You can change the number of trials and secondary benchmark runner tag
        in the{' '}
        <Link to="/account" style={{ color: 'inherit' }}>
          settings
        </Link>
        .
      </Typography>
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
