import fs from 'node:fs';
import path from 'node:path';

const pngPath = path.resolve('build/brand-logo.png');
const outDir = path.resolve('src/assets');
const outPath = path.join(outDir, 'brandLogo.ts');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const b64 = fs.readFileSync(pngPath).toString('base64');
const content = `export const BRAND_LOGO_BASE64 = ${JSON.stringify(`data:image/png;base64,${b64}`)};\n`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('Successfully generated brandLogo.ts with size:', b64.length);
