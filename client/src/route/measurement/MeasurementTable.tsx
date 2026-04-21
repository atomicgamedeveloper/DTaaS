// Measurement results table with per-trial execution details
import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Collapse,
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
} from 'model/backend/gitlab/measure/measurement.execution';
import {
  TrialCard,
  RunnerTagBadge,
  statusColorMap,
} from 'route/measurement/MeasurementComponents';
import {
  getRunnerTags,
  isTaskComplete,
} from 'model/backend/gitlab/measure/measurement.utils';

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

function resolveDescription(
  description: string,
  primaryDTName: string,
  secondaryDTName: string,
): string {
  return description
    .replace(/\bprimary\b/gi, primaryDTName) // NOSONAR
    .replace(/\bsecondary\b/gi, secondaryDTName); // NOSONAR
}

function findLastRunningIndex(results: TimedTask[]): number {
  let last = -1;
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].Status === 'RUNNING') last = i;
  }
  return last;
}

function TrialCardCell({
  task,
  isActiveTask,
  isNotStartedOrPending,
  latestTrial,
}: Readonly<{
  task: TimedTask;
  isActiveTask: boolean;
  isNotStartedOrPending: boolean;
  latestTrial: Trial | undefined;
}>) {
  if (isNotStartedOrPending) {
    return (
      <Typography variant="body1" color="text.disabled">
        —
      </Typography>
    );
  }
  if (latestTrial) {
    return (
      <TrialCard
        trial={latestTrial}
        trialIndex={
          // NOSONAR
          isActiveTask ? task.Trials.length : task.Trials.length - 1
        }
        executions={task.Executions?.()}
        allTrials={task.Trials}
        expectedTrials={task.ExpectedTrials}
        isRunning={isActiveTask}
      />
    );
  }
  return null;
}

function TaskNameCell({
  index,
  task,
  primaryTag,
  secondaryTag,
}: Readonly<{
  index: number;
  task: TimedTask;
  primaryTag: string | null | undefined;
  secondaryTag: string | null | undefined;
}>) {
  return (
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="body2" color="grey.500" sx={{ minWidth: '20px' }}>
          {index + 1}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {task['Task Name']}
            </Typography>
            {primaryTag && (
              <RunnerTagBadge runnerTag={primaryTag} variant="primary" />
            )}
            {secondaryTag && (
              <RunnerTagBadge runnerTag={secondaryTag} variant="secondary" />
            )}
          </Box>
        </Box>
      </Box>
    </TableCell>
  );
}

function AverageTimeCell({
  averageTime,
}: Readonly<{ averageTime: number | undefined }>) {
  return (
    <TableCell align="center">
      {averageTime === undefined ? (
        <Typography variant="body1" color="text.disabled">
          —
        </Typography>
      ) : (
        `${averageTime.toFixed(1)}s`
      )}
    </TableCell>
  );
}

interface RowState {
  primaryTag: string | null | undefined;
  secondaryTag: string | null | undefined;
  isActiveTask: boolean;
  isNotStartedOrPending: boolean;
  latestTrial: Trial | undefined;
}

function deriveRowState(
  task: TimedTask,
  index: number,
  currentTaskIndex: number | null,
  currentExecutions: ExecutionResult[],
  primaryRunnerTag: string,
  secondaryRunnerTag: string,
): RowState {
  const { primaryTag, secondaryTag } = getRunnerTags(
    task,
    primaryRunnerTag,
    secondaryRunnerTag,
  );
  const isActiveTask =
    index === currentTaskIndex &&
    task.Trials.length < (task.ExpectedTrials ?? Infinity);
  const isNotStartedOrPending =
    task.Status === 'NOT_STARTED' || task.Status === 'PENDING';
  const latestTrial: Trial | undefined = isActiveTask
    ? {
        'Time Start': undefined,
        'Time End': undefined,
        Execution: currentExecutions,
        Status: 'RUNNING',
        Error: undefined,
      }
    : task.Trials[task.Trials.length - 1]; // NOSONAR
  return {
    primaryTag,
    secondaryTag,
    isActiveTask,
    isNotStartedOrPending,
    latestTrial,
  };
}

