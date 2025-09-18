/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { getAuthority } from 'util/envUtil';
import {
  getGroupName,
  getRunnerTag,
  getDTDirectory,
  getBranchName,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { ExecutionStatus, JobLog } from 'model/backend/interfaces/execution';
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
import { v4 as uuidv4 } from 'uuid';
import indexedDBService from 'database/digitalTwins';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import DTAssets from './DTAssets';
import {
  isValidInstance,
  logError,
  logSuccess,
  getUpdatedLibraryFile,
} from './digitalTwinUtils';

export const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());

class DigitalTwin implements DigitalTwinInterface {
  public DTName: string;

  public description: string | undefined = '';

  public fullDescription: string = '';

  public backend: BackendInterface;

  public DTAssets: DTAssetsInterface;

  // Current active pipeline ID (for backward compatibility)
  public pipelineId: number | null = null;

  public activePipelineIds: number[] = [];

  // Current execution ID (for backward compatibility)
  public currentExecutionId: string | null = null;

  // Last execution status (for backward compatibility)
  public lastExecutionStatus!: ExecutionStatus | null;

  // Job logs for the current execution (for backward compatibility)
  public jobLogs: JobLog[] = [];

  // Loading state for the current pipeline (for backward compatibility)
  public pipelineLoading: boolean = false;

  // Completion state for the current pipeline (for backward compatibility)
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

  /**
   * Execute a Digital Twin and create an execution history entry
   * @returns Promise that resolves with the pipeline ID or null if execution failed
   */
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

      this.activePipelineIds.push(response.id);

      const executionId = uuidv4();
      this.currentExecutionId = executionId;

      const executionEntry: DTExecutionResult = {
        id: executionId,
        dtName: this.DTName,
        pipelineId: response.id,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      await indexedDBService.add(executionEntry);

      return response.id;
    } catch (error) {
      logError(this, runnerTag, String(error));
      return null;
    }
  }

  /**
   * Stop a specific pipeline execution
   * @param projectId The GitLab project ID
   * @param pipeline The pipeline to stop ('parentPipeline' or 'childPipeline')
   * @param executionId Optional execution ID to stop a specific execution
   * @returns Promise that resolves when the pipeline is stopped
   */
  async stop(
    projectId: ProjectId,
    pipeline: string,
    executionId?: string,
  ): Promise<void> {
    const runnerTag = getRunnerTag();
    let pipelineId: number | null = null;

    if (executionId) {
      const execution = await indexedDBService.getById(executionId);
      if (execution) {
        pipelineId = execution.pipelineId;
        if (pipeline !== 'parentPipeline') {
          pipelineId += 1;
        }
      }
    } else {
      pipelineId =
        pipeline === 'parentPipeline' ? this.pipelineId : this.pipelineId! + 1;
    }

    if (!pipelineId) {
      return;
    }

    try {
      await this.backend.api.cancelPipeline(projectId, pipelineId!);
      this.backend.logs.push({
        status: 'canceled',
        DTName: this.DTName,
        runnerTag,
      });
      this.lastExecutionStatus = ExecutionStatus.CANCELED;

      if (executionId) {
        const execution = await indexedDBService.getById(executionId);
        if (execution) {
          execution.status = ExecutionStatus.CANCELED;
          await indexedDBService.update(execution);
        }
      } else if (this.currentExecutionId) {
        const execution = await indexedDBService.getById(
          this.currentExecutionId,
        );
        if (execution) {
          execution.status = ExecutionStatus.CANCELED;
          await indexedDBService.update(execution);
        }
      }

      this.activePipelineIds = this.activePipelineIds.filter(
        (id) => id !== pipelineId,
      );
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

  /**
   * Get all execution history entries for this Digital Twin
   * @returns Promise that resolves with an array of execution history entries
   */
  async getExecutionHistory(): Promise<DTExecutionResult[]> {
    return indexedDBService.getByDTName(this.DTName);
  }

  /**
   * Get a specific execution history entry by ID
   * @param executionId The execution ID
   * @returns Promise that resolves with the execution history entry or undefined if not found
   */
  // eslint-disable-next-line class-methods-use-this
  async getExecutionHistoryById(
    executionId: string,
  ): Promise<DTExecutionResult | undefined> {
    const result = await indexedDBService.getById(executionId);
    return result || undefined;
  }

  /**
   * Update job logs for a specific execution
   * @param executionId The execution ID
   * @param jobLogs The job logs to update
   * @returns Promise that resolves when the logs are updated
   */
  async updateExecutionLogs(
    executionId: string,
    jobLogs: JobLog[],
  ): Promise<void> {
    const execution = await indexedDBService.getById(executionId);
    if (execution) {
      execution.jobLogs = jobLogs;
      await indexedDBService.update(execution);

      // Update current job logs for backward compatibility
      if (executionId === this.currentExecutionId) {
        this.jobLogs = jobLogs;
      }
    }
  }

  /**
   * Update the status of a specific execution
   * @param executionId The execution ID
   * @param status The new status
   * @returns Promise that resolves when the status is updated
   */
  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
  ): Promise<void> {
    const execution = await indexedDBService.getById(executionId);
    if (execution) {
      execution.status = status;
      await indexedDBService.update(execution);

      if (executionId === this.currentExecutionId) {
        this.lastExecutionStatus = status;
      }
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
