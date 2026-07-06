import { Button } from '@mui/material';
import { Dispatch, SetStateAction } from 'react';

interface ReconfigureButtonProps {
  readonly assetName: string;
  readonly setShowReconfigure: Dispatch<SetStateAction<boolean>>;
}

export const handleToggleReconfigureDialog = (
  setShowReconfigure: Dispatch<SetStateAction<boolean>>,
) => {
  setShowReconfigure((prev) => !prev);
};

function ReconfigureButton({
  assetName,
  setShowReconfigure,
}: ReconfigureButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleReconfigureDialog(setShowReconfigure)}
      data-logger-element="button"
      data-logger-label="Reconfigure"
      data-logger-context={JSON.stringify({
        'dt.name': assetName,
        'dt.button': 'reconfigure',
      })}
    >
      Reconfigure
    </Button>
  );
}

export default ReconfigureButton;