function ExpandedDescriptionRow({
  isExpanded,
  description,
  primaryDTName,
  secondaryDTName,
}: Readonly<{
  isExpanded: boolean;
  description: string;
  primaryDTName: string;
  secondaryDTName: string;
}>) {
  return (
    <TableRow>
      <TableCell
        colSpan={5}
        sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}
      >
        <Collapse in={isExpanded}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', px: 1, py: 1 }}
          >
            {resolveDescription(description, primaryDTName, secondaryDTName)}
          </Typography>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

function MeasurementTableRow({
  task,
  index,
  currentTaskIndex,
  currentExecutions,
  onDownloadTask,
  primaryRunnerTag,
  secondaryRunnerTag,
  primaryDTName,
  secondaryDTName,
  isExpanded,
  onToggle,
  rowRef,
}: Readonly<{
  task: TimedTask;
  index: number;
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  onDownloadTask: (task: TimedTask) => void;
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
  primaryDTName: string;
  secondaryDTName: string;
  isExpanded: boolean;
  onToggle: () => void;
  rowRef?: React.Ref<HTMLTableRowElement>;
}>) {
  const {
    primaryTag,
    secondaryTag,
    isActiveTask,
    isNotStartedOrPending,
    latestTrial,
  } = deriveRowState(
    task,
    index,
    currentTaskIndex,
    currentExecutions,
    primaryRunnerTag,
    secondaryRunnerTag,
  );

  return (
    <>
      <TableRow
        ref={rowRef}
        hover
        onClick={onToggle}
        sx={{ cursor: 'pointer' }}
      >
        <TaskNameCell
          index={index}
          task={task}
          primaryTag={primaryTag}
          secondaryTag={secondaryTag}
        />
        <TableCell align="center" sx={{ color: statusColorMap[task.Status] }}>
          {task.Status === 'NOT_STARTED' ? '—' : task.Status}
        </TableCell>
        <AverageTimeCell averageTime={task['Average Time (s)']} />
        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          <TrialCardCell
            task={task}
            isActiveTask={isActiveTask}
            isNotStartedOrPending={isNotStartedOrPending}
            latestTrial={latestTrial}
          />
        </TableCell>
        <TableCell
          align="center"
          sx={{ verticalAlign: 'middle' }}
          onClick={(e) => e.stopPropagation()}
        >
          <TaskControls task={task} onDownloadTask={onDownloadTask} />
        </TableCell>
      </TableRow>
      <ExpandedDescriptionRow
        isExpanded={isExpanded}
        description={task.Description ?? ''}
        primaryDTName={primaryDTName}
        secondaryDTName={secondaryDTName}
      />
    </>
  );
}

function MeasurementTableHeader() {
  return (
    <TableHead>
      <TableRow>
        <TableCell sx={{ width: '37%', fontWeight: 'bold' }}>Task</TableCell>
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
  );
}

export default function MeasurementTable({
  results,
  currentTaskIndex,
  currentExecutions,
  onDownloadTask,
  primaryRunnerTag,
  secondaryRunnerTag,
  primaryDTName,
  secondaryDTName,
}: Readonly<{
  results: TimedTask[];
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  onDownloadTask: (task: TimedTask) => void;
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
  primaryDTName: string;
  secondaryDTName: string;
}>) {
  const runningRowRef = useRef<HTMLTableRowElement | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (taskName: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(taskName)) next.delete(taskName);
      else next.add(taskName);
      return next;
    });
  };

  const lastRunningIndex = findLastRunningIndex(results);

  useEffect(() => {
    if (lastRunningIndex < 0) return;
    runningRowRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [lastRunningIndex]);

  return (
    <TableContainer
      component={Paper}
      sx={{ maxHeight: '50vh', overflow: 'auto', clipPath: 'inset(0)' }}
    >
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <MeasurementTableHeader />
        <TableBody>
          {results.map((task, index) => (
            <MeasurementTableRow
              key={task['Task Name']}
              task={task}
              index={index}
              currentTaskIndex={currentTaskIndex}
              currentExecutions={currentExecutions}
              onDownloadTask={onDownloadTask}
              primaryRunnerTag={primaryRunnerTag}
              secondaryRunnerTag={secondaryRunnerTag}
              primaryDTName={primaryDTName}
              secondaryDTName={secondaryDTName}
              isExpanded={expandedRows.has(task['Task Name'])}
              onToggle={() => toggleRow(task['Task Name'])}
              rowRef={index === lastRunningIndex ? runningRowRef : undefined}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
