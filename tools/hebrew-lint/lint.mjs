// Hebrew string linter: deterministic, report-only. It never rewrites anything.
// Passing it is NOT proof of correct Hebrew (no spelling, grammar, vowel or meaning checks).
// Canonical mark order used by the mark-order rule: Unicode canonical order (the order NFC produces), i.e.
// base letter, vowels (sheva..qubuts, by combining class 10-20), dagesh (21), meteg (22), rafe (23),
// shin/sin dot (24/25), then cantillation/other marks by combining class. This matches the repo's existing
// corpus normalisation test (letter, vowel, dagesh, shin/sin dot).
import fs from 'node:fs';
import path from 'node:path';

export const RULES = {
  'mark-order': { cls: 'definite', reason: 'Marks on one letter are not in Unicode canonical order, so equal-looking strings compare unequal and some renderers misplace them.' },
  'stray-mark': { cls: 'definite', reason: 'A point or accent has no Hebrew letter (or dotted circle) to attach to, so it renders detached or on the wrong glyph.' },
  'conflicting-marks': { cls: 'definite', reason: 'Two different vowels, or both shin and sin dot, or a shin/sin dot on a non-shin letter; none is valid pointing.' },
  'duplicate-mark': { cls: 'definite', reason: 'The same mark appears twice on one letter, which is never intended.' },
  'final-letter-mid-word': { cls: 'definite', reason: 'A final-form letter (kaf, mem, nun, pe, tsadi) is followed by another letter in the same word.' },
  'nonfinal-letter-at-end': { cls: 'definite', reason: 'A non-final kaf/mem/nun/tsadi ends a multi-letter word. Exempt: one-letter strings, letter+geresh, words with gershayim (acronyms), and fragment fields (syllables, marked segments, folded dropTokens).' },
  'nonfinal-pe-at-end': { cls: 'style', reason: 'Plain pe ending a word is the accepted spelling of many loanwords (tip, ketchup); it is wrong only in native words.' },
  'latin-in-hebrew-word': { cls: 'definite', reason: 'A Latin letter touches a Hebrew letter with no space or punctuation, usually a keyboard or paste slip.' },
  'invisible-char': { cls: 'definite', reason: 'Zero-width space/joiner, word joiner, soft hyphen or BOM inside a Hebrew string is invisible and breaks matching.' },
  'bidi-unbalanced': { cls: 'definite', reason: 'A bidi embedding/override/isolate is opened and never closed (or closed without opening), which can reorder following text.' },
  'not-nfc': { cls: 'definite', reason: 'After mark ordering, the string still changes under NFC (Hebrew presentation forms or decomposed Latin), so it is inconsistently normalised.' },
  'bidi-control': { cls: 'style', reason: 'Directional marks (LRM, RLM, embeddings, isolates) are legitimate when deliberate; listed so they can be reviewed.' },
  'bidi-mixed-direction': { cls: 'style', reason: 'Both left-to-right and right-to-left controls in one string; may be intentional in mixed-script text.' },
  'double-space': { cls: 'style', reason: 'Consecutive whitespace collapses in HTML, so it is usually a layout or typing habit rather than a wrong word.' },
  'sof-pasuq-space-before': { cls: 'style', reason: 'Convention is no space before the sof pasuq; the text still reads correctly.' },
  'sof-pasuq-no-space-after': { cls: 'style', reason: 'Convention is one space after the sof pasuq before the next word.' },
  'maqaf-spacing': { cls: 'style', reason: 'Convention is no spaces around the maqaf.' },
  'ascii-hyphen-in-pointed-text': { cls: 'style', reason: 'Pointed text conventionally joins words with the maqaf; modern prose often uses a hyphen on purpose.' },
  'ascii-gershayim': { cls: 'style', reason: 'A straight or curly double quote stands in for gershayim (U+05F4); readable but does not match the proper character.' },
  'ascii-geresh': { cls: 'style', reason: 'A straight or curly apostrophe stands in for geresh (U+05F3); readable but does not match the proper character.' },
};

