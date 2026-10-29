import React, { useState, useRef, useCallback } from 'react';
import {
  FolderOpen,
  Plus,
  FolderPlus,
  RotateCw,
  FolderTree,
  Shapes,
} from 'lucide-react';
import { FileNode } from '../../types/ide';
import { FileItem } from './FileItem';

interface SidebarProps {
  rootPath: string | null;
  fileTree: FileNode[];
  expandedFolders: Set<string>;
  activeFilePath: string | null;
  isLoading: boolean;
  onOpenFolder: () => void;
  onRefresh: () => void;
  /** `toSide` is true on Ctrl+click: open in the other editor group */
  onSelectFile: (node: FileNode, toSide?: boolean) => void;
  onToggleFolder: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => Promise<unknown>;
  onCreateFolder: (parentPath: string, name: string) => Promise<unknown>;
  onDeleteItem: (path: string) => Promise<unknown>;
  onRenameItem: (oldPath: string, newName: string) => Promise<unknown>;
  /** Label of the current file icon theme, shown in the toggle's tooltip */
  iconThemeLabel: string;
  onToggleIconTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  rootPath,
  fileTree,
  expandedFolders,
  activeFilePath,
  isLoading,
  onOpenFolder,
  onRefresh,
  onSelectFile,
  onToggleFolder,
  onCreateFile,
  onCreateFolder,
  onDeleteItem,
  onRenameItem,
  iconThemeLabel,
  onToggleIconTheme,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(250);
  const isResizingRef = useRef(false);

  const [isCreatingRootFile, setIsCreatingRootFile] = useState(false);
  const [isCreatingRootFolder, setIsCreatingRootFolder] = useState(false);
  const [rootItemName, setRootItemName] = useState('');

  const rootFolderName = rootPath ? rootPath.replace(/\\/g, '/').split('/').pop() : null;

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      // Allow slight resizing (between 190px and 380px)
      const newWidth = Math.min(Math.max(startWidth + deltaX, 190), 380);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  const handleRootCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !rootItemName.trim()) {
      setIsCreatingRootFile(false);
      setIsCreatingRootFolder(false);
      return;
    }

    if (isCreatingRootFile) {
      await onCreateFile(rootPath, rootItemName.trim());
    } else if (isCreatingRootFolder) {
      await onCreateFolder(rootPath, rootItemName.trim());
    }

    setRootItemName('');
    setIsCreatingRootFile(false);
    setIsCreatingRootFolder(false);
  };

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="relative bg-zeus-surface border-r border-zeus-border flex flex-col h-full shrink-0 select-none"
    >
      {/* Right edge drag-to-resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500/30 active:bg-purple-500/50 transition-colors z-30"
        title="Arrastar para redimensionar barra lateral"
      />

      {/* Sidebar Header */}
      <div className="h-9 px-3 border-b border-zeus-border/70 flex items-center justify-between text-xs font-semibold tracking-wider text-zeus-muted">
        <div className="flex items-center space-x-1.5 truncate">
          <FolderTree className="w-3.5 h-3.5 text-purple-600 dark:text-fuchsia-400" />
          <span className="truncate uppercase text-[11px] font-bold text-zeus-text">
            {rootFolderName || 'Explorador'}
          </span>
        </div>

        {rootPath && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsCreatingRootFile(true)}
              className="p-1 hover:text-zeus-text hover:bg-zeus-hover rounded transition-colors text-zeus-muted"
              title="Novo Arquivo na Raiz"
            >
              <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-fuchsia-400" />
            </button>
            <button
              onClick={() => setIsCreatingRootFolder(true)}
              className="p-1 hover:text-zeus-text hover:bg-zeus-hover rounded transition-colors text-zeus-muted"
              title="Nova Pasta na Raiz"
            >
              <FolderPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </button>
            <button
              onClick={onRefresh}
              className={`p-1 hover:text-zeus-text hover:bg-zeus-hover rounded transition-colors text-zeus-muted ${
                isLoading ? 'animate-spin text-purple-600 dark:text-fuchsia-400' : ''
              }`}
              title="Atualizar Pastas"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleIconTheme}
              className="p-1 hover:text-zeus-text hover:bg-zeus-hover rounded transition-colors text-zeus-muted"
              title={`Ícones: ${iconThemeLabel} (clique para trocar)`}
            >
              <Shapes className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main File Tree Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-0.5">
        {/* Root inline creation */}
        {(isCreatingRootFile || isCreatingRootFolder) && rootPath && (
          <div className="px-2 py-1">
            <form onSubmit={handleRootCreate} className="flex items-center space-x-1">
              <span className="text-zeus-muted">
                {isCreatingRootFolder ? (
                  <FolderPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-fuchsia-400" />
                )}
              </span>
              <input
                autoFocus
                type="text"
                placeholder={isCreatingRootFolder ? 'Nova pasta...' : 'Novo arquivo...'}
                value={rootItemName}
                onChange={(e) => setRootItemName(e.target.value)}
                onBlur={() => {
                  setIsCreatingRootFile(false);
                  setIsCreatingRootFolder(false);
                }}
                className="bg-zeus-panel border border-purple-500/50 text-zeus-text px-2 py-0.5 rounded text-xs w-full outline-none"
              />
            </form>
          </div>
        )}

        {/* Tree Nodes */}
        {rootPath ? (
          fileTree.length > 0 ? (
            fileTree.map((node) => (
              <FileItem
                key={node.path}
                node={node}
                level={0}
                expandedFolders={expandedFolders}
                activeFilePath={activeFilePath}
                onSelectFile={onSelectFile}
                onToggleFolder={onToggleFolder}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onDeleteItem={onDeleteItem}
                onRenameItem={onRenameItem}
              />
            ))
          ) : (
            <div className="p-4 text-center text-xs text-zeus-muted">
              Pasta vazia. Crie um arquivo ou pasta acima.
            </div>
          )
        ) : (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 font-sans">
            <div className="w-10 h-10 rounded-lg bg-zeus-panel border border-zeus-border flex items-center justify-center text-zeus-muted">
              <FolderOpen className="w-5 h-5 text-purple-600 dark:text-purple-400/80" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-zeus-text">Nenhum projeto</p>
              <p className="text-[11px] text-zeus-muted">
                Selecione uma pasta para editar arquivos.
              </p>
            </div>
            <button
              onClick={onOpenFolder}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-zeus-panel hover:bg-zeus-hover border border-zeus-border hover:border-purple-500/40 text-zeus-text text-xs font-medium transition-all shadow-sm"
            >
              <FolderOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Abrir Pasta</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
