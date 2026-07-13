import React, { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import ExecutionHistoryLoader from 'components/execution/ExecutionHistoryLoader';
import WaitNavigateAndReload from 'route/auth/WaitAndNavigate';
import { useLogger } from 'util/logger/useLogger';

interface PrivateRouteProps {
  children: ReactNode;
}

type RouteState = 'loading' | 'error' | 'unauthenticated' | 'authenticated';

function getRouteState(auth: ReturnType<typeof useAuth>): RouteState {
  if (auth.isLoading) return 'loading';
  if (auth.error) return 'error';
  if (!auth.isAuthenticated) return 'unauthenticated';
  return 'authenticated';
}

function storeAccessToken(
  isAuthenticated: boolean,
  user: ReturnType<typeof useAuth>['user'],
): void {
  if (!isAuthenticated) return;
  if (!user) throw new Error('Access token was not available...');
  sessionStorage.setItem('access_token', user.access_token);
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const auth = useAuth();
  useLogger();

  useEffect(() => {
    storeAccessToken(auth.isAuthenticated, auth.user);
  }, [auth.isAuthenticated, auth.user]);

  const routeState = getRouteState(auth);
  if (routeState === 'loading') return <div>Loading...</div>;
  if (routeState === 'error') {
    return (
      <div>
        Oops... {auth.error?.message}
        <WaitNavigateAndReload />
      </div>
    );
  }
  if (routeState === 'unauthenticated') return <Navigate to="/" replace />;
  return (
    <>
      {children}
      <ExecutionHistoryLoader />
    </>
  );
};

export default PrivateRoute;
