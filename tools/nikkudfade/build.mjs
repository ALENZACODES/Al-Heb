// Builds data/nikkudfade/reading-set.json from data/vocab/words.json. Deterministic; no Hebrew is written by hand.
// Every pointed form is copied verbatim from the vocabulary file. `ambiguous` = another vocabulary entry has the same
// unpointed spelling but a different pointed form, among the 5,000 most frequent modern words (a real homograph in the data), so removing points would hide a choice.
// Usage: node tools/nikkudfade/build.mjs [--check]   (--check exits 1 if the file on disk is stale)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stripPoints, hasPoints } from '../../src/nikkudfade/model.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const SIZE = 240;
export const RIVAL_RANK = 1500; // a look-alike counts only if the other word is among the 1,500 most frequent modern words
const MAX_GLOSS = 40; // skip words whose gloss is too long for a phone card
const lessonNo = (u) => { const m = /^r(\d+)$/.exec(u || ''); return m ? Number(m[1]) : null; };
/** id -> rival for EVERY vocabulary row that has a look-alike within RIVAL_RANK (same unpointed spelling, different points). Used to flag look-alikes outside the 240-word set. */
export function buildHomographs(words) {
  const groups = new Map();
  for (const w of words) { if (w.kind !== 'word' || !hasPoints(w.he) || !(w.modernRank <= RIVAL_RANK)) continue; const k = stripPoints(w.he); if (!groups.has(k)) groups.set(k, new Map()); if (!groups.get(k).has(w.he)) groups.get(k).set(w.he, w); }
  const ids = {};
  for (const w of words) {
    if (w.kind !== 'word' || !hasPoints(w.he)) continue;
    const rival = [...(groups.get(stripPoints(w.he))?.values() || [])].filter((r) => r.he !== w.he).sort((a, b) => a.modernRank - b.modernRank)[0];
    if (rival) ids[w.id] = { he: rival.he, translit: rival.translit, id: rival.id };
  }
  return { schema: 1, source: 'data/vocab/words.json', rivalRank: RIVAL_RANK, note: 'id -> its most frequent look-alike (same unpointed spelling, different points) among the most frequent modern words. Unreviewed.', count: Object.keys(ids).length, ids };
}
export function buildSet(words) {
  const forms = new Map();
  // Only rivals within RIVAL_RANK count; rarer dictionary homographs (fleet, pedestal, shovel) would flag nearly every word.
  for (const w of words) { if (!(w.modernRank <= RIVAL_RANK)) continue; const k = stripPoints(w.he); if (!forms.has(k)) forms.set(k, new Map()); const m = forms.get(k); if (!m.has(w.he)) m.set(w.he, w); }
  const ok = words.filter((w) => w.kind === 'word' && hasPoints(w.he) && !w.he.includes('־') && !(w.flags && w.flags.hidden)
    && ['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'num'].includes(w.pos) && Number.isFinite(w.modernRank) && w.en.length <= MAX_GLOSS);
  ok.sort((a, b) => a.modernRank - b.modernRank || (a.id < b.id ? -1 : 1));
  const items = ok.slice(0, SIZE).map((w) => {
    const rivals = [...(forms.get(stripPoints(w.he))?.values() || [])].filter((r) => r.he !== w.he).sort((a, b) => a.modernRank - b.modernRank);
    return { id: w.id, he: w.he, unpointed: stripPoints(w.he), translit: w.translit, en: w.en, pos: w.pos, level: w.level, modernRank: w.modernRank, unlock: lessonNo(w.unlockLesson), ambiguous: rivals.length > 0,
      ...(rivals.length ? { rival: { id: rivals[0].id, he: rivals[0].he, translit: rivals[0].translit, en: rivals[0].en, modernRank: rivals[0].modernRank } } : {}) };
  });
  const flagged = items.filter((i) => i.ambiguous).length;
  return { schema: 1, source: 'data/vocab/words.json', note: `Pointed forms and glosses are copied from the vocabulary file; nothing here is hand-written Hebrew. Unreviewed by a Hebrew teacher. Look-alike (ambiguous) = another word with the same unpointed spelling and different points within the ${RIVAL_RANK} most frequent modern words: ${flagged} of ${items.length} flagged. unlock = lesson number from the vocabulary file (r08 -> 8).`, rivalRank: RIVAL_RANK, count: items.length, items };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const words = JSON.parse(readFileSync(root + 'data/vocab/words.json', 'utf8')).words;
  const files = { 'data/nikkudfade/reading-set.json': JSON.stringify(buildSet(words), null, 1) + '\n', 'data/nikkudfade/homographs.json': JSON.stringify(buildHomographs(words)) + '\n' };
  let stale = false;
  for (const [p, text] of Object.entries(files)) {
    if (process.argv.includes('--check')) { let cur = ''; try { cur = readFileSync(root + p, 'utf8'); } catch {} if (cur !== text) { console.error(p + ' is stale'); stale = true; } }
    else { writeFileSync(root + p, text); console.log('wrote', p, text.length, 'bytes'); }
  }
  if (stale) process.exit(1);
}
