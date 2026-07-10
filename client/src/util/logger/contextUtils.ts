import type { LogContext, LogContextValue } from 'util/logger/logEvent';

export const MAX_LOG_CONTEXT_DEPTH = 6;
export const MAX_LOG_CONTEXT_ENTRIES = 100;
export const MAX_LOG_CONTEXT_VALUE_LENGTH = 1024;

const MAX_DEPTH_VALUE = '[context depth limit reached]';

interface WalkBudget {
  remainingEntries: number;
}

export interface FlattenedLogContextEntry {
  key: string;
  value: string;
}

function isContextObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function useContextEntry(budget: WalkBudget): boolean {
  if (budget.remainingEntries <= 0) return false;
  budget.remainingEntries -= 1;
  return true;
}

function sanitizeContextArray(
  values: unknown[],
  depth: number,
  budget: WalkBudget,
): LogContextValue[] {
  const sanitized: LogContextValue[] = [];
  values.every((value) => {
    if (!useContextEntry(budget)) return false;
    sanitized.push(sanitizeContextValue(value, depth - 1, budget));
    return true;
  });
  return sanitized;
}

function sanitizeContextObject(
  value: Record<string, unknown>,
  depth: number,
  budget: WalkBudget,
): LogContext {
  const sanitized: LogContext = {};
  Object.entries(value).every(([key, nested]) => {
    if (!useContextEntry(budget)) return false;
    sanitized[key] = sanitizeContextValue(nested, depth - 1, budget);
    return true;
  });
  return sanitized;
}

function sanitizeContextValue(
  value: unknown,
  depth: number,
  budget: WalkBudget,
): LogContextValue {
  if (typeof value === 'string')
    return value.slice(0, MAX_LOG_CONTEXT_VALUE_LENGTH);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null)
    return value;
  if (depth <= 0) return MAX_DEPTH_VALUE;
  if (Array.isArray(value)) return sanitizeContextArray(value, depth, budget);
  if (isContextObject(value))
    return sanitizeContextObject(value, depth, budget);
  const stringified =
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint' ||
    value === undefined
      ? String(value)
      : JSON.stringify(value);
  return stringified.slice(0, MAX_LOG_CONTEXT_VALUE_LENGTH);
}

export function sanitizeLogContext(value: unknown): LogContext {
  if (!isContextObject(value)) return {};
  return sanitizeContextObject(value, MAX_LOG_CONTEXT_DEPTH, {
    remainingEntries: MAX_LOG_CONTEXT_ENTRIES,
  });
}

function formatContextValue(value: LogContextValue): string {
  return typeof value === 'object' && value !== null
    ? JSON.stringify(value)
    : String(value);
}

function flattenContextValue(
  key: string,
  value: LogContextValue,
  depth: number,
  budget: WalkBudget,
): FlattenedLogContextEntry[] {
  if (isContextObject(value)) {
    if (depth <= 1) return [{ key, value: MAX_DEPTH_VALUE }];
    return flattenContextObject(value, depth - 1, budget, key);
  }
  return [{ key, value: formatContextValue(value) }];
}

function flattenContextObject(
  context: LogContext,
  depth: number,
  budget: WalkBudget,
  prefix = '',
): FlattenedLogContextEntry[] {
  return Object.entries(context).flatMap(([key, value]) => {
    if (!useContextEntry(budget)) return [];
    const path = prefix ? `${prefix}.${key}` : key;
    return flattenContextValue(path, value, depth, budget);
  });
}

export function flattenLogContext(
  context: LogContext,
): FlattenedLogContextEntry[] {
  return flattenContextObject(context, MAX_LOG_CONTEXT_DEPTH, {
    remainingEntries: MAX_LOG_CONTEXT_ENTRIES,
  });
}

function collectTextValue(
  value: LogContextValue,
  depth: number,
  budget: WalkBudget,
): string[] {
  if (value === null || depth <= 0) return [];
  if (Array.isArray(value)) return collectTextArray(value, depth, budget);
  if (isContextObject(value)) return collectTextObject(value, depth, budget);
  return [String(value)];
}

function collectTextArray(
  values: LogContextValue[],
  depth: number,
  budget: WalkBudget,
): string[] {
  return values.flatMap((value) =>
    useContextEntry(budget) ? collectTextValue(value, depth - 1, budget) : [],
  );
}

function collectTextObject(
  context: LogContext,
  depth: number,
  budget: WalkBudget,
): string[] {
  return Object.entries(context).flatMap(([key, value]) =>
    useContextEntry(budget)
      ? [key, ...collectTextValue(value, depth - 1, budget)]
      : [],
  );
}

export function collectLogContextText(context: LogContext): string[] {
  return collectTextObject(context, MAX_LOG_CONTEXT_DEPTH, {
    remainingEntries: MAX_LOG_CONTEXT_ENTRIES,
  });
}
