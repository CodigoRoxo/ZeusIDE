import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/sidebar/Sidebar';
import { EditorArea } from './components/editor/EditorArea';
import { TerminalPanel, ShellType } from './components/terminal/TerminalPanel';
import { StatusBar } from './components/statusbar/StatusBar';
import { CommandPalette, PaletteCommand } from './components/palette/CommandPalette';
import { useFileSystem } from './hooks/useFileSystem';
import { useTabs } from './hooks/useTabs';
import { useZoom } from './hooks/useZoom';
import { CursorPosition, EditorGroup } from './types/ide';
import { IconThemeContext, IconThemeId, ICON_THEMES, ICON_THEME_KEY, loadIconTheme } from './theme/iconTheme';

const SESSION_KEY = 'zeus_session';

interface SavedSession {
  rootPath: string | null;
  expandedFolders: string[];
  /** Editor columns with their tabs (split editor) */
  groups?: EditorGroup[];
  activeGroup?: number;
  /** Older sessions (before the split editor) only stored one tab list */
  openTabs?: string[];
  activeTab?: string | null;
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
    files,
    groups,
    activeGroup,
    activeTab,
    activeTabPath,
    selectTab,
    focusGroup,
    openFile,
    closeTab,
    moveTab,
    splitEditor,
    closeGroup,
    updateContent,
    handlePathRenamed,
    handlePathDeleted,
    reloadChangedFiles,
    saveActiveFile,
    saveAll,
  } = useTabs();

  const {
    uiZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    editorFontSize,
    changeEditorFontSize,
    resetEditorFontSize,
    isPresentation,
    togglePresentation,
  } = useZoom();

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
  const [iconTheme, setIconTheme] = useState<IconThemeId>(loadIconTheme);
  const iconThemeContext = useMemo(() => ({ iconTheme, uiTheme: theme }), [iconTheme, theme]);

  useEffect(() => {
    try {
      localStorage.setItem(ICON_THEME_KEY, iconTheme);
    } catch {
      // Preference just won't persist
    }
  }, [iconTheme]);

  const handleToggleIconTheme = () => {
    setIconTheme((prev) => (prev === 'zeus' ? 'material' : 'zeus'));
  };
  const iconThemeLabel = ICON_THEMES.find((t) => t.id === iconTheme)?.label ?? iconTheme;

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
      } else if (key === '\\') {
        e.preventDefault();
        e.stopPropagation();
        splitEditor();
      } else if ((key === '1' || key === '2') && !e.shiftKey && !e.altKey) {
        // Ctrl+1 / Ctrl+2 jump to the left / right editor
        e.preventDefault();
        e.stopPropagation();
        focusGroup(Number(key) - 1);
      } else if ((key === '=' || key === '+') && !e.altKey) {
        // Ctrl+= / Ctrl++ (also numpad +) zoom the whole interface
        e.preventDefault();
        e.stopPropagation();
        zoomIn();
      } else if ((key === '-' || key === '_') && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        zoomOut();
      } else if (key === '0' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [openFolder, splitEditor, focusGroup, zoomIn, zoomOut, resetZoom]);

  // Restore the last session (folder, expanded folders and open tabs) on startup
  const sessionRestored = useRef(false);
  useEffect(() => {
    const restore = async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        const session = raw ? (JSON.parse(raw) as SavedSession) : null;
        if (session?.rootPath && (await openFolderPath(session.rootPath, session.expandedFolders))) {
          const savedGroups: EditorGroup[] = session.groups ?? [
            { tabs: session.openTabs ?? [], active: session.activeTab ?? null },
          ];
          for (const [groupIndex, group] of savedGroups.entries()) {
            for (const path of group.tabs) {
              await openFile({ name: fileNameOf(path), path, isDirectory: false }, { group: groupIndex });
            }
          }
          // Files that no longer exist are skipped, so groups may have shifted
          for (const [groupIndex, group] of savedGroups.entries()) {
            if (group.active) selectTab(groupIndex, group.active);
          }
          focusGroup(session.activeGroup ?? 0);
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
  const groupsKey = JSON.stringify(groups);
  useEffect(() => {
    if (!sessionRestored.current) return;
    const session: SavedSession = {
      rootPath,
      expandedFolders: [...expandedFolders].filter((p) => p !== rootPath),
      groups: JSON.parse(groupsKey) as EditorGroup[],
      activeGroup,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Storage full or unavailable: the session just won't be remembered
    }
  }, [rootPath, expandedFolders, groupsKey, activeGroup]);

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
    { id: 'editor.split', label: 'Dividir editor (abrir ao lado)', shortcut: 'Ctrl + \\', run: splitEditor },
    { id: 'editor.closeGroup', label: 'Fechar painel dividido', run: () => { if (groups.length > 1) closeGroup(activeGroup); } },
    { id: 'editor.focusLeft', label: 'Ir para o editor da esquerda', shortcut: 'Ctrl + 1', run: () => focusGroup(0) },
    { id: 'editor.focusRight', label: 'Ir para o editor da direita', shortcut: 'Ctrl + 2', run: () => focusGroup(1) },
    { id: 'terminal.toggle', label: 'Alternar terminal', shortcut: 'Ctrl + `', run: handleToggleTerminal },
    { id: 'terminal.cmd', label: 'Terminal: usar Prompt de Comando (CMD)', run: () => { setShellType('cmd'); setIsTerminalOpen(true); } },
    { id: 'terminal.powershell', label: 'Terminal: usar PowerShell', run: () => { setShellType('powershell'); setIsTerminalOpen(true); } },
    { id: 'zoom.in', label: 'Aumentar zoom da interface', shortcut: 'Ctrl + =', run: zoomIn },
    { id: 'zoom.out', label: 'Diminuir zoom da interface', shortcut: 'Ctrl + -', run: zoomOut },
    { id: 'zoom.reset', label: 'Restaurar zoom da interface (100%)', shortcut: 'Ctrl + 0', run: resetZoom },
    { id: 'font.bigger', label: 'Aumentar fonte do editor', shortcut: 'Ctrl + roda', run: () => changeEditorFontSize(1) },
    { id: 'font.smaller', label: 'Diminuir fonte do editor', shortcut: 'Ctrl + roda', run: () => changeEditorFontSize(-1) },
    { id: 'font.reset', label: 'Restaurar fonte do editor', run: resetEditorFontSize },
    { id: 'presentation.toggle', label: isPresentation ? 'Sair do modo apresentação' : 'Modo apresentação (gravar aulas)', run: togglePresentation },
    { id: 'theme.toggle', label: `Mudar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`, run: handleToggleTheme },
    ...ICON_THEMES.map((t) => ({
      id: `icons.${t.id}`,
      label: `Tema de ícones: ${t.label}${t.id === iconTheme ? ' (atual)' : ''}`,
      run: () => setIconTheme(t.id),
    })),
    { id: 'explorer.refresh', label: 'Recarregar explorador de arquivos', run: () => refreshTree() },
    { id: 'help.channel', label: 'Abrir canal Código Roxo no YouTube', run: () => window.zeusAPI?.openExternal('https://www.youtube.com/@codigoroxo') },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [openFolder, saveActiveFile, saveAll, activeTabPath, closeTab, theme, refreshTree, splitEditor, closeGroup, focusGroup, groups.length, activeGroup, iconTheme, zoomIn, zoomOut, resetZoom, changeEditorFontSize, resetEditorFontSize, isPresentation, togglePresentation]);

  // Hide preloader splash screen once React workspace is mounted
  useEffect(() => {
    ((window as unknown) as { hideZeusSplash?: () => void }).hideZeusSplash?.();
  }, []);

  // Project display name
  const projectName = rootPath ? rootPath.replace(/\\/g, '/').split('/').pop() : null;

  return (
    <IconThemeContext.Provider value={iconThemeContext}>
      <div className="h-screen w-screen flex flex-col bg-zeus-bg text-zeus-text overflow-hidden">
        {/* Title Bar */}
        <TitleBar
          projectName={projectName}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenFolder={openFolder}
          onToggleTerminal={handleToggleTerminal}
          isTerminalOpen={isTerminalOpen}
          isPresentation={isPresentation}
          onTogglePresentation={togglePresentation}
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
            onSelectFile={(node, toSide) => openFile(node, { toSide })}
            onToggleFolder={toggleFolder}
            onCreateFile={createFile}
            onCreateFolder={createFolder}
            onDeleteItem={handleDeleteItem}
            onRenameItem={handleRenameItem}
            iconThemeLabel={iconThemeLabel}
            onToggleIconTheme={handleToggleIconTheme}
          />

          {/* Central Work Area: Editor & Terminal */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <EditorArea
              files={files}
              groups={groups}
              activeGroup={activeGroup}
              theme={theme}
              onSelectTab={selectTab}
              onCloseTab={closeTab}
              onFocusGroup={focusGroup}
              onMoveTab={moveTab}
              onSplit={splitEditor}
              onCloseGroup={closeGroup}
              onChangeContent={updateContent}
              onCursorChange={setCursorPos}
              onOpenFolder={openFolder}
              onToggleTerminal={handleToggleTerminal}
              editorFontSize={editorFontSize}
              showMinimap={!isPresentation}
              onZoomFont={changeEditorFontSize}
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
          uiZoom={uiZoom}
          editorFontSize={editorFontSize}
          isPresentation={isPresentation}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onTogglePresentation={togglePresentation}
        />

        <CommandPalette
          isOpen={paletteQuery !== null}
          initialQuery={paletteQuery ?? ''}
          rootPath={rootPath}
          files={projectFiles}
          commands={paletteCommands}
          onOpenFile={(path, toSide) => openFile({ name: fileNameOf(path), path, isDirectory: false }, { toSide })}
          onClose={() => setPaletteQuery(null)}
        />
      </div>
    </IconThemeContext.Provider>
  );
};

export default App;
