import * as React from 'react';
import { useEffect, useState } from 'react';
import { getValidationResults, validationType } from 'util/configUtil';
import { ConfigItem, loadingComponent } from './ConfigItems';
import { Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const DeveloperConfig = (validationResults: {
  [key: string]: validationType;
}): JSX.Element => {
  return (
    <Paper
      sx={{
        p: 2,
        width: 'min(60vw, 100%)',
        height: 'auto',
        marginTop: '2%',
        maxHeight: '75vh',
        minWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        marginLeft: 'auto',
        marginRight: 'auto',
        position: 'relative',
        overflow: 'auto',
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontSize: 'clamp(0.2rem, 4vw, 1.6rem)',
          padding: 'clamp(0, 4vw, 5%)',
        }}
      >
        {'Config verification'}
      </Typography>
      <div id="config-items">
        {Object.entries(window.env).map(([key, value]) => (
          <ConfigItem
            key={key}
            label={key}
            value={value!}
            validation={validationResults[key]}
          />
        ))}
      </div>
    </Paper>
  );
};

const UserConfig = (): JSX.Element => {
  const title: JSX.Element = (
    <>
      Invalid Application Configuration. Please contact the administrator of
      your DTaaS installation.
      <br />
      <a href="./config/verify" style={{ fontSize: '0.7em' }}>
        Inspect configuration
      </a>
    </>
  );
  return (
    <Paper
      sx={{
        p: 2,
        marginTop: '2%',
        width: 'min(60vw, 390px)',
        aspectRatio: '2 / 1',
        display: 'flex',
        flexDirection: 'column',
        marginLeft: 'auto',
        marginRight: 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontSize: 'clamp(0.2rem, 4vw, 1.6rem)',
          padding: 'clamp(0, 4vw, 5%)',
        }}
      >
        {title}
      </Typography>
    </Paper>
  );
};

const Config = (props: { role: string }) => {
  const [validationResults, setValidationResults] = useState<{
    [key: string]: validationType;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchValidationResults = async () => {
      const results = await getValidationResults([]);
      setValidationResults(results);
      setIsLoading(false);
    };
    fetchValidationResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.env]);

  const loading = loadingComponent();
  const configVerification =
    props.role === 'user' ? UserConfig() : DeveloperConfig(validationResults);

  const hasConfigErrors = Object.keys(window.env).some(
    (key: string | undefined) =>
      key !== undefined && validationResults[key]?.error !== undefined,
  );

  const shouldRedirect =
    !isLoading && props.role === 'user' && !hasConfigErrors;
  useEffect(() => {
    if (shouldRedirect) {
      navigate('/signin');
    }
  }, [isLoading, props.role, hasConfigErrors, navigate]);

  let displayedComponent = loading;

  if (!isLoading && !shouldRedirect) {
    displayedComponent = configVerification;
  }

  return displayedComponent;
};

export default Config;
