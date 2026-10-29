import React from 'react';
import { X } from 'lucide-react';
import { OpenFile } from '../../types/ide';
import { FileIcon } from '../sidebar/FileIcon';

interface TabBarProps {
  tabs: OpenFile[];
  activeTabPath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabPath,
  onSelectTab,
  onCloseTab,
}) => {
  if (tabs.length === 0) return null;

  return (
    <div className="h-9 bg-zeus-surface border-b border-zeus-border flex items-center overflow-x-auto select-none no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;

        return (
          <div
            key={tab.path}
            onClick={() => onSelectTab(tab.path)}
            className={`group h-full flex items-center space-x-2 px-3 border-r border-zeus-border text-xs cursor-pointer transition-all shrink-0 relative ${
              isActive
                ? 'bg-zeus-bg text-zeus-text font-medium'
                : 'bg-zeus-surface text-zeus-muted hover:bg-zeus-hover hover:text-zeus-text'
            }`}
          >
            {/* Top clean active accent line */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500" />
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
  );
};
