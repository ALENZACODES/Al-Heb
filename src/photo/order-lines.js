// RTL reading-order reconstruction from OCR word boxes. Lane 6. Pure.
// Box: {text, x, y, w, h} in image coordinates (origin top-left, y grows downward).
// Rules (from research notes): cluster boxes into lines by vertical overlap; lines top-down;
// words right-to-left by x-max within a line; consecutive Latin/digit boxes keep LTR order.
import { isHebrew } from './hebrew.js';

const LTR_RE = /[A-Za-z0-9]/;

/** 'he' | 'ltr' (Latin/digit, no Hebrew) | 'neutral' (punctuation only; treated as 'he'). */
export function boxClass(text) {
  const t = String(text ?? '');
  if (isHebrew(t)) return 'he';
  if (LTR_RE.test(t)) return 'ltr';
  return 'neutral';
}

function vOverlapRatio(a, b) {
  const top = Math.max(a.y, b.y);
  const bot = Math.min(a.y + a.h, b.y + b.h);
  const ov = Math.max(0, bot - top);
  const m = Math.min(a.h, b.h);
  return m > 0 ? ov / m : 0;
}

/**
 * @param {{text:string,x:number,y:number,w:number,h:number}[]} boxes
 * @param {{minOverlap?:number}} [opts] minOverlap: fraction of the smaller height that must overlap (default 0.5)
 * @returns {{text:string, words:object[], bbox:{x:number,y:number,w:number,h:number}}[]}
 *   words are in logical (reading) order.
 */
export function orderLines(boxes, { minOverlap = 0.5 } = {}) {
  const clean = (boxes || []).filter((b) => b && String(b.text ?? '').trim() !== '' &&
    [b.x, b.y, b.w, b.h].every(Number.isFinite));
  const sorted = [...clean].sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
  /** @type {object[][]} */
  const lines = [];
  for (const box of sorted) {
    let best = -1; let bestScore = 0;
    lines.forEach((line, i) => {
      // compare with the member nearest in x: tolerates a slightly skewed baseline
      const bcx = box.x + box.w / 2;
      let nearest = line[0]; let nd = Infinity;
      for (const m of line) {
        const d = Math.abs(m.x + m.w / 2 - bcx);
        if (d < nd) { nd = d; nearest = m; }
      }
      const s = vOverlapRatio(box, nearest);
      if (s >= minOverlap && s > bestScore) { bestScore = s; best = i; }
    });
    if (best >= 0) lines[best].push(box); else lines.push([box]);
  }
  const meanCy = (l) => l.reduce((a, b) => a + b.y + b.h / 2, 0) / l.length;
  lines.sort((a, b) => meanCy(a) - meanCy(b));
  return lines.map((line) => {
    const rtl = [...line].sort((a, b) => (b.x + b.w) - (a.x + a.w)); // x-max descending
    const words = fixLtrRuns(rtl);
    const x0 = Math.min(...line.map((b) => b.x)); const y0 = Math.min(...line.map((b) => b.y));
    const x1 = Math.max(...line.map((b) => b.x + b.w)); const y1 = Math.max(...line.map((b) => b.y + b.h));
    return { text: words.map((w) => w.text).join(' '), words, bbox: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
  });
}

/** Reverse each maximal run of consecutive 'ltr' boxes so Latin/digit runs read left-to-right. */
function fixLtrRuns(words) {
  const out = []; let i = 0;
  while (i < words.length) {
    if (boxClass(words[i].text) !== 'ltr') { out.push(words[i++]); continue; }
    let j = i;
    while (j < words.length && boxClass(words[j].text) === 'ltr') j++;
    out.push(...words.slice(i, j).reverse());
    i = j;
  }
  return out;
}

/** Convenience: ordered lines -> array of line strings. */
export function orderedTextLines(boxes, opts) { return orderLines(boxes, opts).map((l) => l.text); }
