import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, FolderPlus, Trash2, Edit3 } from 'lucide-react';
import { FileNode } from '../../types/ide';
import { FileIcon } from './FileIcon';

interface FileItemProps {
  node: FileNode;
  level: number;
  expandedFolders: Set<string>;
  activeFilePath: string | null;
  onSelectFile: (node: FileNode) => void;
  onToggleFolder: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => Promise<unknown>;
  onCreateFolder: (parentPath: string, name: string) => Promise<unknown>;
  onDeleteItem: (path: string) => Promise<unknown>;
  onRenameItem: (oldPath: string, newName: string) => Promise<unknown>;
}

export const FileItem: React.FC<FileItemProps> = ({
  node,
  level,
  expandedFolders,
  activeFilePath,
  onSelectFile,
  onToggleFolder,
  onCreateFile,
  onCreateFolder,
  onDeleteItem,
  onRenameItem,
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isActive = activeFilePath === node.path;

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDirectory) {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      return;
    }

    if (isCreatingFile) {
      await onCreateFile(node.path, newItemName.trim());
    } else if (isCreatingFolder) {
      await onCreateFolder(node.path, newItemName.trim());
    }

    setNewItemName('');
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim() && renameValue.trim() !== node.name) {
      await onRenameItem(node.path, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(
      `Mover "${node.name}"${node.isDirectory ? ' e todo seu conteúdo' : ''} para a Lixeira?`
    );
    if (confirmDelete) {
      await onDeleteItem(node.path);
    }
  };

  return (
    <div className="select-none text-xs font-sans">
      {/* Node row */}
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        className={`group flex items-center justify-between py-1 pr-2 rounded cursor-pointer transition-colors ${
          isActive
            ? 'bg-zeus-active text-zeus-text border-l-2 border-purple-500 font-medium'
            : 'text-zeus-muted hover:bg-zeus-hover hover:text-zeus-text'
        }`}
      >
        <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-1">
          {node.isDirectory ? (
            <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-zeus-muted">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}

          <span className="shrink-0 flex items-center justify-center">
            <FileIcon
              isDirectory={node.isDirectory}
              isOpen={isExpanded}
              extension={node.extension}
              name={node.name}
            />
          </span>

          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="flex-1 min-w-0">
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onClick={(e) => e.stopPropagation()}
                className="bg-zeus-panel border border-purple-500/50 text-zeus-text px-1 py-0.5 rounded text-xs w-full outline-none"
              />
            </form>
          ) : (
            <span className="truncate text-zeus-text min-w-0 flex-1">{node.name}</span>
          )}
        </div>

        {/* Action icons on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
          {node.isDirectory && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreatingFile(true);
                  if (!isExpanded) onToggleFolder(node.path);
                }}
                className="p-1 hover:text-purple-400 rounded hover:bg-zeus-panel"
                title="Novo Arquivo"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreatingFolder(true);
                  if (!isExpanded) onToggleFolder(node.path);
                }}
                className="p-1 hover:text-purple-400 rounded hover:bg-zeus-panel"
                title="Nova Pasta"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
            }}
            className="p-1 hover:text-amber-400 rounded hover:bg-zeus-panel"
            title="Renomear"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:text-rose-400 rounded hover:bg-zeus-panel"
            title="Excluir"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Inline input for creating file/folder inside this directory */}
      {(isCreatingFile || isCreatingFolder) && (
        <div style={{ paddingLeft: `${(level + 1) * 14 + 8}px` }} className="py-1 pr-2">
          <form onSubmit={handleCreateSubmit} className="flex items-center space-x-1">
            <span className="text-zeus-muted">
              {isCreatingFolder ? (
                <FolderPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              )}
            </span>
            <input
              autoFocus
              type="text"
              placeholder={isCreatingFolder ? 'Nome da pasta...' : 'Nome do arquivo...'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={() => {
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
              }}
              className="bg-zeus-panel border border-purple-500/50 text-zeus-text px-1.5 py-0.5 rounded text-xs w-full outline-none"
            />
          </form>
        </div>
      )}

      {/* Recursive children rendering */}
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileItem
              key={child.path}
              node={child}
              level={level + 1}
              expandedFolders={expandedFolders}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDeleteItem={onDeleteItem}
              onRenameItem={onRenameItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};
