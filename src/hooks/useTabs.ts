import { useState, useCallback, useEffect, useRef } from 'react';
import { OpenFile, FileNode, EditorGroup } from '../types/ide';
import { detectLanguage } from '../theme/monacoTheme';

// Side-by-side editors supported (left and right)
export const MAX_GROUPS = 2;

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

const emptyGroup = (): EditorGroup => ({ tabs: [], active: null });

/** Adds `path` to a group (optionally before another tab) and makes it active. */
const withTab = (group: EditorGroup, path: string, beforePath?: string): EditorGroup => {
  const tabs = group.tabs.filter((t) => t !== path);
  const index = beforePath ? tabs.indexOf(beforePath) : -1;
  if (index === -1) tabs.push(path);
  else tabs.splice(index, 0, path);
  return { tabs, active: path };
};

/** Removes `path` from a group, activating the neighbouring tab if it was active. */
const withoutTab = (group: EditorGroup, path: string): EditorGroup => {
  const index = group.tabs.indexOf(path);
  if (index === -1) return group;
  const tabs = group.tabs.filter((t) => t !== path);
  const active = group.active === path ? tabs[Math.min(index, tabs.length - 1)] ?? null : group.active;
  return { tabs, active };
};

/** Drops empty groups (always keeping one) and returns the adjusted focused index. */
const compactGroups = (groups: EditorGroup[], focused: number) => {
  const kept = groups.filter((g, i) => g.tabs.length > 0 || (i === 0 && groups.every((x) => x.tabs.length === 0)));
  const result = kept.length > 0 ? kept : [emptyGroup()];
  const focusedGroup = groups[focused];
  const newFocus = focusedGroup ? result.indexOf(focusedGroup) : -1;
  return { groups: result, focused: newFocus === -1 ? Math.min(focused, result.length - 1) : newFocus };
};

export interface OpenFileOptions {
  /** Group to open in; defaults to the focused one */
  group?: number;
  /** Open in the other group, creating it if needed */
  toSide?: boolean;
}

