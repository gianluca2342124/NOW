/**
 * One-time NOW icon generator — pure Node, no dependencies.
 *
 * Draws the NOW mark (warm dark field + amber radial "now" pulse + ring) and
 * writes PNGs used by the PWA manifest and iOS home screen. Re-run with:
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/icons');

// --- tiny PNG encoder (RGBA, 8-bit) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10..12 = compression / filter / interlace = 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 (None)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- draw the NOW mark ---
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size * 0.46;
  const coreR = size * 0.26;
  const ringR = size * 0.36;
  const ringW = size * 0.022;

  // brand colors
  const bg = [12, 10, 9];
  const amberIn = [251, 191, 36]; // #fbbf24
  const amberOut = [180, 83, 9]; // #b45309
  const ring = [245, 158, 11]; // #f59e0b

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r = bg[0];
      let g = bg[1];
      let b = bg[2];

      const d = Math.hypot(x - cx, y - cy);

      // ring (stroke)
      const ringDist = Math.abs(d - ringR);
      if (ringDist < ringW) {
        const a = 0.5 * (1 - ringDist / ringW);
        r = lerp(r, ring[0], a);
        g = lerp(g, ring[1], a);
        b = lerp(b, ring[2], a);
      }

      // core (radial amber, soft edge)
      if (d < coreR + 2) {
        const t = Math.min(1, d / coreR); // 0 center -> 1 edge
        const edge = 1 - Math.max(0, (d - (coreR - 2)) / 4); // anti-alias edge
        const cr = lerp(amberIn[0], amberOut[0], t);
        const cg = lerp(amberIn[1], amberOut[1], t);
        const cb = lerp(amberIn[2], amberOut[2], t);
        const a = Math.max(0, Math.min(1, edge));
        r = lerp(r, cr, a);
        g = lerp(g, cg, a);
        b = lerp(b, cb, a);
      }

      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });
const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];
for (const [name, size] of targets) {
  writeFileSync(resolve(OUT_DIR, name), drawIcon(size));
  console.log(`wrote icons/${name} (${size}x${size})`);
}
