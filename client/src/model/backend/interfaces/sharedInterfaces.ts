/**
 * Interfaces, types, enums that are backend agnostic and work on Digital Twin concepts.
 */

/**
 * Logical categories for Digital Twin files.
 * - Backend: used in fileHandler for extension checks and repo path resolution.
 * - Frontend: used to decide how files are displayed in the Editor/Preview.
 */
export enum FileType {
  DESCRIPTION = 'description',
  CONFIGURATION = 'configuration',
  LIFECYCLE = 'lifecycle',
}

/**
 * Project file state representation
 */
export type FileState = {
  name: string;
  content: string;
  isNew: boolean;
  isModified: boolean;
  type?: FileType;
  isFromCommonLibrary?: boolean;
};

export type LibraryAssetDetails = {
  /**
   * Name of the library asset.
   */
  name: string;
  /**
   * The asset's description provided to the user upon browsing assets (description.md).
   */
  description: string;
  /**
   * The asset's README.md shown when inspecting the asset.
   */
  fullDescription: string;
};

/**
 * Represents the metadata associated with a library asset.
 * Does not contain its content.
 */
export type LibraryAssetFiles = {
  path: string;
  type: string;
  isPrivate: boolean;
  configFiles: string[];
};

/*
  Interface for basic DTaaS file operations
  Utilized in FileHandlerInterface
*/
export interface IFile {
  /**
   * Creates a new file.
   * @param file - The file to be created.
   * @param filePath - The path where the file will be created.
   * @param commitMessage - The commit message for the file creation.
   */
  createFile(
    file: FileState,
    filePath: string,
    commitMessage: string,
  ): Promise<void>;
  /**
   * Updates an existing file.
   * @param filePath - The path of the file to be updated.
   * @param updatedContent - The new content for the file.
   * @param commitMessage - The commit message for the file update.
   */
  updateFile(
    filePath: string,
    updatedContent: string,
    commitMessage: string,
  ): Promise<void>;
  /**
   * Deletes a digital twin.
   * @param digitalTwinPath - The path of the digital twin to be deleted.
   */
  deleteDT(digitalTwinPath: string): Promise<void>;
  /**
   * Retrieves the content of a file.
   * @param filePath - The path of the file to be retrieved.
   */
  getFileContent(filePath: string): Promise<string>;
  /**
   * Retrieves the names of all files of a specific type.
   * @param fileType - The type of files to retrieve names for.
   */
  getFileNames(fileType: FileType): Promise<string[]>;
}
