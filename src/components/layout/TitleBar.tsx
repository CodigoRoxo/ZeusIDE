import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, FolderOpen, Terminal as TerminalIcon, Sun, Moon, Presentation } from 'lucide-react';
import { BRAND_LOGO_BASE64 } from '../../assets/brandLogo';

interface TitleBarProps {
  projectName?: string | null;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
  isTerminalOpen: boolean;
  isPresentation?: boolean;
  onTogglePresentation?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  projectName,
  theme = 'dark',
  onToggleTheme,
  onOpenFolder,
  onToggleTerminal,
  isTerminalOpen,
  isPresentation = false,
  onTogglePresentation,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.zeusAPI?.window) {
      window.zeusAPI.window.isMaximized().then(setIsMaximized);
    }
  }, []);

  const handleMinimize = () => window.zeusAPI?.window.minimize();
  const handleMaximize = async () => {
    window.zeusAPI?.window.maximize();
    const max = await window.zeusAPI?.window.isMaximized();
    setIsMaximized(max);
  };
  const handleClose = () => window.zeusAPI?.window.close();
  const handleOpenChannel = () => {
    if (window.zeusAPI?.openExternal) {
      window.zeusAPI.openExternal('https://www.youtube.com/@codigoroxo');
    } else {
      window.open('https://www.youtube.com/@codigoroxo', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <header
      className="h-10 bg-zeus-surface border-b border-zeus-border flex items-center justify-between px-3 select-none z-50 font-sans"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: Brand Logo & Quick Actions */}
      <div className="flex items-center space-x-3 no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center space-x-2 cursor-pointer" onClick={handleOpenChannel} title="Código Roxo - Canal no YouTube">
          <img
            src={BRAND_LOGO_BASE64}
            alt="Zeus IDE Logo"
            className="w-5 h-5 object-contain"
          />
          <div className="flex items-baseline space-x-1">
            <span className="font-semibold text-xs tracking-wider text-zeus-text font-sans">
              ZEUS
            </span>
            <span className="text-[10px] font-mono text-purple-500 font-normal">
              IDE
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center space-x-1 pl-2 border-l border-zeus-border">
          <button
            onClick={onOpenFolder}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs text-zeus-text hover:bg-zeus-hover border border-transparent hover:border-zeus-border transition-all"
            title="Abrir pasta de projeto"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zeus-muted" />
            <span>Abrir pasta</span>
          </button>

          <button
            onClick={onToggleTerminal}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
              isTerminalOpen
                ? 'bg-zeus-panel text-purple-400 border-purple-500/30'
                : 'text-zeus-muted hover:text-zeus-text hover:bg-zeus-hover border-transparent'
            }`}
            title="Alternar terminal (Ctrl+`)"
          >
            <TerminalIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>Terminal</span>
          </button>
        </div>
      </div>

      {/* Center: Current Project / Workspace Name */}
      <div className="text-xs text-zeus-muted truncate max-w-[40%] flex items-center space-x-2">
        {projectName ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span className="text-zeus-text font-medium">{projectName}</span>
          </>
        ) : (
          <span className="text-zeus-muted text-xs italic">Nenhum projeto aberto</span>
        )}
      </div>

      {/* Right: Channel Link, Theme Toggle & Window Controls */}
      <div
        className="flex items-center space-x-1 no-drag"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleOpenChannel}
          className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all mr-1 font-medium font-sans"
          title="Abrir canal Código Roxo no YouTube (youtube.com/@codigoroxo)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          <span>Código Roxo</span>
        </button>

        {onTogglePresentation && (
          <button
            onClick={onTogglePresentation}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
              isPresentation
                ? 'text-purple-600 dark:text-purple-300 bg-purple-500/15'
                : 'text-zeus-muted hover:text-zeus-text hover:bg-zeus-hover'
            }`}
            title={isPresentation ? 'Sair do modo apresentação' : 'Modo apresentação (zoom grande para gravar aulas)'}
          >
            <Presentation className="w-3.5 h-3.5" />
          </button>
        )}

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="w-7 h-7 flex items-center justify-center text-zeus-muted hover:text-zeus-text hover:bg-zeus-hover rounded transition-colors mr-1"
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-purple-600" />
            )}
          </button>
        )}

        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center text-zeus-muted hover:text-zeus-text hover:bg-zeus-hover rounded transition-colors"
          title="Minimizar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center text-zeus-muted hover:text-zeus-text hover:bg-zeus-hover rounded transition-colors"
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center text-zeus-muted hover:text-white hover:bg-rose-600 rounded transition-colors"
          title="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
