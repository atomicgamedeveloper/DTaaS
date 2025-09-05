/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import { getAuthority } from 'util/envUtil';
import {
  getGroupName,
  getRunnerTag,
  getDTDirectory,
  getBranchName,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  FileState,
  FileType,
  DigitalTwinInterface,
  DTAssetsInterface,
  LibraryAssetInterface,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';
import {
  BackendInterface,
  ProjectId,
} from 'model/backend/interfaces/backendInterfaces';
import {
  isValidInstance,
  logError,
  logSuccess,
  getUpdatedLibraryFile,
} from './digitalTwinUtils';
import DTAssets from './DTAssets';

export const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());

class DigitalTwin implements DigitalTwinInterface {
  public DTName: string;

  public description: string | undefined = '';

  public fullDescription: string = '';

  public backend: BackendInterface;

  public DTAssets: DTAssetsInterface;

  public pipelineId: number | null = null;

  public lastExecutionStatus!: ExecutionStatus | null;

  public jobLogs: { jobName: string; log: string }[] = [];

  public pipelineLoading: boolean = false;

  public pipelineCompleted: boolean = false;

  public descriptionFiles: string[] = [];

  public configFiles: string[] = [];

  public lifecycleFiles: string[] = [];

  public assetFiles: { assetPath: string; fileNames: string[] }[] = [];

  constructor(DTName: string, backend: BackendInterface) {
    this.DTName = DTName;
    this.backend = backend;
    this.DTAssets = new DTAssets(DTName, this.backend);
  }

  async getDescription(): Promise<void> {
    try {
      const fileContent = await this.DTAssets.getFileContent('description.md');
      this.description = fileContent;
    } catch (_error) {
      this.description = `There is no description.md file`;
    }
  }

