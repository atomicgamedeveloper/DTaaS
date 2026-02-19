import Layout from 'page/Layout';
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
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { showSnackbar } from 'store/snackbar.slice';
import {
  TimedTask,
  ExecutionResult,
  BenchmarkSetters,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  startMeasurement,
  continueMeasurement,
  restartMeasurement,
  stopAllPipelines,
  handleBeforeUnload,
  downloadTaskResultJson,
  tasks,
} from 'model/backend/gitlab/measure/benchmark.runner';
import { getBenchmarkStatus } from 'model/backend/gitlab/measure/benchmark.utils';
import {
  benchmarkState,
  DEFAULT_CONFIG,
} from 'model/backend/gitlab/measure/benchmark.execution';
import measurementDBService from 'database/measurementHistoryDB';
import {
  PaginatedTrialCard,
  TaskControls,
  BenchmarkPageHeader,
  BenchmarkControls,
  CompletionSummary,
  RunnerTagBadge,
  getRunnerTags,
} from 'route/benchmark/BenchmarkComponents';
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
  contentBox,
  contentPaper,
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
          <Typography
            variant="body2"
            color="grey.500"
            sx={taskIndexStyle}
          >
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
          <PaginatedTrialCard
            trials={task.Trials}
            currentTrial={
              index === currentTaskIndex &&
              task.Trials.length < (task.ExpectedTrials ?? Infinity)
                ? {
                    'Time Start': undefined,
                    'Time End': undefined,
                    Execution: currentExecutions,
                    Status: 'RUNNING',
                    Error: undefined,
                  }
                : undefined
            }
            executions={task.Executions?.()}
          />
        )}
      </TableCell>
      <TableCell align="center" sx={verticalMiddle}>
        <TaskControls task={task} onDownloadTask={onDownloadTask} />
      </TableCell>
    </TableRow>
  );
}

