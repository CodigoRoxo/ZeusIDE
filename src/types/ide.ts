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

/** One editor column: the paths of its tabs (in order) and which one is shown */
export interface EditorGroup {
  tabs: string[];
  active: string | null;
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
