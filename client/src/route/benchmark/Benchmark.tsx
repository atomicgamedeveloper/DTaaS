import Layout from 'page/Layout';
import { Box, Paper } from '@mui/material';
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
  stopAllPipelines,
  downloadTaskResultJson,
  tasks,
} from 'model/backend/gitlab/measure/benchmark.runner';
import {
  continueMeasurement,
  restartMeasurement,
  handleBeforeUnload,
} from 'model/backend/gitlab/measure/benchmark.lifecycle';
import {
  getBenchmarkStatus,
  mergeExecutionStatus,
} from 'model/backend/gitlab/measure/benchmark.utils';
import {
  benchmarkState,
  DEFAULT_CONFIG,
  attachSetters,
  detachSetters,
} from 'model/backend/gitlab/measure/benchmark.execution';
import measurementDBService from 'database/measurementHistoryDB';
import {
  BenchmarkPageHeader,
  BenchmarkControls,
  CompletionSummary,
} from 'route/benchmark/BenchmarkComponents';
import BenchmarkTable from 'route/benchmark/BenchmarkTable';
import { contentBox, contentPaper } from 'route/benchmark/benchmark.styles';

interface BenchmarkContentProps {
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
}: Readonly<BenchmarkContentProps>) {
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
  const [results, setResults] = useState<TimedTask[]>(
    () => benchmarkState.results ?? [...tasks],
  );
  const [currentExecutions, setCurrentExecutions] = useState<ExecutionResult[]>(
    [],
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(
    benchmarkState.isRunning ? benchmarkState.currentTaskIndexUI : null,
  );
  const [isRunning, setIsRunning] = useState(benchmarkState.isRunning);
  const hasShownCompletionSnackbar = useRef(false);
  const originalPrimaryRunnerTag = useRef(primaryRunnerTag);

  const setters: BenchmarkSetters = {
    setIsRunning,
    setCurrentExecutions,
    setCurrentTaskIndex,
    setResults,
  };

  useEffect(() => {
    if (!benchmarkState.results) {
      benchmarkState.results = [...tasks];
    }
    attachSetters(setters);
    return () => detachSetters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasStopped = results.some((task) => task.Status === 'STOPPED');

  useEffect(() => {
    if (!isRunning) return undefined;
    const interval = setInterval(() => {
      if (currentTaskIndex === null) return;
      const task = tasks[currentTaskIndex];
      const executions = task?.Executions?.() ?? [];
      const merged = mergeExecutionStatus(
        executions,
        benchmarkState.activePipelines,
        benchmarkState.executionResults,
        DEFAULT_CONFIG,
      );
      setCurrentExecutions(merged);
    }, 500);
    return () => clearInterval(interval);
  }, [isRunning, currentTaskIndex]);

  useEffect(() => {
    const onBeforeUnload = () =>
      handleBeforeUnload(benchmarkState.isRunningRef);

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
    return startMeasurement(setters, benchmarkState.isRunningRef);
  };

  const handleContinue = () => {
    originalPrimaryRunnerTag.current = primaryRunnerTag;
    dispatch(showSnackbar({ message: 'Benchmark resumed', severity: 'info' }));
    return continueMeasurement(setters, benchmarkState.isRunningRef, results);
  };

  const handleRestart = () => {
    originalPrimaryRunnerTag.current = primaryRunnerTag;
    hasShownCompletionSnackbar.current = false;
    dispatch(
      showSnackbar({ message: 'Benchmark restarted', severity: 'info' }),
    );
    return restartMeasurement(setters, benchmarkState.isRunningRef);
  };

  const handleStop = () => {
    dispatch(
      showSnackbar({ message: 'Stopping benchmark...', severity: 'warning' }),
    );
    return stopAllPipelines();
  };

  const handlePurge = async () => {
    await measurementDBService.purge();
    benchmarkState.results = [...tasks];
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
      primaryRunnerTag={
        isRunning ? originalPrimaryRunnerTag.current : primaryRunnerTag
      }
      secondaryRunnerTag={alternateRunnerTag}
    />
  );
}

export default Benchmark;
