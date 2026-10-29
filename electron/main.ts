import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { FileService } from './services/fileService';
import { TerminalService } from './services/terminalService';
import { WatchService } from './services/watchService';
import { setupAutoUpdates } from './services/updateService';

let mainWindow: BrowserWindow | null = null;
// Names of open files with unsaved changes, reported by the renderer
let dirtyFiles: string[] = [];
// Set once the user chose to close anyway (or everything was saved)
let forceClose = false;
const fileService = new FileService();
const terminalService = new TerminalService();
const watchService = new WatchService();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure application identity for Windows taskbar grouping and icons
app.setName('Zeus IDE');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.zeus.ide');
}

function getAppIcon(): string {
  const icoPath = path.join(__dirname, '../build/icon.ico');
  if (fs.existsSync(icoPath)) return icoPath;
  const pngPath = path.join(__dirname, '../build/icon.png');
  if (fs.existsSync(pngPath)) return pngPath;
  return icoPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#161922',
    icon: getAppIcon(),
    frame: false, // Sleek modern custom title bar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Never navigate the IDE window away from the app, and open links in the real browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith('http://localhost:5173') : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  terminalService.setWindow(mainWindow);
  watchService.setWindow(mainWindow);
  forceClose = false;
  dirtyFiles = [];

  // Ask before closing when there are unsaved files
  mainWindow.on('close', (event) => {
    if (forceClose || dirtyFiles.length === 0 || !mainWindow) return;
    event.preventDefault();

    const list = dirtyFiles.slice(0, 8).map((name) => `• ${name}`).join('\n');
    const more = dirtyFiles.length > 8 ? `\n… e mais ${dirtyFiles.length - 8}` : '';
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      title: 'Alterações não salvas',
      message: `Você tem ${dirtyFiles.length} arquivo(s) com alterações não salvas.`,
      detail: `${list}${more}`,
      buttons: ['Salvar tudo e fechar', 'Fechar sem salvar', 'Cancelar'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });

    if (response === 0) {
      mainWindow.webContents.send('app:saveAllAndClose');
    } else if (response === 1) {
      forceClose = true;
      mainWindow.close();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    terminalService.kill();
    watchService.stop();
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();
  setupAutoUpdates(() => mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  terminalService.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // App info
  ipcMain.handle('app:getPath', () => app.getAppPath());

  // Window management
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.on('window:forceClose', () => {
    forceClose = true;
    mainWindow?.close();
  });

  ipcMain.on('app:setDirtyFiles', (_event, names: unknown) => {
    dirtyFiles = Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string') : [];
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // External link handler
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
    }
  });

  // File System Handlers
  ipcMain.handle('fs:selectFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecione uma pasta para abrir no ZeusIDE',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('fs:readDirectory', async (_event, dirPath: string) => {
    return await fileService.readDirectory(dirPath);
  });

  ipcMain.handle('fs:listFiles', async (_event, rootPath: string) => {
    return await fileService.listFiles(rootPath);
  });

  ipcMain.handle('fs:watch', async (_event, rootPath: string) => {
    watchService.watch(rootPath);
  });

  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    return await fileService.readFile(filePath);
  });

  ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
    return await fileService.writeFile(filePath, content);
  });

  ipcMain.handle('fs:createFile', async (_event, filePath: string) => {
    return await fileService.createFile(filePath);
  });

  ipcMain.handle('fs:createDirectory', async (_event, dirPath: string) => {
    return await fileService.createDirectory(dirPath);
  });

  ipcMain.handle('fs:deleteItem', async (_event, itemPath: string) => {
    return await fileService.deleteItem(itemPath);
  });

  ipcMain.handle('fs:renameItem', async (_event, oldPath: string, newPath: string) => {
    return await fileService.renameItem(oldPath, newPath);
  });

  // Terminal Handlers
  ipcMain.handle('terminal:start', async (_event, cwd?: string, shellType?: 'cmd' | 'powershell', cols?: number, rows?: number) => {
    terminalService.start(cwd, shellType, cols, rows);
  });

  ipcMain.on('terminal:write', (_event, data: string) => {
    terminalService.write(data);
  });

  ipcMain.on('terminal:resize', (_event, cols: number, rows: number) => {
    terminalService.resize(cols, rows);
  });

  ipcMain.handle('terminal:restart', async (_event, cwd?: string, shellType?: 'cmd' | 'powershell', cols?: number, rows?: number) => {
    terminalService.restart(cwd, shellType, cols, rows);
  });

  ipcMain.on('terminal:kill', () => {
    terminalService.kill();
  });
}
