import * as React from 'react';
import { Dispatch, SetStateAction, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { selectDigitalTwinByName } from 'preview/store/digitalTwin.slice';
import { formatName } from 'preview/util/digitalTwin';
import { JobLog } from 'preview/model/executionHistory';
import {
  fetchExecutionHistory,
  selectSelectedExecution,
  setSelectedExecutionId,
} from 'preview/store/executionHistory.slice';
import ExecutionHistoryList from 'preview/components/execution/ExecutionHistoryList';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

interface LogDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`log-tabpanel-${index}`}
      aria-labelledby={`log-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `log-tab-${index}`,
    'aria-controls': `log-tabpanel-${index}`,
  };
}

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

function LogDialog({ showLog, setShowLog, name }: LogDialogProps) {
  const dispatch =
    useDispatch<ThunkDispatch<RootState, unknown, Action<string>>>();
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  const selectedExecution = useSelector(selectSelectedExecution);
  const [tabValue, setTabValue] = React.useState(0);

  useEffect(() => {
    if (showLog) {
      // Use the thunk action creator directly
      dispatch(fetchExecutionHistory(name));
    }
  }, [dispatch, name, showLog]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewLogs = (executionId: string) => {
    dispatch(setSelectedExecutionId(executionId));
    setTabValue(1);
  };

  const logsToDisplay: JobLog[] = selectedExecution
    ? selectedExecution.jobLogs
    : digitalTwin.jobLogs;

  const title = selectedExecution
    ? `${formatName(name)} - Execution ${new Date(selectedExecution.timestamp).toLocaleString()}`
    : `${formatName(name)} log`;

  return (
    <Dialog open={showLog} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="log tabs">
          <Tab label="History" {...a11yProps(0)} />
          <Tab label="Logs" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <DialogContent dividers>
        <TabPanel value={tabValue} index={0}>
          <ExecutionHistoryList dtName={name} onViewLogs={handleViewLogs} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          {logsToDisplay.length > 0 ? (
            logsToDisplay.map((jobLog: JobLog, index: number) => (
              <div key={index} style={{ marginBottom: '16px' }}>
                <Typography variant="h6">{jobLog.jobName}</Typography>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {jobLog.log}
                </Typography>
              </div>
            ))
          ) : (
            <Typography variant="body2">No logs available</Typography>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleCloseLog(setShowLog)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LogDialog;