const isLetterCp = (c) => (c >= 0x5d0 && c <= 0x5ea) || (c >= 0x5f0 && c <= 0x5f2) || (c >= 0xfb1d && c <= 0xfb4f && c !== 0xfb1e);
const isMarkCp = (c) => (c >= 0x591 && c <= 0x5bd) || c === 0x5bf || c === 0x5c1 || c === 0x5c2 || c === 0x5c4 || c === 0x5c5 || c === 0x5c7 || c === 0xfb1e;
const isVowelCp = (c) => (c >= 0x5b0 && c <= 0x5bb) || c === 0x5c7;
const isHebCp = (c) => isLetterCp(c) || isMarkCp(c);
const isLatinCp = (c) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f && c !== 0xd7 && c !== 0xf7);
const FINAL = new Set([0x5da, 0x5dd, 0x5df, 0x5e3, 0x5e5]);
const NONFINAL = new Set([0x5db, 0x5de, 0x5e0, 0x5e4, 0x5e6]);
const INVIS = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0xad]);
const BIDI_LTR = new Set([0x200e, 0x202a, 0x202d, 0x2066, 0x2068]);
const BIDI_RTL = new Set([0x200f, 0x061c, 0x202b, 0x202e, 0x2067]);
const BIDI_ALL = new Set([...BIDI_LTR, ...BIDI_RTL, 0x202c, 0x2069]);
const WS = new Set([0x20, 0xa0, 0x2009, 0x202f, 0x3000, 0x09]);

export const hasHebrew = (s) => /[\u0590-\u05ff\ufb1d-\ufb4f]/.test(s);
const hex = (c) => 'U+' + c.toString(16).toUpperCase().padStart(4, '0');

const sortMarks = (marks) => {
  const a = [...marks];
  for (let i = 1; i < a.length; i++) {
    for (let j = i; j > 0; j--) {
      const probe = '\u05d0' + a[j - 1] + a[j];
      if (probe.normalize('NFC') !== probe) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; } else break;
    }
  }
  return a;
};

