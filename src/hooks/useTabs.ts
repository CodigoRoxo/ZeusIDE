import { useState, useCallback, useEffect, useRef } from 'react';
import { OpenFile, FileNode } from '../types/ide';
import { detectLanguage } from '../theme/monacoTheme';

// Compares paths regardless of separator (and case, on Windows)
const normalizePath = (p: string) => {
  const unified = p.replace(/\\/g, '/').replace(/\/+$/, '');
  return window.zeusAPI?.platform === 'win32' ? unified.toLowerCase() : unified;
};

// True when `target` is `base` itself or something inside it
const isSameOrInside = (target: string, base: string) => {
  const t = normalizePath(target);
  const b = normalizePath(base);
  return t === b || t.startsWith(`${b}/`);
};

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function useTabs() {
  const [tabs, setTabs] = useState<OpenFile[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.path === activeTabPath);

  // Always-current view of the tabs for async callbacks (save all on close)
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const openFile = useCallback(async (node: FileNode) => {
    if (node.isDirectory) return;

    // Check if already open
    const existingIndex = tabsRef.current.findIndex((t) => t.path === node.path);
    if (existingIndex !== -1) {
      setActiveTabPath(node.path);
      return;
    }

    // Read content from disk
    if (!window.zeusAPI) return;
    try {
      const result = await window.zeusAPI.readFile(node.path);
      if (!result.ok) {
        window.alert(
          result.reason === 'binary'
            ? `"${node.name}" parece ser um arquivo binário e não pode ser aberto no editor.`
            : `"${node.name}" é grande demais para o editor (${formatSize(result.size)}; limite de 5 MB).`
        );
        return;
      }
      const content = result.content;
      const language = detectLanguage(node.name);

      const newTab: OpenFile = {
        path: node.path,
        name: node.name,
        content,
        savedContent: content,
        isDirty: false,
        language,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabPath(node.path);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, []);

  const closeTab = useCallback((path: string) => {
    setTabs((prev) => {
      const targetTab = prev.find((t) => t.path === path);
      if (targetTab?.isDirty) {
        const confirmClose = window.confirm(
          `O arquivo "${targetTab.name}" possui alterações não salvas. Deseja fechar mesmo assim?`
        );
        if (!confirmClose) return prev;
      }

      const nextTabs = prev.filter((t) => t.path !== path);

      // If active tab was closed, switch to adjacent tab
      if (activeTabPath === path) {
        if (nextTabs.length > 0) {
          const closedIndex = prev.findIndex((t) => t.path === path);
          const nextActive = nextTabs[Math.min(closedIndex, nextTabs.length - 1)];
          setActiveTabPath(nextActive.path);
        } else {
          setActiveTabPath(null);
        }
      }

      return nextTabs;
    });
  }, [activeTabPath]);

  const updateContent = useCallback((path: string, newContent: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.path === path) {
          return {
            ...tab,
            content: newContent,
            isDirty: newContent !== tab.savedContent,
          };
        }
        return tab;
      })
    );
  }, []);

  const saveFile = useCallback(async (path: string): Promise<boolean> => {
    const tabToSave = tabsRef.current.find((t) => t.path === path);
    if (!tabToSave || !window.zeusAPI) return false;

    try {
      await window.zeusAPI.writeFile(tabToSave.path, tabToSave.content);
      setTabs((prev) =>
        prev.map((t) =>
          t.path === path
            ? { ...t, savedContent: tabToSave.content, isDirty: t.content !== tabToSave.content }
            : t
        )
      );
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      window.alert(`Não foi possível salvar "${tabToSave.name}".\n\n${String(error)}`);
      return false;
    }
  }, []);

  const saveAll = useCallback(async (): Promise<boolean> => {
    const dirty = tabsRef.current.filter((t) => t.isDirty);
    const results = await Promise.all(dirty.map((t) => saveFile(t.path)));
    return results.every(Boolean);
  }, [saveFile]);

  // Keep tabs pointing at the right place after a rename in the file tree
  const handlePathRenamed = useCallback((oldPath: string, newPath: string) => {
    const remap = (p: string) =>
      isSameOrInside(p, oldPath) ? newPath + p.slice(oldPath.replace(/[\\/]+$/, '').length) : p;

    setTabs((prev) =>
      prev.map((t) => {
        if (!isSameOrInside(t.path, oldPath)) return t;
        const path = remap(t.path);
        const name = path.replace(/\\/g, '/').split('/').pop() || t.name;
        return { ...t, path, name, language: detectLanguage(name) };
      })
    );
    setActiveTabPath((current) => (current ? remap(current) : current));
  }, []);

  // Close tabs of deleted files; unsaved ones stay open so the work is not lost
  const handlePathDeleted = useCallback((deletedPath: string) => {
    setTabs((prev) => {
      const nextTabs = prev.filter((t) => t.isDirty || !isSameOrInside(t.path, deletedPath));
      setActiveTabPath((current) => {
        if (current && nextTabs.some((t) => t.path === current)) return current;
        return nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].path : null;
      });
      return nextTabs;
    });
  }, []);

  // Pick up edits made outside the IDE; tabs with unsaved changes are left alone
  const reloadChangedFiles = useCallback(async (changedPaths: string[]) => {
    if (!window.zeusAPI) return;
    const changed = new Set(changedPaths.map(normalizePath));
    const candidates = tabsRef.current.filter((t) => !t.isDirty && changed.has(normalizePath(t.path)));

    for (const tab of candidates) {
      try {
        const result = await window.zeusAPI.readFile(tab.path);
        if (!result.ok || result.content === tab.savedContent) continue;
        setTabs((prev) =>
          prev.map((t) =>
            t.path === tab.path && !t.isDirty
              ? { ...t, content: result.content, savedContent: result.content }
              : t
          )
        );
      } catch {
        // File removed or locked mid-write; the next change event will retry
      }
    }
  }, []);

  // Tell the main process which files are unsaved, so closing the window can warn
  const dirtyNames = tabs.filter((t) => t.isDirty).map((t) => t.name).join('\n');
  useEffect(() => {
    window.zeusAPI?.setDirtyFiles(dirtyNames ? dirtyNames.split('\n') : []);
  }, [dirtyNames]);

  // "Salvar tudo e fechar" chosen in the close dialog
  useEffect(() => {
    if (!window.zeusAPI?.onSaveAllAndClose) return;
    return window.zeusAPI.onSaveAllAndClose(async () => {
      if (await saveAll()) {
        window.zeusAPI.window.forceClose();
      }
    });
  }, [saveAll]);

  const saveActiveFile = useCallback(async () => {
    if (activeTabPath) {
      await saveFile(activeTabPath);
    }
  }, [activeTabPath, saveFile]);

  // Global keyboard shortcuts (Ctrl+S and Ctrl+W)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          saveActiveFile();
        } else if (e.key.toLowerCase() === 'w') {
          e.preventDefault();
          if (activeTabPath) {
            closeTab(activeTabPath);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveActiveFile, closeTab, activeTabPath]);

  return {
    tabs,
    activeTab,
    activeTabPath,
    setActiveTabPath,
    openFile,
    closeTab,
    updateContent,
    saveFile,
    saveAll,
    saveActiveFile,
    handlePathRenamed,
    handlePathDeleted,
    reloadChangedFiles,
  };
}
