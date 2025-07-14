import * as React from 'react';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/store';
import {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectId,
  setRunnerTag,
  resetToDefaults,
  DEFAULT_SETTINGS,
} from 'store/settings.slice';
import {
  Button,
  TextField,
  Paper,
  Typography,
  Grid,
  Box,
  Divider,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import { Save as SaveIcon, RestartAlt as ResetIcon } from '@mui/icons-material';

const SettingsForm: React.FC = () => {
  const dispatch = useDispatch();
  const { GROUP_NAME, DT_DIRECTORY, COMMON_LIBRARY_PROJECT_ID, RUNNER_TAG } =
    useSelector((state: RootState) => state.settings);

  // Local state for form values - prevents saving on each keystroke
  const [formValues, setFormValues] = useState({
    groupName: GROUP_NAME,
    dtDirectory: DT_DIRECTORY,
    commonLibraryProjectId: COMMON_LIBRARY_PROJECT_ID,
    runnerTag: RUNNER_TAG,
  });

  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(
    'Settings saved successfully!',
  );

  // Update local state when Redux state changes
  useEffect(() => {
    setFormValues({
      groupName: GROUP_NAME,
      dtDirectory: DT_DIRECTORY,
      commonLibraryProjectId: COMMON_LIBRARY_PROJECT_ID,
      runnerTag: RUNNER_TAG,
    });
  }, [GROUP_NAME, DT_DIRECTORY, COMMON_LIBRARY_PROJECT_ID, RUNNER_TAG]);

  // Handle local form changes without dispatching to Redux
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;

    setFormValues((prev) => {
      if (id === 'groupName') {
        return { ...prev, groupName: value };
      }
      if (id === 'dtDirectory') {
        return { ...prev, dtDirectory: value };
      }
      if (id === 'commonLibraryProjectId') {
        return { ...prev, commonLibraryProjectId: Number(value) };
      }
      return { ...prev, runnerTag: value };
    });
  };

  // Reset form to default values
  const handleResetToDefaults = () => {
    setFormValues({
      groupName: DEFAULT_SETTINGS.GROUP_NAME,
      dtDirectory: DEFAULT_SETTINGS.DT_DIRECTORY,
      commonLibraryProjectId: DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_ID,
      runnerTag: DEFAULT_SETTINGS.RUNNER_TAG,
    });

    dispatch(resetToDefaults());

    setNotificationMessage('Settings reset to defaults');
    setShowNotification(true);
  };

  // Save all settings at once
  const handleSaveSettings = () => {
    if (formValues.groupName !== GROUP_NAME) {
      dispatch(setGroupName(formValues.groupName));
    }

    if (formValues.dtDirectory !== DT_DIRECTORY) {
      dispatch(setDTDirectory(formValues.dtDirectory));
    }

    if (formValues.commonLibraryProjectId !== COMMON_LIBRARY_PROJECT_ID) {
      dispatch(setCommonLibraryProjectId(formValues.commonLibraryProjectId));
    }

    if (formValues.runnerTag !== RUNNER_TAG) {
      dispatch(setRunnerTag(formValues.runnerTag));
    }

    setNotificationMessage('Settings saved successfully!');
    setShowNotification(true);
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {/* Application Settings Section */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Application Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="groupName"
              label="Group Name"
              variant="outlined"
              value={formValues.groupName}
              onChange={handleInputChange}
              helperText="The group name used for GitLab operations"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="dtDirectory"
              label="DT Directory"
              variant="outlined"
              value={formValues.dtDirectory}
              onChange={handleInputChange}
              helperText="Directory for Digital Twin files"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="commonLibraryProjectId"
              label="Common Library Project ID"
              variant="outlined"
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              value={formValues.commonLibraryProjectId}
              onChange={handleInputChange}
              helperText="Project ID for the common library"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="runnerTag"
              label="Runner Tag"
              variant="outlined"
              value={formValues.runnerTag}
              onChange={handleInputChange}
              helperText="Tag used for GitLab CI runners (e.g., linux, windows)"
            />
          </Grid>

          <Grid
            item
            xs={12}
            sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}
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
