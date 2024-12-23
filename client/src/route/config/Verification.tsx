import * as React from 'react';
import { validationType } from 'util/configUtil';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import { StatusCodes } from 'http-status-codes';

const ConfigIcon = (toolTipTitle: string, icon: JSX.Element): JSX.Element => (
  <Tooltip
    title={toolTipTitle}
    PopperProps={{ container: document.getElementById('root') }}
  >
    {icon}
  </Tooltip>
);

interface ValidationIconConfig {
  icon: JSX.Element;
  hoverTip: string;
}

const getValidationIconConfig = (
  validation: validationType,
  label: string,
): ValidationIconConfig => {
  const { value, status, error } = validation;
  if (error) {
    return {
      icon: <ErrorOutlineIcon color="error" data-testid="error-icon" />,
      hoverTip: `${label} threw the following error: ${error}`,
    };
  }

  const statusIsAcceptable = status === StatusCodes.OK || status === undefined;

  return statusIsAcceptable
    ? {
        icon: <CheckCircleIcon color="success" data-testid="success-icon" />,
        hoverTip: `${label} field is configured correctly.`,
      }
    : {
        icon: <ErrorOutlineIcon color="warning" data-testid="warning-icon" />,
        hoverTip: `${label} field may not be configured correctly. ${value} responded with status code ${status}.`,
      };
};

export const getConfigIcon = (
  validation: validationType,
  label: string,
): JSX.Element => {
  const { icon, hoverTip } = getValidationIconConfig(validation, label);
  return ConfigIcon(hoverTip, icon);
};

export const ConfigItem: React.FC<{
  label: string;
  value: string;
  validation: validationType;
}> = ({ label, value, validation = { error: 'Validation unavailable' } }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      margin: '5px 0',
    }}
    className="Config-item"
  >
    {getConfigIcon(validation, label)}
    <Typography
      sx={{
        fontSize: 'clamp(0.1rem, 4vw, 1rem)',
        padding: 'clamp(0, 4vw, 5%)',
      }}
    >
      <strong>{label}:</strong> {value}
    </Typography>
  </div>
);
ConfigItem.displayName = 'ConfigItem';

export const loadingComponent = (): React.ReactNode => (
  <Box
    sx={{
      marginTop: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    Verifying configuration
    <CircularProgress />
  </Box>
);
