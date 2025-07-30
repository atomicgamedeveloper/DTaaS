import * as React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import SettingsForm from 'route/account/SettingsForm';
import {
  DEFAULT_SETTINGS,
  setGroupName,
  resetToDefaults,
} from 'store/settings.slice';
import { useSelector, useDispatch } from 'react-redux';
import { renderWithRouter } from '../unit.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockedUseSelector = useSelector as unknown as jest.Mock;
const mockedUseDispatch = useDispatch as unknown as jest.Mock;

describe('SettingsForm', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    mockedUseSelector.mockImplementation((selector) =>
      selector({ settings: DEFAULT_SETTINGS }),
    );
    mockedUseDispatch.mockReturnValue(mockDispatch);
    renderWithRouter(<SettingsForm />, { route: '/private' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders form fields', () => {
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dt directory/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/common library/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/runner tag/i)).toBeInTheDocument();
  });

  test('updates local state on input change', () => {
    const input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: 'new-group' } });
    expect(input).toHaveValue('new-group');
  });

  test('saves settings when save button clicked', () => {
    const input = screen.getByLabelText(/group name/i);
    fireEvent.change(input, { target: { value: 'new-group' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    expect(mockDispatch).toHaveBeenCalledWith(setGroupName('new-group'));
  });

  test('shows success notification after save', async () => {
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    expect(
      await screen.findByText(/settings saved successfully/i),
    ).toBeInTheDocument();
  });

  test('only dispatches actions for changed fields', () => {
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

  test('resets to defaults when reset button clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

    expect(mockDispatch).toHaveBeenCalledWith(resetToDefaults());
  });
});
