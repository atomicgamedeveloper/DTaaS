import * as React from 'react';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { Grid, CircularProgress, Button, Box } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { addOrUpdateLibraryFile } from 'preview/store/libraryConfigFiles.slice';
import { getFilteredFileNames } from 'preview/util/fileUtils';
import { createDigitalTwinFromData } from 'route/digitaltwins/execution/digitalTwinAdapter';
import DigitalTwin from 'preview/util/digitalTwin';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import { FileState } from '../../../store/file.slice';
import { fetchData } from './sidebarFetchers';
import { handleAddFileClick } from './sidebarFunctions';
import { renderFileTreeItems, renderFileSection } from './sidebarRendering';
import SidebarDialog from './SidebarDialog';
import FileActionButtons from '../create/FileActionButtons';

interface SidebarProps {
  name?: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setFilePrivacy: Dispatch<SetStateAction<string>>;
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  setLibraryAssetPath: Dispatch<SetStateAction<string>>;
  tab: string;
  fileName: string;
  isLibraryFile: boolean;
  setOpenDeleteFileDialog?: Dispatch<SetStateAction<boolean>>;
  setOpenChangeFileNameDialog?: Dispatch<SetStateAction<boolean>>;
}

const Sidebar = ({
  name,
  setFileName,
  setFileContent,
  setFileType,
  setFilePrivacy,
  setIsLibraryFile,
  setLibraryAssetPath,
  tab,
  fileName,
  isLibraryFile,
  setOpenDeleteFileDialog,
  setOpenChangeFileNameDialog,
}: SidebarProps) => {
  const [isLoading, setIsLoading] = useState(!!name);
  const [newFileName, setNewFileName] = useState('');
  const [isFileNameDialogOpen, setIsFileNameDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [digitalTwinInstance, setDigitalTwinInstance] =
    useState<DigitalTwin | null>(null);

  const digitalTwinData = useSelector((state: RootState) =>
    name ? selectDigitalTwinByName(name)(state) : null,
  );
  const files: FileState[] = useSelector((state: RootState) => state.files);

  const assets = useSelector((state: RootState) => state.cart.assets);
  const libraryFiles = useSelector(
    (state: RootState) => state.libraryConfigFiles,
  );

  const dispatch = useDispatch();

  useEffect(() => {
    const loadFiles = async () => {
      if (name && digitalTwinData) {
        try {
          const instance = await createDigitalTwinFromData(
            digitalTwinData,
            name,
          );
          setDigitalTwinInstance(instance);
          await fetchData(instance);
        } catch {
          setDigitalTwinInstance(null);
        }
      } else {
        setDigitalTwinInstance(null);
      }

      if (tab === 'create') {
        if (assets.length > 0) {
          await Promise.all(
            assets.map(async (asset) => {
              await asset.getConfigFiles();
              asset.configFiles.forEach((configFile) => {
                dispatch(
                  addOrUpdateLibraryFile({
                    assetPath: asset.path,
                    fileName: configFile,
                    fileContent: '',
                    isNew: true,
                    isModified: false,
                    isPrivate: asset.isPrivate,
                  }),
                );
              });
            }),
          );
        }
      }
      setIsLoading(false);
    };

    loadFiles();
  }, [name, digitalTwinData, assets, dispatch, tab]);

  if (isLoading) {
    return (
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        sx={{
          padding: 2,
          height: '100%',
          maxWidth: '300px',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          overflowY: 'auto',
        }}
      >
        <CircularProgress />
      </Grid>
    );
  }

  return (
    <Grid
      container
      direction="column"
      sx={{
        padding: 2,
        height: '100%',
        maxWidth: '300px',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        overflowY: 'auto',
      }}
    >
      {tab === 'create' && (
        <Box>
          <Button
            variant="contained"
            onClick={() => handleAddFileClick(setIsFileNameDialogOpen)}
            sx={{ width: '100%', marginBottom: -1 }}
          >
            Add new file
          </Button>

          <Box sx={{ marginBottom: 2 }}>
            <FileActionButtons
              fileName={fileName}
              setOpenDeleteFileDialog={setOpenDeleteFileDialog!}
              setOpenChangeFileNameDialog={setOpenChangeFileNameDialog!}
              isLibraryFile={isLibraryFile}
            />
          </Box>
        </Box>
      )}
      <SidebarDialog
        isOpen={isFileNameDialogOpen}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        setIsFileNameDialogOpen={setIsFileNameDialogOpen}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        files={files}
        dispatch={dispatch}
      />

      <SimpleTreeView>
        {name && digitalTwinInstance ? (
          <React.Fragment key="reconfigure-page">
            {renderFileTreeItems(
              'Description',
              digitalTwinInstance.descriptionFiles,
              digitalTwinInstance,
              setFileName,
              setFileContent,
              setFileType,
              setFilePrivacy,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {renderFileTreeItems(
              'Configuration',
              digitalTwinInstance.configFiles,
              digitalTwinInstance,
              setFileName,
              setFileContent,
              setFileType,
              setFilePrivacy,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {renderFileTreeItems(
              'Lifecycle',
              digitalTwinInstance.lifecycleFiles,
              digitalTwinInstance,
              setFileName,
              setFileContent,
              setFileType,
              setFilePrivacy,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {digitalTwinInstance.assetFiles.map(
              (assetFolder: { assetPath: string; fileNames: string[] }) =>
                renderFileTreeItems(
                  `${assetFolder.assetPath} configuration`,
                  assetFolder.fileNames,
                  digitalTwinInstance,
                  setFileName,
                  setFileContent,
                  setFileType,
                  setFilePrivacy,
                  files,
                  tab,
                  dispatch,
                  setIsLibraryFile,
                  setLibraryAssetPath,
                  true,
                  libraryFiles,
                  assetFolder.assetPath,
                ),
            )}
          </React.Fragment>
        ) : (
          <React.Fragment key="create-page">
            {renderFileSection(
              'Description',
              'description',
              getFilteredFileNames('description', files),
              digitalTwinInstance!,
              setFileName,
              setFileContent,
              setFileType,
              setFilePrivacy,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {renderFileSection(
              'Configuration',
              'config',
              getFilteredFileNames('config', files),
              digitalTwinInstance!,
              setFileName,
              setFileContent,
              setFileType,
              setFilePrivacy,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {renderFileSection(
              'Lifecycle',
              'lifecycle',
              getFilteredFileNames('lifecycle', files),
              digitalTwinInstance!,
              setFileName,
              setFileContent,
              setFileType,
              setFilePrivacy,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {assets.map((asset) =>
              renderFileSection(
                asset.isPrivate
                  ? `${asset.name} configuration`
                  : `common/${asset.name} configuration`,
                'config',
                asset.configFiles,
                asset,
                setFileName,
                setFileContent,
                setFileType,
                setFilePrivacy,
                files,
                tab,
                dispatch,
                setIsLibraryFile,
                setLibraryAssetPath,
                true,
                libraryFiles,
              ),
            )}
          </React.Fragment>
        )}
      </SimpleTreeView>
    </Grid>
  );
};

export default Sidebar;
