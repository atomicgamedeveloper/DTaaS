import { AlertColor } from '@mui/material';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ShowNotificationPayload } from 'model/backend/interfaces/sharedInterfaces';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

const initialState: SnackbarState = {
  open: false,
  message: '',
  severity: 'info',
};

const snackbarSlice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    showSnackbar(state, action: PayloadAction<ShowNotificationPayload>) {
      state.open = true;
      state.message = action.payload.message;
      state.severity = action.payload.severity as AlertColor;
    },
    hideSnackbar(state) {
      state.open = false;
    },
  },
});

export const { showSnackbar, hideSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;
