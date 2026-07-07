import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClearLogsDialog from 'page/logViewer/ClearLogsDialog';
import { logDismiss } from 'util/logger/logger';

jest.mock('util/logger/logger', () => ({
  logDismiss: jest.fn(),
}));

describe('ClearLogsDialog', () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();

  it('logs the dismissal and cancels when dismissed via Escape', () => {
    render(
      <ClearLogsDialog
        open
        logCount={3}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(logDismiss).toHaveBeenCalledWith(
      'dialog',
      'Clear All Logs',
      'escapeKeyDown',
      { log: { count: 3 } },
    );
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
