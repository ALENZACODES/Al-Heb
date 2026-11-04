// Pure logic for the trope trainer. Words, mark ids and names all come from data/corpus/trope/*.json; nothing is invented here.
export const STORE_KEY = 'trope.v1';
export const TRAD = { ashkenazi: 'ashkenazi' };

/** Naming system: Ashkenazi names for an Ashkenazi congregation setting, otherwise the Sephardi/Mizrahi names. */
export const systemFor = (congregation) => (TRAD[congregation] ? 'ashkenazi' : 'sephardi');

/** id -> { id, name, he, cls, level } for one naming system, from the corpus mark table. */
export function nameMap(table, system) {
  const m = new Map();
  for (const r of table?.prose || []) {
    if (m.has(r.id)) continue;
    m.set(r.id, { id: r.id, name: system === 'ashkenazi' ? r.ashkenazi : r.sephardi, he: system === 'ashkenazi' ? r.ashkenaziHe : r.sephardiHe, cls: r.cls, level: r.level });
  }
  return m;
}

/** Words that carry exactly one trope id (secondary-stress meteg and separators ignored), with their corpus text. */
export function collectWords(passages, names) {
  const out = [];
  for (const p of passages || []) for (const v of p.verses || []) for (const w of v.words || []) {
    const ids = new Set((w.marks || []).filter((m) => m.cls === 'disjunctive' || m.cls === 'conjunctive').map((m) => m.id));
    if (ids.size !== 1 || !w.trope || !ids.has(w.trope) || !names.has(w.trope) || !w.text) continue;
    out.push({ key: `${p.id}:${v.chapter}:${v.verse}:${w.i}`, text: w.text, trope: w.trope, ref: v.ref });
  }
  return out;
}

/** Trope ids by how many words carry them (most frequent first; ties by id so the order is stable). */
export function frequency(words) {
  const c = new Map();
  for (const w of words) c.set(w.trope, (c.get(w.trope) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([id, n]) => ({ id, n }));
}

/** Trope ids allowed at a level, given the levels file. A level needs at least `need` marks or it widens to all. */
export function marksForLevel(freq, levels, level, need = 4) {
  const L = (levels?.levels || []).find((x) => x.level === level);
  const top = L?.topMarks;
  const ids = freq.map((f) => f.id);
  const cut = top == null ? ids : ids.slice(0, Math.max(top, need));
  return cut.length >= need ? cut : ids;
}

/** Fisher-Yates with an injectable rng. */
export function shuffle(a, rng = Math.random) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/** One question: a word and `n` options (the right mark plus distractors from the same level, or any mark if the level is too thin). */
export function buildQuestion({ words, names, freq, levels, level, rng = Math.random, n = 4, avoidKey = null }) {
  const allowed = new Set(marksForLevel(freq, levels, level, n));
  const pool = words.filter((w) => allowed.has(w.trope) && w.key !== avoidKey);
  if (!pool.length) return null;
  const w = pool[Math.floor(rng() * pool.length)];
  const others = shuffle([...allowed].filter((id) => id !== w.trope), rng);
  const extra = others.length >= n - 1 ? [] : shuffle(freq.map((f) => f.id).filter((id) => id !== w.trope && !others.includes(id)), rng);
  const distract = others.concat(extra).slice(0, n - 1);
  if (distract.length < n - 1) return null;
  const options = shuffle([w.trope, ...distract], rng).map((id) => ({ id, label: names.get(id).name, he: names.get(id).he }));
  return { word: w, answer: w.trope, options };
}

export const emptyState = () => ({ v: 1, level: 1, answered: 0, correct: 0, byTrope: {} });
export function normaliseState(s) {
  const b = emptyState();
  if (!s || typeof s !== 'object') return b;
  const num = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  b.level = [1, 2, 3].includes(s.level) ? s.level : 1;
  b.answered = num(s.answered); b.correct = Math.min(num(s.correct), b.answered);
  for (const [k, v] of Object.entries(s.byTrope && typeof s.byTrope === 'object' ? s.byTrope : {})) {
    const seen = num(v?.seen); b.byTrope[k] = { seen, right: Math.min(num(v?.right), seen) };
  }
  return b;
}
export function applyAnswer(state, trope, correct) {
  const s = normaliseState(state);
  const t = s.byTrope[trope] || { seen: 0, right: 0 };
  s.byTrope[trope] = { seen: t.seen + 1, right: t.right + (correct ? 1 : 0) };
  s.answered += 1; if (correct) s.correct += 1;
  return s;
}
