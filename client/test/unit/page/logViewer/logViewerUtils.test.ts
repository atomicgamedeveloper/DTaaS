import { matchesFilter } from 'page/logViewer/logViewerUtils';
import {
  MAX_LOG_CONTEXT_DEPTH,
  MAX_LOG_CONTEXT_ENTRIES,
} from 'util/logger/contextUtils';
import { LogContext, LogEvent } from 'util/logger/logEvent';

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

  it('does not search beyond the context depth cap', () => {
    let context: LogContext = { value: 'hidden' };
    for (let index = 0; index < MAX_LOG_CONTEXT_DEPTH + 3; index += 1) {
      context = { child: context };
    }

    expect(matchesFilter(buildEvent(context), 'hidden')).toBe(false);
  });

  it('does not search beyond the context entry cap', () => {
    const context = {
      values: Array.from(
        { length: MAX_LOG_CONTEXT_ENTRIES + 5 },
        (_, index) => `value${index}`,
      ),
    };

    expect(
      matchesFilter(buildEvent(context), `value${MAX_LOG_CONTEXT_ENTRIES + 4}`),
    ).toBe(false);
  });
});
