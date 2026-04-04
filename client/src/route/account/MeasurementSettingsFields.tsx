import { TextField, Typography, Grid, Divider } from '@mui/material';
import { SettingsFieldProps } from 'route/account/SettingsForm';

const MeasurementSettingsFields: React.FC<SettingsFieldProps> = ({
  formValues,
  fieldErrors,
  handleInputChange,
}) => (
  <>
    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
      Measurement Settings
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="measurementTrials"
          label="Trial Number"
          type="number"
          variant="outlined"
          value={formValues.measurementTrials}
          onChange={handleInputChange}
          error={fieldErrors.measurementTrials}
          helperText={
            fieldErrors.measurementTrials
              ? 'Trial number is required and must be at least 1'
              : 'Number of times each task is repeated to calculate average execution time'
          }
          slotProps={{
            htmlInput: { min: 1 },
          }}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="measurementSecondaryRunnerTag"
          label="Measurement Secondary Runner Tag"
          variant="outlined"
          value={formValues.measurementSecondaryRunnerTag}
          onChange={handleInputChange}
          error={fieldErrors.measurementSecondaryRunnerTag}
          helperText={
            fieldErrors.measurementSecondaryRunnerTag
              ? 'Measurement secondary runner tag is required'
              : 'Runner tag used for multi-runner measurement tests'
          }
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="measurementPrimaryDTName"
          label="Primary Digital Twin Name"
          variant="outlined"
          value={formValues.measurementPrimaryDTName}
          onChange={handleInputChange}
          error={fieldErrors.measurementPrimaryDTName}
          helperText={
            fieldErrors.measurementPrimaryDTName
              ? 'Primary Digital Twin name is required'
              : 'Digital Twin used in single-DT and same-DT measurement tasks'
          }
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="measurementSecondaryDTName"
          label="Secondary Digital Twin Name"
          variant="outlined"
          value={formValues.measurementSecondaryDTName}
          onChange={handleInputChange}
          error={fieldErrors.measurementSecondaryDTName}
          helperText={
            fieldErrors.measurementSecondaryDTName
              ? 'Secondary Digital Twin name is required'
              : 'Digital Twin used as the second DT in multi-DT measurement tasks'
          }
        />
      </Grid>
    </Grid>
  </>
);

export default MeasurementSettingsFields;
