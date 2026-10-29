import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/sidebar/Sidebar';
import { EditorArea } from './components/editor/EditorArea';
import { TerminalPanel, ShellType } from './components/terminal/TerminalPanel';
import { StatusBar } from './components/statusbar/StatusBar';
import { CommandPalette, PaletteCommand } from './components/palette/CommandPalette';
import { useFileSystem } from './hooks/useFileSystem';
import { useTabs } from './hooks/useTabs';
import { CursorPosition } from './types/ide';

const SESSION_KEY = 'zeus_session';

interface SavedSession {
  rootPath: string | null;
  expandedFolders: string[];
  openTabs: string[];
  activeTab: string | null;
}

const fileNameOf = (p: string) => p.replace(/\\/g, '/').split('/').pop() || p;

export const App: React.FC = () => {
  const {
    rootPath,
    fileTree,
    expandedFolders,
    isLoading,
    openFolder,
    openFolderPath,
    refreshTree,
    toggleFolder,
    createFile,
    createFolder,
    deleteItem,
    renameItem,
  } = useFileSystem();

  const {
    tabs,
    activeTab,
    activeTabPath,
    setActiveTabPath,
    openFile,
    closeTab,
    updateContent,
    handlePathRenamed,
    handlePathDeleted,
    reloadChangedFiles,
    saveActiveFile,
    saveAll,
  } = useTabs();

  const handleRenameItem = async (oldPath: string, newName: string) => {
    const newPath = await renameItem(oldPath, newName);
    if (newPath) handlePathRenamed(oldPath, newPath);
  };

  const handleDeleteItem = async (itemPath: string) => {
    if (await deleteItem(itemPath)) handlePathDeleted(itemPath);
  };

  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [shellType, setShellType] = useState<ShellType>('cmd');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('zeus_theme') as 'dark' | 'light') || 'dark';
  });
  const [cursorPos, setCursorPos] = useState<CursorPosition>({ line: 1, column: 1 });

  // Sync dark class on document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('zeus_theme', theme);
  }, [theme]);

  // Toggle terminal handler
  const handleToggleTerminal = () => {
    setIsTerminalOpen((prev) => !prev);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Command palette: '' opens the file finder (Ctrl+P), '>' the command list (Ctrl+Shift+P)
  const [paletteQuery, setPaletteQuery] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<string[] | null>(null);
  const projectFilesStale = useRef(true);

  const openPalette = (initialQuery: '' | '>') => {
    setPaletteQuery(initialQuery);
    if (initialQuery === '' && rootPath && projectFilesStale.current) {
      projectFilesStale.current = false;
      window.zeusAPI?.listFiles(rootPath).then(setProjectFiles).catch(() => setProjectFiles([]));
    }
  };

  // A new project invalidates the quick-open index
  useEffect(() => {
    setProjectFiles(null);
    projectFilesStale.current = true;
  }, [rootPath]);

  // Keyboard shortcuts. Capture phase so the editor and terminal don't swallow them.
  const openPaletteRef = useRef(openPalette);
  openPaletteRef.current = openPalette;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === '`') {
        e.preventDefault();
        handleToggleTerminal();
      } else if (key === 'o') {
        e.preventDefault();
        openFolder();
      } else if (key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        openPaletteRef.current(e.shiftKey ? '>' : '');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [openFolder]);

  // Restore the last session (folder, expanded folders and open tabs) on startup
  const sessionRestored = useRef(false);
  useEffect(() => {
    const restore = async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        const session = raw ? (JSON.parse(raw) as SavedSession) : null;
        if (session?.rootPath && (await openFolderPath(session.rootPath, session.expandedFolders))) {
          for (const path of session.openTabs ?? []) {
            await openFile({ name: fileNameOf(path), path, isDirectory: false });
          }
          if (session.activeTab) setActiveTabPath(session.activeTab);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        sessionRestored.current = true;
      }
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the session whenever it changes (after the restore finished)
  const tabPaths = tabs.map((t) => t.path).join('\n');
  useEffect(() => {
    if (!sessionRestored.current) return;
    const session: SavedSession = {
      rootPath,
      expandedFolders: [...expandedFolders].filter((p) => p !== rootPath),
      openTabs: tabPaths ? tabPaths.split('\n') : [],
      activeTab: activeTabPath,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Storage full or unavailable: the session just won't be remembered
    }
  }, [rootPath, expandedFolders, tabPaths, activeTabPath]);

  // React to changes made outside the IDE (git, npm, other editors)
  const refreshTreeRef = useRef(refreshTree);
  refreshTreeRef.current = refreshTree;
  useEffect(() => {
    if (!window.zeusAPI?.onFilesChanged) return;
    return window.zeusAPI.onFilesChanged((paths) => {
      refreshTreeRef.current(true);
      reloadChangedFiles(paths);
      projectFilesStale.current = true;
    });
  }, [reloadChangedFiles]);

  const paletteCommands = useMemo<PaletteCommand[]>(() => [
    { id: 'file.goto', label: 'Ir para arquivo...', shortcut: 'Ctrl + P', run: () => setTimeout(() => openPaletteRef.current(''), 0) },
    { id: 'folder.open', label: 'Abrir pasta...', shortcut: 'Ctrl + O', run: openFolder },
    { id: 'file.save', label: 'Salvar arquivo', shortcut: 'Ctrl + S', run: saveActiveFile },
    { id: 'file.saveAll', label: 'Salvar todos os arquivos', run: () => { saveAll(); } },
    { id: 'tab.close', label: 'Fechar aba ativa', shortcut: 'Ctrl + W', run: () => { if (activeTabPath) closeTab(activeTabPath); } },
    { id: 'terminal.toggle', label: 'Alternar terminal', shortcut: 'Ctrl + `', run: handleToggleTerminal },
    { id: 'terminal.cmd', label: 'Terminal: usar Prompt de Comando (CMD)', run: () => { setShellType('cmd'); setIsTerminalOpen(true); } },
    { id: 'terminal.powershell', label: 'Terminal: usar PowerShell', run: () => { setShellType('powershell'); setIsTerminalOpen(true); } },
    { id: 'theme.toggle', label: `Mudar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`, run: handleToggleTheme },
    { id: 'explorer.refresh', label: 'Recarregar explorador de arquivos', run: () => refreshTree() },
    { id: 'help.channel', label: 'Abrir canal Código Roxo no YouTube', run: () => window.zeusAPI?.openExternal('https://www.youtube.com/@codigoroxo') },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [openFolder, saveActiveFile, saveAll, activeTabPath, closeTab, theme, refreshTree]);

  // Hide preloader splash screen once React workspace is mounted
  useEffect(() => {
    ((window as unknown) as { hideZeusSplash?: () => void }).hideZeusSplash?.();
  }, []);

  // Project display name
  const projectName = rootPath ? rootPath.replace(/\\/g, '/').split('/').pop() : null;

  return (
    <div className="h-screen w-screen flex flex-col bg-zeus-bg text-zeus-text overflow-hidden">
      {/* Title Bar */}
      <TitleBar
        projectName={projectName}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenFolder={openFolder}
        onToggleTerminal={handleToggleTerminal}
        isTerminalOpen={isTerminalOpen}
      />

      {/* Workspace Area: Sidebar + Editor + Terminal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          rootPath={rootPath}
          fileTree={fileTree}
          expandedFolders={expandedFolders}
          activeFilePath={activeTabPath}
          isLoading={isLoading}
          onOpenFolder={openFolder}
          onRefresh={() => refreshTree()}
          onSelectFile={openFile}
          onToggleFolder={toggleFolder}
          onCreateFile={createFile}
          onCreateFolder={createFolder}
          onDeleteItem={handleDeleteItem}
          onRenameItem={handleRenameItem}
        />

        {/* Central Work Area: Editor & Terminal */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <EditorArea
            tabs={tabs}
            activeTab={activeTab}
            activeTabPath={activeTabPath}
            theme={theme}
            onSelectTab={setActiveTabPath}
            onCloseTab={closeTab}
            onChangeContent={(content) => {
              if (activeTabPath) updateContent(activeTabPath, content);
            }}
            onCursorChange={setCursorPos}
            onOpenFolder={openFolder}
            onToggleTerminal={handleToggleTerminal}
          />

          {/* Terminal Drawer (CMD / PowerShell) */}
          <TerminalPanel
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
            cwd={rootPath}
            shellType={shellType}
            theme={theme}
            onShellChange={setShellType}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        activeTab={activeTab}
        cursorPos={cursorPos}
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={handleToggleTerminal}
        rootPath={rootPath}
        shellType={shellType}
      />

      <CommandPalette
        isOpen={paletteQuery !== null}
        initialQuery={paletteQuery ?? ''}
        rootPath={rootPath}
        files={projectFiles}
        commands={paletteCommands}
        onOpenFile={(path) => openFile({ name: fileNameOf(path), path, isDirectory: false })}
        onClose={() => setPaletteQuery(null)}
      />
    </div>
  );
};

export default App;
