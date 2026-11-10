// "Sounds that differ by tradition": drills and summaries from data/speak/minimal-pairs.json (built by the pronunciation lane from
// the niqqud of existing word-list entries by rule; no native review, no recordings). `audible[i]` says whether a pair sounds
// different in tradition i (index into data.traditions). Pure functions; no DOM.
import { shuffle } from './pairs.js';

export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const TRADITION_LABEL = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };
export const tradition = (t) => (TRADITIONS.includes(t) ? t : 'sephardi');

/** Per contrast: how many pairs sound different / the same in this tradition. */
export function traditionSummary(data, trad) {
  const i = data.traditions.indexOf(tradition(trad));
  return data.contrasts.map((c) => {
    const distinct = c.pairs.filter((p) => p.audible[i]).length;
    return { id: c.id, title: c.title, feature: c.feature, heard: c.heard?.[tradition(trad)] || '', available: c.available, shown: c.pairs.length, distinct, same: c.pairs.length - distinct };
  });
}

/** One pair's line for the list: sound-spellings in this tradition and whether it is a real minimal pair there. */
export function pairLine(pair, data, trad) {
  const i = data.traditions.indexOf(tradition(trad));
  return { he: [pair.a.he, pair.b.he], en: [pair.a.en, pair.b.en], simple: [pair.a.simple[i], pair.b.simple[i]], distinct: !!pair.audible[i] };
}

/** Pairs that sound different in this tradition, shuffled, up to n. Items: {contrast, pair, idx}. */
export function tradQueue(data, trad, rng = Math.random, n = 10) {
  const i = data.traditions.indexOf(tradition(trad));
  const all = [];
  for (const c of data.contrasts) for (const p of c.pairs) if (p.audible[i]) all.push({ contrast: c.id, pair: p, idx: i });
  return shuffle(all, rng).slice(0, n);
}

/** Question: one word of the pair is played (or its sound-spelling is shown); pick which word. */
export function tradQuestion(item, rng = Math.random) {
  const playB = rng() >= 0.5;
  const w = playB ? item.pair.b : item.pair.a, other = playB ? item.pair.a : item.pair.b;
  return {
    item, answer: w.id,
    play: { he: w.he, simple: w.simple[item.idx], en: w.en },
    options: shuffle([{ id: item.pair.a.id, he: item.pair.a.he, label: item.pair.a.en }, { id: item.pair.b.id, he: item.pair.b.he, label: item.pair.b.en }], rng),
    played: w, other,
  };
}
