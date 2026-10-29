import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

/**
 * Checks GitHub Releases for a newer version, downloads it in the background
 * and offers to restart once it is ready. Only runs in the installed (NSIS) build:
 * the portable .exe and the dev server cannot update themselves.
 */
export function setupAutoUpdates(getWindow: () => BrowserWindow | null) {
  const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
  if (!app.isPackaged || isPortable) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', async (info) => {
    const win = getWindow();
    const options = {
      type: 'info' as const,
      title: 'Atualização disponível',
      message: `A versão ${info.version} do Zeus IDE está pronta para instalar.`,
      detail: 'Reinicie agora para atualizar, ou ela será instalada quando você fechar a IDE.',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    };
    const { response } = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (error) => {
    // Offline or no release published yet: not worth bothering the user
    console.error('Falha ao verificar atualizações:', error);
  });

  autoUpdater.checkForUpdates().catch(() => {
    // Already reported by the 'error' handler
  });
}
