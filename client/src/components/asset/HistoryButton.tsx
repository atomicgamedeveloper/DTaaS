import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button, Badge } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectExecutionHistoryByDTName } from 'store/selectors/executionHistory.selectors';

interface HistoryButtonProps {
  setShowLog: Dispatch<React.SetStateAction<boolean>>;
  historyButtonDisabled: boolean;
  assetName: string;
}

export const handleToggleHistory = (
  setShowLog: Dispatch<SetStateAction<boolean>>,
) => {
  setShowLog((prev) => !prev);
};

function HistoryButton({
  setShowLog,
  historyButtonDisabled,
  assetName,
}: HistoryButtonProps) {
  const executions =
    useSelector(selectExecutionHistoryByDTName(assetName)) || [];

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
        onClick={() => handleToggleHistory(setShowLog)}
        disabled={historyButtonDisabled && executionCount === 0}
      >
        History
      </Button>
    </Badge>
  );
}

export default HistoryButton;
