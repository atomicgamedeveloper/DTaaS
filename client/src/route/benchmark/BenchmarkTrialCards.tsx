import { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import {
  Trial,
  ExecutionCardProps,
  TrialCardProps,
  Execution,
} from 'model/backend/gitlab/measure/benchmark.types';
import { secondsDifference } from 'model/backend/gitlab/measure/benchmark.utils';
import { DEFAULT_CONFIG } from 'model/backend/gitlab/measure/benchmark.execution';
import {
  statusColorMap,
  getExecutionStatusColor,
  executionCard,
  bold,
  trialCard,
  trialHeaderRow,
  trialHeaderLeft,
  paginationNav,
  paginationButton,
  errorBox,
} from 'route/benchmark/benchmark.styles';

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
