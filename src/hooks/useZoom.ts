import { useState, useEffect, useCallback } from 'react';

// Interface zoom steps (like a browser): Ctrl+= / Ctrl+- move between them
export const ZOOM_STEPS = [0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5];

export const DEFAULT_EDITOR_FONT_SIZE = 14;
const MIN_EDITOR_FONT_SIZE = 10;
const MAX_EDITOR_FONT_SIZE = 40;

// Presentation mode: big enough to read on a recorded or projected screen
const PRESENTATION_ZOOM = 1.5;

const UI_ZOOM_KEY = 'zeus_ui_zoom';
const EDITOR_FONT_KEY = 'zeus_editor_font_size';
const PRESENTATION_KEY = 'zeus_presentation';

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Preference just won't persist
  }
};

interface PresentationState {
  /** Interface zoom to go back to when presentation mode is turned off */
  previousZoom: number;
}

export function useZoom() {
  const [uiZoom, setUiZoom] = useState<number>(() => readStored(UI_ZOOM_KEY, 1));
  const [editorFontSize, setEditorFontSize] = useState<number>(() =>
    readStored(EDITOR_FONT_KEY, DEFAULT_EDITOR_FONT_SIZE)
  );
  const [presentation, setPresentation] = useState<PresentationState | null>(() =>
    readStored<PresentationState | null>(PRESENTATION_KEY, null)
  );

  useEffect(() => {
    window.zeusAPI?.zoom?.setFactor(uiZoom);
    store(UI_ZOOM_KEY, uiZoom);
  }, [uiZoom]);

  useEffect(() => {
    store(EDITOR_FONT_KEY, editorFontSize);
  }, [editorFontSize]);

  useEffect(() => {
    store(PRESENTATION_KEY, presentation);
  }, [presentation]);

  const zoomIn = useCallback(() => {
    setUiZoom((z) => ZOOM_STEPS.find((step) => step > z + 0.001) ?? z);
  }, []);

  const zoomOut = useCallback(() => {
    setUiZoom((z) => [...ZOOM_STEPS].reverse().find((step) => step < z - 0.001) ?? z);
  }, []);

  const resetZoom = useCallback(() => setUiZoom(1), []);

  /** Ctrl+mouse wheel over the code: changes only the editor font. */
  const changeEditorFontSize = useCallback((delta: number) => {
    setEditorFontSize((size) => Math.min(Math.max(size + delta, MIN_EDITOR_FONT_SIZE), MAX_EDITOR_FONT_SIZE));
  }, []);

  const resetEditorFontSize = useCallback(() => setEditorFontSize(DEFAULT_EDITOR_FONT_SIZE), []);

  const togglePresentation = useCallback(() => {
    if (presentation) {
      setUiZoom(presentation.previousZoom);
      setPresentation(null);
    } else {
      setPresentation({ previousZoom: uiZoom });
      setUiZoom(Math.max(uiZoom, PRESENTATION_ZOOM));
    }
  }, [presentation, uiZoom]);

  return {
    uiZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    editorFontSize,
    changeEditorFontSize,
    resetEditorFontSize,
    isPresentation: presentation !== null,
    togglePresentation,
  };
}
