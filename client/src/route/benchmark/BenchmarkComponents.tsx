import { Box, Typography, Tooltip } from '@mui/material';
import { Link } from 'react-router-dom';
import {
  TimedTask,
  CompletionSummaryProps,
  ExecutionCardProps,
  TrialCardProps,
  Execution,
  DEFAULT_CONFIG,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  secondsDifference,
  getTotalTime,
  downloadResultsJson,
  isTaskComplete,
} from 'model/backend/gitlab/measure/benchmark.utils';
import {
  statusColorMap,
  getExecutionStatusColor,
  executionCard,
  bold,
  trialCard,
  trialHeaderRow,
  trialHeaderLeft,
  errorBox,
  runnerTagColors,
  runnerTagBadge,
  downloadLink,
  pageHeaderBox,
  pageHeaderRow,
  completionSummary,
  clickableLink,
} from 'route/benchmark/benchmark.styles';

export { statusColorMap, getExecutionStatusColor };
export { default as BenchmarkControls } from 'route/benchmark/BenchmarkControls';

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
          <Typography variant="caption" color="text.secondary" sx={bold}>
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
            <Typography component="span" variant="caption" sx={bold}>
              Error:
            </Typography>{' '}
            {trial.Error.message}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

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

export function TaskControls({
  task,
  onDownloadTask,
}: Readonly<{
  task: TimedTask;
  onDownloadTask: (task: TimedTask) => void;
}>) {
  const canDownload = task.Trials.some(isTaskComplete);

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
  const allComplete = results.every(isTaskComplete);

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
