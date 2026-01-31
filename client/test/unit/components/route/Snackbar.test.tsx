import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDispatch, useSelector } from 'react-redux';
import CustomSnackbar from 'components/route/Snackbar';
import { hideSnackbar } from 'store/snackbar.slice';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('store/snackbar.slice', () => ({
  hideSnackbar: jest.fn(() => ({ type: 'snackbar/hideSnackbar' })),
}));

// Track calls to the mock Snackbar
const mockSnackbarCalls: Array<{
  open: boolean;
  autoHideDuration?: number;
  onClose?: (event: React.SyntheticEvent | Event, reason?: string) => void;
}> = [];

// Mock MUI Snackbar to capture onClose handler
jest.mock('@mui/material/Snackbar', () => {
  const MockSnackbar = (props: {
    children: React.ReactNode;
    onClose?: (event: React.SyntheticEvent | Event, reason?: string) => void;
    open: boolean;
    autoHideDuration?: number;
  }) => {
    mockSnackbarCalls.push({
      open: props.open,
      autoHideDuration: props.autoHideDuration,
      onClose: props.onClose,
    });
    if (!props.open) return null;
    return (
      <div data-testid="mock-snackbar">
        {props.children}
        <button
          data-testid="trigger-clickaway"
          onClick={(e) => props.onClose?.(e, 'clickaway')}
        >
          Clickaway
        </button>
        <button
          data-testid="trigger-timeout"
          onClick={(e) => props.onClose?.(e, 'timeout')}
        >
          Timeout
        </button>
        <button
          data-testid="trigger-escapeKeyDown"
          onClick={(e) => props.onClose?.(e, 'escapeKeyDown')}
        >
          Escape
        </button>
      </div>
    );
  };
  return {
    __esModule: true,
    default: MockSnackbar,
  };
});

jest.mock('@mui/material/Alert', () => {
  const MockAlert = (props: {
    children: React.ReactNode;
    onClose?: () => void;
    severity?: string;
  }) => (
    <div
      role="alert"
      data-testid="mock-alert"
      data-severity={props.severity}
      className={`MuiAlert-standard${props.severity ? props.severity.charAt(0).toUpperCase() + props.severity.slice(1) : 'Success'}`}
    >
      {props.children}
      {props.onClose && (
        <button aria-label="close" onClick={props.onClose}>
          Close
        </button>
      )}
    </div>
  );
  return {
    __esModule: true,
    default: MockAlert,
  };
});

describe('CustomSnackbar', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSnackbarCalls.length = 0;
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
  });

  const renderSnackbar = (snackbarState = {}) => {
    const defaultState = {
      open: true,
      message: 'Test message',
      severity: 'success' as const,
    };
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue({
      ...defaultState,
      ...snackbarState,
    });
    return render(<CustomSnackbar />);
  };

  it('renders the Snackbar with the correct message', () => {
    renderSnackbar({ message: 'Custom test message' });
    expect(screen.getByText('Custom test message')).toBeInTheDocument();
  });

  it('renders the Alert with correct severity', () => {
    renderSnackbar({ severity: 'error' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardError');
  });

  it('does not render when open is false', () => {
    renderSnackbar({ open: false });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not dispatch hideSnackbar on clickaway', () => {
    renderSnackbar();

    mockDispatch.mockClear();

    // Trigger the clickaway event through our mock
    const clickawayButton = screen.getByTestId('trigger-clickaway');
    fireEvent.click(clickawayButton);

    // Should NOT dispatch hideSnackbar when reason is 'clickaway'
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches hideSnackbar on timeout', () => {
    renderSnackbar();

    mockDispatch.mockClear();

    // Trigger the timeout event through our mock
    const timeoutButton = screen.getByTestId('trigger-timeout');
    fireEvent.click(timeoutButton);

    // Should dispatch hideSnackbar when reason is 'timeout'
    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar());
  });

  it('dispatches hideSnackbar on escape key down', () => {
    renderSnackbar();

    mockDispatch.mockClear();

    // Trigger the escapeKeyDown event through our mock
    const escapeButton = screen.getByTestId('trigger-escapeKeyDown');
    fireEvent.click(escapeButton);

    // Should dispatch hideSnackbar when reason is 'escapeKeyDown'
    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar());
  });

  it('dispatches hideSnackbar when close button is clicked', () => {
    renderSnackbar();

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar());
  });

  it('uses correct selector to get snackbar state', () => {
    const mockSnackbarState = {
      open: true,
      message: 'Selector test',
      severity: 'warning' as const,
    };
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue(
      mockSnackbarState,
    );

    render(<CustomSnackbar />);

    expect(useSelector).toHaveBeenCalledWith(expect.any(Function));

    // Verify the selector function extracts snackbar state correctly
    const selectorFn = (useSelector as jest.MockedFunction<typeof useSelector>)
      .mock.calls[0][0];
    const result = selectorFn({ snackbar: mockSnackbarState });
    expect(result).toEqual(mockSnackbarState);
  });

  it('renders with different severity levels', () => {
    const severities = ['success', 'error', 'warning', 'info'] as const;

    severities.forEach((severity) => {
      const { unmount } = renderSnackbar({ severity });
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass(
        `MuiAlert-standard${severity.charAt(0).toUpperCase() + severity.slice(1)}`,
      );
      unmount();
    });
  });

  it('passes autoHideDuration to Snackbar', () => {
    renderSnackbar();

    // Verify Snackbar was called with autoHideDuration prop
    expect(mockSnackbarCalls.length).toBeGreaterThan(0);
    expect(mockSnackbarCalls[0].autoHideDuration).toBe(6000);
  });
});
