import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from 'store/store';
import {
  initLogger,
  isLoggerInitialized,
  log,
  logNavigation,
} from 'util/logger/logger';
import type { LogContext, LogEventType } from 'util/logger/logEvent';

const LOGGED_EVENT_TYPES: readonly LogEventType[] = ['click', 'change'];

function findLoggerElement(target: EventTarget | null): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el !== document.documentElement) {
    if (el.dataset?.loggerElement) return el;
    el = el.parentElement;
  }
  return null;
}

function isLogContext(value: unknown): value is LogContext {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseContext(raw: string | undefined): LogContext {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isLogContext(parsed) ? parsed : {};
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Logger: failed to parse data-logger-context', raw, err);
    return {};
  }
}

function getLoggerUsername(stateUsername: string | undefined): string {
  return stateUsername ?? sessionStorage.getItem('username') ?? '';
}

function startLogger(
  username: string,
  initRef: { current: boolean },
  onReady: () => void,
): void {
  if (!username || initRef.current) return;
  initLogger(username)
    .then(() => {
      initRef.current = true;
      onReady();
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('Logger: init failed, will retry on next render', err);
    });
}

function isFormControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function getChangedValue(
  el: HTMLElement,
  target: EventTarget | null,
): string | null {
  // Value capture is opt-in: an element must explicitly request it, since
  // any future tagged field (e.g. a token/API-key input) would otherwise
  // have its value logged by default.
  if (el.dataset.loggerCaptureValue !== 'true') return null;
  if (target instanceof HTMLInputElement) {
    // Never record secret values, even if a password field gets tagged.
    if (target.type === 'password') return null;
    if (target.type === 'checkbox' || target.type === 'radio') {
      return String(target.checked);
    }
    return target.value;
  }
  if (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return target.value;
  }
  return null;
}

function logDomEvent(event: Event): void {
  if (!isLoggerInitialized()) return;
  if (event.type === 'click' && isFormControl(event.target)) return;
  const el = findLoggerElement(event.target);
  if (!el) return;

  const element = el.dataset.loggerElement ?? '';
  const label = el.dataset.loggerLabel ?? el.textContent?.trim() ?? '';
  const context = parseContext(el.dataset.loggerContext);
  const page = globalThis.location.pathname;

  if (event.type === 'change') {
    const value = getChangedValue(el, event.target);
    if (value !== null) context.value = value;
  }

  log({ event: event.type as LogEventType, page, element, label, context });
}

function registerDomEventLogger(handleEvent: (event: Event) => void) {
  LOGGED_EVENT_TYPES.forEach((type) =>
    document.addEventListener(type, handleEvent, true),
  );
  return () =>
    LOGGED_EVENT_TYPES.forEach((type) =>
      document.removeEventListener(type, handleEvent, true),
    );
}

function useLoggerReady(loggingEnabled: boolean, username: string): boolean {
  const initRef = useRef(false);
  const [ready, setReady] = useState(isLoggerInitialized());

  useEffect(() => {
    if (!loggingEnabled) return;
    startLogger(username, initRef, () => setReady(true));
  }, [loggingEnabled, username]);

  return ready;
}

function useLoggerNavigation(loggingEnabled: boolean, ready: boolean): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (loggingEnabled && ready) logNavigation(pathname);
  }, [loggingEnabled, ready, pathname]);
}

function useLoggerDomEvents(loggingEnabled: boolean): void {
  const handleEvent = useCallback(
    (event: Event) => {
      if (!loggingEnabled) return;
      logDomEvent(event);
    },
    [loggingEnabled],
  );

  useEffect(() => {
    if (!loggingEnabled) return undefined;
    return registerDomEventLogger(handleEvent);
  }, [handleEvent, loggingEnabled]);
}

// eslint-disable-next-line import/prefer-default-export
export function useLogger(): void {
  const stateUsername = useSelector((state: RootState) => state.auth.userName);
  const loggingEnabled = useSelector(
    (state: RootState) => state.settings.loggingEnabled,
  );
  const username = getLoggerUsername(stateUsername);

  const ready = useLoggerReady(loggingEnabled, username);
  useLoggerNavigation(loggingEnabled, ready);
  useLoggerDomEvents(loggingEnabled);
}
