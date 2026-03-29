import { TextField, Typography, Grid, Divider } from '@mui/material';
import { SettingsFieldProps } from 'route/account/SettingsForm';

const BenchmarkSettingsFields: React.FC<SettingsFieldProps> = ({
  formValues,
  fieldErrors,
  handleInputChange,
}) => (
  <>
    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
      Benchmark Settings
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="benchmarkTrials"
          label="Trial Number"
          type="number"
          variant="outlined"
          value={formValues.benchmarkTrials}
          onChange={handleInputChange}
          error={fieldErrors.benchmarkTrials}
          helperText={
            fieldErrors.benchmarkTrials
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
          id="benchmarkSecondaryRunnerTag"
          label="Benchmark Secondary Runner Tag"
          variant="outlined"
          value={formValues.benchmarkSecondaryRunnerTag}
          onChange={handleInputChange}
          error={fieldErrors.benchmarkSecondaryRunnerTag}
          helperText={
            fieldErrors.benchmarkSecondaryRunnerTag
              ? 'Benchmark secondary runner tag is required'
              : 'Runner tag used for multi-runner benchmark tests'
          }
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="benchmarkPrimaryDTName"
          label="Primary Digital Twin Name"
          variant="outlined"
          value={formValues.benchmarkPrimaryDTName}
          onChange={handleInputChange}
          error={fieldErrors.benchmarkPrimaryDTName}
          helperText={
            fieldErrors.benchmarkPrimaryDTName
              ? 'Primary Digital Twin name is required'
              : 'Digital Twin used in single-DT and same-DT benchmark tasks'
          }
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="benchmarkSecondaryDTName"
          label="Secondary Digital Twin Name"
          variant="outlined"
          value={formValues.benchmarkSecondaryDTName}
          onChange={handleInputChange}
          error={fieldErrors.benchmarkSecondaryDTName}
          helperText={
            fieldErrors.benchmarkSecondaryDTName
              ? 'Secondary Digital Twin name is required'
              : 'Digital Twin used as the second DT in multi-DT benchmark tasks'
          }
        />
      </Grid>
    </Grid>
  </>
);

export default BenchmarkSettingsFields;
