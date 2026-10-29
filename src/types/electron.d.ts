import { FileNode } from './ide';

export type ReadFileResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'binary' | 'tooLarge'; size: number };

export interface ZeusAPI {
  selectFolder: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<FileNode[]>;
  readFile: (filePath: string) => Promise<ReadFileResult>;
  listFiles: (rootPath: string) => Promise<string[]>;
  watchFolder: (rootPath: string) => Promise<void>;
  onFilesChanged: (callback: (paths: string[]) => void) => () => void;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  createFile: (filePath: string) => Promise<boolean>;
  createDirectory: (dirPath: string) => Promise<boolean>;
  deleteItem: (itemPath: string) => Promise<boolean>;
  renameItem: (oldPath: string, newPath: string) => Promise<boolean>;
  getAppPath: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  setDirtyFiles: (names: string[]) => void;
  onSaveAllAndClose: (callback: () => void) => () => void;
  platform: string;

  terminal: {
    start: (cwd?: string, shellType?: 'cmd' | 'powershell', cols?: number, rows?: number) => Promise<void>;
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    onData: (callback: (data: string) => void) => () => void;
    restart: (cwd?: string, shellType?: 'cmd' | 'powershell', cols?: number, rows?: number) => Promise<void>;
    kill: () => void;
  };

  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    forceClose: () => void;
    isMaximized: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    zeusAPI: ZeusAPI;
  }
}
