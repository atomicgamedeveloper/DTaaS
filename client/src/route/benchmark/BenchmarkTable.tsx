import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  TimedTask,
  ExecutionResult,
  Trial,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  TrialCard,
  TaskControls,
  RunnerTagBadge,
} from 'route/benchmark/BenchmarkComponents';
import { getRunnerTags } from 'model/backend/gitlab/measure/benchmark.utils';
import {
  statusColorMap,
  tableContainer,
  tableLayout,
  taskNameColumn,
  statusColumn,
  avgDurationColumn,
  trialsColumn,
  dataColumn,
  taskRowNameBox,
  taskIndex as taskIndexStyle,
  bold,
  inlineDisplay,
  verticalMiddle,
} from 'route/benchmark/benchmark.styles';

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
        <Box sx={taskRowNameBox}>
          <Typography variant="body2" color="grey.500" sx={taskIndexStyle}>
            {index + 1}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={bold}>
              {task['Task Name']}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={inlineDisplay}
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
                trialIndex={isActiveTask ? task.Trials.length : task.Trials.length - 1}
                executions={task.Executions?.()}
              />
            ) : null;
          })()
        )}
      </TableCell>
      <TableCell align="center" sx={verticalMiddle}>
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
    <TableContainer component={Paper} sx={tableContainer}>
      <Table size="small" sx={tableLayout}>
        <TableHead>
          <TableRow>
            <TableCell sx={taskNameColumn}>Task</TableCell>
            <TableCell align="center" sx={statusColumn}>
              Status
            </TableCell>
            <TableCell align="center" sx={avgDurationColumn}>
              Average Duration
            </TableCell>
            <TableCell align="center" sx={trialsColumn}>
              Trials
            </TableCell>
            <TableCell align="center" sx={dataColumn}>
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
