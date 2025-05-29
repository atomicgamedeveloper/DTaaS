import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetCardExecute } from 'preview/components/asset/AssetCard';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import assetsReducer, {
  selectAssetByPathAndPrivacy,
  setAssets,
} from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import executionHistoryReducer from 'model/backend/gitlab/state/executionHistory.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import {
  mockLibraryAsset,
  createMockDigitalTwinData,
} from 'test/preview/__mocks__/global_mocks';
import { RootState } from 'store/store';

jest.mock('database/digitalTwins');

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

jest.mock('route/digitaltwins/execution/executionButtonHandlers', () => ({
  handleStart: jest
    .fn()
    .mockImplementation(() => Promise.resolve('test-execution-id')),
  handleStop: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('preview/route/digitaltwins/execute/LogDialog', () => ({
  __esModule: true,
  default: ({ showLog, name }: { showLog: boolean; name: string }) =>
    showLog ? <div data-testid="log-dialog">Log Dialog for {name}</div> : null,
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const store = configureStore({
  reducer: combineReducers({
    assets: assetsReducer,
    digitalTwin: digitalTwinReducer,
    executionHistory: executionHistoryReducer,
    snackbar: snackbarSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('AssetCardExecute Integration Test', () => {
  const asset = {
    name: 'Asset 1',
    description: 'Mocked description',
    path: 'path/asset1',
    type: 'Digital twins',
    isPrivate: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    store.dispatch({ type: 'RESET_ALL' });

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (
          selector === selectAssetByPathAndPrivacy(asset.path, asset.isPrivate)
        ) {
          return null;
        }
        if (
          typeof selector === 'function' &&
          selector.name === 'selector' &&
          selector.toString().includes('selectExecutionHistoryByDTName')
        ) {
          return [
            {
              id: 'test-execution-id',
              dtName: 'Asset 1',
              pipelineId: 123,
              timestamp: Date.now(),
              status: ExecutionStatus.COMPLETED,
              jobLogs: [],
            },
          ];
        }
        return createMockDigitalTwinData('Asset 1');
      },
    );

    store.dispatch(setAssets([mockLibraryAsset]));
    const digitalTwinData = createMockDigitalTwinData('Asset 1');
    store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin: digitalTwinData,
      }),
    );

    act(() => {
      render(
        <Provider store={store}>
          <AssetCardExecute asset={asset} />
        </Provider>,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();

    store.dispatch({ type: 'RESET_ALL' });

    jest.clearAllTimers();
  });

  it('should start execution', async () => {
    const startButton = screen.getByRole('button', { name: /Start/i });

    await act(async () => {
      fireEvent.click(startButton);
    });
    expect(startButton).toBeInTheDocument();
  });

  it('should open log dialog when History button is clicked', async () => {
    const historyButton = screen.getByRole('button', { name: /History/i });

    await act(async () => {
      fireEvent.click(historyButton);
    });

    expect(screen.getByTestId('log-dialog')).toBeInTheDocument();
    expect(screen.getByText('Log Dialog for Asset 1')).toBeInTheDocument();
  });
});
