import React, { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import {
  ZEUS_THEME_NAME,
  ZEUS_LIGHT_THEME_NAME,
  zeusDarkNeonTheme,
  zeusLightTheme,
} from '../../theme/monacoTheme';
import { OpenFile, CursorPosition } from '../../types/ide';

interface CodeEditorProps {
  file: OpenFile;
  theme?: 'dark' | 'light';
  onChangeContent: (newContent: string) => void;
  onCursorChange?: (pos: CursorPosition) => void;
  /** Called when this editor gets keyboard focus (used to track the focused group) */
  onFocus?: () => void;
  /** Focus the editor on mount and whenever its file changes */
  autoFocus?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  theme = 'dark',
  onChangeContent,
  onCursorChange,
  onFocus,
  autoFocus = true,
}) => {
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);

  // Latest callbacks, since Monaco listeners are registered once on mount
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;

  const activeThemeName = theme === 'dark' ? ZEUS_THEME_NAME : ZEUS_LIGHT_THEME_NAME;

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    monacoRef.current = monaco;

    monaco.editor.defineTheme(ZEUS_THEME_NAME, zeusDarkNeonTheme);
    monaco.editor.defineTheme(ZEUS_LIGHT_THEME_NAME, zeusLightTheme);
    monaco.editor.setTheme(activeThemeName);

    editorRef.current = editorInstance;

    // Only the editor being typed in reports its cursor (edits from the other
    // side of a split also move this editor's cursor)
    editorInstance.onDidChangeCursorPosition((e: monacoEditor.ICursorPositionChangedEvent) => {
      if (!editorInstance.hasTextFocus()) return;
      onCursorChangeRef.current?.({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    editorInstance.onDidFocusEditorText(() => {
      onFocusRef.current?.();
      const position = editorInstance.getPosition();
      if (position) onCursorChangeRef.current?.({ line: position.lineNumber, column: position.column });
    });

    if (autoFocus) editorInstance.focus();
  };

  // Switching tabs keeps the same editor and swaps its model, so refocus it
  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.path]);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(activeThemeName);
    }
  }, [activeThemeName]);

  return (
    <div className="w-full h-full bg-zeus-bg relative">
      <Editor
        height="100%"
        path={file.path}
        // Models outlive tab switches so undo history and scroll position are kept;
        // EditorArea disposes them once the file is closed everywhere
        keepCurrentModel
        language={file.language}
        value={file.content}
        onChange={(value) => onChangeContent(value || '')}
        onMount={handleEditorMount}
        theme={activeThemeName}
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
          fontLigatures: true,
          minimap: {
            enabled: true,
            maxColumn: 80,
            renderCharacters: false,
          },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'line',
          lineNumbersMinChars: 5,
          glyphMargin: true,
          lineDecorationsWidth: 10,
          automaticLayout: true,
          padding: { top: 10, bottom: 10 },
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};
