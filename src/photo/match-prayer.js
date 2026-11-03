// Fuzzy match of an OCR'd Hebrew line against the corpus. Lane 6. Pure.
//
// Method: consonant skeletons (marks stripped, finals folded, non-letters dropped) compared with a
// WEIGHTED Levenshtein distance. Substitutions between letters that OCR engines commonly confuse
// cost CONFUSION_COST (0.5) instead of 1; insertions/deletions cost 1 (dropped letters are real
// errors). score = 1 - distance / max(len(ocr), len(candidate)), in [0,1].
// A "containment" score (OCR line is a fragment of a longer corpus line: free gaps at both ends of the
// candidate) is also computed and used when the OCR skeleton has >= MIN_FRAGMENT_LETTERS letters.
//
// THRESHOLD: DEFAULT_THRESHOLD = 0.75. This is a conservative engineering default, NOT tuned on real OCR
// output (no real OCR was available). It must be re-tuned with the 50-photo benchmark (docs/photo/ENGINES.md).
import { consonantSkeleton } from './hebrew.js';

export const DEFAULT_THRESHOLD = 0.75;
export const MIN_FRAGMENT_LETTERS = 8;
export const CONFUSION_COST = 0.5;

// Unordered pairs of letters that print/photo OCR commonly confuses (derived from letter shapes, not measured).
const CONFUSABLE = [
  'רד', 'וי', 'וז', 'בכ', 'גנ', 'חה', 'חת', 'הת', 'טמ', 'כנ', 'מס', 'עצ', 'פק', 'דו', 'כפ', 'עט', 'שס',
];
const CONF = new Set();
for (const p of CONFUSABLE) { const c = [...p]; for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) { CONF.add(c[i] + c[j]); CONF.add(c[j] + c[i]); } }
// note: skeleton has finals folded, so ן/ם etc never occur in practice.

function sub(a, b) { return a === b ? 0 : (CONF.has(a + b) ? CONFUSION_COST : 1); }

/** Weighted Levenshtein distance over two strings (arrays of chars). */
export function weightedDistance(a, b) {
  const A = [...a]; const B = [...b];
  let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + sub(A[i - 1], B[j - 1]));
    prev = cur;
  }
  return prev[B.length];
}

/** Minimum weighted distance of `a` against any substring of `b` (free leading/trailing gaps in b). */
export function containmentDistance(a, b) {
  const A = [...a]; const B = [...b];
  let prev = new Array(B.length + 1).fill(0); // free start anywhere in b
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + sub(A[i - 1], B[j - 1]));
    prev = cur;
  }
  return Math.min(...prev); // free end anywhere in b
}

export function similarity(skelA, skelB, { allowFragment = true } = {}) {
  const la = [...skelA].length; const lb = [...skelB].length;
  if (!la || !lb) return { score: 0, kind: 'empty' };
  const full = 1 - weightedDistance(skelA, skelB) / Math.max(la, lb);
  let best = { score: Math.max(0, full), kind: 'full' };
  if (allowFragment && la >= MIN_FRAGMENT_LETTERS && la < lb) {
    const frag = 1 - containmentDistance(skelA, skelB) / la;
    if (frag > best.score) best = { score: Math.max(0, frag), kind: 'fragment' };
  }
  return best;
}

// Small built-in fixture, used when data/corpus/registry.json is absent. Pointed text was typed by the
// lane-6 builder and has NOT been checked against tanach.us (same caveat as lane 5's transcriptions).
export const FIXTURE_REGISTRY = [
  {
    id: 'fixture.priestly-blessing',
    ref: 'Numbers 6:24-26',
    he: 'יְבָרֶכְךָ יְהוָה וְיִשְׁמְרֶךָ\nיָאֵר יְהוָה פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ\nיִשָּׂא יְהוָה פָּנָיו אֵלֶיךָ וְיָשֵׂם לְךָ שָׁלוֹם',
    english: null,
    status: 'fixture-unverified',
  },
  {
    id: 'fixture.shema',
    ref: 'Deuteronomy 6:4',
    he: 'שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ יְהוָה אֶחָד',
    english: null,
    status: 'fixture-unverified',
  },
];

/**
 * Turn registry JSON (array, or {entries|texts|items:[...]}) into candidate lines:
 * [{id, ref, lineIndex, pointed, skeleton, english?}]. An entry's `he` is split on newlines and sof pasuq (U+05C3);
 * the whole entry is also added as a candidate (lineIndex -1) so multi-line OCR blocks can match.
 */
export function buildCandidates(registry) {
  const arr = Array.isArray(registry) ? registry : (registry?.entries || registry?.texts || registry?.items || []);
  const out = [];
  for (const e of arr) {
    if (!e || typeof e.he !== 'string' || !e.he) continue;
    const lines = e.he.split(/\n|׃/u).map((l) => l.trim()).filter(Boolean);
    lines.forEach((l, i) => {
      const skeleton = consonantSkeleton(l);
      if (skeleton) out.push({ id: e.id, ref: e.ref, lineIndex: i, pointed: l, skeleton, english: e.english ?? null });
    });
    if (lines.length > 1) out.push({ id: e.id, ref: e.ref, lineIndex: -1, pointed: e.he.replace(/\n/g, ' '), skeleton: consonantSkeleton(e.he), english: e.english ?? null });
  }
  return out;
}

/**
 * @param {string} ocrLine OCR output for one line (marks optional, errors tolerated)
 * @param {object|object[]|null} registry parsed registry.json; null -> built-in fixture
 * @param {{threshold?:number, topN?:number}} [opts]
 * @returns {{id:string, score:number, pointed:string, ref?:string, lineIndex:number, kind:string, matched:boolean, english:string|null, source:'registry'|'fixture'} | null}
 *   best candidate (matched=false if below threshold), or null if the line has no Hebrew letters / no candidates.
 */
export function matchPrayer(ocrLine, registry = null, { threshold = DEFAULT_THRESHOLD } = {}) {
  const skel = consonantSkeleton(ocrLine);
  if (!skel) return null;
  const usingFixture = !registry;
  const cands = buildCandidates(usingFixture ? FIXTURE_REGISTRY : registry);
  let best = null;
  for (const c of cands) {
    const { score, kind } = similarity(skel, c.skeleton);
    if (!best || score > best.score) best = { c, score, kind };
  }
  if (!best) return null;
  return {
    id: best.c.id, score: Math.round(best.score * 1000) / 1000, pointed: best.c.pointed, ref: best.c.ref,
    lineIndex: best.c.lineIndex, kind: best.kind, matched: best.score >= threshold,
    english: best.c.english, source: usingFixture ? 'fixture' : 'registry',
  };
}

/** Load data/corpus/registry.json if present (Node only; browsers should pass a fetched object). */
export async function loadRegistryIfPresent(path = new URL('../../data/corpus/registry.json', import.meta.url)) {
  try {
    const fs = await import('node:fs/promises');
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch { return null; }
}
