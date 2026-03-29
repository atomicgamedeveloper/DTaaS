/**
 * Main benchmark page.
 *
 * - Controls (start, stop, download) are in ./BenchmarkControls.tsx
 * - Results table is in ./BenchmarkTable.tsx
 * - Trial cards and status indicators are in ./BenchmarkComponents.tsx
 */
import Layout from 'page/Layout';
import { Box, Paper, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { showSnackbar } from 'store/snackbar.slice';
import {
  TimedTask,
  ExecutionResult,
  BenchmarkSetters,
  benchmarkState,
  getDefaultConfig,
  attachSetters,
  detachSetters,
  getTasks,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  startMeasurement,
  stopAllPipelines,
  restartMeasurement,
  handleBeforeUnload,
  purgeBenchmarkData,
} from 'model/backend/gitlab/measure/benchmark.runner';
import {
  getBenchmarkStatus,
  mergeExecutionStatus,
  areAllBenchmarksComplete,
  downloadTaskResultJson,
} from 'model/backend/gitlab/measure/benchmark.utils';
import BenchmarkControls, {
  CompletionSummary,
} from 'route/benchmark/BenchmarkControls';
import BenchmarkTable from 'route/benchmark/BenchmarkTable';

function BenchmarkPageHeader() {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
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
        You can change the number of trials, runner tags, and Digital Twin names
        in the{' '}
        <Link to="/account" style={{ color: 'inherit' }}>
          settings
        </Link>
        .
      </Typography>
    </Box>
  );
}

function Benchmark() {
  const dispatch = useDispatch();
  const { trials: iterations, secondaryRunnerTag: alternateRunnerTag } =
    useSelector((state: RootState) => state.settings);
  const primaryRunnerTag = useSelector(
    (state: RootState) => state.settings.RUNNER_TAG,
  );
  const [results, setResults] = useState<TimedTask[]>(
    () => benchmarkState.results ?? [...getTasks()],
  );
  const [currentExecutions, setCurrentExecutions] = useState<ExecutionResult[]>(
    () => {
      if (
        !benchmarkState.isRunning ||
        benchmarkState.currentTaskIndexUI === null
      )
        return [];
      const task = getTasks()[benchmarkState.currentTaskIndexUI];
      const executions = task?.Executions?.() ?? [];
      return mergeExecutionStatus(
        executions,
        benchmarkState.activePipelines,
        benchmarkState.executionResults,
        getDefaultConfig(),
      );
    },
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(
    benchmarkState.isRunning ? benchmarkState.currentTaskIndexUI : null,
  );
  const [isRunning, setIsRunning] = useState(benchmarkState.isRunning);
  const hasShownCompletionSnackbar = useRef(false);
  const originalPrimaryRunnerTag = useRef(
    benchmarkState.originalPrimaryRunnerTag ?? primaryRunnerTag,
  );
  const originalSecondaryRunnerTag = useRef(
    benchmarkState.originalSecondaryRunnerTag ?? alternateRunnerTag,
  );

  const setters: BenchmarkSetters = {
    setIsRunning,
    setCurrentExecutions,
    setCurrentTaskIndex,
    setResults,
  };

  useEffect(() => {
    benchmarkState.results ??= [...getTasks()];
    attachSetters(setters);
    if (benchmarkState.restoredAfterRefresh) {
      benchmarkState.restoredAfterRefresh = false;
      dispatch(
        showSnackbar({
          message: 'Stopping benchmark...',
          severity: 'warning',
        }),
      );
    }
    return () => detachSetters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRunning) return undefined;
    const interval = setInterval(() => {
      if (currentTaskIndex === null) return;
      const task = getTasks()[currentTaskIndex];
      const executions = task?.Executions?.() ?? [];
      const merged = mergeExecutionStatus(
        executions,
        benchmarkState.activePipelines,
        benchmarkState.executionResults,
        getDefaultConfig(),
      );
      setCurrentExecutions(merged);
    }, 500);
    return () => clearInterval(interval);
  }, [isRunning, currentTaskIndex]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) =>
      handleBeforeUnload(event, benchmarkState.isRunningRef);

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

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
    originalSecondaryRunnerTag.current = alternateRunnerTag;
    dispatch(showSnackbar({ message: 'Benchmark started', severity: 'info' }));
    return startMeasurement(setters, benchmarkState.isRunningRef);
  };

  const handleRestart = () => {
    originalPrimaryRunnerTag.current = primaryRunnerTag;
    originalSecondaryRunnerTag.current = alternateRunnerTag;
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
    await purgeBenchmarkData();
    hasShownCompletionSnackbar.current = false;
    dispatch(
      showSnackbar({ message: 'Benchmark data purged', severity: 'success' }),
    );
  };

  const { hasStarted, completedTasks, completedTrials, totalTasks } =
    getBenchmarkStatus(results);
  const effectivePrimaryTag = isRunning
    ? originalPrimaryRunnerTag.current
    : primaryRunnerTag;
  const effectiveSecondaryTag = isRunning
    ? originalSecondaryRunnerTag.current
    : alternateRunnerTag;

  return (
    <Layout sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', p: 3, alignSelf: 'center' }}>
        <BenchmarkPageHeader />
        <Paper sx={{ p: 3 }}>
          <BenchmarkControls
            isRunning={isRunning}
            hasStarted={hasStarted}
            iterations={iterations}
            completedTasks={completedTasks}
            completedTrials={completedTrials}
            totalTasks={totalTasks}
            onStart={handleStart}
            onRestart={handleRestart}
            onStop={handleStop}
            onPurge={handlePurge}
          />
          <BenchmarkTable
            results={results}
            currentTaskIndex={currentTaskIndex}
            currentExecutions={currentExecutions}
            onDownloadTask={downloadTaskResultJson}
            primaryRunnerTag={effectivePrimaryTag}
            secondaryRunnerTag={effectiveSecondaryTag}
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

export default Benchmark;
