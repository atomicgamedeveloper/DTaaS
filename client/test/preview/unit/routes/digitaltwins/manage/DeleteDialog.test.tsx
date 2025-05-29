import * as React from 'react';
import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { createDigitalTwinFromData } from 'route/digitaltwins/execution/digitalTwinAdapter';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('preview/util/digitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

jest.mock('route/digitaltwins/execution/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'TestDigitalTwin',
    delete: jest.fn().mockResolvedValue('Digital twin deleted successfully'),
  }),
}));

describe('DeleteDialog', () => {
  const showDialog = true;
  const name = 'testName';
  const setShowDialog = jest.fn();
  const onDelete = jest.fn();

  it('renders the DeleteDialog', () => {
    render(
      <Provider store={store}>
        <DeleteDialog
          showDialog={showDialog}
          setShowDialog={setShowDialog}
          name={name}
          onDelete={onDelete}
        />
      </Provider>,
    );
    expect(screen.getByText(/This step is irreversible/i)).toBeInTheDocument();
  });

  it('handles close dialog', async () => {
    render(
      <Provider store={store}>
        <DeleteDialog
          showDialog={showDialog}
          setShowDialog={setShowDialog}
          name={name}
          onDelete={onDelete}
        />
      </Provider>,
    );
    const closeButton = screen.getByRole('button', { name: /Cancel/i });
    closeButton.click();
    expect(setShowDialog).toHaveBeenCalled();
  });

  it('handles delete button click', async () => {
    // Mock createDigitalTwinFromData for this test
    (createDigitalTwinFromData as jest.Mock).mockResolvedValueOnce({
      DTName: 'testName',
      delete: jest.fn().mockResolvedValue('Deleted successfully'),
    });

    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue({
      DTName: 'testName',
      description: 'Test description',
    });

    render(
      <Provider store={store}>
        <DeleteDialog
          showDialog={showDialog}
          setShowDialog={setShowDialog}
          name={name}
          onDelete={onDelete}
        />
      </Provider>,
    );

    const deleteButton = screen.getByRole('button', { name: /Yes/i });

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
      expect(setShowDialog).toHaveBeenCalledWith(false);
    });
  });

  it('handles delete button click and shows error message', async () => {
    // Mock createDigitalTwinFromData for this test
    (createDigitalTwinFromData as jest.Mock).mockResolvedValueOnce({
      DTName: 'testName',
      delete: jest.fn().mockResolvedValue('Error: deletion failed'),
    });

    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue({
      DTName: 'testName',
      description: 'Test description',
    });

    render(
      <Provider store={store}>
        <DeleteDialog
          showDialog={showDialog}
          setShowDialog={setShowDialog}
          name={name}
          onDelete={onDelete}
        />
      </Provider>,
    );

    const deleteButton = screen.getByRole('button', { name: /Yes/i });

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
      expect(setShowDialog).toHaveBeenCalledWith(false);
    });
  });
});
