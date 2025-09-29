import { combineReducers, configureStore } from '@reduxjs/toolkit';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/gitlab/state/digitalTwin.slice';
import snackbarReducer from 'store/snackbar.slice';
import { mockLibraryAsset } from 'test/preview/__mocks__/global_mocks';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import DigitalTwin from 'preview/util/digitalTwin';
import LibraryAsset from 'preview/util/libraryAsset';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';
import { extractDataFromDigitalTwin } from 'util/digitalTwinAdapter';

const setupStore = () => {
  const preSetItems: LibraryAsset[] = [mockLibraryAsset];
  const files: FileState[] = [
    { name: 'Asset 1', content: 'content1', isNew: false, isModified: false },
  ];

  const store = configureStore({
    reducer: combineReducers({
      assets: assetsReducer,
      digitalTwin: digitalTwinReducer,
      snackbar: snackbarReducer,
      files: fileSlice,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

  const digitalTwin = new DigitalTwin('Asset 1', mockBackendInstance);
  digitalTwin.descriptionFiles = ['description.md'];

  const digitalTwinData = extractDataFromDigitalTwin(digitalTwin);

  store.dispatch(setAssets(preSetItems));
  store.dispatch(
    setDigitalTwin({ assetName: 'Asset 1', digitalTwin: digitalTwinData }),
  );
  store.dispatch(addOrUpdateFile(files[0]));

  return store;
};

export default setupStore;