// Returns [{rule, index (UTF-16 offset), len, detail}]
// Fields that hold word fragments or skeleton-folded tokens by construction.
const FRAGMENT_PATH = /\.(syllables|s|marked|dropTokens)(\[|\.)|\.dropTokens\[/;
export function lintString(s, p = '') {
  const out = [];
  if (!hasHebrew(s)) return out;
  const add = (rule, index, len = 1, detail = '') => out.push({ rule, index, len, detail });
  const chars = [];
  // markup like <s t="large">..</s> is transparent (offsets are kept); U+034F (CGJ) acts as a mark barrier like a base.
  let inTag = false;
  for (let i = 0; i < s.length;) {
    const c = s.codePointAt(i); const n = c > 0xffff ? 2 : 1;
    if (c === 0x3c && /^<\/?[A-Za-z][^<>]*>/.test(s.slice(i))) inTag = true;
    if (!inTag) chars.push({ c, i, n, ch: s.slice(i, i + n) });
    if (inTag && c === 0x3e) inTag = false;
    i += n;
  }
  const onlyMarks = chars.every((x) => isMarkCp(x.c) || x.c === 0x25cc || WS.has(x.c) || x.c === 0x34f);

  // clusters: base + marks
  let k = 0;
  while (k < chars.length) {
    const x = chars[k];
    if (isMarkCp(x.c) && (k === 0 || !isMarkCp(chars[k - 1].c))) {
      const prev = chars[k - 1];
      let e = k; while (e + 1 < chars.length && isMarkCp(chars[e + 1].c)) e++;
      const nx = chars[e + 1];
      const specimen = (!prev || WS.has(prev.c) || prev.c === 0x28 || prev.c === 0x22) && (!nx || WS.has(nx.c) || nx.c === 0x29 || nx.c === 0x22 || nx.c === 0x2c || nx.c === 0x25cc);
      if ((!prev || !(isLetterCp(prev.c) || prev.c === 0x25cc || prev.c === 0x34f)) && !onlyMarks && !specimen) {
        add('stray-mark', x.i, chars[e].i + chars[e].n - x.i, [...Array(e - k + 1).keys()].map((q) => hex(chars[k + q].c)).join(' '));
        k = e + 1; continue;
      }
    }
    if (isLetterCp(x.c) || x.c === 0x25cc || x.c === 0x34f) {
      let e = k; while (e + 1 < chars.length && isMarkCp(chars[e + 1].c)) e++;
      if (e > k) {
        const ms = chars.slice(k + 1, e + 1);
        const seq = ms.map((m) => m.ch);
        const sorted = sortMarks(seq);
        const span = chars[e].i + chars[e].n - x.i;
        if (sorted.join('') !== seq.join('')) add('mark-order', x.i, span, seq.map((m) => hex(m.codePointAt(0))).join(' ') + ' -> ' + sorted.map((m) => hex(m.codePointAt(0))).join(' '));
        const seen = new Set(); const dup = new Set();
        for (const m of ms) { if (seen.has(m.c)) dup.add(m.c); seen.add(m.c); }
        if (dup.size) add('duplicate-mark', x.i, span, [...dup].map(hex).join(' '));
        const vowels = new Set(ms.filter((m) => isVowelCp(m.c)).map((m) => m.c));
        const hasShin = seen.has(0x5c1), hasSin = seen.has(0x5c2);
        const dotOnWrong = (hasShin || hasSin) && x.c !== 0x5e9 && x.c !== 0xfb2a;
        if (vowels.size > 1) add('conflicting-marks', x.i, span, 'vowels ' + [...vowels].map(hex).join(' '));
        else if (hasShin && hasSin) add('conflicting-marks', x.i, span, 'shin dot and sin dot');
        else if (dotOnWrong) add('conflicting-marks', x.i, span, 'shin/sin dot on ' + hex(x.c));
      }
      k = e + 1; continue;
    }
    k++;
  }

  // words (runs of letters/marks, joined across geresh/gershayim and ASCII quote between letters)
  let w = [];
  const flushWord = () => {
    if (!w.length) return;
    const letters = w.filter((q) => isLetterCp(q.c));
    if (letters.length) {
      for (let a = 0; a < letters.length - 1; a++) if (FINAL.has(letters[a].c)) add('final-letter-mid-word', letters[a].i, 1, hex(letters[a].c));
      const last = letters[letters.length - 1];
      const after = w[w.length - 1];
      const lastIdx = w.lastIndexOf(last);
      const trailingGeresh = w.slice(lastIdx + 1).some((q) => q.c === 0x5f3);
      const nextCh = chars[chars.indexOf(after) + 1];
      const followedByQuote = nextCh && (nextCh.ch === "'" || nextCh.c === 0x2019) && !trailingGeresh;
      const pePlosive = last.c === 0x5e4 && w.slice(lastIdx + 1).some((q) => q.c === 0x5bc);
      const hasGershayim = w.some((q) => q.c === 0x5f4 || q.ch === '"' || q.c === 0x201d);
      if (NONFINAL.has(last.c) && !pePlosive && letters.length > 1 && !trailingGeresh && !followedByQuote && !hasGershayim) {
        if (last.c === 0x5e4) add('nonfinal-pe-at-end', last.i, 1, hex(last.c));
        else if (!FRAGMENT_PATH.test(p + '.')) add('nonfinal-letter-at-end', last.i, 1, hex(last.c));
      }
    }
    w = [];
  };
  for (let q = 0; q < chars.length; q++) {
    const x = chars[q];
    const quoteJoin = (x.ch === '"' || x.ch === "'" || x.c === 0x201d || x.c === 0x2019) && chars[q - 1] && isHebCp(chars[q - 1].c) && chars[q + 1] && isLetterCp(chars[q + 1].c);
    if (isHebCp(x.c) || x.c === 0x34f || x.c === 0x5f3 || x.c === 0x5f4 || quoteJoin) w.push(x); else flushWord();
  }
  flushWord();

  // Latin touching Hebrew
  for (let q = 1; q < chars.length; q++) {
    const a = chars[q - 1], b = chars[q];
    if ((isHebCp(a.c) && isLatinCp(b.c)) || (isLatinCp(a.c) && isHebCp(b.c))) add('latin-in-hebrew-word', a.i, a.n + b.n, a.ch + b.ch);
  }

  // invisible, bidi
  let stack = 0, unbal = false, hasL = false, hasR = false;
  for (const x of chars) {
    if (INVIS.has(x.c)) add('invisible-char', x.i, x.n, hex(x.c));
    if (BIDI_ALL.has(x.c)) {
      add('bidi-control', x.i, x.n, hex(x.c));
      if (BIDI_LTR.has(x.c)) hasL = true; if (BIDI_RTL.has(x.c)) hasR = true;
      if ([0x202a, 0x202b, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068].includes(x.c)) stack++;
      if (x.c === 0x202c || x.c === 0x2069) { if (stack === 0) unbal = true; else stack--; }
    }
  }
  if (hasL && hasR) add('bidi-mixed-direction', 0, 1);
  if (unbal || stack > 0) add('bidi-unbalanced', 0, 1, unbal ? 'close without open' : 'open without close');

  // normalisation (after canonical mark ordering)
  {
    let s2 = ''; let q = 0;
    while (q < chars.length) {
      if (isLetterCp(chars[q].c) && isMarkCp(chars[q + 1]?.c ?? 0)) {
        let e = q + 1; while (e + 1 < chars.length && isMarkCp(chars[e + 1].c)) e++;
        s2 += chars[q].ch + sortMarks(chars.slice(q + 1, e + 1).map((m) => m.ch)).join(''); q = e + 1;
      } else { s2 += chars[q].ch; q++; }
    }
    if (s2 !== s2.normalize('NFC')) {
      const n = s2.normalize('NFC'); let d = 0; while (d < s2.length && s2[d] === n[d]) d++;
      add('not-nfc', Math.min(d, s.length - 1), 1, 'changes under NFC at offset ' + d);
    }
  }

  // spacing and punctuation
  for (let q = 0; q < chars.length; q++) {
    const x = chars[q], p = chars[q - 1], n = chars[q + 1];
    if (WS.has(x.c) && n && WS.has(n.c) && !(p && WS.has(p.c))) { let e = q + 1; while (chars[e + 1] && WS.has(chars[e + 1].c)) e++; add('double-space', x.i, chars[e].i + 1 - x.i); }
    if (x.c === 0x5c3) {
      if (p && WS.has(p.c)) add('sof-pasuq-space-before', p.i, 2);
      if (n && isLetterCp(n.c)) add('sof-pasuq-no-space-after', x.i, 2);
    }
    if (x.c === 0x5be && ((p && WS.has(p.c)) || (n && WS.has(n.c)))) add('maqaf-spacing', x.i, 1);
    if (x.ch === '-' && p && n && isHebCp(p.c) && isLetterCp(n.c)) {
      let a = q - 1; while (a > 0 && isHebCp(chars[a - 1].c)) a--;
      let b = q + 1; while (b + 1 < chars.length && isHebCp(chars[b + 1].c)) b++;
      const pointed = chars.slice(a, b + 1).some((m) => (m.c >= 0x5b0 && m.c <= 0x5bc));
      const both = chars.slice(a, q).some((m) => m.c >= 0x5b0 && m.c <= 0x5bc) && chars.slice(q + 1, b + 1).some((m) => m.c >= 0x5b0 && m.c <= 0x5bc);
      if (pointed && both) add('ascii-hyphen-in-pointed-text', x.i, 1);
    }
    if ((x.ch === '"' || x.c === 0x201d || x.c === 0x201c) && p && n && isHebCp(p.c) && isLetterCp(n.c)) add('ascii-gershayim', x.i, 1, x.ch);
  }
  // apostrophe as geresh: skip when the string also uses apostrophes as opening quotes before Hebrew
  const quotedHebrew = chars.some((x, q) => (x.ch === "'" || x.c === 0x2018) && (!chars[q - 1] || !isHebCp(chars[q - 1].c) && !isLatinCp(chars[q - 1].c)) && chars[q + 1] && isLetterCp(chars[q + 1].c));
  if (!quotedHebrew) for (let q = 1; q < chars.length; q++) {
    const x = chars[q];
    if ((x.ch === "'" || x.c === 0x2019) && isHebCp(chars[q - 1].c)) add('ascii-geresh', x.i, 1, x.ch);
  }
  out.sort((a, b) => a.index - b.index || a.rule.localeCompare(b.rule));
  return out;
}

export function walkJson(v, cb, p = '') {
  if (typeof v === 'string') cb(v, p);
  else if (Array.isArray(v)) v.forEach((x, i) => walkJson(x, cb, `${p}[${i}]`));
  else if (v && typeof v === 'object') for (const [key, x] of Object.entries(v)) {
    if (hasHebrew(key)) cb(key, `${p}.<key>`);
    walkJson(x, cb, `${p}.${key}`);
  }
}

export function listJson(dir) {
  const out = [];
  const rec = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) rec(f); else if (e.name.endsWith('.json')) out.push(f);
  } };
  rec(dir); return out;
}

