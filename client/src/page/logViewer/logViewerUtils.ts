import { LogEvent } from 'util/logger/logEvent';

function timestampValue(event: LogEvent): number {
  const parsed = Date.parse(event.timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toDisplayOrder(event: LogEvent) {
  const {
    timestamp,
    event: eventType,
    label,
    element,
    page,
    context,
    sessionId,
    userHash,
  } = event;
  return {
    timestamp,
    event: eventType,
    label,
    element,
    page,
    context,
    sessionId,
    userHash,
  };
}

export function sortLogsNewestFirst(entries: LogEvent[]): LogEvent[] {
  return [...entries].sort(
    (first, second) => timestampValue(second) - timestampValue(first),
  );
}

export function toJsonLines(entries: LogEvent[]): string {
  return entries.map((event) => JSON.stringify(event)).join('\n');
}

export function toDisplayJsonLines(entries: LogEvent[]): string {
  return entries
    .map((event) => JSON.stringify(toDisplayOrder(event)))
    .join('\n');
}

const NON_BREAKING_HYPHEN = '‑';

export function toWrappableJsonLines(entries: LogEvent[]): string {
  return toDisplayJsonLines(entries).replace(/-/g, NON_BREAKING_HYPHEN);
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

export function matchesFilter(event: LogEvent, query: string): boolean {
  return [
    event.event,
    event.label,
    event.element,
    event.page,
    ...Object.entries(event.context ?? {}).flat(),
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export function scheduleLogLoad(loadLogs: () => Promise<void>): () => void {
  const timer = globalThis.setTimeout(() => {
    loadLogs().catch(() => {});
  }, 0);
  return () => globalThis.clearTimeout(timer);
}

export function getCountText(
  displayedCount: number,
  totalCount: number,
  filtered: boolean,
): string {
  return filtered
    ? `${displayedCount} of ${totalCount} log entries`
    : `${totalCount} log entries`;
}

export function getDownloadLabel(filtered: boolean): string {
  return filtered ? 'Download Filtered JSONL' : 'Download All JSONL';
}

export function downloadJsonLines(entries: LogEvent[]): void {
  const jsonl = toJsonLines(entries);
  const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
  let url = '';
  try {
    url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dtaas-workflow-log-${new Date().toISOString().slice(0, 10)}.jsonl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
