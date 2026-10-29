import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function buildElectron() {
  await build({
    entryPoints: [
      path.join(root, 'electron/main.ts'),
      path.join(root, 'electron/preload.ts'),
    ],
    outdir: path.join(root, 'dist-electron'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    external: ['electron', 'node-pty', 'electron-updater'],
    sourcemap: true,
    format: 'cjs',
  });
  console.log('✔ Electron main & preload compiled successfully.');
}

buildElectron().catch((err) => {
  console.error('Failed to compile Electron files:', err);
  process.exit(1);
});
