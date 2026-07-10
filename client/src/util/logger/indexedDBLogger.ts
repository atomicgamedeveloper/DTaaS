import { LogEvent } from 'util/logger/logEvent';
import {
  openDB,
  resetDBConnection as resetSharedDBConnection,
} from 'database/dbConnection';

const STORE_NAME = 'logs';
const LOGS_CHANGED_EVENT = 'dtaas:logs-changed';
const LOGS_CHANGED_CHANNEL = 'dtaas-workflow-logs';
export const MAX_LOG_BYTES = 25 * 1024 * 1024;

let changeChannel: BroadcastChannel | null = null;

function emitLocalLogChange(): void {
  globalThis.dispatchEvent(new Event(LOGS_CHANGED_EVENT));
}

function getChangeChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (changeChannel) return changeChannel;

  changeChannel = new BroadcastChannel(LOGS_CHANGED_CHANNEL);
  changeChannel.onmessage = emitLocalLogChange;
  return changeChannel;
}

function notifyLogChange(): void {
  emitLocalLogChange();
  getChangeChannel()?.postMessage(LOGS_CHANGED_EVENT);
}

function swallowRequestError(request: IDBRequest): void {
  request.onerror = (event) => {
    event.preventDefault();
  };
}

function estimateEventBytes(event: LogEvent): number {
  return new Blob([JSON.stringify(event)]).size;
}

// Cached running total of the logs store's approximate byte size
let cachedTotalBytes: number | null = null;

function pruneToByteBudget(store: IDBObjectStore, totalBytes: number): void {
  if (totalBytes <= MAX_LOG_BYTES) {
    cachedTotalBytes = totalBytes;
    return;
  }

  let remaining = totalBytes;
  const cursorReq = store.index('timestamp').openCursor();
  swallowRequestError(cursorReq);
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (!cursor || remaining <= MAX_LOG_BYTES) {
      cachedTotalBytes = remaining;
      return;
    }
    remaining -= estimateEventBytes(cursor.value as LogEvent);
    cursor.delete();
    cursor.continue();
  };
}

function withCurrentTotalBytes(
  store: IDBObjectStore,
  addedBytes: number,
  onTotal: (total: number) => void,
): void {
  if (cachedTotalBytes !== null) {
    onTotal(cachedTotalBytes + addedBytes);
    return;
  }
  const request = store.getAll();
  swallowRequestError(request);
  request.onsuccess = () => {
    const scanned = (request.result as LogEvent[]) || [];
    const total = scanned.reduce(
      (sum, scannedEvent) => sum + estimateEventBytes(scannedEvent),
      0,
    );
    onTotal(total + addedBytes);
  };
}

export async function addLog(event: LogEvent): Promise<void> {
  const db = await openDB();
  const eventBytes = estimateEventBytes(event);
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...event });
    withCurrentTotalBytes(store, eventBytes, (total) =>
      pruneToByteBudget(store, total),
    );

    tx.oncomplete = () => {
      notifyLogChange();
      resolve();
    };
    tx.onerror = () => reject(new Error('Failed to add log event'));
  });
}

export async function getAllLogs(): Promise<LogEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    tx.oncomplete = () => resolve(request.result || []);
    tx.onerror = () => reject(new Error('Failed to get log events'));
  });
}

export async function clearLogs(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    tx.oncomplete = () => {
      cachedTotalBytes = 0;
      notifyLogChange();
      resolve();
    };
    tx.onerror = () => reject(new Error('Failed to clear log events'));
  });
}

export function subscribeToLogChanges(listener: () => void): () => void {
  const handleLogChange = () => listener();
  globalThis.addEventListener(LOGS_CHANGED_EVENT, handleLogChange);
  getChangeChannel();
  return () =>
    globalThis.removeEventListener(LOGS_CHANGED_EVENT, handleLogChange);
}

export function resetDBConnection(): void {
  resetSharedDBConnection();
  changeChannel?.close();
  changeChannel = null;
  cachedTotalBytes = null;
}
