import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('zeusAPI', {
  platform: process.platform,
  getAppPath: () => ipcRenderer.invoke('app:getPath'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  setDirtyFiles: (names: string[]) => ipcRenderer.send('app:setDirtyFiles', names),
  onSaveAllAndClose: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('app:saveAllAndClose', subscription);
    return () => {
      ipcRenderer.removeListener('app:saveAllAndClose', subscription);
    };
  },

  // File System Operations
  selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  listFiles: (rootPath: string) => ipcRenderer.invoke('fs:listFiles', rootPath),
  watchFolder: (rootPath: string) => ipcRenderer.invoke('fs:watch', rootPath),
  onFilesChanged: (callback: (paths: string[]) => void) => {
    const subscription = (_event: IpcRendererEvent, paths: string[]) => callback(paths);
    ipcRenderer.on('fs:changed', subscription);
    return () => {
      ipcRenderer.removeListener('fs:changed', subscription);
    };
  },
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile: (filePath: string) => ipcRenderer.invoke('fs:createFile', filePath),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('fs:createDirectory', dirPath),
  deleteItem: (itemPath: string) => ipcRenderer.invoke('fs:deleteItem', itemPath),
  renameItem: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameItem', oldPath, newPath),

  // Terminal Operations
  terminal: {
    start: (cwd?: string, shellType?: string, cols?: number, rows?: number) =>
      ipcRenderer.invoke('terminal:start', cwd, shellType, cols, rows),
    write: (data: string) => ipcRenderer.send('terminal:write', data),
    resize: (cols: number, rows: number) => ipcRenderer.send('terminal:resize', cols, rows),
    onData: (callback: (data: string) => void) => {
      const subscription = (_event: IpcRendererEvent, data: string) => callback(data);
      ipcRenderer.on('terminal:data', subscription);
      return () => {
        ipcRenderer.removeListener('terminal:data', subscription);
      };
    },
    restart: (cwd?: string, shellType?: string, cols?: number, rows?: number) =>
      ipcRenderer.invoke('terminal:restart', cwd, shellType, cols, rows),
    kill: () => ipcRenderer.send('terminal:kill'),
  },

  // Window Controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    forceClose: () => ipcRenderer.send('window:forceClose'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
});
