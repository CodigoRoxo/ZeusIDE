import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { RotateCw, Trash2, X, Terminal as TerminalIcon } from 'lucide-react';

export type ShellType = 'cmd' | 'powershell';

function getTerminalTheme(theme: 'dark' | 'light') {
  if (theme === 'light') {
    return {
      background: '#edf0f4',
      foreground: '#111620',
      cursor: '#8b2fc9',
      cursorAccent: '#edf0f4',
      selectionBackground: '#d4e0fc',
      black: '#111620',
      red: '#dc2626',
      green: '#16a34a',
      yellow: '#d97706',
      blue: '#2563eb',
      magenta: '#8b2fc9',
      cyan: '#0891b2',
      white: '#edf0f4',
      brightBlack: '#64748b',
      brightRed: '#ef4444',
      brightGreen: '#22c55e',
      brightYellow: '#f59e0b',
      brightBlue: '#3b82f6',
      brightMagenta: '#a855f7',
      brightCyan: '#06b6d4',
      brightWhite: '#f7f9fa',
    };
  }
  return {
    background: '#161922',
    foreground: '#f1f3f7',
    cursor: '#e879f9',
    cursorAccent: '#161922',
    selectionBackground: '#3d255466',
    black: '#161922',
    red: '#f43f5e',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#38bdf8',
    magenta: '#d946ef',
    cyan: '#06b6d4',
    white: '#e2e8f0',
    brightBlack: '#475569',
    brightRed: '#fb7185',
    brightGreen: '#34d399',
    brightYellow: '#fbbf24',
    brightBlue: '#60a5fa',
    brightMagenta: '#f472b6',
    brightCyan: '#22d3ee',
    brightWhite: '#ffffff',
  };
}

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cwd?: string | null;
  shellType?: ShellType;
  theme?: 'dark' | 'light';
  onShellChange?: (shell: ShellType) => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  isOpen,
  onClose,
  cwd,
  shellType = 'cmd',
  theme = 'dark',
  onShellChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [panelHeight, setPanelHeight] = useState<number>(240);
  const isDraggingRef = useRef<boolean>(false);

  // Initialize xterm
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const term = new Terminal({
      theme: getTerminalTheme(theme),
      fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    terminalInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Hook to backend terminal with zero-delay node-pty ConPTY
    if (window.zeusAPI?.terminal) {
      const cols = term.cols || 80;
      const rows = term.rows || 24;

      window.zeusAPI.terminal.start(cwd || undefined, shellType, cols, rows);

      const unsubscribe = window.zeusAPI.terminal.onData((data) => {
        term.write(data);
      });

      const onDataDisposable = term.onData((data) => {
        window.zeusAPI.terminal.write(data);
      });

      const handleResize = () => {
        try {
          fitAddon.fit();
          if (term.cols > 0 && term.rows > 0) {
            window.zeusAPI.terminal.resize(term.cols, term.rows);
          }
        } catch {
          // ignore when unmounting
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        unsubscribe();
        onDataDisposable.dispose();
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    }

    return () => {
      term.dispose();
    };
  }, [isOpen, shellType]);

  // If cwd changes and terminal is already open, restart in new cwd
  useEffect(() => {
    if (isOpen && cwd && window.zeusAPI?.terminal && terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      window.zeusAPI.terminal.restart(
        cwd,
        shellType,
        terminalInstanceRef.current.cols,
        terminalInstanceRef.current.rows
      );
    }
  }, [cwd, shellType]);

  // Update terminal theme when dark/light mode toggles
  useEffect(() => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.options.theme = getTerminalTheme(theme);
    }
  }, [theme]);

  // Resize drag handle handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const startY = e.clientY;
    const startHeight = panelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(Math.max(startHeight + deltaY, 120), window.innerHeight * 0.75);
      setPanelHeight(newHeight);
      fitAddonRef.current?.fit();
      if (terminalInstanceRef.current && window.zeusAPI?.terminal) {
        window.zeusAPI.terminal.resize(
          terminalInstanceRef.current.cols,
          terminalInstanceRef.current.rows
        );
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      fitAddonRef.current?.fit();
      if (terminalInstanceRef.current && window.zeusAPI?.terminal) {
        window.zeusAPI.terminal.resize(
          terminalInstanceRef.current.cols,
          terminalInstanceRef.current.rows
        );
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [panelHeight]);

  const handleClear = () => {
    terminalInstanceRef.current?.clear();
  };

  const handleRestart = () => {
    if (window.zeusAPI?.terminal && terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      window.zeusAPI.terminal.restart(
        cwd || undefined,
        shellType,
        terminalInstanceRef.current.cols,
        terminalInstanceRef.current.rows
      );
    }
  };

  const handleSwitchShell = (newShell: ShellType) => {
    if (newShell === shellType) return;
    onShellChange?.(newShell);
    if (terminalInstanceRef.current && window.zeusAPI?.terminal) {
      terminalInstanceRef.current.clear();
      window.zeusAPI.terminal.restart(
        cwd || undefined,
        newShell,
        terminalInstanceRef.current.cols,
        terminalInstanceRef.current.rows
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ height: `${panelHeight}px` }}
      className="w-full bg-zeus-bg border-t border-zeus-border flex flex-col shrink-0 relative select-none"
    >
      {/* Top drag resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-purple-500/25 transition-colors z-20"
      />

      {/* Terminal Title Bar */}
      <div className="h-8 bg-zeus-surface border-b border-zeus-border px-3 flex items-center justify-between text-xs font-sans">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <TerminalIcon className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-medium text-slate-200">Terminal</span>
          </div>

          {/* Clean Shell Switcher: CMD / PowerShell */}
          <div className="flex items-center bg-zeus-panel border border-zeus-border rounded p-0.5 text-[10px]">
            <button
              onClick={() => handleSwitchShell('cmd')}
              className={`px-2 py-0.5 rounded font-mono transition-colors ${
                shellType === 'cmd'
                  ? 'bg-zeus-border text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mudar para Prompt de Comando (CMD)"
            >
              CMD
            </button>
            <button
              onClick={() => handleSwitchShell('powershell')}
              className={`px-2 py-0.5 rounded font-mono transition-colors ${
                shellType === 'powershell'
                  ? 'bg-zeus-border text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mudar para PowerShell"
            >
              PowerShell
            </button>
          </div>

          {cwd && (
            <span className="text-[11px] text-slate-500 truncate max-w-sm hidden md:inline font-mono">
              {cwd}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-zeus-hover rounded transition-colors"
            title="Limpar Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRestart}
            className="p-1 text-slate-400 hover:text-purple-400 hover:bg-zeus-hover rounded transition-colors"
            title="Reiniciar Sessão"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-zeus-hover rounded transition-colors"
            title="Fechar Painel (Ctrl+`)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full p-2 overflow-hidden bg-zeus-bg"
      />
    </div>
  );
};
