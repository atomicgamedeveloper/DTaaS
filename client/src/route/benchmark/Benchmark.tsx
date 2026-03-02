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
  benchmarkState,
  DEFAULT_CONFIG,
  attachSetters,
  detachSetters,
  tasks,
} from 'model/backend/gitlab/measure/benchmark.execution';
import {
  startMeasurement,
  stopAllPipelines,
  downloadTaskResultJson,
} from 'model/backend/gitlab/measure/benchmark.runner';
import {
  restartMeasurement,
  handleBeforeUnload,
  purgeBenchmarkData,
} from 'model/backend/gitlab/measure/benchmark.lifecycle';
import {
  getBenchmarkStatus,
  mergeExecutionStatus,
  areAllBenchmarksComplete,
} from 'model/backend/gitlab/measure/benchmark.utils';
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
  iterations: number;
  onStart: () => void;
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
  iterations,
  onStart,
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
            iterations={iterations}
            completedTasks={completedTasks}
            completedTrials={completedTrials}
            totalTasks={totalTasks}
            onStart={onStart}
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
    await purgeBenchmarkData();
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
      iterations={iterations}
      onStart={handleStart}
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
