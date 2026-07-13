import { useCallback, useEffect, useState } from 'react';
import { getAllLogs, subscribeToLogChanges } from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';
import { scheduleLogLoad } from 'page/logViewer/logViewerUtils';

interface UseLogsResult {
  logs: LogEvent[];
  loading: boolean;
  loadLogs: () => Promise<void>;
  setLogs: (logs: LogEvent[]) => void;
}

const LIVE_UPDATE_DEBOUNCE_MS = 250;

function useLogs(liveUpdate: boolean): UseLogsResult {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    const entries = await getAllLogs().catch(() => [] as LogEvent[]);
    setLogs(entries);
    setLoading(false);
  }, []);

  useEffect(() => scheduleLogLoad(loadLogs), [loadLogs]);

  useEffect(() => {
    if (!liveUpdate) return undefined;

    // Coalesce bursts of change events (a single click can log a click and
    // a change) into one full store re-read.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        loadLogs().catch(() => {});
      }, LIVE_UPDATE_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeToLogChanges(scheduleReload);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [liveUpdate, loadLogs]);

  return { logs, loading, loadLogs, setLogs };
}

export default useLogs;
