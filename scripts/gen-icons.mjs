// 產生 PWA 圖示（public/icon-192.png、icon-512.png）。
// 零依賴：自己寫最小 PNG 編碼（IHDR + IDAT(zlib) + IEND）。
// 執行：node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BG = [0xc7, 0xf0, 0xd8, 0xff]; // Nokia 亮綠
const FG = [0x43, 0x52, 0x3d, 0xff]; // Nokia 深綠

// 與 src/core/hull.ts 的 SHIP_SHAPE 同形
const SHIP = ['.X....', '.XXX..', 'XXXXXX', '.XXX..', '.X....'];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // 每列前置 filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) BG.forEach((v, j) => (px[i * 4 + j] = v));
  // 船置中，佔約 75% 寬
  const scale = Math.floor((size * 0.75) / SHIP[0].length);
  const w = SHIP[0].length * scale;
  const h = SHIP.length * scale;
  const ox = Math.floor((size - w) / 2);
  const oy = Math.floor((size - h) / 2);
  for (let sy = 0; sy < SHIP.length; sy++) {
    for (let sx = 0; sx < SHIP[sy].length; sx++) {
      if (SHIP[sy][sx] !== 'X') continue;
      for (let y = oy + sy * scale; y < oy + (sy + 1) * scale; y++) {
        for (let x = ox + sx * scale; x < ox + (sx + 1) * scale; x++) {
          FG.forEach((v, j) => (px[(y * size + x) * 4 + j] = v));
        }
      }
    }
  }
  return encodePng(size, px);
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(out, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(join(out, `icon-${size}.png`), renderIcon(size));
  console.log(`public/icon-${size}.png`);
}
