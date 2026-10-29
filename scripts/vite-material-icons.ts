import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

/**
 * Makes the Material Icon Theme (github.com/material-extensions/vscode-material-icon-theme, MIT)
 * available to the renderer:
 *   - `virtual:material-icons` exports a compact name -> icon lookup table
 *   - the SVGs are served from /material-icons/ in dev and copied there in the build
 */
const VIRTUAL_ID = 'virtual:material-icons';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const URL_PREFIX = '/material-icons/';

const require = createRequire(import.meta.url);

type IconMap = Record<string, string>;

interface Manifest {
  iconDefinitions: Record<string, { iconPath: string }>;
  file: string;
  folder: string;
  folderExpanded: string;
  fileExtensions: IconMap;
  fileNames: IconMap;
  folderNames: IconMap;
  folderNamesExpanded: IconMap;
  languageIds: IconMap;
  light?: Partial<Record<'fileExtensions' | 'fileNames' | 'folderNames' | 'folderNamesExpanded' | 'languageIds', IconMap>>;
}

const iconsDir = () => path.join(path.dirname(require.resolve('material-icon-theme/package.json')), 'icons');

function buildLookup() {
  const { generateManifest } = require('material-icon-theme') as { generateManifest: () => Manifest };
  const manifest = generateManifest();

  // Icon ids -> SVG file name without extension (what the renderer puts in the URL)
  const fileOf = (id: string) => path.basename(manifest.iconDefinitions[id]?.iconPath ?? `${id}.svg`, '.svg');
  const mapIds = (map: IconMap = {}) =>
    Object.fromEntries(Object.entries(map).map(([key, id]) => [key.toLowerCase(), fileOf(id)]));

  const light = manifest.light ?? {};
  return {
    file: fileOf(manifest.file),
    folder: fileOf(manifest.folder),
    folderExpanded: fileOf(manifest.folderExpanded),
    fileExtensions: mapIds(manifest.fileExtensions),
    fileNames: mapIds(manifest.fileNames),
    folderNames: mapIds(manifest.folderNames),
    folderNamesExpanded: mapIds(manifest.folderNamesExpanded),
    languageIds: mapIds(manifest.languageIds),
    light: {
      fileExtensions: mapIds(light.fileExtensions),
      fileNames: mapIds(light.fileNames),
      folderNames: mapIds(light.folderNames),
      folderNamesExpanded: mapIds(light.folderNamesExpanded),
      languageIds: mapIds(light.languageIds),
    },
  };
}

export function materialIconsPlugin(): Plugin {
  return {
    name: 'zeus-material-icons',

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },

    load(id) {
      return id === RESOLVED_ID ? `export default ${JSON.stringify(buildLookup())};` : null;
    },

    configureServer(server) {
      server.middlewares.use(URL_PREFIX, (req, res, next) => {
        const name = path.basename(decodeURIComponent((req.url ?? '').split('?')[0]));
        const file = path.join(iconsDir(), name);
        if (!name.endsWith('.svg') || !fs.existsSync(file)) return next();
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'max-age=31536000');
        fs.createReadStream(file).pipe(res);
      });
    },

    generateBundle() {
      // MIT requires the copyright notice to travel with the icons
      this.emitFile({
        type: 'asset',
        fileName: `${URL_PREFIX.slice(1)}LICENSE`,
        source: fs.readFileSync(path.join(iconsDir(), '..', 'LICENSE')),
      });

      for (const name of fs.readdirSync(iconsDir())) {
        if (!name.endsWith('.svg')) continue;
        this.emitFile({
          type: 'asset',
          fileName: `${URL_PREFIX.slice(1)}${name}`,
          source: fs.readFileSync(path.join(iconsDir(), name)),
        });
      }
    },
  };
}
