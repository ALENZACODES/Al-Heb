// @ts-check
// Weak-spot report: the (up to) 10 items the learner slips on most, each with a plain-English "do this next" and a link.
// Pure: no DOM, no storage, no clock. Sources, all written by other lanes and only read here:
//   letters.progress (tracing runs that never came out clean), srs.cards / srs.vocab lapses, curriculum.pairs (Spot It),
//   pron.misses, speak.v1 (weakest sounds), placement.v1 (missed placement items), timedread.v1 (words marked as stumbles).
// Rows about the same thing (for example the letter Bet from tracing, review slips and the placement check) are merged
// into one row. Scores are "slips" counted by each source, so the order is a rough guide, not a measurement; the screen says so.
// Everything but the SRS lapses is self-reported or recognizer-based: nothing here says the learner can or cannot read.
import { weakSpots, niceId } from './model.js';
import { splitWords } from './decode.js';
import { coerceState, soundReport } from '../speak/model.js';
import { cleanState as cleanTimedReads, trickyWords } from '../timedread/model.js';

export const MAX_WEAK = 10;
const RANK = ['pair', 'srs', 'tracing', 'speak', 'vocab', 'practice', 'timed', 'placement'];
const rank = (src) => { const i = RANK.indexOf(src); return i < 0 ? RANK.length : i; };
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);

/**
 * @param {any} s Snapshot (model.js readSnapshot) @param {{registry:any[]}} d @param {{read:{lines:any[]}}} c makeContext result
 * @param {{max?:number, has?:(name:string)=>boolean}} [o] `has(routeName)` says whether a route exists in this build
 * @returns {Array<{subject:string, sources:string[], label:string, he:boolean, detail:string, next:string, href:string, score:number}>}
 */
