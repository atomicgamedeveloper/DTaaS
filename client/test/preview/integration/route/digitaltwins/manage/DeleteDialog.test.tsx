import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import snackbarSlice from 'store/snackbar.slice';
import DigitalTwin from 'model/backend/digitalTwin';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import { createMockDigitalTwinData } from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));
jest.mock('util/digitalTwinAdapter', () => {
  const adapterMocks = jest.requireActual(
    'test/preview/__mocks__/adapterMocks',
  );
  return adapterMocks.ADAPTER_MOCKS;
});
jest.mock('preview/util/init', () => {
  const adapterMocks = jest.requireActual(
    'test/preview/__mocks__/adapterMocks',
  );
  return adapterMocks.INIT_MOCKS;
});
jest.mock('model/backend/gitlab/instance', () => {
  const adapterMocks = jest.requireActual(
    'test/preview/__mocks__/adapterMocks',
  );
  return adapterMocks.GITLAB_MOCKS;
});

const mockDigitalTwin = new DigitalTwin('Asset 1', mockBackendInstance);
mockDigitalTwin.delete = jest.fn().mockResolvedValue('Deleted successfully');

const store = configureStore({
  reducer: combineReducers({
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('DeleteDialog Integration Tests', () => {
  const setupTest = () => {
    store.dispatch({ type: 'RESET_ALL' });

    const digitalTwinData = createMockDigitalTwinData('Asset 1');
    store.dispatch(
      setDigitalTwin({ assetName: 'Asset 1', digitalTwin: digitalTwinData }),
    );
  };

  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    store.dispatch({ type: 'RESET_ALL' });
    jest.clearAllTimers();
  });

  it('closes DeleteDialog on Cancel button click', async () => {
    const setShowDialog = jest.fn();

    render(
      <Provider store={store}>
        <DeleteDialog
          showDialog={true}
          setShowDialog={setShowDialog}
          name="Asset 1"
          onDelete={jest.fn()}
        />
      </Provider>,
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });
});
