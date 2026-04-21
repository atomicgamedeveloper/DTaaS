import { TextField, Typography, Grid, Divider } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { SettingsFieldProps } from 'route/account/SettingsForm';

interface MeasurementSettingsFieldsProps extends SettingsFieldProps {
  twinsLoading: boolean;
}

const MeasurementSettingsFields: React.FC<MeasurementSettingsFieldsProps> = ({
  formValues,
  fieldErrors,
  handleInputChange,
  twinsLoading,
}) => {
  const digitalTwins = useSelector(
    (state: RootState) => state.digitalTwin.digitalTwin,
  );
  const twinNames = Object.keys(digitalTwins);

  const primaryDTHelperText = () => {
    if (fieldErrors.measurementPrimaryDTName)
      return 'Please select a Digital Twin';
    if (twinsLoading) return 'Loading available digital twins...';
    return 'Digital Twin used in single-DT and same-DT measurement tasks';
  };

  const secondaryDTHelperText = () => {
    if (fieldErrors.measurementSecondaryDTName)
      return 'Please select a Digital Twin';
    if (twinsLoading) return 'Loading available digital twins...';
    return 'Digital Twin used as the second DT in multi-DT measurement tasks';
  };

  return (
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
            select
            SelectProps={{ native: true }}
            fullWidth
            id="measurementPrimaryDTName"
            label="Primary Digital Twin"
            variant="outlined"
            value={formValues.measurementPrimaryDTName}
            onChange={handleInputChange}
            disabled={twinsLoading}
            error={fieldErrors.measurementPrimaryDTName}
            helperText={primaryDTHelperText()}
          >
            {twinsLoading ? (
              <option value={formValues.measurementPrimaryDTName}>
                {formValues.measurementPrimaryDTName}
              </option>
            ) : (
              twinNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            )}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            SelectProps={{ native: true }}
            fullWidth
            id="measurementSecondaryDTName"
            label="Secondary Digital Twin"
            variant="outlined"
            value={formValues.measurementSecondaryDTName}
            onChange={handleInputChange}
            disabled={twinsLoading}
            error={fieldErrors.measurementSecondaryDTName}
            helperText={secondaryDTHelperText()}
          >
            {twinsLoading ? (
              <option value={formValues.measurementSecondaryDTName}>
                {formValues.measurementSecondaryDTName}
              </option>
            ) : (
              twinNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            )}
          </TextField>
        </Grid>
      </Grid>
    </>
  );
};

export default MeasurementSettingsFields;
