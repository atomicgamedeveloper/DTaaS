/**
 * Main measurement page.
 *
 * - Controls (start, stop, download) are in ./MeasurementControls.tsx
 * - Results table is in ./MeasurementTable.tsx
 * - Trial cards and status indicators are in ./MeasurementComponents.tsx
 */
import ClearIcon from '@mui/icons-material/Clear';
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
  MeasurementSetters,
  measurementState,
  getDefaultConfig,
  attachSetters,
  detachSetters,
  getTasks,
} from 'model/backend/gitlab/measure/measurement.execution';
import {
  startMeasurement,
  stopAllPipelines,
  restartMeasurement,
  handleBeforeUnload,
  purgeMeasurementData,
} from 'model/backend/gitlab/measure/measurement.runner';
import {
  getMeasurementStatus,
  mergeExecutionStatus,
  downloadTaskResultJson,
} from 'model/backend/gitlab/measure/measurement.utils';
import MeasurementControls, {
  CompletionSummary,
} from 'route/measurement/MeasurementControls';
import MeasurementTable from 'route/measurement/MeasurementTable';

function MeasurementPageHeader() {
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
        <Typography variant="h5">Digital Twin Measurement</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        Run performance measurements for Digital Twin executions. Each task runs
        a number of trials to calculate average time per task. Click{' '}
        <strong>Start</strong> to begin the measurement suite,{' '}
        <strong>Stop</strong> to cancel running executions, or{' '}
        <strong>Purge</strong> to permanently delete all measurement data from
        storage. After all tasks are through as well as after each trial
        completes, you will be able to download a summary.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        You can navigate away from this page while a measurement is running and it
        will continue in the background. However,{' '}
        <strong>
          changing the URL, refreshing, or closing the tab will stop the
          execution
        </strong>
        . Notifications will inform you when a measurement completes or is
        stopped.
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

function Measurement() {
  const dispatch = useDispatch();
  const { trials: iterations, secondaryRunnerTag: alternateRunnerTag } =
    useSelector((state: RootState) => state.settings);
  const primaryRunnerTag = useSelector(
    (state: RootState) => state.settings.RUNNER_TAG,
  );
  const [results, setResults] = useState<TimedTask[]>(
    () => measurementState.results ?? [...getTasks()],
  );
  const [currentExecutions, setCurrentExecutions] = useState<ExecutionResult[]>(
    () => {
      if (
        !measurementState.isRunning ||
        measurementState.currentTaskIndexUI === null
      )
        return [];
      const task = getTasks()[measurementState.currentTaskIndexUI];
      const executions = task?.Executions?.() ?? [];
      return mergeExecutionStatus(
        executions,
        measurementState.activePipelines,
        measurementState.executionResults,
        getDefaultConfig(),
      );
    },
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(
    measurementState.isRunning ? measurementState.currentTaskIndexUI : null,
  );
  const [isRunning, setIsRunning] = useState(measurementState.isRunning);
  const originalPrimaryRunnerTag = useRef(
    measurementState.originalPrimaryRunnerTag ?? primaryRunnerTag,
  );
  const originalSecondaryRunnerTag = useRef(
    measurementState.originalSecondaryRunnerTag ?? alternateRunnerTag,
  );

  const setters: MeasurementSetters = {
    setIsRunning,
    setCurrentExecutions,
    setCurrentTaskIndex,
    setResults,
  };

  useEffect(() => {
    measurementState.results ??= [...getTasks()];
    attachSetters(setters);
    if (measurementState.restoredAfterRefresh) {
      measurementState.restoredAfterRefresh = false;
      dispatch(
        showSnackbar({
          message: 'Measurement stopped',
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
        measurementState.activePipelines,
        measurementState.executionResults,
        getDefaultConfig(),
      );
      setCurrentExecutions(merged);
    }, 500);
    return () => clearInterval(interval);
  }, [isRunning, currentTaskIndex]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) =>
      handleBeforeUnload(event, measurementState.isRunningRef);

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const handleStart = () => {
    originalPrimaryRunnerTag.current = primaryRunnerTag;
    originalSecondaryRunnerTag.current = alternateRunnerTag;
    dispatch(
      showSnackbar({ message: 'Measurement started', severity: 'info' }),
    );
    return startMeasurement(setters, measurementState.isRunningRef);
  };

  const handleRestart = () => {
    originalPrimaryRunnerTag.current = primaryRunnerTag;
    originalSecondaryRunnerTag.current = alternateRunnerTag;
    dispatch(
      showSnackbar({ message: 'Measurement restarted', severity: 'info' }),
    );
    return restartMeasurement(setters, measurementState.isRunningRef);
  };

  const handleStop = () => {
    dispatch(
      showSnackbar({ message: 'Stopping measurement...', severity: 'warning' }),
    );
    return stopAllPipelines();
  };

  const handlePurge = async () => {
    await purgeMeasurementData();
    dispatch(
      showSnackbar({
        message: 'Measurement data purged',
        severity: 'warning',
        icon: <ClearIcon fontSize="inherit" />,
      }),
    );
  };

  const { hasStarted, completedTasks, completedTrials, totalTasks } =
    getMeasurementStatus(results);
  const effectivePrimaryTag = isRunning
    ? originalPrimaryRunnerTag.current
    : primaryRunnerTag;
  const effectiveSecondaryTag = isRunning
    ? originalSecondaryRunnerTag.current
    : alternateRunnerTag;

  return (
    <Layout sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', p: 3, alignSelf: 'center' }}>
        <MeasurementPageHeader />
        <Paper sx={{ p: 3 }}>
          <MeasurementControls
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
          <MeasurementTable
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

export default Measurement;
