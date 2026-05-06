import type { ModelStoreState } from 'model/store/modelRootState';

type StoreReader = { getState: () => ModelStoreState };

let _store: StoreReader | null = null;

export function setEnvironmentStore(store: StoreReader): void {
  _store = store;
}

export default function getAuthority(): string {
  if (!_store) {
    throw new Error(
      'Environment store not initialized. Call setEnvironmentStore() first.',
    );
  }
  return _store.getState().environment.REACT_APP_AUTH_AUTHORITY;
}
