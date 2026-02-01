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
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'store/snackbar.slice';
import {
  TimedTask,
  ExecutionResult,
  BenchmarkSetters,
} from 'model/backend/gitlab/measure/benchmark.types';
import {
  statusColorMap,
  startMeasurement,
  continueMeasurement,
  restartMeasurement,
  stopAllPipelines,
  handleBeforeUnload,
  downloadTaskResultJson,
  tasks,
  setTrials as setBenchmarkTrials,
  setAlternateRunnerTag as setBenchmarkRunnerTag,
} from 'model/backend/gitlab/measure/benchmark.runner';
import { getBenchmarkStatus } from 'model/backend/gitlab/measure/benchmark.utils';
import { benchmarkState } from 'model/backend/gitlab/measure/benchmark.execution';
import measurementDBService from 'database/measurementHistoryDB';
import {
  TrialCard,
  TaskControls,
  BenchmarkPageHeader,
  BenchmarkControls,
  CompletionSummary,
} from 'route/benchmark/BenchmarkComponents';

function BenchmarkTableRow({
  task,
  index,
  currentTaskIndex,
  currentExecutions,
  onDownloadTask,
}: Readonly<{
  task: TimedTask;
  index: number;
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  onDownloadTask: (task: TimedTask) => void;
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
            <Typography variant="caption" color="text.secondary">
              {task.Description}
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
        {(task.Status === 'NOT_STARTED' || task.Status === 'PENDING') && (
          <Typography variant="body1" color="text.disabled">
            —
          </Typography>
        )}
        {task.Trials.map((trial, trialIndex) => (
          <TrialCard
            key={`trial-${task['Task Name']}-${trial['Time Start']?.toISOString() ?? trialIndex}`}
            trial={trial}
            trialIndex={trialIndex}
          />
        ))}
        {index === currentTaskIndex && (
          <TrialCard
            trial={{
              'Time Start': undefined,
              'Time End': undefined,
              Execution: currentExecutions,
              Status: 'RUNNING',
              Error: undefined,
            }}
            trialIndex={task.Trials.length}
          />
        )}
      </TableCell>
      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
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
}: Readonly<{
  results: TimedTask[];
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  onDownloadTask: (task: TimedTask) => void;
}>) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        maxHeight: '50vh',
        overflow: 'auto',
      }}
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
  alternateRunnerTag,
  onIterationsChange,
  onAlternateRunnerTagChange,
  onStart,
  onContinue,
  onRestart,
  onStop,
  onPurge,
  onDownloadTask,
}: Readonly<{
  results: TimedTask[];
  currentTaskIndex: number | null;
  currentExecutions: ExecutionResult[];
  isRunning: boolean;
  hasStopped: boolean;
  iterations: number;
  alternateRunnerTag: string;
  onIterationsChange: (value: number) => void;
  onAlternateRunnerTagChange: (value: string) => void;
  onStart: () => void;
  onContinue: () => void;
  onRestart: () => void;
  onStop: () => void;
  onPurge: () => void;
  onDownloadTask: (task: TimedTask) => void;
}>) {
  const { hasStarted, completedTasks, totalTasks } =
    getBenchmarkStatus(results);

  return (
    <Layout sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', p: 3, alignSelf: 'center' }}>
        <BenchmarkPageHeader />
        <Paper sx={{ p: 3 }}>
          <BenchmarkControls
            isRunning={isRunning}
            hasStarted={hasStarted}
            hasStopped={hasStopped}
            iterations={iterations}
            alternateRunnerTag={alternateRunnerTag}
            completedTasks={completedTasks}
            totalTasks={totalTasks}
            onIterationsChange={onIterationsChange}
            onAlternateRunnerTagChange={onAlternateRunnerTagChange}
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
  const [results, setResults] = useState<TimedTask[]>(() => [...tasks]);
  const [currentExecutions, setCurrentExecutions] = useState<ExecutionResult[]>(
    [],
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(3);
  const [alternateRunnerTag, setAlternateRunnerTag] = useState('windows');
  const isRunningRef = useRef(false);
  const hasShownCompletionSnackbar = useRef(false);

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
    const interval = setInterval(() => {
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
      const running: ExecutionResult[] = benchmarkState.activePipelines.map(
        (execution) => {
          const phaseName = execution.phase === 'parent' ? 'Parent' : 'Child';
          const statusText = statusMap[execution.status] ?? execution.status;
          return {
            dtName: execution.dtName,
            pipelineId: execution.pipelineId,
            status: `${phaseName} pipeline ${statusText}`,
            config: execution.config,
          };
        },
      );
      setCurrentExecutions([...benchmarkState.executionResults, ...running]);
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning]);

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
    setBenchmarkTrials(iterations);
    setBenchmarkRunnerTag(alternateRunnerTag);
    dispatch(showSnackbar({ message: 'Benchmark started', severity: 'info' }));
    return startMeasurement(setters, isRunningRef);
  };

  const handleContinue = () => {
    setBenchmarkTrials(iterations);
    setBenchmarkRunnerTag(alternateRunnerTag);
    dispatch(showSnackbar({ message: 'Benchmark resumed', severity: 'info' }));
    return continueMeasurement(setters, isRunningRef, results);
  };

  const handleRestart = () => {
    setBenchmarkTrials(iterations);
    setBenchmarkRunnerTag(alternateRunnerTag);
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
      alternateRunnerTag={alternateRunnerTag}
      onIterationsChange={setIterations}
      onAlternateRunnerTagChange={setAlternateRunnerTag}
      onStart={handleStart}
      onContinue={handleContinue}
      onRestart={handleRestart}
      onStop={handleStop}
      onPurge={handlePurge}
      onDownloadTask={downloadTaskResultJson}
    />
  );
}

export default Benchmark;
