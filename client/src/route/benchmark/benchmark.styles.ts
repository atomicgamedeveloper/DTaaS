import { SxProps, Theme } from '@mui/material';
import { Status } from 'model/backend/gitlab/measure/benchmark.execution';

// Color constants
export const statusColorMap: Record<Status, string> = {
  NOT_STARTED: '#9e9e9e',
  PENDING: '#9e9e9e',
  RUNNING: '#1976d2',
  FAILURE: '#d32f2f',
  SUCCESS: '#1976d2',
  STOPPED: '#616161',
};

const executionStatusColors: Record<string, string> = {
  success: '#1976d2',
  failed: '#d32f2f',
  cancelled: '#616161',
};

export function getExecutionStatusColor(status: string): string {
  return executionStatusColors[status] ?? '#9e9e9e';
}

export const runnerTagColors = {
  primary: {
    background: '#e8f5e9',
    border: '#4caf50',
    text: '#2e7d32',
  },
  secondary: {
    background: '#e3f2fd',
    border: '#42a5f5',
    text: '#1565c0',
  },
};

// Benchmark.tsx styles
export const tableContainer: SxProps<Theme> = {
  maxHeight: '50vh',
  overflow: 'auto',
};

export const tableLayout: SxProps<Theme> = { tableLayout: 'fixed' };

export const taskNameColumn: SxProps<Theme> = {
  width: '37%',
  fontWeight: 'bold',
};

export const statusColumn: SxProps<Theme> = {
  width: '10%',
  fontWeight: 'bold',
};

export const avgDurationColumn: SxProps<Theme> = {
  width: '15%',
  fontWeight: 'bold',
};

export const trialsColumn: SxProps<Theme> = {
  width: '26%',
  fontWeight: 'bold',
};

export const dataColumn: SxProps<Theme> = {
  width: '12%',
  fontWeight: 'bold',
};

export const taskRowNameBox: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1.5,
};

export const taskIndex: SxProps<Theme> = { minWidth: '20px', mt: 0.2 };

export const bold: SxProps<Theme> = { fontWeight: 'bold' };

export const inlineDisplay: SxProps<Theme> = { display: 'inline' };

export const verticalMiddle: SxProps<Theme> = { verticalAlign: 'middle' };

export const contentBox: SxProps<Theme> = {
  width: '100%',
  p: 3,
  alignSelf: 'center',
};

export const contentPaper: SxProps<Theme> = { p: 3 };

// BenchmarkComponents.tsx styles
export const runnerTagBadge = (color: {
  background: string;
  border: string;
  text: string;
}): SxProps<Theme> => ({
  display: 'inline-flex',
  alignItems: 'center',
  px: 0.6,
  py: 0.15,
  ml: 0.4,
  borderRadius: '10px',
  border: `1.5px solid ${color.border}`,
  backgroundColor: color.background,
  fontSize: '0.65rem',
  fontWeight: 500,
  color: color.text,
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
});

export const executionCard: SxProps<Theme> = {
  mb: 0.5,
  p: 1,
  bgcolor: 'grey.100',
  borderRadius: 1,
  textAlign: 'center',
};

export const trialCard: SxProps<Theme> = {
  mb: 1.5,
  p: 1,
  border: 1,
  borderColor: 'grey.300',
  borderRadius: 1,
  bgcolor: 'background.paper',
};

export const trialHeaderRow: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 0.5,
};

export const trialHeaderLeft: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};

export const errorBox: SxProps<Theme> = {
  mt: 0.5,
  p: 1,
  bgcolor: 'error.light',
  borderRadius: 1,
};

export const downloadLink: SxProps<Theme> = {
  color: 'primary.main',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: '0.7rem',
};

export const pageHeaderBox: SxProps<Theme> = { mb: 3 };

export const pageHeaderRow: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 1,
};

export const controlsBar: SxProps<Theme> = { mb: 3 };

export const controlsButtonGroup: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};

export const trialsProgress: SxProps<Theme> = { color: 'primary.main' };

export const completionSummary: SxProps<Theme> = {
  mt: 2,
  textAlign: 'center',
  color: 'text.secondary',
};

export const clickableLink: SxProps<Theme> = {
  color: 'primary.main',
  cursor: 'pointer',
  textDecoration: 'underline',
};
