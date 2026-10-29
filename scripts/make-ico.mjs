import fs from 'node:fs';
import path from 'node:path';

// Read the generated PNG files or create ICO from the PNG
const buildDir = path.resolve('build');
const publicDir = path.resolve('public');
const pngPath = path.join(buildDir, 'icon.png');

if (!fs.existsSync(pngPath)) {
  console.error('icon.png not found');
  process.exit(1);
}

const pngBuffer = fs.readFileSync(pngPath);

// Create an ICO containing the 256x256 PNG image
// ICO format header: 6 bytes
// 0-1: 0 (reserved)
// 2-3: 1 (type: 1 = ICO)
// 4-5: count (number of images = 1)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

// Directory entry: 16 bytes
// 0: width (0 = 256px)
// 1: height (0 = 256px)
// 2: color count (0)
// 3: reserved (0)
// 4-5: planes (1)
// 6-7: bitCount (32)
// 8-11: bytesInRes (size of PNG)
// 12-15: imageOffset (offset of PNG data = 6 + 16 = 22)
const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // 256 width
entry.writeUInt8(0, 1); // 256 height
entry.writeUInt8(0, 2);
entry.writeUInt8(0, 3);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(pngBuffer.length, 8);
entry.writeUInt32LE(22, 12);

const icoBuffer = Buffer.concat([header, entry, pngBuffer]);

fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuffer);

console.log(`Generated icon.ico (${icoBuffer.length} bytes) successfully!`);
