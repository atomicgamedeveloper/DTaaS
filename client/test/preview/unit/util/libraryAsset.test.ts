import LibraryAsset, { getLibrarySubfolders } from 'preview/util/libraryAsset';
import { BackendInterface } from 'model/backend/gitlab/UtilityInterfaces';
import LibraryManager from 'preview/util/libraryManager';
import { AssetTypes } from 'model/backend/gitlab/digitalTwinConfig/constants';
import { getGroupName } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';

jest.mock('preview/util/libraryManager');

describe('LibraryAsset', () => {
  let backend: BackendInterface;
  let libraryManager: LibraryManager;
  let libraryAsset: LibraryAsset;

  beforeEach(() => {
    backend = {
      projectName: 'mockedUsername',
      api: {
        listRepositoryFiles: jest.fn(),
      },
      logs: [],
      triggerToken: 'mock trigger token',
      init: jest.fn(),
      setProjectIds: jest.fn(),
      getProjectId: jest.fn().mockReturnValue(1),
      getCommonProjectId: jest.fn().mockReturnValue(3),
      getTriggerToken: jest.fn(),
      getExecutionLogs: jest.fn(),
      getPipelineJobs: jest.fn(),
      getJobTrace: jest.fn(),
      getPipelineStatus: jest.fn(),
    } as unknown as BackendInterface;

    libraryManager = new LibraryManager('test', backend);
    libraryManager.assetName = 'test';
    libraryManager.backend = backend;
    libraryAsset = new LibraryAsset(
      libraryManager,
      'path/to/library',
      true,
      'type',
    );
  });

  it('should initialize correctly', () => {
    expect(libraryAsset.name).toBe('test');
    expect(libraryAsset.path).toBe('path/to/library');
    expect(libraryAsset.isPrivate).toBe(true);
    expect(libraryAsset.type).toBe('type');
    expect(libraryAsset.backend).toBe(backend);
    expect(libraryAsset.libraryManager).toBe(libraryManager);
  });

  it('should get description', async () => {
    libraryManager.getFileContent = jest.fn().mockResolvedValue('File content');
    await libraryAsset.getDescription();
    expect(libraryAsset.description).toBe('File content');
  });

  it('should handle error when getting description', async () => {
    libraryManager.getFileContent = jest
      .fn()
      .mockRejectedValue(new Error('Error'));
    await libraryAsset.getDescription();
    expect(libraryAsset.description).toBe('There is no description.md file');
  });

  it('should get full description with image URLs replaced', async () => {
    const fileContent = '![alt text](image.png)';
    libraryManager.getFileContent = jest.fn().mockResolvedValue(fileContent);
    sessionStorage.setItem('username', 'user');
    await libraryAsset.getFullDescription();
    expect(libraryAsset.fullDescription).toBe(
      `![alt text](https://example.com/AUTHORITY/${getGroupName()}/user/-/raw/main/path/to/library/image.png)`,
    );
  });

  it('should handle error when getting full description', async () => {
    libraryManager.getFileContent = jest
      .fn()
      .mockRejectedValue(new Error('Error'));
    await libraryAsset.getFullDescription();
    expect(libraryAsset.fullDescription).toBe('There is no README.md file');
  });

  it('should get config files', async () => {
    const fileNames = ['file1', 'file2'];
    libraryManager.getFileNames = jest.fn().mockResolvedValue(fileNames);
    await libraryAsset.getConfigFiles();
    expect(libraryAsset.configFiles).toEqual(fileNames);
  });

  it('should fetch common library subfolders succesfully', async () => {
    const files = [
      { name: 'subfolder1', path: 'tools/subfolder1', type: 'tree' },
    ];

    (backend.api.listRepositoryFiles as jest.Mock).mockResolvedValue(files);

    const type = 'Tools' as keyof typeof AssetTypes;
    const subfolders = await getLibrarySubfolders(
      backend.getCommonProjectId(),
      type,
      backend,
    );

    expect(subfolders).toHaveLength(1);

    expect(backend.api.listRepositoryFiles).toHaveBeenCalledWith(
      backend.getCommonProjectId(),
      AssetTypes[type], // recursive is false by default
    );
  });

  it('should throw error when fetching invalid library asset type', async () => {
    await expect(
      getLibrarySubfolders(3, 'Foo' as keyof typeof AssetTypes, backend),
    ).rejects.toThrow('Invalid asset type: Foo');
  });
});
