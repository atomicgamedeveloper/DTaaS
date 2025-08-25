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

export type LibraryAssetFiles = {
  path: string;
  type: string;
  isPrivate: boolean;
  configFiles: string[];
};

export interface IFile {
  createFile(
    file: FileState,
    filePath: string,
    commitMessage: string,
  ): Promise<void>;
  updateFile(
    filePath: string,
    updatedContent: string,
    commitMessage: string,
  ): Promise<void>;
  deleteDT(digitalTwinPath: string): Promise<void>;
  getFileContent(filePath: string): Promise<string>;
  getFileNames(fileType: FileType): Promise<string[]>;
}
