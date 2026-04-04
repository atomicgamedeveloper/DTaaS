if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'test',
    REACT_APP_URL: 'http://localhost/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
    REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
    REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
    REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

    REACT_APP_CLIENT_ID: 'b19ed42b32e4976ed15572e0ecfb70407f8e78d427d9bfddcb42dc7968103a04',
    REACT_APP_AUTH_AUTHORITY: 'https://dtaas-digitaltwin.com/gitlab',
    REACT_APP_REDIRECT_URI: 'http://localhost/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
  };
};
