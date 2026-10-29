import React, { useState } from 'react';
import { X, Columns2, PanelRightClose } from 'lucide-react';
import { OpenFile } from '../../types/ide';
import { FileIcon } from '../sidebar/FileIcon';

// MIME type used to carry a dragged tab between tab bars and editor groups
export const TAB_DRAG_TYPE = 'application/x-zeus-tab';

export interface DraggedTab {
  path: string;
  from: number;
}

export const readDraggedTab = (e: React.DragEvent): DraggedTab | null => {
  try {
    const raw = e.dataTransfer.getData(TAB_DRAG_TYPE);
    return raw ? (JSON.parse(raw) as DraggedTab) : null;
  } catch {
    return null;
  }
};

interface TabBarProps {
  tabs: OpenFile[];
  activeTabPath: string | null;
  groupIndex: number;
  groupCount: number;
  /** Highlights the bar of the focused group when the editor is split */
  isFocused: boolean;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onDropTab: (tab: DraggedTab, beforePath?: string) => void;
  onSplit: () => void;
  onCloseGroup: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabPath,
  groupIndex,
  groupCount,
  isFocused,
  onSelectTab,
  onCloseTab,
  onDropTab,
  onSplit,
  onCloseGroup,
}) => {
  const [dropBefore, setDropBefore] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (tabs.length === 0) return null;

  const isSplit = groupCount > 1;

  const handleDrop = (e: React.DragEvent, beforePath?: string) => {
    const tab = readDraggedTab(e);
    setDropBefore(null);
    setIsDragOver(false);
    if (!tab) return;
    e.preventDefault();
    e.stopPropagation();
    onDropTab(tab, beforePath);
  };

  const allowDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(TAB_DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  return (
    <div
      onDragOver={(e) => {
        allowDrop(e);
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => handleDrop(e)}
      className={`h-9 bg-zeus-surface border-b border-zeus-border flex items-center select-none shrink-0 ${
        isDragOver ? 'bg-zeus-hover' : ''
      }`}
    >
      <div className="flex-1 h-full flex items-center overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.path === activeTabPath;

          return (
            <div
              key={tab.path}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TAB_DRAG_TYPE, JSON.stringify({ path: tab.path, from: groupIndex }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                allowDrop(e);
                setDropBefore(tab.path);
              }}
              onDragLeave={() => setDropBefore(null)}
              onDrop={(e) => handleDrop(e, tab.path)}
              onClick={() => onSelectTab(tab.path)}
              onMouseDown={(e) => {
                // Middle click closes the tab, like browsers and VS Code
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tab.path);
                }
              }}
              className={`group h-full flex items-center space-x-2 px-3 border-r border-zeus-border text-xs cursor-pointer transition-all shrink-0 relative ${
                isActive
                  ? 'bg-zeus-bg text-zeus-text font-medium'
                  : 'bg-zeus-surface text-zeus-muted hover:bg-zeus-hover hover:text-zeus-text'
              }`}
            >
              {/* Top clean active accent line (dimmed in the unfocused group) */}
              {isActive && (
                <div
                  className={`absolute top-0 left-0 right-0 h-[2px] ${
                    isFocused || !isSplit ? 'bg-purple-500' : 'bg-purple-500/30'
                  }`}
                />
              )}

              {/* Drop position marker while dragging a tab over this one */}
              {dropBefore === tab.path && (
                <div className="absolute top-1 bottom-1 left-0 w-[2px] bg-purple-500 rounded" />
              )}

              <FileIcon isDirectory={false} name={tab.name} />
              <span className="truncate max-w-[140px] font-sans text-xs">{tab.name}</span>

              {/* Unsaved changes indicator (subtle dot) or Close button */}
              <div className="flex items-center ml-1">
                {tab.isDirty ? (
                  <span
                    title="Alterações não salvas (Ctrl+S para salvar)"
                    className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:hidden"
                  />
                ) : null}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.path);
                  }}
                  className={`p-0.5 rounded hover:bg-zeus-hover hover:text-zeus-text transition-colors ${
                    tab.isDirty ? 'hidden group-hover:flex' : 'flex'
                  }`}
                  title="Fechar (Ctrl+W)"
                >
                  <X className="w-3 h-3 text-zeus-muted hover:text-rose-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Group actions */}
      <div className="flex items-center px-1.5 shrink-0 border-l border-zeus-border h-full">
        {isSplit ? (
          <button
            onClick={onCloseGroup}
            className="p-1 rounded text-zeus-muted hover:text-zeus-text hover:bg-zeus-hover transition-colors"
            title="Fechar painel (as abas vão para o outro lado)"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onSplit}
            className="p-1 rounded text-zeus-muted hover:text-zeus-text hover:bg-zeus-hover transition-colors"
            title="Dividir editor (Ctrl+\)"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
