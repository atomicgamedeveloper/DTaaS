import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button, Badge } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectExecutionHistoryByDTName } from 'preview/store/executionHistory.slice';

interface LogButtonProps {
  setShowLog: Dispatch<React.SetStateAction<boolean>>;
  logButtonDisabled: boolean;
  assetName: string;
}

export const handleToggleLog = (
  setShowLog: Dispatch<SetStateAction<boolean>>,
) => {
  setShowLog((prev) => !prev);
};

function LogButton({
  setShowLog,
  logButtonDisabled,
  assetName,
}: LogButtonProps) {
  // Get execution history for this Digital Twin
  const executions =
    useSelector(selectExecutionHistoryByDTName(assetName)) || [];

  // Count of executions with logs
  const executionCount = executions.length;

  return (
    <Badge
      badgeContent={executionCount > 0 ? executionCount : 0}
      color="secondary"
      overlap="circular"
      invisible={executionCount === 0}
    >
      <Button
        variant="contained"
        size="small"
        color="primary"
        onClick={() => handleToggleLog(setShowLog)}
        disabled={logButtonDisabled && executionCount === 0}
      >
        History
      </Button>
    </Badge>
  );
}

export default LogButton;
