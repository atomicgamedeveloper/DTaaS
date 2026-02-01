import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import { testLayout } from 'test/integration/Routes/routes.testUtil';

const setup = () => setupIntegrationTest('/admin/measure');

describe('Benchmark Page', () => {
  beforeEach(async () => {
    await setup();
  });

  it('renders the Benchmark page and Layout correctly', async () => {
    await testLayout();

    const mainHeading = screen.getByRole('heading', { level: 5 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Digital Twin Benchmark/);
  });

  it('displays the benchmark table with headers', async () => {
    expect(
      screen.getByRole('columnheader', { name: 'Data' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Task' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Status' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Average Duration' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Trials' }),
    ).toBeInTheDocument();
  });

  it('displays all benchmark tasks', async () => {
    expect(
      screen.getByText('Valid Setup Digital Twin Execution'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Multiple Identical Digital Twins Simultaneously'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Multiple different Digital Twins Simultaneously'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Different Runners same Digital Twin'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Different Runners different Digital Twins'),
    ).toBeInTheDocument();
  });

  it('displays control buttons', async () => {
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purge' })).toBeInTheDocument();
  });

  it('displays iterations input field', async () => {
    const iterationsInput = screen.getByLabelText('Trials');
    expect(iterationsInput).toBeInTheDocument();
    expect(iterationsInput).toHaveValue(3);
  });

  it('displays secondary runner tag input field', async () => {
    const runnerTagInput = screen.getByLabelText('Secondary Runner Tag');
    expect(runnerTagInput).toBeInTheDocument();
  });

  it('allows changing the iterations value', async () => {
    const iterationsInput = screen.getByLabelText('Trials');

    await userEvent.tripleClick(iterationsInput);
    await userEvent.keyboard('5');

    expect(iterationsInput).toHaveValue(5);
  });

  it('allows changing the secondary runner tag value', async () => {
    const runnerTagInput = screen.getByLabelText('Secondary Runner Tag');

    await userEvent.clear(runnerTagInput);
    await userEvent.type(runnerTagInput, 'custom-runner');

    expect(runnerTagInput).toHaveValue('custom-runner');
  });

  it('disables Restart button when benchmark has not started', async () => {
    const restartButton = screen.getByRole('button', { name: 'Restart' });
    expect(restartButton).toBeDisabled();
  });

  it('shows all tasks with NOT_STARTED status initially', async () => {
    // NOT_STARTED status is displayed as '—' in the UI
    const statusCells = screen.getAllByRole('cell');
    const dashStatuses = statusCells.filter((cell) =>
      cell.textContent?.includes('—'),
    );
    expect(dashStatuses.length).toBeGreaterThanOrEqual(5);
  });

  it('displays task descriptions', async () => {
    expect(
      screen.getByText(
        'Running the Hello World Digital Twin with current setup.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Running the Hello World Digital Twin twice at once.'),
    ).toBeInTheDocument();
  });

  it('displays helper text about the benchmark', async () => {
    expect(
      screen.getByText(
        /Run performance benchmarks for Digital Twin executions/,
      ),
    ).toBeInTheDocument();
  });

  it('shows tooltip when hovering over iterations input', async () => {
    const iterationsInput = screen.getByLabelText('Trials');

    await userEvent.hover(iterationsInput);

    await waitFor(() => {
      expect(
        screen.getByRole('tooltip', {
          name: /Number of times each task is repeated/,
        }),
      ).toBeInTheDocument();
    });
  });

  it('shows tooltip when hovering over secondary runner tag input', async () => {
    const runnerTagInput = screen.getByLabelText('Secondary Runner Tag');

    await userEvent.hover(runnerTagInput);

    await waitFor(() => {
      expect(
        screen.getByRole('tooltip', {
          name: /Runner tag used for multi-runner tests/,
        }),
      ).toBeInTheDocument();
    });
  });
});
