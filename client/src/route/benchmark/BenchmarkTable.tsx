// Benchmark results table with per-trial execution details
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  TimedTask,
  ExecutionResult,
  Trial,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  TrialCard,
  RunnerTagBadge,
  statusColorMap,
} from 'route/benchmark/BenchmarkComponents';
import {
  getRunnerTags,
  isTaskComplete,
} from 'model/backend/gitlab/measure/benchmark.utils';

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
    </Tooltip>
  );
}

function BenchmarkTableRow({
  task,
  index,
  currentTaskIndex,
  currentExecutions,
  onDownloadTask,
  primaryRunnerTag,
  secondaryRunnerTag,
}: Readonly<{
  task: TimedTask;
  index: number;
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  onDownloadTask: (task: TimedTask) => void;
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
}>) {
  return (
    <TableRow>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Typography
            variant="body2"
            color="grey.500"
            sx={{ minWidth: '20px', mt: 0.2 }}
          >
            {index + 1}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {task['Task Name']}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={{ display: 'inline' }}
            >
              {task.Description}
              {(() => {
                const { primaryTag, secondaryTag } = getRunnerTags(
                  task,
                  primaryRunnerTag,
                  secondaryRunnerTag,
                );
                return (
                  <>
                    {primaryTag && (
                      <RunnerTagBadge
                        runnerTag={primaryTag}
                        variant="primary"
                      />
                    )}
                    {secondaryTag && (
                      <RunnerTagBadge
                        runnerTag={secondaryTag}
                        variant="secondary"
                      />
                    )}
                  </>
                );
              })()}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell align="center" sx={{ color: statusColorMap[task.Status] }}>
        {task.Status === 'NOT_STARTED' ? '—' : task.Status}
      </TableCell>
      <TableCell align="center">
        {task['Average Time (s)'] === undefined ? (
          <Typography variant="body1" color="text.disabled">
            —
          </Typography>
        ) : (
          `${task['Average Time (s)'].toFixed(1)}s`
        )}
      </TableCell>
      <TableCell align="center">
        {task.Status === 'NOT_STARTED' || task.Status === 'PENDING' ? (
          <Typography variant="body1" color="text.disabled">
            —
          </Typography>
        ) : (
          (() => {
            const isActiveTask =
              index === currentTaskIndex &&
              task.Trials.length < (task.ExpectedTrials ?? Infinity);
            const latestTrial: Trial | undefined = isActiveTask
              ? {
                  'Time Start': undefined,
                  'Time End': undefined,
                  Execution: currentExecutions,
                  Status: 'RUNNING',
                  Error: undefined,
                }
              : task.Trials[task.Trials.length - 1];

            return latestTrial ? (
              <TrialCard
                trial={latestTrial}
                trialIndex={
                  isActiveTask ? task.Trials.length : task.Trials.length - 1
                }
                executions={task.Executions?.()}
              />
            ) : null;
          })()
        )}
      </TableCell>
      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
        <TaskControls task={task} onDownloadTask={onDownloadTask} />
      </TableCell>
    </TableRow>
  );
}

export default function BenchmarkTable({
  results,
  currentTaskIndex,
  currentExecutions,
  onDownloadTask,
  primaryRunnerTag,
  secondaryRunnerTag,
}: Readonly<{
  results: TimedTask[];
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  onDownloadTask: (task: TimedTask) => void;
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
}>) {
  return (
    <TableContainer
      component={Paper}
      sx={{ maxHeight: '50vh', overflow: 'auto' }}
    >
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '37%', fontWeight: 'bold' }}>
              Task
            </TableCell>
            <TableCell align="center" sx={{ width: '10%', fontWeight: 'bold' }}>
              Status
            </TableCell>
            <TableCell align="center" sx={{ width: '15%', fontWeight: 'bold' }}>
              Average Duration
            </TableCell>
            <TableCell align="center" sx={{ width: '26%', fontWeight: 'bold' }}>
              Trials
            </TableCell>
            <TableCell align="center" sx={{ width: '12%', fontWeight: 'bold' }}>
              Data
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((task, index) => (
            <BenchmarkTableRow
              key={task['Task Name']}
              task={task}
              index={index}
              currentTaskIndex={currentTaskIndex}
              currentExecutions={currentExecutions}
              onDownloadTask={onDownloadTask}
              primaryRunnerTag={primaryRunnerTag}
              secondaryRunnerTag={secondaryRunnerTag}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
