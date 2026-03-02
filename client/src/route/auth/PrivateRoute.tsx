import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import CustomSnackbar from 'components/route/Snackbar';
import ExecutionHistoryLoader from 'components/execution/ExecutionHistoryLoader';
import WaitNavigateAndReload from 'route/auth/WaitAndNavigate';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const auth = useAuth();
  let returnJSX;

  if (auth.isAuthenticated) {
    if (auth.user !== null && auth.user !== undefined) {
      sessionStorage.setItem('access_token', auth.user.access_token);
    } else {
      throw new Error('Access token was not available...');
    }
  }

  if (auth.isLoading) {
    returnJSX = <div>Loading...</div>;
  } else if (auth.error) {
    returnJSX = (
      <div>
        Oops... {auth.error.message}
        <WaitNavigateAndReload />
      </div>
    );
  } else if (!auth.isAuthenticated) {
    returnJSX = <Navigate to="/" replace />;
  } else if (auth.isAuthenticated) {
    // Lets all authenticated routes inform about DT status
    returnJSX = (
      <>
        {children}
        <ExecutionHistoryLoader />
        <CustomSnackbar />
      </>
    );
  } else {
    returnJSX = <Navigate to="/" replace />;
  }

  return returnJSX;
};

export default PrivateRoute;
