// @ts-check
// ALEF teacher share (DRAFT): aggregate validated summaries into class-level confusions and per-learner help rows. Pure.
import { niceId } from '../progress/model.js';

const SCREEN = { vowelboard: 'Vowel board', niqquddial: 'Vowel-point dial', dottile: 'Dot tiles', syllablechips: 'Syllable chips' };

/** Human label for one weak-spot entry (plain text; callers must still escape/textContent it). */
export function weakLabel(w) {
  if (w.kind === 'pair') return `${niceId(w.ids[0])} or ${niceId(w.ids[1])}`;
  if (w.kind === 'letter') return `Letter ${niceId(w.ids[0])}`;
  if (w.kind === 'vowel') return `Sign ${niceId(w.ids[0])}`;
  if (w.kind === 'practice') { const [scr, tag] = String(w.src || '').split('|'); return `${SCREEN[scr] || niceId(scr || 'practice')}: ${niceId(tag || w.ids[0] || '')}`; }
  return 'Words they keep missing';
}
const keyOf = (w) => (w.kind === 'pair' ? 'pair:' + [...w.ids].sort().join('|') : w.kind === 'practice' ? 'practice:' + (w.src || w.ids[0]) : `${w.kind}:${w.ids.join('|')}`);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };

/**
 * @param {any[]} summaries validated by parseSummary
 * @param {{top?:number}} [o]
 */
export function aggregate(summaries, { top = 8 } = {}) {
  const n = summaries.length;
  const items = new Map();
  summaries.forEach((s, i) => {
    for (const w of s.weak) {
      const k = keyOf(w), e = items.get(k) || { key: k, kind: w.kind, label: weakLabel({ ...w, ids: w.kind === 'pair' ? [...w.ids].sort() : w.ids }), learners: 0, total: 0, who: [] };
      e.learners++; e.total += w.n; e.who.push(i); items.set(k, e);
    }
  });
  const rank = (arr) => arr.sort((a, b) => b.learners - a.learners || b.total - a.total || a.key.localeCompare(b.key)).slice(0, top);
  const all = [...items.values()];
  const medWeek = median(summaries.map((s) => s.week));
  const label = (s, i) => s.name || `Learner ${i + 1}`;
  const rows = summaries.map((s, i) => {
    const mine = [...s.weak].sort((a, b) => b.n - a.n).slice(0, 3).map(weakLabel);
    const behind = n > 1 && s.week < medWeek - 1 && !s.weekDone;
    const fast = s.timed?.length ? Math.round(s.timed.reduce((a, t) => a + t.wpm, 0) / s.timed.length) : null;
    return { index: i, name: label(s, i), week: s.week, weekDone: s.weekDone, lessons: s.lessons.length, letters: s.letters.length, signs: s.signs.length, date: s.date, helpOn: mine, behind, avgWpm: fast, needsHelp: behind || mine.length > 0 };
  });
  return {
    learners: n, medianWeek: medWeek,
    confusions: rank(all.filter((e) => e.kind === 'pair')),
    signs: rank(all.filter((e) => e.kind === 'vowel' || (e.kind === 'practice'))),
    letters: rank(all.filter((e) => e.kind === 'letter')),
    rows,
  };
}
