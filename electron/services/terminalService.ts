import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';

export type ShellType = 'cmd' | 'powershell';

export class TerminalService {
  private ptyProcess: pty.IPty | null = null;
  private window: BrowserWindow | null = null;
  private currentCwd: string = process.cwd();
  private currentShell: ShellType = 'cmd';

  setWindow(win: BrowserWindow) {
    this.window = win;
  }

  start(cwd?: string, shellType: ShellType = 'cmd', cols: number = 80, rows: number = 24) {
    this.kill();

    if (cwd) {
      this.currentCwd = cwd;
    }
    this.currentShell = shellType;

    let shell: string;
    let args: string[] = [];

    if (process.platform === 'win32') {
      if (shellType === 'powershell') {
        shell = 'powershell.exe';
        args = ['-NoLogo'];
      } else {
        shell = 'cmd.exe';
        args = [];
      }
    } else {
      shell = process.env.SHELL || 'bash';
    }

    try {
      this.ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: Math.max(cols || 80, 20),
        rows: Math.max(rows || 24, 5),
        cwd: this.currentCwd,
        env: process.env as Record<string, string>,
      });

      this.ptyProcess.onData((data: string) => {
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send('terminal:data', data);
        }
      });

      this.ptyProcess.onExit(({ exitCode }) => {
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send('terminal:data', `\r\n[Processo finalizado com código ${exitCode}]\r\n`);
        }
        this.ptyProcess = null;
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Falha ao iniciar PTY:', err);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('terminal:data', `\r\n[Erro ao iniciar terminal: ${err.message}]\r\n`);
      }
    }
  }

  write(data: string) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols: number, rows: number) {
    if (this.ptyProcess && cols > 0 && rows > 0) {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch {
        // Ignora se o processo estiver fechando
      }
    }
  }

  restart(cwd?: string, shellType?: ShellType, cols?: number, rows?: number) {
    this.start(cwd || this.currentCwd, shellType || this.currentShell, cols, rows);
  }

  kill() {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill();
      } catch (e) {
        console.error('Erro ao encerrar PTY:', e);
      }
      this.ptyProcess = null;
    }
  }
}
