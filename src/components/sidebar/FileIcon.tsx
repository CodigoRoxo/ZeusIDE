import React from 'react';
import {
  FileCode,
  FileJson,
  FileText,
  FileSpreadsheet,
  FileImage,
  Folder,
  FolderOpen,
  File,
  FileTerminal,
} from 'lucide-react';
import { useIconTheme, materialIconUrl } from '../../theme/iconTheme';

interface FileIconProps {
  isDirectory: boolean;
  isOpen?: boolean;
  extension?: string;
  name?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  isDirectory,
  isOpen,
  extension,
  name,
}) => {
  const { iconTheme, uiTheme } = useIconTheme();

  if (iconTheme === 'material') {
    return (
      <img
        src={materialIconUrl(name || extension || '', isDirectory, Boolean(isOpen), uiTheme)}
        alt=""
        draggable={false}
        className="w-4 h-4 shrink-0"
      />
    );
  }

  if (isDirectory) {
    return isOpen ? (
      <FolderOpen className="w-4 h-4 text-purple-400 shrink-0" />
    ) : (
      <Folder className="w-4 h-4 text-fuchsia-400/80 shrink-0" />
    );
  }

  // Tabs and the palette only pass the file name
  const fromName = name && name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const ext = (extension || fromName).replace('.', '').toLowerCase();

  // Specific file names
  if (name?.toLowerCase() === 'package.json') {
    return <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (name?.toLowerCase() === 'dockerfile') {
    return <FileTerminal className="w-4 h-4 text-cyan-400 shrink-0" />;
  }

  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
    case 'js':
    case 'jsx':
    case 'mjs':
      return <FileCode className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'py':
      return <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-500 shrink-0" />;
    case 'html':
      return <FileCode className="w-4 h-4 text-orange-500 shrink-0" />;
    case 'css':
    case 'scss':
    case 'less':
      return <FileCode className="w-4 h-4 text-pink-400 shrink-0" />;
    case 'md':
    case 'markdown':
      return <FileText className="w-4 h-4 text-purple-300 shrink-0" />;
    case 'ps1':
    case 'bat':
    case 'sh':
      return <FileTerminal className="w-4 h-4 text-fuchsia-400 shrink-0" />;
    case 'csv':
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'ico':
      return <FileImage className="w-4 h-4 text-sky-400 shrink-0" />;
    default:
      return <File className="w-4 h-4 text-slate-400 shrink-0" />;
  }
};
