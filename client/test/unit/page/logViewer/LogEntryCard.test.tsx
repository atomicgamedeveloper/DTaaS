import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogEntryCard from 'page/logViewer/LogEntryCard';
import { LogEvent } from 'util/logger/logEvent';

const baseEntry: LogEvent = {
  sessionId: 'session-1',
  userHash: 'hash',
  timestamp: '2026-07-07T17:47:02.000Z',
  event: 'click',
  page: '/insights/log',
  element: 'button',
  label: 'Toggle Raw Logs',
  context: {},
};

describe('LogEntryCard', () => {
  it('flattens nested context values into dotted-path chips instead of stringifying objects', () => {
    render(
      <LogEntryCard
        entry={{
          ...baseEntry,
          context: { log: { button: 'toggle-raw-view', rawView: true } },
        }}
      />,
    );

    expect(screen.getByText('log.button: toggle-raw-view')).toBeInTheDocument();
    expect(screen.getByText('log.rawView: true')).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('renders array context values as JSON instead of stringifying them', () => {
    render(
      <LogEntryCard
        entry={{
          ...baseEntry,
          context: { dt: { name: 'hello', history: ['2026-07-07T00:00:00.000Z'] } },
        }}
      />,
    );

    expect(
      screen.getByText('dt.history: ["2026-07-07T00:00:00.000Z"]'),
    ).toBeInTheDocument();
  });

  it('renders flat primitive context values unchanged', () => {
    render(
      <LogEntryCard
        entry={{ ...baseEntry, context: { value: 'enabled' } }}
      />,
    );

    expect(screen.getByText('value: enabled')).toBeInTheDocument();
  });
});
