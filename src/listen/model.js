/** Listen and pick: pure model. Words come from data/vocab/words.json only. */
export const KEY = 'listen.v1';
export const emptyState = () => ({ v: 1, answered: 0, correct: 0, heard: 0, heardCorrect: 0, missed: {}, last: 0 });

export function normState(s) {
  const o = emptyState();
  if (!s || typeof s !== 'object') return o;
  for (const k of ['answered', 'correct', 'heard', 'heardCorrect', 'last']) if (Number.isFinite(s[k]) && s[k] >= 0) o[k] = s[k];
  if (s.missed && typeof s.missed === 'object') for (const [id, n] of Object.entries(s.missed)) if (Number.isFinite(n) && n > 0) o.missed[id] = n;
  return o;
}

/** Candidate words: single-token entries with usable letters, most frequent first. */
export function buildPool(words, cfg) {
  return (words || [])
    .filter((w) => w && w.kind === 'word' && w.he && w.heUnpointed && w.en && !/\s/.test(w.heUnpointed)
      && w.heUnpointed.length >= cfg.minLetters && w.heUnpointed.length <= cfg.maxLetters)
    .sort((a, b) => (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9))
    .slice(0, cfg.poolSize);
}

/** Edit distance between unpointed forms (small strings). */
export function distance(a, b) {
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Look-alike distractors: nearest unpointed forms (never the same spelling or the same pointed text). */
export function distractors(target, pool, n) {
  const seen = new Set([target.heUnpointed, target.he]);
  const ranked = pool.filter((w) => w.id !== target.id)
    .map((w) => ({ w, d: distance(target.heUnpointed, w.heUnpointed) + Math.abs(target.heUnpointed.length - w.heUnpointed.length) * 0.1 }))
    .sort((a, b) => a.d - b.d || (a.w.id < b.w.id ? -1 : 1));
  const out = [];
  for (const { w } of ranked) { if (seen.has(w.heUnpointed) || seen.has(w.he)) continue; seen.add(w.heUnpointed); seen.add(w.he); out.push(w); if (out.length >= n) break; }
  return out;
}

function shuffle(a, rng) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

/** mode 'audio' or 'read'. Returns null when too few look-alikes exist. */
export function buildQuestion(target, pool, cfg, rng, mode) {
  const d = distractors(target, pool, cfg.choices - 1);
  if (d.length < cfg.choices - 1) return null;
  return { id: target.id, mode, prompt: mode === 'read' ? target.en : null, answer: target.he,
    choices: shuffle([target, ...d], rng).map((w) => ({ id: w.id, he: w.he })) };
}

export function buildRound(targets, pool, cfg, rng, mode, missed = {}) {
  const weighted = shuffle(targets, rng).sort((a, b) => (missed[b.id] || 0) - (missed[a.id] || 0)).slice(0, cfg.rounds * 2);
  const qs = [];
  for (const t of shuffle(weighted, rng)) { const q = buildQuestion(t, pool, cfg, rng, mode); if (q) qs.push(q); if (qs.length >= cfg.rounds) break; }
  return qs;
}

/** mode 'audio' = a clip was played for this question; anything else is a reading question (a visible word is not evidence of hearing). */
export function applyAnswer(state, id, ok, now, mode = 'read') {
  const s = normState(state); s.answered++; s.last = now;
  if (mode === 'audio') { s.heard++; if (ok) s.heardCorrect++; }
  if (ok) { s.correct++; if (s.missed[id]) { s.missed[id]--; if (s.missed[id] <= 0) delete s.missed[id]; } } else s.missed[id] = (s.missed[id] || 0) + 1;
  return s;
}
