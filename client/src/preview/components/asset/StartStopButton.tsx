import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button, CircularProgress, Box } from '@mui/material';
import { handleStart } from 'model/backend/gitlab/execution/pipelineHandler';
import { useSelector, useDispatch } from 'react-redux';
import { selectDigitalTwinByName } from 'model/backend/gitlab/state/digitalTwin.slice';
import { selectExecutionHistoryByDTName } from 'model/backend/gitlab/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';

interface StartStopButtonProps {
  assetName: string;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
}

function StartStopButton({
  assetName,
  setLogButtonDisabled,
}: StartStopButtonProps) {
  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const executions =
    useSelector(selectExecutionHistoryByDTName(assetName)) || [];

  const runningExecutions = Array.isArray(executions)
    ? executions.filter(
        (execution) => execution.status === ExecutionStatus.RUNNING,
      )
    : [];

  const hasRunningExecutions = runningExecutions.length > 0;
  const hasAnyExecutions = executions.length > 0;

  const isLoading = hasRunningExecutions ||
    (!hasAnyExecutions && digitalTwin?.pipelineLoading);

  const runningCount = runningExecutions.length;

  return (
    <Box display="flex" alignItems="center">
      {isLoading && (
        <Box display="flex" alignItems="center" mr={1}>
          <CircularProgress size={22} data-testid="circular-progress" />
          {runningCount > 0 && (
            <Box component="span" ml={0.5} fontSize="0.75rem">
              ({runningCount})
            </Box>
          )}
        </Box>
      )}
      <Button
        variant="contained"
        size="small"
        color="primary"
        onClick={() => {
          const setButtonText = () => {}; // Dummy function since we don't need to change button text
          handleStart(
            'Start',
            setButtonText,
            digitalTwin,
            setLogButtonDisabled,
            dispatch,
          );
        }}
      >
        Start
      </Button>
    </Box>
  );
}

export default StartStopButton;
