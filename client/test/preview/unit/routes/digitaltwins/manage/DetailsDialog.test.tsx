import { render, screen } from '@testing-library/react';
import DetailsDialog from 'preview/route/digitaltwins/manage/DetailsDialog';
import * as React from 'react';
import { useSelector, Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('DetailsDialog', () => {
  const setShowDialog = jest.fn();

  beforeEach(() => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      () => ({
        description: 'fullDescription',
      }),
    );
  });

  it('renders DetailsDialog', () => {
    render(
      <DetailsDialog
        showDialog={true}
        setShowDialog={setShowDialog}
        name="name"
        isPrivate={true}
      />,
    );

    expect(screen.getByText('fullDescription')).toBeInTheDocument();
  });

  it('closes the dialog when the "Close" button is clicked', () => {
    const mockStore = configureStore({
      reducer: {
        digitalTwin: () => ({}),
        assets: () => ({ items: [] }),
      },
    });

    render(
      <Provider store={mockStore}>
        <DetailsDialog
          showDialog={true}
          setShowDialog={setShowDialog}
          name="name"
          isPrivate={true}
        />
      </Provider>,
    );

    screen.getByText('Close').click();

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });
});
