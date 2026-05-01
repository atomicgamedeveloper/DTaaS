import type LibraryAsset from 'model/backend/libraryAsset';
import type { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';
import type { ExecutionHistoryState } from 'model/backend/state/executionHistory.slice';
import type {
  FileState,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';
import type { CartState } from 'model/store/cart.slice';

export interface ModelSettingsState {
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_NAME: string;
  RUNNER_TAG: string;
  BRANCH_NAME: string;
}

export interface ModelRootState {
  assets: { items: LibraryAsset[] };
  cart: CartState;
  digitalTwin: { digitalTwin: Record<string, DigitalTwinData> };
  executionHistory: ExecutionHistoryState;
  files: FileState[];
  libraryConfigFiles: LibraryConfigFile[];
  settings: ModelSettingsState;
}
