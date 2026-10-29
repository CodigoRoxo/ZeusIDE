import React from 'react';
import { Terminal as TerminalIcon, Check, CircleAlert } from 'lucide-react';
import { OpenFile, CursorPosition } from '../../types/ide';

interface StatusBarProps {
  activeTab: OpenFile | undefined;
  cursorPos: CursorPosition;
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
  rootPath: string | null;
  shellType?: 'cmd' | 'powershell';
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeTab,
  cursorPos,
  isTerminalOpen,
  onToggleTerminal,
  rootPath,
  shellType = 'cmd',
}) => {
  return (
    <footer className="h-6 bg-zeus-surface border-t border-zeus-border px-3 flex items-center justify-between text-[11px] font-sans select-none text-zeus-muted shrink-0">
      {/* Left side */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleTerminal}
          className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition-colors ${
            isTerminalOpen
              ? 'text-purple-600 dark:text-purple-300 bg-zeus-panel font-medium'
              : 'hover:text-zeus-text hover:bg-zeus-hover'
          }`}
          title="Alternar Terminal (Ctrl+`)"
        >
          <TerminalIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          <span>{shellType === 'cmd' ? 'CMD' : 'PowerShell'}</span>
        </button>

        {rootPath && (
          <span className="truncate max-w-[250px] text-zeus-muted hidden md:inline font-mono text-[10px]">
            {rootPath}
          </span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Save Status Indicator */}
        {activeTab && (
          <div className="flex items-center space-x-1">
            {activeTab.isDirty ? (
              <span className="flex items-center space-x-1 text-purple-600 dark:text-purple-400 font-medium">
                <CircleAlert className="w-3 h-3" />
                <span>Não salvo (Ctrl+S)</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3 h-3" />
                <span>Salvo</span>
              </span>
            )}
          </div>
        )}

        {/* Cursor position */}
        {activeTab && (
          <span>
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>
        )}

        {/* Language */}
        {activeTab && (
          <span className="uppercase text-purple-600 dark:text-purple-300 font-semibold">
            {activeTab.language}
          </span>
        )}

        <span>UTF-8</span>

        {/* Creator / Channel Link */}
        <button
          onClick={() => {
            if (window.zeusAPI?.openExternal) {
              window.zeusAPI.openExternal('https://www.youtube.com/@codigoroxo');
            } else {
              window.open('https://www.youtube.com/@codigoroxo', '_blank', 'noopener,noreferrer');
            }
          }}
          className="flex items-center space-x-1 text-purple-600 dark:text-purple-400 hover:underline transition-colors font-medium text-[10px]"
          title="Canal Código Roxo no YouTube (youtube.com/@codigoroxo)"
        >
          <span>Código Roxo</span>
          <span className="text-[9px]">↗</span>
        </button>
      </div>
    </footer>
  );
};
