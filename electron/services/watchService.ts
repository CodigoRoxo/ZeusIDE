import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow } from 'electron';

// Batches bursts of events (e.g. git checkout, npm install) into one notification
const DEBOUNCE_MS = 250;
// Changes inside these folders are noisy and never shown as edits
const IGNORED_SEGMENTS = new Set(['.git', 'node_modules']);

export class WatchService {
  private watcher: fs.FSWatcher | null = null;
  private window: BrowserWindow | null = null;
  private rootPath: string | null = null;
  private pending = new Set<string>();
  private timer: NodeJS.Timeout | null = null;

  setWindow(win: BrowserWindow) {
    this.window = win;
  }

  /**
   * Watches a project folder recursively, replacing any previous watch.
   */
  watch(rootPath: string) {
    this.stop();
    this.rootPath = rootPath;

    try {
      this.watcher = fs.watch(rootPath, { recursive: true }, (_eventType, fileName) => {
        if (!fileName) return;
        const relative = fileName.toString();
        const segments = relative.split(/[\\/]/);
        if (segments.some((s) => IGNORED_SEGMENTS.has(s))) return;

        this.pending.add(path.join(rootPath, relative));
        this.schedule();
      });

      this.watcher.on('error', (error) => {
        console.error('Falha no monitoramento de arquivos:', error);
        this.stop();
      });
    } catch (error) {
      console.error(`Não foi possível monitorar ${rootPath}:`, error);
    }
  }

  stop() {
    this.watcher?.close();
    this.watcher = null;
    this.rootPath = null;
    this.pending.clear();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      const changed = [...this.pending];
      this.pending.clear();
      if (changed.length > 0 && this.rootPath && this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('fs:changed', changed);
      }
    }, DEBOUNCE_MS);
  }
}
