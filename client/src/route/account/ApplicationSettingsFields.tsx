import { TextField, Typography, Grid, Divider } from '@mui/material';
import { SettingsFieldProps } from 'route/account/SettingsForm';

const ApplicationSettingsFields: React.FC<SettingsFieldProps> = ({
  formValues,
  fieldErrors,
  handleInputChange,
}) => (
  <>
    <Typography variant="h6" gutterBottom>
      Application Settings
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="groupName"
          label="Group Name"
          variant="outlined"
          value={formValues.groupName}
          onChange={handleInputChange}
          error={fieldErrors.groupName}
          helperText={
            fieldErrors.groupName
              ? 'Group name is required'
              : 'The group name used for GitLab operations'
          }
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="dtDirectory"
          label="DT Directory"
          variant="outlined"
          value={formValues.dtDirectory}
          onChange={handleInputChange}
          error={fieldErrors.dtDirectory}
          helperText={
            fieldErrors.dtDirectory
              ? 'DT directory is required'
              : 'Directory for Digital Twin files'
          }
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="commonLibraryProjectName"
          label="Common Library Project name"
          variant="outlined"
          value={formValues.commonLibraryProjectName}
          onChange={handleInputChange}
          error={fieldErrors.commonLibraryProjectName}
          helperText={
            fieldErrors.commonLibraryProjectName
              ? 'Common library project name is required'
              : 'Project name for the common library'
          }
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="runnerTag"
          label="Runner Tag"
          variant="outlined"
          value={formValues.runnerTag}
          onChange={handleInputChange}
          error={fieldErrors.runnerTag}
          helperText={
            fieldErrors.runnerTag
              ? 'Runner tag is required'
              : 'Tag used for GitLab CI runners (e.g., linux, windows)'
          }
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          id="branchName"
          label="Branch Name"
          variant="outlined"
          value={formValues.branchName}
          onChange={handleInputChange}
          error={fieldErrors.branchName}
          helperText={
            fieldErrors.branchName
              ? 'Branch name is required'
              : 'Default branch name for GitLab projects'
          }
        />
      </Grid>
    </Grid>
  </>
);

export default ApplicationSettingsFields;
