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

    const unsubscribe = subscribeToLogChanges(loadLogs);
    return unsubscribe;
  }, [liveUpdate, loadLogs]);

  return { logs, loading, loadLogs, setLogs };
}

export default useLogs;
