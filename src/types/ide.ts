export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  extension?: string;
  size?: number;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
  language: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface ZeusSettings {
  fontSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  theme: 'zeus-dark-neon';
}