  async getFullDescription(): Promise<void> {
    const imagesPath = `${getDTDirectory()}/${this.DTName}/`;
    try {
      const fileContent = await this.DTAssets.getFileContent('README.md');
      this.fullDescription = fileContent.replace(
        /(!\[[^\]]*\])\(([^)]+)\)/g,
        (match: string, altText: string, imagePath: string) => {
          const fullUrl = `${getAuthority()}/${getGroupName()}/${sessionStorage.getItem('username')}/-/raw/main/${imagesPath}${imagePath}`;
          return `${altText}(${fullUrl})`;
        },
      );
    } catch (_error) {
      this.fullDescription = `There is no README.md file`;
    }
  }

  private async triggerPipeline() {
    const runnerTag = getRunnerTag();
    const variables = { DTName: this.DTName, RunnerTag: runnerTag };
    return this.backend.startPipeline(
      this.backend.getProjectId(),
      getBranchName(),
      variables,
    );
  }

  async execute(): Promise<number | null> {
    const runnerTag = getRunnerTag();
    if (!isValidInstance(this)) {
      logError(this, runnerTag, 'Missing projectId or triggerToken');
      return null;
    }

    try {
      const response = await this.triggerPipeline();
      logSuccess(this, runnerTag);
      this.pipelineId = response.id;
      return this.pipelineId;
    } catch (error) {
      logError(this, runnerTag, String(error));
      return null;
    }
  }

  async stop(projectId: ProjectId, pipeline: string): Promise<void> {
    const runnerTag = getRunnerTag();
    const pipelineId =
      pipeline === 'parentPipeline' ? this.pipelineId : this.pipelineId! + 1;
    try {
      await this.backend.api.cancelPipeline(projectId, pipelineId!);
      this.backend.logs.push({
        status: 'canceled',
        DTName: this.DTName,
        runnerTag,
      });
      this.lastExecutionStatus = ExecutionStatus.CANCELED;
    } catch (error) {
      this.backend.logs.push({
        status: 'error',
        error: new Error(String(error)),
        DTName: this.DTName,
        runnerTag,
      });
      this.lastExecutionStatus = ExecutionStatus.ERROR;
    }
  }

  async create(
    files: FileState[],
    cartAssets: LibraryAssetInterface[],
    libraryFiles: LibraryConfigFile[],
  ): Promise<string> {
    const mainFolderPath = `digital_twins/${this.DTName}`;
    const lifecycleFolderPath = `${mainFolderPath}/lifecycle`;

    try {
      const assetFilesToCreate = await this.prepareAllAssetFiles(
        cartAssets,
        libraryFiles,
      );

      await this.DTAssets.createFiles(
        files,
        mainFolderPath,
        lifecycleFolderPath,
      );

      await this.DTAssets.createFiles(
        assetFilesToCreate,
        mainFolderPath,
        lifecycleFolderPath,
      );

      await this.DTAssets.appendTriggerToPipeline();

      return `${this.DTName} digital twin files initialized successfully.`;
    } catch (error) {
      return `Error initializing ${this.DTName} digital twin files: ${String(
        error,
      )}`;
    }
  }

  async delete() {
    try {
      await this.DTAssets.delete();

      return `${this.DTName} deleted successfully`;
    } catch (_error) {
      return `Error deleting ${this.DTName} digital twin`;
    }
  }

  async getDescriptionFiles() {
    this.descriptionFiles = await this.DTAssets.getFileNames(
      FileType.DESCRIPTION,
    );
  }

  async getConfigFiles() {
    this.configFiles = await this.DTAssets.getFileNames(FileType.CONFIGURATION);
  }

  async getLifecycleFiles() {
    this.lifecycleFiles = await this.DTAssets.getFileNames(FileType.LIFECYCLE);
  }

  async prepareAllAssetFiles(
    cartAssets: LibraryAssetInterface[],
    libraryFiles: LibraryConfigFile[],
  ): Promise<
    Array<{
      name: string;
      content: string;
      isNew: boolean;
      isFromCommonLibrary: boolean;
    }>
  > {
    const assetFilesToCreate: Array<{
      name: string;
      content: string;
      isNew: boolean;
      isFromCommonLibrary: boolean;
    }> = [];

    for (const asset of cartAssets) {
      const assetFiles = await this.DTAssets.getFilesFromAsset(
        asset.path,
        asset.isPrivate,
      );
      for (const assetFile of assetFiles) {
        const updatedFile = getUpdatedLibraryFile(
          assetFile.name,
          asset.path,
          asset.isPrivate,
          libraryFiles,
        );

        assetFilesToCreate.push({
          name: `${asset.name}/${assetFile.name}`,
          content: updatedFile ? updatedFile.fileContent : assetFile.content,
          isNew: true,
          isFromCommonLibrary: !asset.isPrivate,
        });
      }
    }
    return assetFilesToCreate;
  }

  async getAssetFiles(): Promise<{ assetPath: string; fileNames: string[] }[]> {
    const mainFolderPath = `digital_twins/${this.DTName}`;
    const excludeFolder = FileType.LIFECYCLE;
    const result: { assetPath: string; fileNames: string[] }[] = [];

    try {
      const folders = await this.DTAssets.getFolders(mainFolderPath);

      const validFolders = folders.filter(
        (folder) => !folder.includes(excludeFolder),
      );

      for (const folder of validFolders) {
        if (folder.endsWith('/common')) {
          const subFolders = await this.DTAssets.getFolders(folder);
          for (const subFolder of subFolders) {
            const fileNames =
              await this.DTAssets.getLibraryConfigFileNames(subFolder);

            result.push({
              assetPath: subFolder,
              fileNames,
            });
          }
        } else {
          const fileNames =
            await this.DTAssets.getLibraryConfigFileNames(folder);

          result.push({
            assetPath: folder,
            fileNames,
          });
        }
      }

      this.assetFiles = result;
    } catch (_error) {
      return [];
    }
    return result;
  }
}

export default DigitalTwin;
