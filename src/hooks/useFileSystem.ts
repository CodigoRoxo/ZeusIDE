import { useState, useCallback, useEffect } from 'react';
import { FileNode } from '../types/ide';

export function useFileSystem() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Helper to load directory contents recursively or lazily
  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    if (!window.zeusAPI) return [];
    try {
      const entries = await window.zeusAPI.readDirectory(dirPath);
      return entries;
    } catch (error) {
      console.error('Failed to load directory:', error);
      return [];
    }
  }, []);

  // Loads children for every expanded folder, recursively
  const populateExpanded = useCallback(async (nodes: FileNode[], expanded: Set<string>): Promise<FileNode[]> => {
    return Promise.all(
      nodes.map(async (node) => {
        if (node.isDirectory && expanded.has(node.path)) {
          const children = await loadDirectory(node.path);
          return { ...node, children: await populateExpanded(children, expanded) };
        }
        return node;
      })
    );
  }, [loadDirectory]);

  /**
   * Opens a folder by path (used by the dialog and to restore the last session).
   * Returns false when the folder no longer exists or cannot be read.
   */
  const openFolderPath = useCallback(async (folderPath: string, expanded?: string[]): Promise<boolean> => {
    if (!window.zeusAPI) return false;
    setIsLoading(true);
    try {
      const entries = await window.zeusAPI.readDirectory(folderPath);
      const expandedSet = new Set([folderPath, ...(expanded ?? [])]);
      setRootPath(folderPath);
      setExpandedFolders(expandedSet);
      setFileTree(await populateExpanded(entries, expandedSet));
      return true;
    } catch (error) {
      console.error('Error opening folder:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [populateExpanded]);

  const openFolder = useCallback(async () => {
    if (!window.zeusAPI) return;
    const selected = await window.zeusAPI.selectFolder();
    if (selected) {
      await openFolderPath(selected);
    }
  }, [openFolderPath]);

  const refreshTree = useCallback(async (silent = false) => {
    if (!rootPath) return;
    if (!silent) setIsLoading(true);
    try {
      const entries = await loadDirectory(rootPath);
      setFileTree(await populateExpanded(entries, expandedFolders));
    } catch (error) {
      console.error('Error refreshing tree:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [rootPath, expandedFolders, loadDirectory, populateExpanded]);

  // Watch the open project so external changes (git, npm, other editors) show up
  useEffect(() => {
    if (rootPath) window.zeusAPI?.watchFolder(rootPath);
  }, [rootPath]);

  const toggleFolder = useCallback(async (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });

    // Helper to recursively populate children into fileTree
    const populateNode = async (nodes: FileNode[]): Promise<FileNode[]> => {
      return Promise.all(
        nodes.map(async (node) => {
          if (node.path === folderPath) {
            if (!node.children || node.children.length === 0) {
              const children = await loadDirectory(node.path);
              return { ...node, children };
            }
            return node;
          }
          if (node.isDirectory && node.children) {
            return {
              ...node,
              children: await populateNode(node.children),
            };
          }
          return node;
        })
      );
    };

    setFileTree((currentTree) => {
      // Start asynchronous populate and set tree
      populateNode(currentTree).then((updated) => setFileTree(updated));
      return currentTree;
    });
  }, [loadDirectory]);

  const createFile = useCallback(async (parentPath: string, fileName: string) => {
    if (!window.zeusAPI || !fileName.trim()) return;
    const fullPath = `${parentPath}/${fileName}`.replace(/\\/g, '/');
    try {
      await window.zeusAPI.createFile(fullPath);
      await refreshTree();
      return fullPath;
    } catch (error) {
      console.error('Error creating file:', error);
    }
  }, [refreshTree]);

  const createFolder = useCallback(async (parentPath: string, folderName: string) => {
    if (!window.zeusAPI || !folderName.trim()) return;
    const fullPath = `${parentPath}/${folderName}`.replace(/\\/g, '/');
    try {
      await window.zeusAPI.createDirectory(fullPath);
      await refreshTree();
      return fullPath;
    } catch (error) {
      console.error('Error creating directory:', error);
    }
  }, [refreshTree]);

  const deleteItem = useCallback(async (itemPath: string) => {
    if (!window.zeusAPI) return;
    try {
      await window.zeusAPI.deleteItem(itemPath);
      await refreshTree();
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      window.alert(`Não foi possível excluir o item.\n\n${String(error)}`);
      return false;
    }
  }, [refreshTree]);

  const renameItem = useCallback(async (oldPath: string, newName: string) => {
    if (!window.zeusAPI || !newName.trim()) return;
    // Keep the original separator so the new path matches what the tree reports
    const sep = oldPath.includes('\\') ? '\\' : '/';
    const parts = oldPath.split(/[\\/]/);
    parts.pop();
    const newPath = [...parts, newName].join(sep);
    try {
      await window.zeusAPI.renameItem(oldPath, newPath);
      await refreshTree();
      return newPath;
    } catch (error) {
      console.error('Error renaming item:', error);
      window.alert(`Não foi possível renomear o item.\n\n${String(error)}`);
    }
  }, [refreshTree]);

  return {
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
  };
}
