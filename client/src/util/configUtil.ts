import { z } from 'zod';
import { wait } from 'util/auth/Authentication';

export type validationType = {
  value?: string;
  status?: number;
  error?: string;
};

const EnvironmentEnum = z.enum(['dev', 'local', 'prod', 'test']);
const PathString = z.string();
const ScopesString = z.literal('openid profile read_user read_repository api');

export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retries = 2,
): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (retries <= 0) {
      return Promise.reject(error);
    }
    await wait(1000);
    return retryFetch(url, options, retries - 1);
  }
}

export const getValidationResults = async (
  keysToValidate: string[],
): Promise<{
  [key: string]: validationType;
}> => {
  const allVerifications = {
    REACT_APP_ENVIRONMENT: Promise.resolve(
      parseField(EnvironmentEnum, window.env.REACT_APP_ENVIRONMENT),
    ),
    REACT_APP_URL: urlIsReachable(window.env.REACT_APP_URL),
    REACT_APP_URL_BASENAME: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_URL_BASENAME),
    ),
    REACT_APP_URL_DTLINK: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_URL_DTLINK),
    ),
    REACT_APP_URL_LIBLINK: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_URL_LIBLINK),
    ),
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP),
    ),
    REACT_APP_WORKBENCHLINK_VSCODE: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_VSCODE),
    ),
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB),
    ),
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: Promise.resolve(
      parseField(
        PathString,
        window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
      ),
    ),
    REACT_APP_CLIENT_ID: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_CLIENT_ID),
    ),
    REACT_APP_AUTH_AUTHORITY: urlIsReachable(
      window.env.REACT_APP_AUTH_AUTHORITY,
    ),
    REACT_APP_REDIRECT_URI: urlIsReachable(window.env.REACT_APP_REDIRECT_URI),
    REACT_APP_LOGOUT_REDIRECT_URI: urlIsReachable(
      window.env.REACT_APP_LOGOUT_REDIRECT_URI,
    ),
    REACT_APP_GITLAB_SCOPES: Promise.resolve(
      parseField(ScopesString, window.env.REACT_APP_GITLAB_SCOPES),
    ),
    REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: Promise.resolve(
      parseField(
        PathString,
        window.env.REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW,
      ),
    ),
    REACT_APP_WORKBENCHLINK_DT_PREVIEW: Promise.resolve(
      parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_DT_PREVIEW),
    ),
  };

  const verifications =
    keysToValidate.length === 0
      ? allVerifications
      : Object.fromEntries(
          keysToValidate
            .filter((key) => key in allVerifications)
            .map((key) => [
              key,
              allVerifications[key as keyof typeof allVerifications],
            ]),
        );

  const results = await Promise.all(
    Object.entries(verifications).map(async ([key, task]) => ({
      [key]: await task,
    })),
  );

  return results.reduce((acc, result) => ({ ...acc, ...result }), {});
};

async function opaqueRequest(url: string): Promise<validationType> {
  const urlValidation: validationType = {
    value: undefined,
    status: undefined,
    error: undefined,
  };
  try {
    await retryFetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: AbortSignal.timeout(2000),
    });
    urlValidation.value = url;
    urlValidation.status = 0;
  } catch (error) {
    urlValidation.error = `An error occurred when fetching ${url}: ${error}`;
    throw error;
  }
  return urlValidation;
}

async function corsRequest(url: string): Promise<validationType> {
  const urlValidation: validationType = {
    value: undefined,
    status: undefined,
    error: undefined,
  };
  try {
    const response = await retryFetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(2000),
    });
    const responseIsAcceptable = response.ok || response.redirected;
    if (!responseIsAcceptable) {
      urlValidation.error = `Unexpected response code ${response.status} from ${url}.`;
      throw new Error(urlValidation.error);
    }
    urlValidation.value = url;
    urlValidation.status = response.status;
  } catch (error) {
    urlValidation.error = `An error occurred when fetching ${url}: ${error}`;
    throw error;
  }
  return urlValidation;
}

export async function urlIsReachable(url: string): Promise<validationType> {
  try {
    return await corsRequest(url);
  } catch (_corsError) {
    try {
      return await opaqueRequest(url);
    } catch (opaqueError) {
      return {
        value: undefined,
        status: undefined,
        error: `Failed to fetch ${url} after multiple attempts: ${opaqueError instanceof Error ? opaqueError.message : opaqueError}`,
      };
    }
  }
}

const parseField = (
  parser: {
    safeParse: (value: string) => {
      success: boolean;
      error?: { message?: string };
    };
  },
  value: string,
): validationType => {
  const result = parser.safeParse(value);
  return result.success
    ? { error: undefined, value, status: undefined }
    : { error: result.error?.message, status: undefined, value: undefined };
};
