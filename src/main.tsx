import React from 'react';
import ReactDOM from 'react-dom/client';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import './theme/monacoWorkers';
import App from './App';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './index.css';

// Ensure 100% offline, local Monaco loading with zero CDN dependency
loader.config({ monaco });

// Monaco only sees the open file, not the whole project, so semantic checks would flag
// every import as "cannot find module". Keep syntax errors and IntelliSense only.
const { typescript } = monaco.languages;
for (const defaults of [typescript.typescriptDefaults, typescript.javascriptDefaults]) {
  defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
  defaults.setCompilerOptions({
    target: typescript.ScriptTarget.ESNext,
    module: typescript.ModuleKind.ESNext,
    moduleResolution: typescript.ModuleResolutionKind.NodeJs,
    jsx: typescript.JsxEmit.ReactJSX,
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
  });
}

// Teach the CSS service Tailwind's directives so they aren't flagged as unknown at-rules
const tailwindDirectives = [
  { name: '@tailwind', description: 'Insere as camadas do Tailwind (base, components, utilities).' },
  { name: '@apply', description: 'Aplica classes utilitárias do Tailwind dentro de uma regra CSS.' },
  { name: '@layer', description: 'Coloca as regras em uma camada do Tailwind (base, components, utilities).' },
  { name: '@config', description: 'Indica o arquivo de configuração do Tailwind.' },
  { name: '@screen', description: 'Cria uma media query a partir de um breakpoint do Tailwind.' },
];
for (const defaults of [monaco.languages.css.cssDefaults, monaco.languages.css.scssDefaults, monaco.languages.css.lessDefaults]) {
  defaults.setOptions({
    data: { useDefaultDataProvider: true, dataProviders: { tailwind: { version: 1.1, atDirectives: tailwindDirectives } } },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
