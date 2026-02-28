import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BenchmarkControls } from 'route/benchmark/BenchmarkComponents';

describe('BenchmarkControls', () => {
  const defaultControlProps = {
    isRunning: false,
    hasStarted: false,
    hasStopped: false,
    iterations: 3,
    completedTasks: 0,
    completedTrials: 0,
    totalTasks: 5,
    onStart: jest.fn(),
    onContinue: jest.fn(),
    onRestart: jest.fn(),
    onStop: jest.fn(),
    onPurge: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [false, 0, 0, 5, 3, '0/15'],
    [true, 2, 6, 5, 3, '6/15'],
    [true, 5, 15, 5, 3, '15/15'],
    [true, 0, 0, 3, 3, '0/9'],
    [true, 0, 1, 5, 3, '1/15'],
  ])(
    'shows trial counter (hasStarted=%s, completedTasks=%s, completedTrials=%s, total=%s, iter=%s) as %s',
    (
      hasStarted,
      completedTasks,
      completedTrials,
      totalTasks,
      iterations,
      expected,
    ) => {
      render(
        <BenchmarkControls
          {...defaultControlProps}
          hasStarted={hasStarted}
          completedTasks={completedTasks}
          completedTrials={completedTrials}
          totalTasks={totalTasks}
          iterations={iterations}
        />,
      );
      expect(
        screen.getByText(`Trials Completed: ${expected}`),
      ).toBeInTheDocument();
    },
  );

  it('shows Start button when not running and not stopped', () => {
    render(<BenchmarkControls {...defaultControlProps} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('shows Stop button when running', () => {
    render(<BenchmarkControls {...defaultControlProps} isRunning={true} />);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('shows Continue button when stopped', () => {
    render(<BenchmarkControls {...defaultControlProps} hasStopped={true} />);
    expect(
      screen.getByRole('button', { name: 'Continue' }),
    ).toBeInTheDocument();
  });

  it('calls onStart when Start button is clicked', () => {
    const onStart = jest.fn();
    render(<BenchmarkControls {...defaultControlProps} onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalled();
  });

  it('calls onContinue when Continue button is clicked', () => {
    const onContinue = jest.fn();
    render(
      <BenchmarkControls
        {...defaultControlProps}
        hasStopped={true}
        onContinue={onContinue}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it.each([
    [
      'Stop',
      'isRunning',
      'Stop Benchmark?',
      /Are you sure you want to stop the benchmark/,
      'onStop',
    ],
    ['Restart', 'hasStarted', 'Restart Benchmark?', /restart/, 'onRestart'],
    [
      'Purge',
      'none',
      'Purge Benchmark Data?',
      /Are you sure you want to purge all benchmark data/,
      'onPurge',
    ],
  ])(
    'shows %s confirmation dialog and calls handler on confirm',
    (btnName, propKey, dialogTitle, dialogText, handlerKey) => {
      const handler = jest.fn();
      const props = {
        ...defaultControlProps,
        [handlerKey]: handler,
        ...(propKey === 'none' ? {} : { [propKey]: true }),
      };
      render(<BenchmarkControls {...props} />);

      fireEvent.click(screen.getByRole('button', { name: btnName }));
      expect(screen.getByText(dialogTitle)).toBeInTheDocument();
      expect(screen.getByText(dialogText)).toBeInTheDocument();

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: btnName }));
      expect(handler).toHaveBeenCalled();
    },
  );

  it.each([
    ['Stop', 'isRunning', 'onStop'],
    ['Restart', 'hasStarted', 'onRestart'],
    ['Purge', 'none', 'onPurge'],
  ])(
    'does not call %s handler when dialog is cancelled',
    (btnName, propKey, handlerKey) => {
      const handler = jest.fn();
      const props = {
        ...defaultControlProps,
        [handlerKey]: handler,
        ...(propKey === 'none' ? {} : { [propKey]: true }),
      };
      render(<BenchmarkControls {...props} />);

      fireEvent.click(screen.getByRole('button', { name: btnName }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it('disables Restart button when not started or when running', () => {
    const { rerender } = render(
      <BenchmarkControls {...defaultControlProps} hasStarted={false} />,
    );
    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();

    rerender(
      <BenchmarkControls
        {...defaultControlProps}
        hasStarted={true}
        isRunning={true}
      />,
    );
    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
  });

  it('disables Purge button when running', () => {
    render(<BenchmarkControls {...defaultControlProps} isRunning={true} />);
    expect(screen.getByRole('button', { name: 'Purge' })).toBeDisabled();
  });

  it('disables Start button when all tasks are complete', () => {
    render(
      <BenchmarkControls
        {...defaultControlProps}
        completedTasks={5}
        totalTasks={5}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('enables Start button when not all tasks are complete', () => {
    render(
      <BenchmarkControls
        {...defaultControlProps}
        completedTasks={3}
        totalTasks={5}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
  });
});
