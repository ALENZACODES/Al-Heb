// Camera translator: pure logic (no DOM, no network). Tested in tests/camera.model.test.js.
// The word-list translator here and the one in tools/camera-translate/camera_translate/hebrew.py follow the same rules and
// are held to the same cases (data/camera/glossary-cases.json).
import { stripMarks, isHebrew } from '../photo/hebrew.js';
import { orderLines } from '../photo/order-lines.js';
import { findName, hasLatinName } from '../shell/names.js';

export const HELD_NOTE = 'Sacred text. It is left exactly as written.';
export const MAX_UPLOAD_SIDE = 2000;

// ---------------------------------------------------------------- service address

/**
 * Decide what the configured service address means for this page.
 * @param {unknown} raw value of backendUrl in data/camera/config.json
 * @param {string} pageHref location.href
 * @returns {{mode:'none'|'same-origin'|'loopback'|'remote'|'invalid', url:string|null, origin:string|null}}
 */
export function resolveBackend(raw, pageHref) {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return { mode: 'none', url: null, origin: null };
  let u;
  try { u = new URL(v, pageHref); } catch { return { mode: 'invalid', url: null, origin: null }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { mode: 'invalid', url: null, origin: null };
  const url = u.href.replace(/\/+$/, '');
  let page; try { page = new URL(pageHref); } catch { page = null; }
  if (page && u.origin === page.origin) return { mode: 'same-origin', url, origin: u.origin };
  if (['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return { mode: 'loopback', url, origin: u.origin };
  if (u.protocol !== 'https:') return { mode: 'invalid', url: null, origin: null }; // a photo is never sent over plain http
  return { mode: 'remote', url, origin: u.origin };
}

// ---------------------------------------------------------------- sacred-name guard

/** True when a Hebrew string contains the four-letter name (alone or with prefix letters). */
export function containsSacredName(he) {
  return findName(String(he ?? '')).some((n) => n.kind === 'exact' || n.kind === 'prefixed');
}

// ---------------------------------------------------------------- sign word list

const EDGE_PUNCT = /^[.,;:!?"'()[\]|\-־׳״]+|[.,;:!?"'()[\]|\-־׳״]+$/g;
const SPLIT_PUNCT = /[\s.,;:!?\-־׳״"'()[\]|/\\]+/;
const NUM_RE = /^[0-9]+(?:[.,:][0-9]+)*%?$|^[₪$€]$/;
const LATIN_RE = /^[A-Za-z][A-Za-z0-9'&.-]*$/;

/** Split a line into words: marks removed, punctuation dropped, numbers kept whole. */
export function tokens(text) {
  const out = [];
  for (let raw of stripMarks(String(text ?? '')).split(/\s+/)) {
    raw = raw.replace(EDGE_PUNCT, '');
    if (!raw) continue;
    if (NUM_RE.test(raw)) { out.push(raw); continue; }
    for (const p of raw.split(SPLIT_PUNCT)) if (p) out.push(p);
  }
  return out;
}

function oneEditApart(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d === 1; }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  for (let i = 0; i < l.length; i++) if (l.slice(0, i) + l.slice(i + 1) === s) return true;
  return false;
}

/**
 * @param {{entries:Array<{he:string,en:string,pointed?:string,translit?:string}>, patterns?:Array<{head:string,en:string}>}} data
 * @returns {{translate:(text:string)=>{en:string|null,status:'full'|'near'|'none',translit:string|null,pointed:string|null}}}
 */
export function createGlossary(data) {
  const entries = new Map();
  for (const e of data?.entries || []) entries.set(tokens(e.he).join(' '), e);
  const maxLen = Math.max(1, ...[...entries.keys()].map((k) => k.split(' ').length));
  const patterns = new Map((data?.patterns || []).map((p) => [p.head, p.en]));
  const vocab = [...new Set([...entries.keys()].flatMap((k) => k.split(' ')))].sort();
  const vocabSet = new Set(vocab);
  const near = (tok) => {
    if ([...tok].length < 4) return null;
    const hits = vocab.filter((v) => v.length >= 3 && oneEditApart(tok, v));
    return hits.length === 1 ? hits[0] : null;
  };
  function translate(text) {
    const none = { en: null, status: 'none', translit: null, pointed: null };
    let toks = tokens(text);
    if (!toks.length) return none;
    let usedNear = false;
    toks = toks.map((t) => {
      if (vocabSet.has(t) || NUM_RE.test(t) || LATIN_RE.test(t)) return t;
      const n = near(t); if (n) usedNear = true; return n || t;
    });
    const segs = [];
    for (let i = 0; i < toks.length;) {
      if (NUM_RE.test(toks[i]) || LATIN_RE.test(toks[i])) { segs.push({ he: toks[i], en: toks[i], pointed: null, translit: toks[i], kind: 'literal' }); i++; continue; }
      let hit = null; let n = Math.min(maxLen, toks.length - i);
      for (; n > 0; n--) { hit = entries.get(toks.slice(i, i + n).join(' ')); if (hit) break; }
      if (!hit) return none;
      segs.push({ he: hit.he, en: hit.en, pointed: hit.pointed || null, translit: hit.translit || null, kind: 'word' });
      i += n;
    }
    const words = segs.filter((s) => s.kind === 'word');
    const head = segs[0].he;
    const en = patterns.has(head) && words.length >= 2
      ? patterns.get(head).replace('{x}', segs.slice(1).map((s) => s.en).join(' '))
      : segs.map((s) => s.en).join(' ');
    return { en, status: usedNear ? 'near' : 'full',
      translit: segs.filter((s) => s.translit).map((s) => s.translit).join(' '),
      pointed: segs.map((s) => s.pointed || s.he).join(' ') };
  }
  return { translate };
}

// ---------------------------------------------------------------- regions

/**
 * OCR word boxes -> line regions in reading order, translated with the word list. Lines without Hebrew are dropped.
 * @param {Array<{text:string,x:number,y:number,w:number,h:number,conf?:number}>} boxes
 */
export function regionsFromBoxes(boxes, glossary) {
  const out = [];
  for (const line of orderLines(boxes)) {
    if (!isHebrew(line.text)) continue;
    const held = containsSacredName(line.text);
    const t = held ? { en: null, status: 'none', translit: null, pointed: null } : glossary.translate(line.text);
    if (!held && !t.en && tokens(line.text).join('').length < 2) continue; // a lone letter is almost always noise
    out.push(makeRegion({ id: `r${out.length + 1}`, box: line.bbox, he: line.text, held, en: t.en,
      translationSource: t.en ? (t.status === 'near' ? 'word-list-near' : 'word-list') : null, translit: t.translit, pointed: t.pointed }));
  }
  return out;
}

function makeRegion(r) {
  if (r.held) return { id: r.id, box: r.box, held: true, he: null, en: null, translationSource: null, translit: null, pointed: null, drawn: false, note: HELD_NOTE };
  return { id: r.id, box: r.box, held: false, he: r.he, en: r.en || null, translationSource: r.en ? r.translationSource : null,
    translit: r.translit || null, pointed: r.pointed || null, drawn: !!r.drawn };
}

const num = (v) => (Number.isFinite(+v) ? +v : 0);
const str = (v, max = 400) => (typeof v === 'string' ? v.slice(0, max) : null);

/**
 * Check and tidy a service answer before anything is shown. Unknown fields are dropped, boxes are clamped to the picture,
 * and the sacred-name rule is applied again on this side whatever the service did.
 * @returns {{width:number,height:number,regions:object[],image:string|null,notices:string[]}}
 */
export function normaliseResponse(json) {
  const width = Math.max(1, Math.round(num(json?.width))); const height = Math.max(1, Math.round(num(json?.height)));
  const regions = [];
  for (const r of Array.isArray(json?.regions) ? json.regions.slice(0, 200) : []) {
    const x = Math.min(Math.max(0, num(r?.box?.x)), width); const y = Math.min(Math.max(0, num(r?.box?.y)), height);
    const w = Math.min(Math.max(1, num(r?.box?.w)), width - x || 1); const h = Math.min(Math.max(1, num(r?.box?.h)), height - y || 1);
    const he = str(r?.he); const en = str(r?.en);
    const held = !!r?.held || (he ? containsSacredName(he) : false) || (en ? hasLatinName(en) : false);
    const src = ['machine', 'word-list', 'word-list-near'].includes(r?.translationSource) ? r.translationSource : (en ? 'machine' : null);
    regions.push(makeRegion({ id: `r${regions.length + 1}`, box: { x, y, w, h }, he, en, held, translationSource: src,
      translit: str(r?.translit), pointed: str(r?.pointed), drawn: !!r?.drawn }));
  }
  const image = typeof json?.image === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(json.image) ? json.image : null;
  const notices = (Array.isArray(json?.notices) ? json.notices : []).map((n) => str(n, 300)).filter(Boolean).slice(0, 5);
  return { width, height, regions, image, notices };
}

/** data:image/jpeg;base64,... -> Uint8Array (null if it is anything else). */
export function decodeJpegDataUrl(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ''));
  if (!m) return null;
  const bin = atob(m[1]); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Box in picture pixels -> CSS percentages for a tap target laid over the picture. */
export function percentBox(box, width, height) {
  const pc = (v, total) => `${Math.round((v / total) * 10000) / 100}%`;
  return { left: pc(box.x, width), top: pc(box.y, height), width: pc(box.w, width), height: pc(box.h, height) };
}

/** Human label for where a translation came from. */
export function sourceLabel(src) {
  if (src === 'machine') return 'Machine translation. It can be wrong.';
  if (src === 'word-list-near') return 'Closest match in the built-in word list. A letter may have been misread, so check it.';
  if (src === 'word-list') return 'From the built-in word list.';
  return '';
}

// ---------------------------------------------------------------- drawing layout (used by the on-device overlay)

export const MIN_FONT = 9; export const LINE_HEIGHT = 1.12;

/** Split words into n lines of roughly equal length. */
export function wrapWords(words, n) {
  if (n <= 1 || words.length <= 1) return [words.join(' ')];
  n = Math.min(n, words.length);
  const total = words.reduce((a, w) => a + w.length, 0) + words.length - 1;
  const lines = []; let cur = []; let used = 0;
  words.forEach((w, i) => {
    cur.push(w); used += w.length + 1;
    const leftWords = words.length - i - 1; const leftLines = n - lines.length - 1;
    if (leftLines > 0 && (used >= (total / n) * (lines.length + 1) || leftWords === leftLines)) { lines.push(cur.join(' ')); cur = []; }
  });
  if (cur.length) lines.push(cur.join(' '));
  return lines;
}

/**
 * Largest font size (and line split) at which text fits the box.
 * @param {(text:string, sizePx:number)=>number} measure width of `text` at `sizePx`
 * @returns {{size:number, lines:string[], fits:boolean}}
 */
export function fitText(measure, text, boxW, boxH, maxLines = 3) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const availW = Math.max(4, boxW * 0.96); const availH = Math.max(4, boxH * 1.3);
  let best = null;
  for (let n = 1; n <= Math.min(maxLines, Math.max(1, words.length)); n++) {
    const lines = wrapWords(words, n);
    let lo = MIN_FONT; let hi = Math.max(MIN_FONT, Math.floor(availH / (lines.length * LINE_HEIGHT))); let ok = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const w = Math.max(...lines.map((l) => measure(l, mid)));
      if (w <= availW && lines.length * mid * LINE_HEIGHT <= availH) { ok = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (ok !== null && (!best || ok > best.size)) best = { size: ok, lines, fits: true };
  }
  return best || { size: MIN_FONT, lines: wrapWords(words, Math.min(maxLines, Math.max(1, words.length))), fits: false };
}

/** Group lines that sit under one another (a menu, a two-line sign). */
export function groupBlocks(regions) {
  const groups = [];
  for (const r of [...regions].sort((a, b) => a.box.y - b.box.y)) {
    const { x, y, w, h } = r.box;
    const home = groups.find((g) => {
      const p = g[g.length - 1].box; const gap = y - (p.y + p.h); const overlap = Math.min(x + w, p.x + p.w) - Math.max(x, p.x);
      return gap >= -0.3 * h && gap <= 1.6 * Math.max(h, p.h) && overlap > 0.2 * Math.min(w, p.w) && h / Math.max(1, p.h) >= 0.5 && h / Math.max(1, p.h) <= 2;
    });
    if (home) home.push(r); else groups.push([r]);
  }
  return groups;
}

/**
 * Where the English goes. Hebrew lines set flush right in a group become flush-left English across the group's width;
 * everything else is centred on its own box (with a little sideways room, since English is often longer).
 * @returns {Map<string,{align:'center'|'left', box:{x:number,y:number,w:number,h:number}}>} keyed by region id
 */
export function chooseAlignment(regions, imageW) {
  const out = new Map();
  for (const rs of groupBlocks(regions)) {
    for (const r of rs) {
      const { x, y, w, h } = r.box;
      const grow = Math.max(0, Math.min(0.15 * w, x - 2, imageW - (x + w) - 2));
      out.set(r.id, { align: 'center', box: { x: x - grow, y, w: w + 2 * grow, h } });
    }
    if (rs.length < 2) continue;
    const lefts = rs.map((r) => r.box.x); const rights = rs.map((r) => r.box.x + r.box.w);
    const width = Math.max(...rights) - Math.min(...lefts);
    if (width > 0 && Math.max(...rights) - Math.min(...rights) <= 0.06 * width && Math.max(...lefts) - Math.min(...lefts) >= 0.12 * width) {
      for (const r of rs) out.set(r.id, { align: 'left', box: { x: Math.min(...lefts), y: r.box.y, w: width, h: r.box.h } });
    }
  }
  return out;
}

/** Median colour of a list of [r,g,b] samples. */
export function medianColour(samples) {
  if (!samples.length) return [255, 255, 255];
  const ch = (i) => { const a = samples.map((s) => s[i]).sort((x, y) => x - y); return a[a.length >> 1]; };
  return [ch(0), ch(1), ch(2)];
}

const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
export function contrastRatio(a, b) { const la = lum(a); const lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

/**
 * Background and letter colours of one box, from RGBA pixels of the whole picture.
 * Background = median of a ring just outside the box; letters = median of the pixels inside that differ most from it.
 * @returns {{bg:number[], fg:number[]}} fg falls back to black or white when the letters do not stand out enough
 */
export function boxColours(data, W, H, box) {
  const x0 = Math.max(0, Math.floor(box.x)); const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(W, Math.ceil(box.x + box.w)); const y1 = Math.min(H, Math.ceil(box.y + box.h));
  const ring = Math.max(3, Math.round(box.h * 0.25));
  const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const step = Math.max(1, Math.round(Math.max(box.w, box.h) / 80));
  const ringPx = [];
  for (let y = Math.max(0, y0 - ring); y < Math.min(H, y1 + ring); y += step) {
    for (let x = Math.max(0, x0 - ring); x < Math.min(W, x1 + ring); x += step) if (x < x0 || x >= x1 || y < y0 || y >= y1) ringPx.push(at(x, y));
  }
  const inside = [];
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) inside.push(at(x, y));
  const bg = medianColour(ringPx.length >= 8 ? ringPx : inside);
  const far = inside.filter((p) => Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]) > 60);
  let fg = far.length >= 4 ? medianColour(far) : null;
  if (!fg || contrastRatio(fg, bg) < 3) fg = lum(bg) < 0.4 ? [255, 255, 255] : [17, 17, 17];
  return { bg, fg };
}
