import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import AuthProvider from 'route/auth/AuthProvider';
import * as React from 'react';
import { Provider } from 'react-redux';
import store from 'store/store';
import ExecutionHistoryLoader from 'preview/components/execution/ExecutionHistoryLoader';

const mdTheme: Theme = createTheme({
  palette: {
    mode: 'light',
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={mdTheme}>
        <AuthProvider>
          <CssBaseline />
          <ExecutionHistoryLoader />
          {children}
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default AppProvider;
