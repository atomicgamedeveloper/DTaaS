import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  DialogActions,
  Button,
} from '@mui/material';
import { logDismiss } from 'util/logger/logger';

interface DeleteAllConfirmationDialogProps {
  open: boolean;
  dtName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAllConfirmationDialog: React.FC<
  DeleteAllConfirmationDialogProps
> = ({ open, dtName, onClose, onConfirm }) => (
  <Dialog
    open={open}
    onClose={(_event, reason) => {
      logDismiss('dialog', 'Confirm Clear All', reason);
      onClose();
    }}
  >
    <DialogTitle>Confirm Clear All</DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to delete <strong>all</strong> execution history
        entries for <strong>{dtName}</strong>?<br />
        <br />
        This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button
        onClick={onClose}
        color="primary"
        data-logger-element="button"
        data-logger-label="Cancel"
      >
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        color="error"
        data-logger-element="button"
        data-logger-label="Delete All"
      >
        Delete All
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteAllConfirmationDialog;
