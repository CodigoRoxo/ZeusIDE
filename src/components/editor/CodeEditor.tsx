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
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  theme = 'dark',
  onChangeContent,
  onCursorChange,
}) => {
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const activeThemeName = theme === 'dark' ? ZEUS_THEME_NAME : ZEUS_LIGHT_THEME_NAME;

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    monacoRef.current = monaco;

    monaco.editor.defineTheme(ZEUS_THEME_NAME, zeusDarkNeonTheme);
    monaco.editor.defineTheme(ZEUS_LIGHT_THEME_NAME, zeusLightTheme);
    monaco.editor.setTheme(activeThemeName);

    editorInstance.onDidChangeCursorPosition((e: monacoEditor.ICursorPositionChangedEvent) => {
      onCursorChange?.({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    editorInstance.focus();
  };

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
