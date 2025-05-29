import * as React from 'react';
import { Dispatch, SetStateAction, useState, useCallback } from 'react';
import { Button, CircularProgress, Box } from '@mui/material';
import { handleStart } from 'route/digitaltwins/execution';
import { useSelector, useDispatch } from 'react-redux';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import { selectExecutionHistoryByDTName } from 'store/selectors/executionHistory.selectors';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import { createDigitalTwinFromData } from 'route/digitaltwins/execution/digitalTwinAdapter';

interface StartButtonProps {
  assetName: string;
  setHistoryButtonDisabled: Dispatch<SetStateAction<boolean>>;
}

function StartButton({
  assetName,
  setHistoryButtonDisabled,
}: StartButtonProps) {
  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const executions =
    useSelector(selectExecutionHistoryByDTName(assetName)) || [];

  const [isDebouncing, setIsDebouncing] = useState(false);
  const DEBOUNCE_TIME = 250;

  const runningExecutions = Array.isArray(executions)
    ? executions.filter(
        (execution) => execution.status === ExecutionStatus.RUNNING,
      )
    : [];

  const hasRunningExecutions = runningExecutions.length > 0;
  const hasAnyExecutions = executions.length > 0;

  const isLoading =
    hasRunningExecutions || (!hasAnyExecutions && digitalTwin?.pipelineLoading);

  const runningCount = runningExecutions.length;

  const handleDebouncedClick = useCallback(async () => {
    if (isDebouncing || !digitalTwin) return;

    setIsDebouncing(true);

    try {
      const digitalTwinInstance = await createDigitalTwinFromData(
        digitalTwin,
        assetName,
      );

      const setButtonText = () => {};
      await handleStart(
        'Start',
        setButtonText,
        digitalTwinInstance,
        setHistoryButtonDisabled,
        dispatch,
      );
    } finally {
      setTimeout(() => setIsDebouncing(false), DEBOUNCE_TIME);
    }
  }, [
    isDebouncing,
    digitalTwin,
    assetName,
    setHistoryButtonDisabled,
    dispatch,
  ]);

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
        disabled={isDebouncing}
        onClick={handleDebouncedClick}
      >
        Start
      </Button>
    </Box>
  );
}

export default StartButton;
