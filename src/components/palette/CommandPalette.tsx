import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { FileIcon } from '../sidebar/FileIcon';

export interface PaletteCommand {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  /** Text the input starts with: '' for files, '>' for commands */
  initialQuery: string;
  rootPath: string | null;
  /** Absolute paths of the project files, or null while loading */
  files: string[] | null;
  commands: PaletteCommand[];
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

const MAX_RESULTS = 50;

interface Match {
  score: number;
  /** Indexes of the matched characters in the searched text */
  indexes: number[];
}

/**
 * Subsequence fuzzy match: every query character must appear in order.
 * Rewards consecutive runs, word/segment starts and hits in the file name.
 */
function fuzzyMatch(query: string, text: string, nameStart = 0): Match | null {
  if (!query) return { score: 0, indexes: [] };
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const indexes: number[] = [];
  let score = 0;
  let ti = 0;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === ' ') continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;

    const prev = text[found - 1];
    if (indexes.length > 0 && indexes[indexes.length - 1] === found - 1) score += 5;
    if (found === 0 || prev === '/' || prev === '\\' || prev === '.' || prev === '-' || prev === '_' || prev === ' ') score += 4;
    if (found >= nameStart) score += 2;

    indexes.push(found);
    ti = found + 1;
  }

  // Prefer shorter paths when scores tie
  return { score: score - text.length * 0.01, indexes };
}

const Highlighted: React.FC<{ text: string; indexes: number[]; offset?: number }> = ({ text, indexes, offset = 0 }) => {
  const hits = new Set(indexes.map((i) => i - offset));
  return (
    <>
      {[...text].map((ch, i) =>
        hits.has(i) ? (
          <span key={i} className="text-purple-600 dark:text-purple-400 font-semibold">{ch}</span>
        ) : (
          <React.Fragment key={i}>{ch}</React.Fragment>
        )
      )}
    </>
  );
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  initialQuery,
  rootPath,
  files,
  commands,
  onOpenFile,
  onClose,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelected(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, initialQuery]);

  const isCommandMode = query.startsWith('>');
  const search = (isCommandMode ? query.slice(1) : query).trim();

  const fileResults = useMemo(() => {
    if (isCommandMode || !files) return [];
    const prefixLength = rootPath ? rootPath.length + 1 : 0;

    const scored: { path: string; relative: string; nameStart: number; match: Match }[] = [];
    for (const path of files) {
      const relative = path.slice(prefixLength).replace(/\\/g, '/');
      const nameStart = relative.lastIndexOf('/') + 1;
      const match = fuzzyMatch(search, relative, nameStart);
      if (match) scored.push({ path, relative, nameStart, match });
    }

    if (search) scored.sort((a, b) => b.match.score - a.match.score);
    return scored.slice(0, MAX_RESULTS);
  }, [isCommandMode, files, rootPath, search]);

  const commandResults = useMemo(() => {
    if (!isCommandMode) return [];
    const scored = commands
      .map((command) => ({ command, match: fuzzyMatch(search, command.label) }))
      .filter((r): r is { command: PaletteCommand; match: Match } => r.match !== null);
    if (search) scored.sort((a, b) => b.match.score - a.match.score);
    return scored;
  }, [isCommandMode, commands, search]);

  const resultCount = isCommandMode ? commandResults.length : fileResults.length;

  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Keep the highlighted row visible while navigating with the arrows
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!isOpen) return null;

  const runSelected = (index: number) => {
    if (isCommandMode) {
      const result = commandResults[index];
      if (!result) return;
      onClose();
      result.command.run();
    } else {
      const result = fileResults[index];
      if (!result) return;
      onClose();
      onOpenFile(result.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => (resultCount === 0 ? 0 : (s + 1) % resultCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => (resultCount === 0 ? 0 : (s - 1 + resultCount) % resultCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runSelected(selected);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const emptyMessage = isCommandMode
    ? 'Nenhum comando encontrado'
    : !rootPath
      ? 'Abra uma pasta para buscar arquivos (ou digite > para comandos)'
      : 'Nenhum arquivo encontrado';

  return (
    <div className="fixed inset-0 z-[100] flex justify-center pt-14 font-sans" onMouseDown={onClose}>
      <div
        className="w-[560px] max-w-[90vw] h-fit bg-zeus-panel border border-zeus-border rounded-lg shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center px-3 border-b border-zeus-border">
          {isCommandMode ? (
            <ChevronRight className="w-4 h-4 text-purple-500 shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-zeus-muted shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCommandMode ? 'Digite um comando' : 'Buscar arquivo pelo nome (digite > para comandos)'}
            className="flex-1 bg-transparent outline-none text-xs text-zeus-text placeholder:text-zeus-muted px-2 py-2.5"
            spellCheck={false}
          />
          {!isCommandMode && rootPath && files === null && (
            <Loader2 className="w-3.5 h-3.5 text-zeus-muted animate-spin" />
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1">
          {resultCount === 0 && !(rootPath && files === null && !isCommandMode) && (
            <div className="px-3 py-3 text-xs text-zeus-muted">{emptyMessage}</div>
          )}

          {isCommandMode
            ? commandResults.map(({ command, match }, i) => (
                <div
                  key={command.id}
                  data-index={i}
                  onMouseMove={() => setSelected(i)}
                  onClick={() => runSelected(i)}
                  className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer ${
                    i === selected ? 'bg-zeus-active text-zeus-text' : 'text-zeus-text'
                  }`}
                >
                  <span className="truncate">
                    <Highlighted text={command.label} indexes={match.indexes} />
                  </span>
                  {command.shortcut && (
                    <kbd className="ml-3 shrink-0 px-1.5 py-0.5 bg-zeus-surface border border-zeus-border rounded text-[10px] text-zeus-muted font-mono">
                      {command.shortcut}
                    </kbd>
                  )}
                </div>
              ))
            : fileResults.map(({ path, relative, nameStart, match }, i) => {
                const name = relative.slice(nameStart);
                const dir = relative.slice(0, Math.max(nameStart - 1, 0));
                const dot = name.lastIndexOf('.');
                return (
                  <div
                    key={path}
                    data-index={i}
                    onMouseMove={() => setSelected(i)}
                    onClick={() => runSelected(i)}
                    className={`flex items-center space-x-2 px-3 py-1.5 text-xs cursor-pointer ${
                      i === selected ? 'bg-zeus-active' : ''
                    }`}
                  >
                    <span className="shrink-0 flex items-center">
                      <FileIcon
                        isDirectory={false}
                        isOpen={false}
                        extension={dot > 0 ? name.slice(dot).toLowerCase() : undefined}
                        name={name}
                      />
                    </span>
                    <span className="text-zeus-text shrink-0">
                      <Highlighted text={name} indexes={match.indexes} offset={nameStart} />
                    </span>
                    {dir && (
                      <span className="text-zeus-muted truncate text-[11px]">
                        <Highlighted text={dir} indexes={match.indexes.filter((idx) => idx < nameStart)} />
                      </span>
                    )}
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};