const snippet = (s, index, len) => {
  const a = Math.max(0, index - 10), b = Math.min(s.length, index + len + 10);
  return (a ? '...' : '') + s.slice(a, b) + (b < s.length ? '...' : '');
};

// Scan a data root. Returns { files: [{file, strings, counts}], totals, examples, findings[] }
export function scanDir(dataDir, rootDir = path.dirname(dataDir)) {
  const files = []; const findings = []; const parseErrors = [];
  let scannedFiles = 0, hebrewStrings = 0;
  for (const f of listJson(dataDir)) {
    scannedFiles++;
    const rel = path.relative(rootDir, f).split(path.sep).join('/');
    let json;
    try { json = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { parseErrors.push({ file: rel, error: String(e.message).slice(0, 120) }); continue; }
    const counts = {}; let strings = 0;
    walkJson(json, (s, p) => {
      if (!hasHebrew(s)) return;
      strings++;
      for (const h of lintString(s, p)) {
        counts[h.rule] = (counts[h.rule] || 0) + 1;
        findings.push({ rule: h.rule, file: rel, path: p, detail: h.detail, snippet: snippet(s, h.index, h.len), sample: s });
      }
    });
    hebrewStrings += strings;
    files.push({ file: rel, hebrewStrings: strings, counts });
  }
  return { scannedFiles, hebrewStrings, files, findings, parseErrors };
}
