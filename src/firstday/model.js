// First 10 minutes model (DRAFT, unreviewed): pure functions, no DOM, no clock. Data: data/firstday/*.json.
export const DRAFT_NOTICE = 'Draft and unreviewed: no Hebrew teacher has checked this lesson and no learner has tried it yet.';
export const PROGRESS_KEY = 'firstday.progress';
export const BUDGET_MIN = 10;

/** Letters only: vowel points, cantillation and shin/sin dots removed. */
export const bare = (s) => String(s ?? '').replace(/[֑-ׇ]/g, '');
const FINAL = { 'ם': 'מ', 'ן': 'נ', 'ך': 'כ', 'ף': 'פ', 'ץ': 'צ' };
const ID_BY_LETTER = { 'ש': 'shin', 'ל': 'lamed', 'ו': 'vav', 'מ': 'mem', 'ה': 'he' };
/** Letter ids of a word (final forms mapped to their base letter), or null for a letter outside the taught set. */
export function wordLetterIds(he) {
  const out = [];
  for (const ch of bare(he)) {
    const id = ID_BY_LETTER[FINAL[ch] || ch];
    if (!id) return null;
    out.push(id);
  }
  return out;
}

export const totalMinutes = (data) => data.steps.reduce((a, s) => a + (s.minutes || 0), 0);
export const wordById = (data, id) => data.words.find((w) => w.id === id) || null;
export const taughtBefore = (data, stepIndex) => {
  const letters = new Set(), vowels = new Set();
  data.steps.slice(0, stepIndex).forEach((s) => { if (s.kind === 'letter') s.items.forEach((i) => letters.add(i)); if (s.kind === 'vowel') s.items.forEach((i) => vowels.add(i)); });
  return { letters, vowels };
};
/** Every read step must use only letters and vowels taught in earlier steps. Returns a list of problems (empty = ok). */
export function checkGating(data) {
  const problems = [];
  data.steps.forEach((s, i) => {
    if (s.kind !== 'read') return;
    const w = wordById(data, s.word), t = taughtBefore(data, i);
    if (!w) return problems.push(`${s.id}: unknown word ${s.word}`);
    const ids = wordLetterIds(w.he);
    if (!ids) return problems.push(`${s.id}: ${w.id} uses a letter outside the taught set`);
    ids.forEach((l) => { if (!t.letters.has(l)) problems.push(`${s.id}: letter ${l} not yet taught`); });
    w.vowels.forEach((v) => { if (!t.vowels.has(v)) problems.push(`${s.id}: vowel ${v} not yet taught`); });
  });
  return problems;
}

/** Check question: the target word plus the others, order set by rng (deterministic given rng). */
export function buildCheck(data, targetId = 'shalom', rng = Math.random) {
  const opts = data.words.map((w) => ({ id: w.id, he: w.he }));
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return { targetId, options: opts };
}
export const gradeCheck = (q, pickedId) => ({ correct: pickedId === q.targetId, answer: q.targetId });

/** Progress is self-reported; nothing here claims the learner can read. */
export const emptyProgress = () => ({ step: 0, readWords: [], checkCorrect: null, done: false });
export function advance(p, data) {
  const step = Math.min(p.step + 1, data.steps.length - 1);
  return { ...p, step, done: step === data.steps.length - 1 };
}
export function markRead(p, wordId) { return p.readWords.includes(wordId) ? p : { ...p, readWords: [...p.readWords, wordId] }; }

/** Audio hooks: entries for ctx.audio.extend (status missing, so only the Israeli speech fallback speaks) and a safe play. */
export function audioEntries(data, ladder) {
  const out = [];
  const add = (a, text) => { if (a && text) out.push({ path: `audio/m/israeli/${a.kind}/${a.id}.mp3`, voice: 'm', tradition: 'israeli', kind: a.kind, id: a.id, text, status: 'missing', source: 'none', group: 'firstday' }); };
  data.words.forEach((w) => add(w.audio, w.he));
  (ladder?.steps || []).forEach((s) => add(s.audio, s.word));
  return out;
}
export async function playHook(audio, hook) {
  try { if (!audio?.play || !hook) return { source: 'none' }; return await audio.play(hook.kind, hook.id); } catch { return { source: 'none' }; }
}

// ---- ladder ----
export function checkLadder(ladder) {
  const problems = [];
  if (ladder.steps.length !== 20) problems.push(`expected 20 steps, got ${ladder.steps.length}`);
  ladder.steps.forEach((s, i) => {
    if (s.n !== i + 1) problems.push(`step ${i + 1}: n=${s.n}`);
    if (!ladder.stages.includes(s.stage)) problems.push(`step ${s.n}: bad stage`);
    if (bare(s.word) !== s.bare) problems.push(`step ${s.n}: bare mismatch`);
    if (bare(s.shown) !== s.bare) problems.push(`step ${s.n}: shown letters differ from word`);
    if (s.stage === 'pointed' && s.shown !== s.word) problems.push(`step ${s.n}: pointed step must show full points`);
    if (s.stage.startsWith('unpointed') && s.shown !== s.bare) problems.push(`step ${s.n}: unpointed step still shows points`);
    if (i && ladder.stages.indexOf(s.stage) < ladder.stages.indexOf(ladder.steps[i - 1].stage)) problems.push(`step ${s.n}: stage goes backwards`);
  });
  return problems;
}
export const ladderStep = (ladder, n) => ladder.steps[n - 1] || null;
/** Score of the unpointed steps only (the P014 target is about unpointed words). answers: {n: boolean} */
export function unpointedScore(ladder, answers) {
  const un = ladder.steps.filter((s) => s.stage.startsWith('unpointed'));
  const right = un.filter((s) => answers[s.n] === true).length;
  return { right, total: un.length, pct: un.length ? Math.round((100 * right) / un.length) : 0 };
}
