import React from 'react';
import { FolderOpen, Terminal as TerminalIcon, FileText } from 'lucide-react';
import { OpenFile, CursorPosition } from '../../types/ide';
import { TabBar } from './TabBar';
import { CodeEditor } from './CodeEditor';
import { BRAND_LOGO_BASE64 } from '../../assets/brandLogo';

interface EditorAreaProps {
  tabs: OpenFile[];
  activeTab: OpenFile | undefined;
  activeTabPath: string | null;
  theme?: 'dark' | 'light';
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChangeContent: (content: string) => void;
  onCursorChange: (pos: CursorPosition) => void;
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  tabs,
  activeTab,
  activeTabPath,
  theme = 'dark',
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onCursorChange,
  onOpenFolder,
  onToggleTerminal,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-zeus-bg overflow-hidden relative bg-dot-pattern">
      {/* Tabs */}
      <TabBar
        tabs={tabs}
        activeTabPath={activeTabPath}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
      />

      {/* Editor or Empty State */}
      <div className="flex-1 relative overflow-hidden bg-dot-pattern">
        {activeTab ? (
          <CodeEditor
            key={activeTab.path}
            file={activeTab}
            theme={theme}
            onChangeContent={onChangeContent}
            onCursorChange={onCursorChange}
          />
        ) : (
          /* Welcome Screen */
          <div className="w-full h-full flex flex-col items-center justify-center select-none p-8 font-sans bg-dot-pattern">
            <div className="max-w-md w-full flex flex-col items-center space-y-6 text-center">
              {/* Brand Logo */}
              <div
                onClick={() => {
                  if (window.zeusAPI?.openExternal) {
                    window.zeusAPI.openExternal('https://www.youtube.com/@codigoroxo');
                  } else {
                    window.open('https://www.youtube.com/@codigoroxo', '_blank', 'noopener,noreferrer');
                  }
                }}
                className="cursor-pointer group flex flex-col items-center"
                title="Canal Código Roxo no YouTube"
              >
                <div className="w-16 h-16 rounded-2xl bg-zeus-panel border border-zeus-border flex items-center justify-center p-3 shadow-md group-hover:border-purple-500/50 group-hover:scale-105 transition-all duration-200">
                  <img
                    src={BRAND_LOGO_BASE64}
                    alt="Zeus IDE Logo"
                    className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(168,85,247,0.35)]"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold text-zeus-text tracking-wide font-sans">
                  Zeus IDE
                </h1>
                <p className="text-xs text-zeus-muted font-sans">
                  Editor de código e terminal integrado
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={onOpenFolder}
                  className="flex items-center space-x-2 px-3.5 py-1.5 rounded-md bg-zeus-panel hover:bg-zeus-hover border border-zeus-border hover:border-purple-500/40 text-zeus-text text-xs font-medium transition-all shadow-sm font-sans"
                >
                  <FolderOpen className="w-4 h-4 text-purple-500" />
                  <span>Abrir Pasta</span>
                </button>

                <button
                  onClick={onToggleTerminal}
                  className="flex items-center space-x-2 px-3.5 py-1.5 rounded-md bg-zeus-panel hover:bg-zeus-hover border border-zeus-border hover:border-purple-500/40 text-zeus-text text-xs font-medium transition-all shadow-sm font-sans"
                >
                  <TerminalIcon className="w-4 h-4 text-purple-500" />
                  <span>Abrir Terminal</span>
                </button>
              </div>

              {/* Shortcuts Table */}
              <div className="w-full bg-zeus-panel border border-zeus-border rounded-lg p-4 text-xs space-y-2.5 shadow-sm font-sans">
                <div className="text-xs text-zeus-muted font-medium border-b border-zeus-border pb-1.5 text-left flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-500" />
                  <span>Atalhos de teclado</span>
                </div>
                <div className="flex justify-between items-center text-zeus-text">
                  <span>Buscar arquivo</span>
                  <kbd className="px-2 py-0.5 bg-zeus-surface border border-zeus-border rounded text-[11px] text-zeus-text font-mono">
                    Ctrl + P
                  </kbd>
                </div>
                <div className="flex justify-between items-center text-zeus-text">
                  <span>Paleta de comandos</span>
                  <kbd className="px-2 py-0.5 bg-zeus-surface border border-zeus-border rounded text-[11px] text-zeus-text font-mono">
                    Ctrl + Shift + P
                  </kbd>
                </div>
                <div className="flex justify-between items-center text-zeus-text">
                  <span>Salvar arquivo</span>
                  <kbd className="px-2 py-0.5 bg-zeus-surface border border-zeus-border rounded text-[11px] text-zeus-text font-mono">
                    Ctrl + S
                  </kbd>
                </div>
                <div className="flex justify-between items-center text-zeus-text">
                  <span>Fechar aba</span>
                  <kbd className="px-2 py-0.5 bg-zeus-surface border border-zeus-border rounded text-[11px] text-zeus-text font-mono">
                    Ctrl + W
                  </kbd>
                </div>
                <div className="flex justify-between items-center text-zeus-text">
                  <span>Alternar terminal</span>
                  <kbd className="px-2 py-0.5 bg-zeus-surface border border-zeus-border rounded text-[11px] text-zeus-text font-mono">
                    Ctrl + `
                  </kbd>
                </div>
                <div className="flex justify-between items-center text-zeus-text">
                  <span>Buscar no editor</span>
                  <kbd className="px-2 py-0.5 bg-zeus-surface border border-zeus-border rounded text-[11px] text-zeus-text font-mono">
                    Ctrl + F
                  </kbd>
                </div>
              </div>

              {/* Channel Footer */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    if (window.zeusAPI?.openExternal) {
                      window.zeusAPI.openExternal('https://www.youtube.com/@codigoroxo');
                    } else {
                      window.open('https://www.youtube.com/@codigoroxo', '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline transition-colors font-sans"
                  title="Visitar o canal Código Roxo no YouTube"
                >
                  <span className="text-zeus-muted">Canal oficial:</span>
                  <span className="font-medium">Código Roxo</span>
                  <span className="text-[11px] opacity-75">↗</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
