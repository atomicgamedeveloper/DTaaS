import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import ReconfigureDialog from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import assetsReducer from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import snackbarSlice, { showSnackbar } from 'preview/store/snackbar.slice';
import fileSlice, { removeAllModifiedFiles } from 'preview/store/file.slice';
import libraryConfigFilesSlice, {
  removeAllModifiedLibraryFiles,
} from 'preview/store/libraryConfigFiles.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import {
  mockGitlabInstance,
  createMockDigitalTwinData,
} from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('route/digitaltwins/execution/digitalTwinAdapter', () => {
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
jest.mock('preview/util/gitlab', () => {
  const adapterMocks = jest.requireActual(
    'test/preview/__mocks__/adapterMocks',
  );
  return adapterMocks.GITLAB_MOCKS;
});

const mockDigitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
mockDigitalTwin.fullDescription = 'Digital Twin Description';

const initialState = {
  assets: { items: [] },
  digitalTwin: {
    assetName: 'Asset 1',
    digitalTwin: mockDigitalTwin,
    shouldFetchDigitalTwins: false,
  },
  snackbar: {},
  files: [],
  libraryConfigFiles: [],
  cart: { assets: [] },
};

const store = configureStore({
  reducer: combineReducers({
    assets: assetsReducer,
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
    files: fileSlice,
    libraryConfigFiles: libraryConfigFilesSlice,
    cart: (state = initialState.cart) => state,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('ReconfigureDialog Integration Tests', () => {
  const setupTest = () => {
    jest.clearAllMocks();

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
    jest.clearAllMocks();

    store.dispatch({ type: 'RESET_ALL' });

    jest.clearAllTimers();
  });

  it('renders ReconfigureDialog', async () => {
    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Reconfigure/i)).toBeInTheDocument();
    });
  });

  it('opens save confirmation dialog on save button click', async () => {
    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(
        screen.getByText('Are you sure you want to apply the changes?'),
      ).toBeInTheDocument();
    });
  });

  it('opens cancel confirmation dialog on cancel button click', async () => {
    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(
        screen.getByText(/Are you sure you want to cancel?/i),
      ).toBeInTheDocument();
    });
  });

  it('dispatches actions on confirm save', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        showSnackbar({
          message: 'Asset 1 reconfigured successfully',
          severity: 'success',
        }),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedFiles());
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedLibraryFiles());
    });
  });

  it('dispatches actions on confirm cancel', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedFiles());
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedLibraryFiles());
    });
  });
});
