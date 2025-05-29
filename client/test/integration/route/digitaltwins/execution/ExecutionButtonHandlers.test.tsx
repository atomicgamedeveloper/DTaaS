import * as PipelineHandlers from 'route/digitaltwins/execution/executionButtonHandlers';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
  DigitalTwinData,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import { extractDataFromDigitalTwin } from 'route/digitaltwins/execution/digitalTwinAdapter';
import snackbarSlice, { SnackbarState } from 'preview/store/snackbar.slice';
import { formatName } from 'preview/util/digitalTwin';

const store = configureStore({
  reducer: {
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('PipelineHandler Integration Tests', () => {
  const digitalTwin = mockDigitalTwin;

  beforeEach(() => {
    // Convert DigitalTwin instance to DigitalTwinData using the adapter
    const digitalTwinData: DigitalTwinData =
      extractDataFromDigitalTwin(digitalTwin);
    store.dispatch(
      setDigitalTwin({
        assetName: 'mockedDTName',
        digitalTwin: digitalTwinData,
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles button click when button text is Stop', async () => {
    const { dispatch } = store;
    await PipelineHandlers.handleButtonClick(
      'Start',
      jest.fn(),
      digitalTwin,
      jest.fn(),
      dispatch,
    );

    await PipelineHandlers.handleButtonClick(
      'Stop',
      jest.fn(),
      digitalTwin,
      jest.fn(),
      dispatch,
    );

    const snackbarState = store.getState().snackbar;

    const expectedSnackbarState = {
      open: true,
      message: 'Execution mockedStatus for MockedDTName',
      severity: 'error',
    };

    expect(snackbarState).toEqual(expectedSnackbarState);
  });

  it('handles start when button text is Stop', async () => {
    const setButtonText = jest.fn();
    const setLogButtonDisabled = jest.fn();
    const { dispatch } = store;

    await PipelineHandlers.handleStart(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('handles stop and catches error', async () => {
    const stopPipelinesMock = jest
      .spyOn(PipelineHandlers, 'stopPipelines')
      .mockRejectedValueOnce(new Error('error'));
    const { dispatch } = store;

    await PipelineHandlers.handleStop(digitalTwin, jest.fn(), dispatch);

    const snackbarState = store.getState().snackbar as SnackbarState;
    expect(snackbarState.message).toBe(
      `Execution stop failed for ${formatName(digitalTwin.DTName)}`,
    );

    stopPipelinesMock.mockRestore();
  });
});
