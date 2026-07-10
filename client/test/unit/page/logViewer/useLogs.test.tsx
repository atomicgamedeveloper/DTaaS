import { renderHook, waitFor } from '@testing-library/react';
import useLogs from 'page/logViewer/useLogs';
import * as indexedDBLogger from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';

jest.mock('util/logger/indexedDBLogger');

const mockGetAllLogs = indexedDBLogger.getAllLogs as jest.MockedFunction<
  typeof indexedDBLogger.getAllLogs
>;
const mockSubscribeToLogChanges =
  indexedDBLogger.subscribeToLogChanges as jest.MockedFunction<
    typeof indexedDBLogger.subscribeToLogChanges
  >;

const mockEvents: LogEvent[] = [
  {
    sessionId: 'sess-1',
    userHash: 'hash-1',
    timestamp: '2026-03-24T20:00:00.000Z',
    event: 'click',
    page: '/library',
    element: 'tab',
    label: 'Functions',
    context: {},
  },
];

describe('useLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllLogs.mockResolvedValue(mockEvents);
    mockSubscribeToLogChanges.mockReturnValue(jest.fn());
  });

  it('schedules only one initial load when live update starts enabled', async () => {
    renderHook(() => useLogs(true));

    await waitFor(() => {
      expect(mockGetAllLogs).toHaveBeenCalledTimes(1);
    });
    expect(mockSubscribeToLogChanges).toHaveBeenCalledTimes(1);
  });
});