export function weakReport(s, d, c, { max = MAX_WEAK, has = () => true } = {}) {
  const route = (alts, fallback = '#/learn?review=1') => { for (const [name, href] of alts) if (has(name)) return href; return fallback; };
  /** @type {Map<string, any>} */ const items = new Map();
  const add = (it) => {
    const cur = items.get(it.subject);
    if (!cur) { items.set(it.subject, { ...it, he: !!it.he, sources: [it.source], details: [it.detail], top: it.score }); return; }
    cur.score += it.score;
    if (!cur.sources.includes(it.source)) cur.sources.push(it.source);
    cur.details.push(it.detail);
    if (it.score > cur.top) { cur.top = it.score; cur.next = it.next; cur.href = it.href; }
  };
  const spot = has('spotit'), board = has('vowelboard');

  // 1. Spot It pairs, review slips on letter and vowel cards, pronunciation practice misses (existing rows, re-voiced)
  for (const r of weakSpots(s, { max: 500, has })) {
    if (r.kind === 'words') continue; // replaced by the per-topic vocabulary rows below
    if (r.kind === 'pair') add({ subject: r.key, source: 'pair', label: r.label, detail: r.detail, score: r.score, href: r.href, next: spot ? 'Play Spot It on these two letters until you can tell them apart.' : 'Look at these two letters again in your review cards.' });
    else if (r.kind === 'letter') add({ subject: r.key, source: 'srs', label: r.label, detail: r.detail, score: r.score, href: r.href, next: spot ? 'Trace it again, then play Spot It with it.' : 'Look at it again in your review cards.' });
    else if (r.kind === 'vowel') add({ subject: r.key, source: 'srs', label: r.label, detail: r.detail, score: r.score, href: r.href, next: board ? 'Spend a few minutes on the vowel board with this sign.' : 'Look at it again in your review cards.' });
    else add({ subject: r.key, source: 'practice', label: r.label, detail: r.detail, score: r.score, href: r.href, next: 'Do a few more rounds on that practice screen.' });
  }

  // 2. Tracing: a letter finished at least once but never without slips, and even the best run had 2 or more
  for (const [id, rec] of Object.entries(s.traced)) {
    const es = Object.values(obj(rec)).filter((e) => e && e.completions > 0);
    if (!es.length || es.some((e) => e.perfect > 0)) continue;
    const bests = es.map((e) => e.bestMistakes).filter((x) => Number.isFinite(x));
    if (!bests.length) continue;
    const best = Math.min(...bests);
    if (best < 2) continue;
    add({ subject: `letter:${id}`, source: 'tracing', label: `Letter: ${niceId(id)}`, detail: `Your best tracing run still had ${plural(best, 'slip', 'slips')}`, score: best,
      href: route([['letter', `#/letters/${encodeURIComponent(id)}`], ['letters', '#/letters']]), next: 'Trace it again, slowly. Aim for one run with no slips.' });
  }

  // 3. Vocabulary and lesson-word cards that keep slipping, grouped by topic (the cards carry a topic, not the Hebrew)
  const groups = new Map();
  for (const [id, card] of [...Object.entries(s.vocab), ...Object.entries(s.cards)]) {
    if (!/^(word:|vocab:)/.test(id) || !card) continue;
    const lap = Number(card.lapses) || 0;
    if (lap < 1) continue;
    const key = typeof card.topic === 'string' && card.topic ? card.topic : Number.isFinite(card.tier) ? `the first ${Number(card.tier).toLocaleString('en-US')} words` : 'lesson words';
    const g = groups.get(key) || { cards: 0, slips: 0 }; g.cards++; g.slips += lap; groups.set(key, g);
  }
  for (const [topic, g] of groups) {
    if (g.slips < 2) continue;
    const name = /^(the first|lesson)/.test(topic) ? topic : niceId(topic).toLowerCase();
    add({ subject: `vocab:${topic}`, source: 'vocab', label: `Words: ${name}`, detail: `${plural(g.cards, 'word card', 'word cards')} slipped, ${plural(g.slips, 'slip', 'slips')} in all`, score: g.slips,
      href: route([['vocab', '#/vocab']]), next: `Review your ${name} words. Each slip makes the scheduler show a card sooner.` });
  }

  // 4. Sounds the speaking practice flags (browser recognition is unverified for Hebrew, so the detail says so)
  for (const r of soundReport(coerceState(s.speak).attempts, { min: 3 }).ranked) {
    if (r.misses < 1) continue;
    const viaSay = (r.sources.say || 0) > 0;
    add({ subject: `sound:${r.id}`, source: 'speak', label: `Sound: ${r.label}`, detail: `Missed ${r.misses} of ${plural(r.tries, 'try', 'tries')} in speaking practice${viaSay ? ' (the browser\'s speech recognition may be part of the reason)' : ''}`, score: r.misses,
      href: route([['speak', '#/speak'], ['sounds', '#/sounds']]), next: 'Do a Say it round, or a sound drill, with words that use this sound.' });
  }

  // 5. Placement check: items answered wrongly or marked "not sure"
  const missed = (Array.isArray(s.placement.answers) ? s.placement.answers : []).filter((a) => a && typeof a.id === 'string' && a.correct === false);
  const byId = new Map((d.registry || []).map((e) => [e.id, e]));
  let other = 0;
  for (const a of missed) {
    const m = /^(letter|vowel|phrase|word|syllable):(.+)$/.exec(a.id);
    if (!m) { other++; continue; }
    if (m[1] === 'letter') add({ subject: a.id, source: 'placement', label: `Letter: ${niceId(m[2])}`, detail: 'Missed in the placement check', score: 1, href: route([['spotit', `#/spotit/${encodeURIComponent(m[2])}`], ['letters', '#/letters']]), next: 'Trace it, then play Spot It with it.' });
    else if (m[1] === 'vowel') add({ subject: a.id, source: 'placement', label: `Sign: ${niceId(m[2])}`, detail: 'Missed in the placement check', score: 1, href: route([['vowelboard', '#/vowelboard']]), next: 'Spend a few minutes on the vowel board with this sign.' });
    else if (m[1] === 'phrase' && byId.has(m[2])) add({ subject: a.id, source: 'placement', label: `Prayer phrase: ${byId.get(m[2]).title ?? m[2]}`, detail: 'Missed in the placement check', score: 1, href: route([['read', `#/read/${encodeURIComponent(m[2])}`]]), next: 'Read it on the Read screen with the English beside it.' });
    else other++;
  }
  if (other) add({ subject: 'placement:other', source: 'placement', label: 'Words and syllables from the placement check', detail: `${plural(other, 'item', 'items')} missed or marked "not sure"`, score: other, href: route([]), next: 'Do a review session; the lessons that teach them are on your path.' });

  // 6. Timed reads: words you marked as stumbles in at least 2 reads of the same line (self-reported)
  const state = cleanTimedReads(s.timedRead);
  const lineOf = new Map((c.read?.lines || []).map((l) => [l.id, l]));
  for (const textId of new Set(state.reads.map((r) => r.textId))) {
    const line = lineOf.get(textId); if (!line) continue;
    const words = splitWords(line.he), n = state.reads.filter((r) => r.textId === textId).length;
    for (const t of trickyWords(state, textId, 3)) {
      if (t.count < 2 || !words[t.idx]) continue;
      add({ subject: `word:${textId}:${t.idx}`, source: 'timed', label: words[t.idx], he: true, detail: `You marked this word as a stumble in ${t.count} of your ${plural(n, 'timed read', 'timed reads')} of ${line.title} (self-reported)`, score: t.count,
        href: route([['timedread', '#/timedread']], route([['read', `#/read/${encodeURIComponent(line.entryId)}`]])), next: `Read ${line.title} aloud again, slowly, then time one more read.` });
    }
  }

  return [...items.values()]
    .sort((a, b) => b.score - a.score || rank(a.sources[0]) - rank(b.sources[0]) || a.subject.localeCompare(b.subject))
    .slice(0, max)
    .map((it) => ({ subject: it.subject, sources: it.sources, label: it.label, he: it.he, detail: cap(it.details.join('; ')), next: it.next, href: it.href, score: it.score }));
}
