import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';

interface DeleteButtonProps {
  readonly assetName: string;
  readonly setShowDelete: Dispatch<React.SetStateAction<boolean>>;
}

const handleToggleDeleteDialog = (
  setShowDelete: Dispatch<SetStateAction<boolean>>,
) => {
  setShowDelete(true);
};

function DeleteButton({ assetName, setShowDelete }: DeleteButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleDeleteDialog(setShowDelete)}
      data-logger-element="button"
      data-logger-label="Delete"
      data-logger-context={JSON.stringify({
        dt: { name: assetName, button: 'delete' },
      })}
    >
      Delete
    </Button>
  );
}

export default DeleteButton;
