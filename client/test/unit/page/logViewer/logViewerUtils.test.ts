import { matchesFilter } from 'page/logViewer/logViewerUtils';
import { LogEvent } from 'util/logger/logEvent';

function buildEvent(context: LogEvent['context']): LogEvent {
  return {
    sessionId: 'sess-1',
    userHash: 'hash-1',
    timestamp: '2026-03-24T20:00:00.000Z',
    event: 'click',
    page: '/library',
    element: 'button',
    label: 'Create',
    context,
  };
}

describe('matchesFilter', () => {
  it('matches keys and values nested inside context objects', () => {
    const event = buildEvent({
      dt: { name: 'my-digital-twin' },
      measurement: { count: 5 },
    });

    expect(matchesFilter(event, 'my-digital-twin')).toBe(true);
    expect(matchesFilter(event, 'measurement')).toBe(true);
  });

  it('matches values nested inside context arrays', () => {
    const event = buildEvent({ tags: ['alpha', { nested: 'beta' }] });

    expect(matchesFilter(event, 'alpha')).toBe(true);
    expect(matchesFilter(event, 'beta')).toBe(true);
  });

  it('does not match text absent from the event or its context', () => {
    const event = buildEvent({ dt: { name: 'my-digital-twin' } });

    expect(matchesFilter(event, 'unrelated')).toBe(false);
  });
});