export function useTabs() {
  // Every open file (shared by both groups, so the same file stays in sync)
  const [files, setFiles] = useState<OpenFile[]>([]);
  const [groups, setGroups] = useState<EditorGroup[]>([emptyGroup()]);
  const [activeGroup, setActiveGroup] = useState(0);

  // Always-current views for async callbacks and keyboard handlers
  const filesRef = useRef(files);
  filesRef.current = files;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const activeGroupRef = useRef(activeGroup);
  activeGroupRef.current = activeGroup;

  const applyGroups = useCallback((next: EditorGroup[], focused: number) => {
    const compacted = compactGroups(next, focused);
    groupsRef.current = compacted.groups;
    activeGroupRef.current = compacted.focused;
    setGroups(compacted.groups);
    setActiveGroup(compacted.focused);
  }, []);

  const activeTabPath = groups[activeGroup]?.active ?? null;
  const activeTab = files.find((t) => t.path === activeTabPath);

  const openFile = useCallback(async (node: FileNode, options: OpenFileOptions = {}) => {
    if (node.isDirectory) return;

    const current = groupsRef.current;
    let target = options.group ?? activeGroupRef.current;
    if (options.toSide) target = current.length === 1 ? 1 : 1 - activeGroupRef.current;
    target = Math.min(target, MAX_GROUPS - 1);

    // Read content from disk unless it is already open in some group
    if (!filesRef.current.some((t) => t.path === node.path)) {
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

        const newFile: OpenFile = {
          path: node.path,
          name: node.name,
          content: result.content,
          savedContent: result.content,
          isDirty: false,
          language: detectLanguage(node.name),
        };
        filesRef.current = [...filesRef.current, newFile];
        setFiles(filesRef.current);
      } catch (error) {
        console.error('Failed to open file:', error);
        return;
      }
    }

    const next = [...groupsRef.current];
    while (next.length <= target) next.push(emptyGroup());
    next[target] = withTab(next[target], node.path);
    applyGroups(next, target);
  }, [applyGroups]);

  /** Activates a tab in a group and focuses that group. */
  const selectTab = useCallback((groupIndex: number, path: string) => {
    const next = [...groupsRef.current];
    if (!next[groupIndex]) return;
    next[groupIndex] = { ...next[groupIndex], active: path };
    applyGroups(next, groupIndex);
  }, [applyGroups]);

  /** Kept for callers that only care about the focused group. */
  const setActiveTabPath = useCallback((path: string | null) => {
    if (path) selectTab(activeGroupRef.current, path);
  }, [selectTab]);

  const focusGroup = useCallback((groupIndex: number) => {
    if (groupIndex < groupsRef.current.length && groupIndex !== activeGroupRef.current) {
      activeGroupRef.current = groupIndex;
      setActiveGroup(groupIndex);
    }
  }, []);

  const closeTab = useCallback((path: string, groupIndex = activeGroupRef.current) => {
    const current = groupsRef.current;
    const openElsewhere = current.some((g, i) => i !== groupIndex && g.tabs.includes(path));

    // Only the last copy of a file can lose unsaved work
    if (!openElsewhere) {
      const file = filesRef.current.find((t) => t.path === path);
      if (file?.isDirty) {
        const confirmClose = window.confirm(
          `O arquivo "${file.name}" possui alterações não salvas. Deseja fechar mesmo assim?`
        );
        if (!confirmClose) return;
      }
      filesRef.current = filesRef.current.filter((t) => t.path !== path);
      setFiles(filesRef.current);
    }

    const next = current.map((g, i) => (i === groupIndex ? withoutTab(g, path) : g));
    applyGroups(next, groupIndex);
  }, [applyGroups]);

  /**
   * Moves a tab to another group (or reorders it). `to` equal to the number of
   * groups creates a new group on the right.
   */
  const moveTab = useCallback((path: string, from: number, to: number, beforePath?: string) => {
    const current = groupsRef.current;
    if (!current[from]?.tabs.includes(path) || to > current.length || to >= MAX_GROUPS) return;

    const next = [...current];
    if (to === next.length) next.push(emptyGroup());
    if (from !== to) next[from] = withoutTab(next[from], path);
    next[to] = withTab(next[to], path, beforePath);
    applyGroups(next, to);
  }, [applyGroups]);

  /** Ctrl+\: opens the active file in a new group on the right, or jumps to the other group. */
  const splitEditor = useCallback(() => {
    const current = groupsRef.current;
    const focused = activeGroupRef.current;
    const path = current[focused]?.active;
    if (current.length >= MAX_GROUPS) {
      focusGroup(1 - focused);
      return;
    }
    if (!path) return;
    applyGroups([...current, withTab(emptyGroup(), path)], current.length);
  }, [applyGroups, focusGroup]);

  /** Closes a group by merging its tabs into the remaining one (nothing is lost). */
  const closeGroup = useCallback((groupIndex: number) => {
    const current = groupsRef.current;
    if (current.length < 2) return;
    const other = 1 - groupIndex;
    let merged = current[other];
    for (const path of current[groupIndex].tabs) {
      if (!merged.tabs.includes(path)) merged = { tabs: [...merged.tabs, path], active: merged.active };
    }
    applyGroups([merged], 0);
  }, [applyGroups]);

  const updateContent = useCallback((path: string, newContent: string) => {
    setFiles((prev) =>
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
    const tabToSave = filesRef.current.find((t) => t.path === path);
    if (!tabToSave || !window.zeusAPI) return false;

    try {
      await window.zeusAPI.writeFile(tabToSave.path, tabToSave.content);
      setFiles((prev) =>
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
    const dirty = filesRef.current.filter((t) => t.isDirty);
    const results = await Promise.all(dirty.map((t) => saveFile(t.path)));
    return results.every(Boolean);
  }, [saveFile]);

  // Keep tabs pointing at the right place after a rename in the file tree
  const handlePathRenamed = useCallback((oldPath: string, newPath: string) => {
    const remap = (p: string) =>
      isSameOrInside(p, oldPath) ? newPath + p.slice(oldPath.replace(/[\\/]+$/, '').length) : p;

    setFiles((prev) =>
      prev.map((t) => {
        if (!isSameOrInside(t.path, oldPath)) return t;
        const path = remap(t.path);
        const name = path.replace(/\\/g, '/').split('/').pop() || t.name;
        return { ...t, path, name, language: detectLanguage(name) };
      })
    );
    applyGroups(
      groupsRef.current.map((g) => ({ tabs: g.tabs.map(remap), active: g.active ? remap(g.active) : null })),
      activeGroupRef.current
    );
  }, [applyGroups]);

  // Close tabs of deleted files; unsaved ones stay open so the work is not lost
  const handlePathDeleted = useCallback((deletedPath: string) => {
    const kept = filesRef.current.filter((t) => t.isDirty || !isSameOrInside(t.path, deletedPath));
    const keptPaths = new Set(kept.map((t) => t.path));
    filesRef.current = kept;
    setFiles(kept);

    const next = groupsRef.current.map((g) => {
      let group = g;
      for (const path of g.tabs) if (!keptPaths.has(path)) group = withoutTab(group, path);
      return group;
    });
    applyGroups(next, activeGroupRef.current);
  }, [applyGroups]);

  // Pick up edits made outside the IDE; tabs with unsaved changes are left alone
  const reloadChangedFiles = useCallback(async (changedPaths: string[]) => {
    if (!window.zeusAPI) return;
    const changed = new Set(changedPaths.map(normalizePath));
    const candidates = filesRef.current.filter((t) => !t.isDirty && changed.has(normalizePath(t.path)));

    for (const tab of candidates) {
      try {
        const result = await window.zeusAPI.readFile(tab.path);
        if (!result.ok || result.content === tab.savedContent) continue;
        setFiles((prev) =>
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
  const dirtyNames = files.filter((t) => t.isDirty).map((t) => t.name).join('\n');
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
    files,
    groups,
    activeGroup,
    activeTab,
    activeTabPath,
    setActiveTabPath,
    selectTab,
    focusGroup,
    openFile,
    closeTab,
    moveTab,
    splitEditor,
    closeGroup,
    updateContent,
    saveFile,
    saveAll,
    saveActiveFile,
    handlePathRenamed,
    handlePathDeleted,
    reloadChangedFiles,
  };
}
