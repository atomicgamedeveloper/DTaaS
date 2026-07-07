import { ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import LogEntryCard from 'page/logViewer/LogEntryCard';
import RawLogView from 'page/logViewer/RawLogView';
import EmptyState from 'page/logViewer/EmptyState';
import { LogEvent } from 'util/logger/logEvent';

interface LogViewerContentProps {
  loading: boolean;
  entries: LogEvent[];
  rawView: boolean;
  filtered: boolean;
}

function renderEntries(
  entries: LogEvent[],
  rawView: boolean,
  filtered: boolean,
): ReactNode {
  if (entries.length === 0) return <EmptyState filtered={filtered} />;
  if (rawView) return <RawLogView entries={entries} />;
  return entries.map((entry, index) => (
    <LogEntryCard key={`${entry.timestamp}-${index}`} entry={entry} />
  ));
}

function LogViewerContent({
  loading,
  entries,
  rawView,
  filtered,
}: Readonly<LogViewerContentProps>) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          minHeight: 320,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      data-testid="log-content"
      sx={{
        backgroundColor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
        p: 2,
        borderRadius: 1,
        height: '60vh',
        minHeight: 320,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {renderEntries(entries, rawView, filtered)}
    </Box>
  );
}

export default LogViewerContent;