function BenchmarkTable({
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
      sx={tableContainer}
    >
      <Table size="small" sx={tableLayout}>
        <TableHead>
          <TableRow>
            <TableCell sx={taskNameColumn}>
              Task
            </TableCell>
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

function BenchmarkContent({
  results,
  currentTaskIndex,
  currentExecutions,
  isRunning,
  hasStopped,
  iterations,
  onStart,
  onContinue,
  onRestart,
  onStop,
  onPurge,
  onDownloadTask,
  primaryRunnerTag,
  secondaryRunnerTag,
}: Readonly<{
  results: TimedTask[];
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  isRunning: boolean;
  hasStopped: boolean;
  iterations: number;
  onStart: () => void;
  onContinue: () => void;
  onRestart: () => void;
  onStop: () => void;
  onPurge: () => void;
  onDownloadTask: (task: TimedTask) => void;
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
}>) {
  const { hasStarted, completedTasks, completedTrials, totalTasks } =
    getBenchmarkStatus(results);

  return (
    <Layout sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={contentBox}>
        <BenchmarkPageHeader />
        <Paper sx={contentPaper}>
          <BenchmarkControls
            isRunning={isRunning}
            hasStarted={hasStarted}
            hasStopped={hasStopped}
            iterations={iterations}
            completedTasks={completedTasks}
            completedTrials={completedTrials}
            totalTasks={totalTasks}
            onStart={onStart}
            onContinue={onContinue}
            onRestart={onRestart}
            onStop={onStop}
            onPurge={onPurge}
          />
          <BenchmarkTable
            results={results}
            currentTaskIndex={currentTaskIndex}
            currentExecutions={currentExecutions}
            onDownloadTask={onDownloadTask}
            primaryRunnerTag={primaryRunnerTag}
            secondaryRunnerTag={secondaryRunnerTag}
          />
          <CompletionSummary
            results={results}
            isRunning={isRunning}
            hasStarted={hasStarted}
          />
        </Paper>
      </Box>
    </Layout>
  );
}

function isTaskComplete(task: TimedTask): boolean {
  return task.Status === 'SUCCESS' || task.Status === 'FAILURE';
}

function areAllBenchmarksComplete(taskResults: TimedTask[]): boolean {
  if (taskResults.length === 0) return false;
  const hasNoStopped = !taskResults.some((task) => task.Status === 'STOPPED');
  const allTasksComplete = taskResults.every(isTaskComplete);
  return hasNoStopped && allTasksComplete;
}

function Benchmark() {
  const dispatch = useDispatch();
  const { trials: iterations, secondaryRunnerTag: alternateRunnerTag } =
    useSelector((state: RootState) => state.benchmark);
  const primaryRunnerTag = useSelector(
    (state: RootState) => state.settings.RUNNER_TAG,
  );
  const [results, setResults] = useState<TimedTask[]>(() => [...tasks]);
  const [currentExecutions, setCurrentExecutions] = useState<ExecutionResult[]>(
    [],
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);
  const hasShownCompletionSnackbar = useRef(false);
  const originalPrimaryRunnerTag = useRef(primaryRunnerTag);

  const setters: BenchmarkSetters = {
    setIsRunning,
    setCurrentExecutions,
    setCurrentTaskIndex,
    setResults,
  };

  const hasStopped = results.some((task) => task.Status === 'STOPPED');

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }
    const statusMap: Record<string, string> = {
      pending: 'starting',
      created: 'starting',
      preparing: 'preparing',
      running: 'running',
      success: 'successful',
      failed: 'failed',
      canceled: 'cancelled',
      skipped: 'skipped',
    };
    const interval = setInterval(() => {
      if (currentTaskIndex === null) return;
      const task = tasks[currentTaskIndex];
      const executions = task?.Executions?.() ?? [];

      if (executions.length > 0) {
        const merged: ExecutionResult[] = executions.map((expected, i) => {
          const completed = benchmarkState.executionResults.find(
            (r) => r.executionIndex === i,
          );
          if (completed) return completed;

          const active = benchmarkState.activePipelines.find(
            (p) => p.executionIndex === i,
          );
          if (active) {
            const phaseName = active.phase === 'parent' ? 'Parent' : 'Child';
            const statusText = statusMap[active.status] ?? active.status;
            return {
              dtName: active.dtName,
              pipelineId: active.pipelineId,
              status: `${phaseName} pipeline ${statusText}`,
              config: active.config,
              executionIndex: i,
            };
          }

          return {
            dtName: expected.dtName,
            pipelineId: null,
            status: '—',
            config: { ...DEFAULT_CONFIG, ...expected.config },
            executionIndex: i,
          };
        });
        setCurrentExecutions(merged);
      } else {
        const completedIds = new Set(
          benchmarkState.executionResults.map((r) => r.pipelineId),
        );
        const running: ExecutionResult[] = benchmarkState.activePipelines
          .filter((p) => !completedIds.has(p.pipelineId))
          .map((execution) => {
            const phaseName = execution.phase === 'parent' ? 'Parent' : 'Child';
            const statusText = statusMap[execution.status] ?? execution.status;
            return {
              dtName: execution.dtName,
              pipelineId: execution.pipelineId,
              status: `${phaseName} pipeline ${statusText}`,
              config: execution.config,
            };
          });
        setCurrentExecutions([...benchmarkState.executionResults, ...running]);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, currentTaskIndex]);

  useEffect(() => {
    const onBeforeUnload = () => handleBeforeUnload(isRunningRef);

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  });

  useEffect(() => {
    if (
      areAllBenchmarksComplete(results) &&
      !hasShownCompletionSnackbar.current
    ) {
      hasShownCompletionSnackbar.current = true;
      dispatch(
        showSnackbar({
          message: 'All benchmarks completed',
          severity: 'success',
        }),
      );
    }
  }, [results, dispatch]);

  const handleStart = () => {
    originalPrimaryRunnerTag.current = primaryRunnerTag;
    dispatch(showSnackbar({ message: 'Benchmark started', severity: 'info' }));
    return startMeasurement(setters, isRunningRef);
  };

  const handleContinue = () => {
    originalPrimaryRunnerTag.current = primaryRunnerTag;
    dispatch(showSnackbar({ message: 'Benchmark resumed', severity: 'info' }));
    return continueMeasurement(setters, isRunningRef, results);
  };

  const handleRestart = () => {
    originalPrimaryRunnerTag.current = primaryRunnerTag;
    hasShownCompletionSnackbar.current = false;
    dispatch(
      showSnackbar({ message: 'Benchmark restarted', severity: 'info' }),
    );
    return restartMeasurement(setters, isRunningRef);
  };

  const handleStop = () => {
    dispatch(
      showSnackbar({ message: 'Stopping benchmark...', severity: 'warning' }),
    );
    return stopAllPipelines(setters);
  };

  const handlePurge = async () => {
    await measurementDBService.purge();
    setResults([...tasks]);
    hasShownCompletionSnackbar.current = false;
    dispatch(
      showSnackbar({ message: 'Benchmark data purged', severity: 'success' }),
    );
  };

  return (
    <BenchmarkContent
      results={results}
      currentTaskIndex={currentTaskIndex}
      currentExecutions={currentExecutions}
      isRunning={isRunning}
      hasStopped={hasStopped}
      iterations={iterations}
      onStart={handleStart}
      onContinue={handleContinue}
      onRestart={handleRestart}
      onStop={handleStop}
      onPurge={handlePurge}
      onDownloadTask={downloadTaskResultJson}
      primaryRunnerTag={isRunning ? originalPrimaryRunnerTag.current : primaryRunnerTag}
      secondaryRunnerTag={alternateRunnerTag}
    />
  );
}

export default Benchmark;
