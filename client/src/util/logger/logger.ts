import { createLogEvent } from 'util/logger/logEvent';
import type {
  LogContext,
  LogContextValue,
  LogEvent,
  LogEventType,
  PageTransition,
} from 'util/logger/logEvent';
import { hashUsername } from 'util/logger/hashUtils';
import { getSessionId } from 'util/logger/sessionManager';
import { logToConsole } from 'util/logger/consoleLogger';
import { sendBeacon } from 'util/logger/beaconLogger';
import { addLog } from 'util/logger/indexedDBLogger';
import { getLoggingEnabled } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';

const MAX_CONTEXT_VALUE_LENGTH = 1024;

let userHash = '';
let sessionId = '';
let loggerUrl = '';
let initialized = false;
let lastNavigationPage = '';

function truncateContextValue(value: LogContextValue): LogContextValue {
  if (typeof value === 'string')
    return value.slice(0, MAX_CONTEXT_VALUE_LENGTH);
  if (Array.isArray(value)) return value.map(truncateContextValue);
  if (value && typeof value === 'object') return truncateContext(value);
  return value;
}

function truncateContext(context: LogContext): LogContext {
  const truncated: LogContext = {};
  Object.entries(context).forEach(([key, value]) => {
    truncated[key] = truncateContextValue(value);
  });
  return truncated;
}

export interface LogInput {
  readonly event: LogEventType;
  readonly page: string;
  readonly pageTransition?: PageTransition;
  readonly element: string;
  readonly label: string;
  readonly context?: LogContext;
}

export async function initLogger(username: string): Promise<void> {
  sessionId = getSessionId();
  userHash = await hashUsername(username);
  loggerUrl = globalThis.env?.LOGGER_URL ?? '';
  initialized = true;
}

export function isLoggerInitialized(): boolean {
  return initialized;
}

export function log({
  event,
  page,
  pageTransition,
  element,
  label,
  context = {},
}: LogInput): LogEvent | null {
  if (!initialized || !getLoggingEnabled()) return null;

  const logEvent = createLogEvent({
    sessionId,
    userHash,
    event,
    page,
    pageTransition,
    element,
    label,
    context: truncateContext(context),
  });
  logToConsole(logEvent);
  addLog(logEvent).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('Logger: failed to persist event to IndexedDB', err);
  });
  if (loggerUrl && !sendBeacon(loggerUrl, logEvent)) {
    // eslint-disable-next-line no-console
    console.warn('Logger: failed to send beacon');
  }
  return logEvent;
}

export function logNavigation(page: string): LogEvent | null {
  if (page === lastNavigationPage) return null;
  const pageTransition =
    lastNavigationPage && lastNavigationPage !== page
      ? { src: lastNavigationPage, target: page }
      : undefined;

  const logEvent = log({
    event: 'navigation',
    page,
    pageTransition,
    element: 'page',
    label: page,
  });
  if (logEvent) {
    lastNavigationPage = page;
  }
  return logEvent;
}

export function logDismiss(
  element: string,
  label: string,
  reason?: string,
  context: LogContext = {},
): LogEvent | null {
  return log({
    event: 'dismiss',
    page: globalThis.location.pathname,
    element,
    label,
    context: reason ? { ...context, reason } : context,
  });
}

export function resetLogger(): void {
  userHash = '';
  sessionId = '';
  loggerUrl = '';
  initialized = false;
  lastNavigationPage = '';
}
