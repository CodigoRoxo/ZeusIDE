import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { FolderOpen, Terminal as TerminalIcon, FileText } from 'lucide-react';
import { OpenFile, CursorPosition, EditorGroup } from '../../types/ide';
import { TabBar, DraggedTab, readDraggedTab, TAB_DRAG_TYPE } from './TabBar';
import { CodeEditor } from './CodeEditor';
import { BRAND_LOGO_BASE64 } from '../../assets/brandLogo';
import { MAX_GROUPS } from '../../hooks/useTabs';

interface EditorAreaProps {
  files: OpenFile[];
  groups: EditorGroup[];
  activeGroup: number;
  theme?: 'dark' | 'light';
  onSelectTab: (groupIndex: number, path: string) => void;
  onCloseTab: (path: string, groupIndex: number) => void;
  onFocusGroup: (groupIndex: number) => void;
  onMoveTab: (path: string, from: number, to: number, beforePath?: string) => void;
  onSplit: () => void;
  onCloseGroup: (groupIndex: number) => void;
  onChangeContent: (path: string, content: string) => void;
  onCursorChange: (pos: CursorPosition) => void;
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
}

// Limits for the split divider, as a fraction of the editor width
const MIN_SPLIT = 0.2;
const MAX_SPLIT = 0.8;

export const EditorArea: React.FC<EditorAreaProps> = ({
  files,
  groups,
  activeGroup,
  theme = 'dark',
  onSelectTab,
  onCloseTab,
  onFocusGroup,
  onMoveTab,
  onSplit,
  onCloseGroup,
  onChangeContent,
  onCursorChange,
  onOpenFolder,
  onToggleTerminal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  // Which drop zone is highlighted while a tab is dragged over an editor
  const [dropZone, setDropZone] = useState<{ group: number; side: 'center' | 'right' } | null>(null);

  // Dispose Monaco models of files that are no longer open in any group
  const openUris = files.map((f) => monaco.Uri.parse(f.path).toString()).join('\n');
  useEffect(() => {
    const open = new Set(openUris ? openUris.split('\n') : []);
    for (const model of monaco.editor.getModels()) {
      if (!open.has(model.uri.toString())) model.dispose();
    }
  }, [openUris]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const ratio = (moveEvent.clientX - rect.left) / rect.width;
      setSplitRatio(Math.min(Math.max(ratio, MIN_SPLIT), MAX_SPLIT));
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Dropping a tab on an editor moves it there; on the right half of a single
  // editor it opens a new group to the side
  const zoneFor = (e: React.DragEvent): 'center' | 'right' => {
    if (groups.length >= MAX_GROUPS) return 'center';
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX > rect.left + rect.width / 2 ? 'right' : 'center';
  };

  const handleEditorDrop = (e: React.DragEvent, groupIndex: number) => {
    const tab = readDraggedTab(e);
    const zone = zoneFor(e);
    setDropZone(null);
    if (!tab) return;
    e.preventDefault();
    if (zone === 'right') onMoveTab(tab.path, tab.from, groups.length);
    else onMoveTab(tab.path, tab.from, groupIndex);
  };

  const handleTabBarDrop = (tab: DraggedTab, groupIndex: number, beforePath?: string) => {
    setDropZone(null);
    onMoveTab(tab.path, tab.from, groupIndex, beforePath);
  };

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full bg-zeus-bg overflow-hidden relative bg-dot-pattern">
        <div className="flex-1 relative overflow-hidden bg-dot-pattern">
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
                  <span>Dividir editor</span>
                  <kbd className="px-2 py-0.5 bg-zeus-surface border border-zeus-border rounded text-[11px] text-zeus-text font-mono">
                    Ctrl + \
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
        </div>
      </div>
    );
  }

  const isSplit = groups.length > 1;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex h-full bg-zeus-bg overflow-hidden"
      onDragEnd={() => setDropZone(null)}
    >
      {groups.map((group, groupIndex) => {
        const groupTabs = group.tabs
          .map((path) => files.find((f) => f.path === path))
          .filter((f): f is OpenFile => Boolean(f));
        const activeFile = files.find((f) => f.path === group.active);
        const zone = dropZone?.group === groupIndex ? dropZone.side : null;

        return (
          <React.Fragment key={groupIndex}>
            {groupIndex > 0 && (
              <div
                onMouseDown={handleResizeStart}
                onDoubleClick={() => setSplitRatio(0.5)}
                className="w-1 shrink-0 bg-zeus-border hover:bg-purple-500/60 cursor-col-resize transition-colors"
                title="Arraste para redimensionar (duplo clique centraliza)"
              />
            )}

            <div
              className="flex flex-col h-full min-w-0 overflow-hidden"
              style={{ flex: isSplit ? `${groupIndex === 0 ? splitRatio : 1 - splitRatio} 1 0` : '1 1 0' }}
              onMouseDownCapture={() => onFocusGroup(groupIndex)}
            >
              <TabBar
                tabs={groupTabs}
                activeTabPath={group.active}
                groupIndex={groupIndex}
                groupCount={groups.length}
                isFocused={groupIndex === activeGroup}
                onSelectTab={(path) => onSelectTab(groupIndex, path)}
                onCloseTab={(path) => onCloseTab(path, groupIndex)}
                onDropTab={(tab, beforePath) => handleTabBarDrop(tab, groupIndex, beforePath)}
                onSplit={onSplit}
                onCloseGroup={() => onCloseGroup(groupIndex)}
              />

              <div
                className="flex-1 relative overflow-hidden bg-dot-pattern"
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(TAB_DRAG_TYPE)) return;
                  e.preventDefault();
                  const side = zoneFor(e);
                  if (zone !== side) setDropZone({ group: groupIndex, side });
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropZone(null);
                }}
                onDrop={(e) => handleEditorDrop(e, groupIndex)}
              >
                {activeFile && (
                  <CodeEditor
                    file={activeFile}
                    theme={theme}
                    autoFocus={groupIndex === activeGroup}
                    onChangeContent={(content) => onChangeContent(activeFile.path, content)}
                    onCursorChange={onCursorChange}
                    onFocus={() => onFocusGroup(groupIndex)}
                  />
                )}

                {/* Drop preview while dragging a tab */}
                {zone && (
                  <div
                    className={`absolute top-0 bottom-0 z-20 pointer-events-none bg-purple-500/15 border-2 border-purple-500/50 rounded-sm ${
                      zone === 'right' ? 'right-0 w-1/2' : 'left-0 right-0'
                    }`}
                  />
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
