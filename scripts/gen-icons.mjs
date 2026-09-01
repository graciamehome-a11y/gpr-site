// Génère les icônes PWA (PNG) sans dépendance externe.
// Motif : carré indigo + panneau blanc arrondi + 3 barres (rappel du tableau de bord).
// Sortie : public/icons/*.png   —   à relancer si la charte change.
//
//   node scripts/gen-icons.mjs
//
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const ACCENT = [79, 70, 229]; // #4f46e5
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function roundedRectContains(x, y, rx, ry, rw, rh, r) {
  if (x < rx || y < ry || x >= rx + rw || y >= ry + rh) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + rw - r);
  const cy = Math.min(Math.max(y, ry + r), ry + rh - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.14 : size * 0.0; // zone de sécurité maskable
  const panel = {
    x: size * 0.2 + pad * 0.3,
    y: size * 0.24 + pad * 0.3,
    w: size * 0.6 - pad * 0.6,
    h: size * 0.52 - pad * 0.6,
    r: size * 0.06,
  };
  const barW = panel.w * 0.12;
  const bars = [0.18, 0.42, 0.66].map((f, i) => ({
    x: panel.x + panel.w * f,
    h: panel.h * [0.36, 0.62, 0.48][i],
  }));
  const barsBottom = panel.y + panel.h * 0.82;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = ACCENT;
      // fond : carré plein (ou légèrement arrondi en non-maskable)
      if (!maskable && !roundedRectContains(x, y, 0, 0, size, size, size * 0.22)) {
        buf.set([0, 0, 0, 0], (y * size + x) * 4);
        continue;
      }
      if (roundedRectContains(x, y, panel.x, panel.y, panel.w, panel.h, panel.r)) {
        c = WHITE;
        // barre supérieure du panneau
        const headH = panel.y + panel.h * 0.16;
        if (y < headH) c = ACCENT;
        // barres
        for (const b of bars) {
          if (x >= b.x && x < b.x + barW && y <= barsBottom && y >= barsBottom - b.h) {
            c = ACCENT;
          }
        }
      }
      buf.set([c[0], c[1], c[2], 255], (y * size + x) * 4);
    }
  }
  return png(size, size, buf);
}

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
const out = (name, data) => {
  const p = new URL(`../public/icons/${name}`, import.meta.url);
  writeFileSync(p, data);
  console.log(`· ${name}  (${(data.length / 1024).toFixed(1)} Ko)`);
};

out("icon-192.png", draw(192));
out("icon-512.png", draw(512));
out("icon-maskable-512.png", draw(512, { maskable: true }));
out("apple-icon-180.png", draw(180));
console.log("\nIcônes générées dans public/icons/");
