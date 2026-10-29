import { createServer } from 'vite';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function compileElectron() {
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
  console.log('[ZeusIDE] Electron scripts compiled.');
}

async function startDev() {
  await compileElectron();

  // Start Vite dev server
  const server = await createServer({
    configFile: path.join(root, 'vite.config.ts'),
    server: { port: 5173 },
  });
  await server.listen();
  console.log('[ZeusIDE] Vite dev server listening at http://localhost:5173');

  // Launch Electron directly using electron binary to bypass PowerShell execution policy
  const electronBin = process.platform === 'win32'
    ? path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(root, 'node_modules', '.bin', 'electron');

  const electronProcess = spawn(electronBin, ['.'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  electronProcess.on('close', async (code) => {
    console.log(`[ZeusIDE] Electron closed with code ${code}.`);
    await server.close();
    process.exit(0);
  });
}

startDev().catch((err) => {
  console.error('[ZeusIDE] Dev server failed:', err);
  process.exit(1);
});
