import { Box, Typography } from '@mui/material';
import {
  ExecutionCardProps,
  TrialCardProps,
  Execution,
  DEFAULT_CONFIG,
} from 'model/backend/gitlab/measure/benchmark.execution';
import { secondsDifference } from 'model/backend/gitlab/measure/benchmark.utils';
import {
  statusColorMap,
  getExecutionStatusColor,
  executionCard,
  bold,
  trialCard,
  trialHeaderRow,
  trialHeaderLeft,
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

