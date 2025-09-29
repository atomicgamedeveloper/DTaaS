import * as React from 'react';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import CustomSnackbar from 'route/digitaltwins/Snackbar';
import ExecutionHistoryLoader from 'components/execution/ExecutionHistoryLoader';
import WaitNavigateAndReload from './WaitAndNavigate';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const auth = useAuth();
  const [isInitialFetchDone, setIsInitialFetchDone] = React.useState(false);
  let returnJSX;

  React.useEffect(() => {
    if (auth.isAuthenticated && !isInitialFetchDone) {
      if (auth.user !== null && auth.user !== undefined) {
        sessionStorage.setItem('access_token', auth.user.access_token);
        setIsInitialFetchDone(true);
      } else {
        throw new Error('Access token was not available...');
      }
    }
  }, [auth.user, auth.isAuthenticated, isInitialFetchDone]);

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
