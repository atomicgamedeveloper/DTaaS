import '@testing-library/jest-dom';
import {
  screen,
  fireEvent,
  act,
  waitFor,
  within,
  cleanup,
} from '@testing-library/react';
import SettingsForm from 'route/account/SettingsForm';
import {
  DEFAULT_SETTINGS,
  setGroupName,
  resetToDefaults,
  setCommonLibraryProjectName,
  setDTDirectory,
  setRunnerTag,
  setBranchName,
  DEFAULT_MEASUREMENT,
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
} from 'store/settings.slice';
import { useSelector, useDispatch } from 'react-redux';
import { renderWithRouter } from 'test/unit/unit.testUtil';

jest.mock('routes', () => ({ __esModule: true, default: [] }));

jest.mock('model/backend/util/init', () => ({
  fetchDigitalTwins: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.useFakeTimers();

const mockedUseSelector = useSelector as unknown as jest.Mock;
const mockedUseDispatch = useDispatch as unknown as jest.Mock;

describe('SettingsForm', () => {
  const mockDispatch = jest.fn();

  afterEach(cleanup);

  beforeEach(() => {
    mockDispatch.mockClear();
    mockedUseSelector.mockImplementation((selector) =>
      selector({
        settings: { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT },
        digitalTwin: {
          digitalTwin: {
            [DEFAULT_MEASUREMENT.primaryDTName]: {},
            [DEFAULT_MEASUREMENT.secondaryDTName]: {},
          },
        },
      }),
    );
    mockedUseDispatch.mockReturnValue(mockDispatch);
    renderWithRouter(<SettingsForm />, { route: '/private' });
  });

  it('renders form fields', () => {
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dt directory/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/common library/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^runner tag$/i)).toBeInTheDocument();
  });

  it('updates local state on input change', () => {
    const input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: 'new-group' } });
    expect(input).toHaveValue('new-group');
  });

  it('saves settings when save button clicked', () => {
    // Change form fields
    let input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: 'new-group' } });
    input = screen.getByLabelText(/common library project name/i);
    fireEvent.change(input, { target: { value: 'new-common-library' } });
    input = screen.getByLabelText(/dt directory/i);
    fireEvent.change(input, { target: { value: 'new-dt-directory' } });
    input = screen.getByLabelText(/^runner tag$/i);
    fireEvent.change(input, { target: { value: 'new-runner-tag' } });
    input = screen.getByLabelText(/branch name/i);
    fireEvent.change(input, { target: { value: 'new-branch-name' } });

    // Click the save settings button
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    // Dispatch has been called with the new values
    expect(mockDispatch).toHaveBeenCalledWith(setGroupName('new-group'));
    expect(mockDispatch).toHaveBeenCalledWith(
      setCommonLibraryProjectName('new-common-library'),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setDTDirectory('new-dt-directory'),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setRunnerTag('new-runner-tag'));
    expect(mockDispatch).toHaveBeenCalledWith(setBranchName('new-branch-name'));
  });

  it('shows success notification after save and auto-hides', async () => {
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(
      await screen.findByText(/settings saved successfully/i),
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    await waitFor(() =>
      expect(
        screen.queryByText(/settings saved successfully/i),
      ).not.toBeInTheDocument(),
    );
  });

  it('close button hides the notification immediately', async () => {
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    const alert = await screen.findByRole('alert');

    const closeButton = within(alert).getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });

  it('only dispatches actions for changed fields', () => {
    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: 'new-group' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(setGroupName('new-group'));
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringMatching(
          /setDTDirectory|setCommonLibraryProjectName|setRunnerTag/,
        ),
      }),
    );
  });

  it('resets to defaults when reset button clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

    expect(mockDispatch).toHaveBeenCalledWith(resetToDefaults());
  });

  it('shows "Settings reset to defaults" message when reset is clicked', async () => {
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

    expect(
      await screen.findByText(/settings reset to defaults/i),
    ).toBeInTheDocument();
  });

  it('shows error when required field is empty', () => {
    const input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByText('Group name is required')).toBeInTheDocument();
  });

  it('shows error when required field is whitespace only', () => {
    const input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByText('Group name is required')).toBeInTheDocument();
  });

  it('shows error when trials field is empty', () => {
    const input = screen.getByLabelText(/trial number/i);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByText(/trial number is required/i)).toBeInTheDocument();
  });

  it('shows error when trials value is not a number', () => {
    const input = screen.getByLabelText(/trial number/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByText(/trial number is required/i)).toBeInTheDocument();
  });

  it('shows error when trials value is less than 1', () => {
    const input = screen.getByLabelText(/trial number/i);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByText(/trial number is required/i)).toBeInTheDocument();
  });

  it('clears field error when user starts retyping', () => {
    const input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    expect(screen.getByText('Group name is required')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'x' } });
    expect(
      screen.queryByText('Group name is required'),
    ).not.toBeInTheDocument();
  });

  it('dispatches setTrials when trials value changes', () => {
    const input = screen.getByLabelText(/trial number/i);
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(setTrials(5));
  });

  it('dispatches setSecondaryRunnerTag when secondary runner tag changes', () => {
    const input = screen.getByLabelText(/measurement secondary runner tag/i);
    fireEvent.change(input, { target: { value: 'macos' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(setSecondaryRunnerTag('macos'));
  });

  it('shows error when secondary runner tag is empty', () => {
    const input = screen.getByLabelText(/measurement secondary runner tag/i);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(
      screen.getByText('Measurement secondary runner tag is required'),
    ).toBeInTheDocument();
  });

  describe('DT name dropdowns while twins are loading', () => {
    beforeEach(() => {
      cleanup();
      const { fetchDigitalTwins } = jest.requireMock('model/backend/util/init');
      fetchDigitalTwins.mockReturnValueOnce(new Promise(() => {}));
      mockedUseSelector.mockImplementation((selector) =>
        selector({
          settings: { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT },
          digitalTwin: { digitalTwin: {} },
        }),
      );
      renderWithRouter(<SettingsForm />, { route: '/private' });
    });

    it('disables both DT dropdowns', () => {
      expect(screen.getByLabelText(/primary digital twin/i)).toBeDisabled();
      expect(screen.getByLabelText(/secondary digital twin/i)).toBeDisabled();
    });

    it('shows saved values as placeholder options', () => {
      expect(
        screen.getByRole('option', { name: DEFAULT_MEASUREMENT.primaryDTName }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', {
          name: DEFAULT_MEASUREMENT.secondaryDTName,
        }),
      ).toBeInTheDocument();
    });

    it('enables dropdowns after fetch completes', async () => {
      let resolve!: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      const { fetchDigitalTwins } = jest.requireMock('model/backend/util/init');
      fetchDigitalTwins.mockReturnValueOnce(promise);

      cleanup();
      renderWithRouter(<SettingsForm />, { route: '/private' });

      expect(screen.getByLabelText(/primary digital twin/i)).toBeDisabled();

      await act(async () => {
        resolve();
        await promise;
      });

      expect(screen.getByLabelText(/primary digital twin/i)).not.toBeDisabled();
      expect(
        screen.getByLabelText(/secondary digital twin/i),
      ).not.toBeDisabled();
    });
  });

  it('renders twin names as options in the primary DT dropdown', () => {
    expect(
      screen.getAllByRole('option', {
        name: DEFAULT_MEASUREMENT.primaryDTName,
      }),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole('option', {
        name: DEFAULT_MEASUREMENT.secondaryDTName,
      }),
    ).not.toHaveLength(0);
  });

  it('dispatches setPrimaryDTName when a different twin is selected', () => {
    const select = screen.getByLabelText(/primary digital twin/i);
    fireEvent.change(select, {
      target: { value: DEFAULT_MEASUREMENT.secondaryDTName },
    });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(
      setPrimaryDTName(DEFAULT_MEASUREMENT.secondaryDTName),
    );
  });

  it('dispatches setSecondaryDTName when a different twin is selected', () => {
    const select = screen.getByLabelText(/secondary digital twin/i);
    fireEvent.change(select, {
      target: { value: DEFAULT_MEASUREMENT.primaryDTName },
    });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockDispatch).toHaveBeenCalledWith(
      setSecondaryDTName(DEFAULT_MEASUREMENT.primaryDTName),
    );
  });
});
