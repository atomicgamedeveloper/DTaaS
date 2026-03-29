import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/store';
import {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  resetToDefaults,
  DEFAULT_SETTINGS,
  DEFAULT_BENCHMARK,
  setBranchName,
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
} from 'store/settings.slice';
import {
  Button,
  Paper,
  Grid,
  Box,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import { Save as SaveIcon, RestartAlt as ResetIcon } from '@mui/icons-material';
import ApplicationSettingsFields from 'route/account/ApplicationSettingsFields';
import BenchmarkSettingsFields from 'route/account/BenchmarkSettingsFields';

export interface SettingsFieldProps {
  formValues: Record<string, string>;
  fieldErrors: Record<string, boolean>;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SettingsForm: React.FC = () => {
  const dispatch = useDispatch();
  const {
    GROUP_NAME,
    DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG,
    BRANCH_NAME,
  } = useSelector((state: RootState) => state.settings);
  const {
    trials: BENCHMARK_TRIALS,
    secondaryRunnerTag: BENCHMARK_SECONDARY_RUNNER_TAG,
    primaryDTName: BENCHMARK_PRIMARY_DT_NAME,
    secondaryDTName: BENCHMARK_SECONDARY_DT_NAME,
  } = useSelector((state: RootState) => state.settings);

  // Local state for form values - prevents saving on each keystroke
  const [formValues, setFormValues] = useState({
    groupName: GROUP_NAME,
    dtDirectory: DT_DIRECTORY,
    commonLibraryProjectName: COMMON_LIBRARY_PROJECT_NAME,
    runnerTag: RUNNER_TAG,
    branchName: BRANCH_NAME,
    benchmarkTrials: String(BENCHMARK_TRIALS),
    benchmarkSecondaryRunnerTag: BENCHMARK_SECONDARY_RUNNER_TAG,
    benchmarkPrimaryDTName: BENCHMARK_PRIMARY_DT_NAME,
    benchmarkSecondaryDTName: BENCHMARK_SECONDARY_DT_NAME,
  });

  // Validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(
    'Settings saved successfully!',
  );

  // Sync local form state when Redux state changes (e.g. external reset)
  const reduxKey = `${GROUP_NAME}|${DT_DIRECTORY}|${COMMON_LIBRARY_PROJECT_NAME}|${RUNNER_TAG}|${BRANCH_NAME}|${BENCHMARK_TRIALS}|${BENCHMARK_SECONDARY_RUNNER_TAG}|${BENCHMARK_PRIMARY_DT_NAME}|${BENCHMARK_SECONDARY_DT_NAME}`;
  const [prevReduxKey, setPrevReduxKey] = useState(reduxKey);
  if (prevReduxKey !== reduxKey) {
    setPrevReduxKey(reduxKey);
    setFormValues({
      groupName: GROUP_NAME,
      dtDirectory: DT_DIRECTORY,
      commonLibraryProjectName: COMMON_LIBRARY_PROJECT_NAME,
      runnerTag: RUNNER_TAG,
      branchName: BRANCH_NAME,
      benchmarkTrials: String(BENCHMARK_TRIALS),
      benchmarkSecondaryRunnerTag: BENCHMARK_SECONDARY_RUNNER_TAG,
      benchmarkPrimaryDTName: BENCHMARK_PRIMARY_DT_NAME,
      benchmarkSecondaryDTName: BENCHMARK_SECONDARY_DT_NAME,
    });
    setFieldErrors({});
  }

  // Handle local form changes without dispatching to Redux
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;

    setFormValues((prev) => ({ ...prev, [id]: value }));
    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Reset form to default values
  const handleResetToDefaults = () => {
    setFormValues({
      groupName: DEFAULT_SETTINGS.GROUP_NAME,
      dtDirectory: DEFAULT_SETTINGS.DT_DIRECTORY,
      commonLibraryProjectName: DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_NAME,
      runnerTag: DEFAULT_SETTINGS.RUNNER_TAG,
      branchName: DEFAULT_SETTINGS.BRANCH_NAME,
      benchmarkTrials: String(DEFAULT_BENCHMARK.trials),
      benchmarkSecondaryRunnerTag: DEFAULT_BENCHMARK.secondaryRunnerTag,
      benchmarkPrimaryDTName: DEFAULT_BENCHMARK.primaryDTName,
      benchmarkSecondaryDTName: DEFAULT_BENCHMARK.secondaryDTName,
    });
    setFieldErrors({});

    dispatch(resetToDefaults());

    setNotificationMessage('Settings reset to defaults');
    setShowNotification(true);
  };

  // Save all settings at once
  const handleSaveSettings = () => {
    const requiredStringFields = [
      'groupName',
      'dtDirectory',
      'commonLibraryProjectName',
      'runnerTag',
      'branchName',
      'benchmarkSecondaryRunnerTag',
      'benchmarkPrimaryDTName',
      'benchmarkSecondaryDTName',
    ] as const;

    const errors: Record<string, boolean> = {};
    for (const field of requiredStringFields) {
      if (!formValues[field].trim()) {
        errors[field] = true;
      }
    }

    const trialsValue = Number.parseInt(formValues.benchmarkTrials, 10);
    if (
      !formValues.benchmarkTrials.trim() ||
      Number.isNaN(trialsValue) ||
      trialsValue < 1
    ) {
      errors.benchmarkTrials = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (formValues.groupName !== GROUP_NAME) {
      dispatch(setGroupName(formValues.groupName));
    }

    if (formValues.dtDirectory !== DT_DIRECTORY) {
      dispatch(setDTDirectory(formValues.dtDirectory));
    }

    if (formValues.commonLibraryProjectName !== COMMON_LIBRARY_PROJECT_NAME) {
      dispatch(
        setCommonLibraryProjectName(formValues.commonLibraryProjectName),
      );
    }

    if (formValues.runnerTag !== RUNNER_TAG) {
      dispatch(setRunnerTag(formValues.runnerTag));
    }

    if (formValues.branchName !== BRANCH_NAME) {
      dispatch(setBranchName(formValues.branchName));
    }

    if (trialsValue !== BENCHMARK_TRIALS) {
      dispatch(setTrials(trialsValue));
    }

    if (
      formValues.benchmarkSecondaryRunnerTag !== BENCHMARK_SECONDARY_RUNNER_TAG
    ) {
      dispatch(setSecondaryRunnerTag(formValues.benchmarkSecondaryRunnerTag));
    }

    if (formValues.benchmarkPrimaryDTName !== BENCHMARK_PRIMARY_DT_NAME) {
      dispatch(setPrimaryDTName(formValues.benchmarkPrimaryDTName));
    }

    if (formValues.benchmarkSecondaryDTName !== BENCHMARK_SECONDARY_DT_NAME) {
      dispatch(setSecondaryDTName(formValues.benchmarkSecondaryDTName));
    }

    setNotificationMessage('Settings saved successfully!');
    setShowNotification(true);
  };

  const fieldProps: SettingsFieldProps = {
    formValues,
    fieldErrors,
    handleInputChange,
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <ApplicationSettingsFields {...fieldProps} />
        <BenchmarkSettingsFields {...fieldProps} />

        <Grid container>
          <Grid
            size={{ xs: 12 }}
            sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}
          >
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ResetIcon />}
                onClick={handleResetToDefaults}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
              >
                Save Settings
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={showNotification}
        autoHideDuration={4000}
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowNotification(false)} severity="success">
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsForm;
