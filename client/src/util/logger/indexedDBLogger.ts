import { LogEvent } from 'util/logger/logEvent';
import {
  openDB,
  resetDBConnection as resetSharedDBConnection,
} from 'database/dbConnection';

const STORE_NAME = 'logs';
const LOGS_CHANGED_EVENT = 'dtaas:logs-changed';
const LOGS_CHANGED_CHANNEL = 'dtaas-workflow-logs';

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

export async function addLog(event: LogEvent): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...event });

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
}
