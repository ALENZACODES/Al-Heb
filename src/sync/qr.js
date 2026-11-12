// @ts-check
// A small QR Code encoder written for Aleph (lane 4, 12 Nov): byte mode, error correction L or M, versions 1 to 40, all
// eight masks scored by the standard penalty rules. It follows ISO/IEC 18004; no code was copied from another project.
// tests/sync.qr.test.js decodes its output with an independent reader when one is installed (OpenCV) and checks the
// fixed parts of the symbol otherwise.

const ECC = {
  L: { bits: 1, perBlock: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    blocks: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25] },
  M: { bits: 0, perBlock: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    blocks: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49] },
};

/** Modules available for data and error correction in a symbol of this version. */
export function rawModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) { const n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if (ver >= 7) r -= 36; }
  return r;
}
/** Data codewords (bytes) a version holds at a level. */
export const dataCodewords = (ver, lvl) => Math.floor(rawModules(ver) / 8) - ECC[lvl].perBlock[ver] * ECC[lvl].blocks[ver];
/** Most bytes a byte-mode symbol can hold. */
export const byteCapacity = (ver, lvl) => Math.floor((dataCodewords(ver, lvl) * 8 - 4 - (ver < 10 ? 8 : 16)) / 8);

function gfMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; }
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1; let root = 1;
  for (let i = 0; i < degree; i++) { for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gfMul(root, 2); }
  return r;
}
function rsRemainder(data, div) {
  const r = new Array(div.length).fill(0);
  for (const b of data) { const f = b ^ /** @type {number} */ (r.shift()); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); }
  return r;
}
export function alignmentPositions(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2, size = ver * 4 + 17;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6]; for (let p = size - 7; out.length < n; p -= step) out.splice(1, 0, p);
  return out;
}
const MASKS = [
  (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/**
 * Encode bytes (or a string as UTF-8) into a QR symbol.
 * @param {Uint8Array|string} input @param {{level?:'L'|'M', minVersion?:number, maxVersion?:number}} [o]
 * @returns {{version:number, size:number, level:string, mask:number, modules:boolean[][]}}
 */
export function encode(input, o = {}) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const lvl = o.level === 'M' ? 'M' : 'L';
  let ver = Math.max(1, o.minVersion || 1);
  const maxV = Math.min(40, o.maxVersion || 40);
  while (ver <= maxV && byteCapacity(ver, lvl) < bytes.length) ver++;
  if (ver > maxV) throw new RangeError(`Too much data for a QR code (${bytes.length} bytes; at most ${byteCapacity(maxV, lvl)}).`);
  // bit stream: mode 0100, count, bytes, terminator, padding
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); for (const b of bytes) put(b, 8);
  const cap = dataCodewords(ver, lvl) * 8;
  put(0, Math.min(4, cap - bits.length)); put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data = []; for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; data.push(v); }
  // error correction and interleaving
  const nb = ECC[lvl].blocks[ver], ecl = ECC[lvl].perBlock[ver], raw = Math.floor(rawModules(ver) / 8);
  const shortN = nb - (raw % nb), shortLen = Math.floor(raw / nb), div = rsDivisor(ecl);
  const blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - ecl + (i < shortN ? 0 : 1)); k += dat.length;
    const ecc = rsRemainder(dat, div); if (i < shortN) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const words = [];
  for (let i = 0; i < blocks[0].length; i++) for (let j = 0; j < blocks.length; j++) if (i !== shortLen - ecl || j >= shortN) words.push(blocks[j][i]);
  // function patterns
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4);
    }
  }
  const al = alignmentPositions(ver), last = al.length - 1;
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const drawFormat = (mask) => {
    const d = (ECC[lvl].bits << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, d); set(c, a, d); }
  }
  // data, in the zigzag order
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
      if (!fn[y][x] && i < words.length * 8) { mod[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
    }
  }
  // choose the mask with the lowest penalty
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };
  let best = 0, bestScore = Infinity;
  for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const s = penalty(mod); if (s < bestScore) { bestScore = s; best = m; } applyMask(m); }
  applyMask(best); drawFormat(best);
  return { version: ver, size, level: lvl, mask: best, modules: mod };
}

/** ISO/IEC 18004 penalty score (rules N1 to N4). */
export function penalty(m) {
  const n = m.length; let s = 0, dark = 0;
  const lineScore = (get) => {
    let out = 0;
    for (let a = 0; a < n; a++) {
      let run = 1;
      for (let b = 1; b <= n; b++) {
        if (b < n && get(a, b) === get(a, b - 1)) run++; else { if (run >= 5) out += 3 + (run - 5); run = 1; }
      }
      for (let b = 0; b + 7 <= n; b++) { // 1:1:3:1:1 finder-like pattern with 4 light modules on one side
        if (get(a, b) && !get(a, b + 1) && get(a, b + 2) && get(a, b + 3) && get(a, b + 4) && !get(a, b + 5) && get(a, b + 6)) {
          const before = b - 4 >= 0 ? [1, 2, 3, 4].every((k) => !get(a, b - k)) : b === 0;
          const after = b + 11 <= n ? [7, 8, 9, 10].every((k) => !get(a, b + k)) : b + 7 === n;
          if (before || after) out += 40;
        }
      }
    }
    return out;
  };
  s += lineScore((r, c) => m[r][c]) + lineScore((c, r) => m[r][c]);
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) s += 3; }
  for (const row of m) for (const c of row) if (c) dark++;
  s += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  return s;
}

/** An SVG string (black on white, 4-module quiet zone). @param {{size:number, modules:boolean[][]}} qr @param {{label?:string}} [o] */
export function toSvg(qr, o = {}) {
  const q = 4, w = qr.size + q * 2; let d = '';
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y][x]) d += `M${x + q} ${y + q}h1v1h-1z`;
  const label = String(o.label || 'QR code').replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${w}" height="${w}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
