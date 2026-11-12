// Pure helpers for the vocabulary screen (no DOM).
import { newCard } from '../curriculum/srs.js';
import { rankEntries } from './rank.js';
import { transliterate } from '../pronunciation/transliterate.js';

export const TIER_LABEL = { 500: 'Words 1-500', 1000: 'Words 501-1,000', 2000: 'Words 1,001-2,000', 5000: 'Words 2,001-5,000' };
export const CARD_PREFIX = 'vocab:';
export const VOCAB_CARDS_KEY = 'srs.vocab'; // { [cardId]: srs card + {tier, topic} }; separate from lesson cards (srs.cards) on purpose

/** Remove niqqud, cantillation, maqaf and other non-letter marks, so pointed and unpointed text compare equal. */
export function stripPoints(s) {
  return String(s ?? '').normalize('NFD').replace(/[֑-ׇ־]/g, '').replace(/[‎‏"'`]/g, '').normalize('NFC');
}
/**
 * Topic filter, then relevance order.
 * An empty or whitespace-only query keeps the list order.
 * A query that is only punctuation matches nothing (it is not used as a regular expression).
 * `translitOf(entry)` is the tradition spelling the screen is showing; omit it to use `entry.translit` when present.
 * @param {{lemma:string,pointed?:string|null,gloss:string,pos:string,topic:string,translit?:string}[]} entries
 */
export function filterEntries(entries, { topic = '', query = '', translitOf } = {}) {
  let list = entries;
  if (topic) list = list.filter((e) => e.topic === topic);
  const raw = String(query ?? '');
  if (!raw.trim()) return list;
  return rankEntries(list, raw, translitOf).map((x) => x.entry);
}

export { fold, rankEntries, matchBand, BAND, EXACT_MAX, isExactBand, isShortQuery, keepBand } from './rank.js';

export const cardId = (e) => CARD_PREFIX + e.id;

/** New SRS cards for entries not yet in `cards`. Returns {cards, added}. Input untouched. */
export function addCards(cards, entries, now, limit = Infinity) {
  const out = { ...cards }; let added = 0;
  for (const e of entries) {
    if (added >= limit) break;
    const id = cardId(e);
    if (out[id]) continue;
    out[id] = { ...newCard({ id, kind: 'word', now }), tier: e.tier, topic: e.topic };
    added++;
  }
  return { cards: out, added };
}

export const POS_LABEL = { noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', pron: 'pronoun', conj: 'conjunction', num: 'numeral', intj: 'interjection', particle: 'particle', det: 'determiner' };

export const TRAD = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };
/** Transliteration for an entry in the learner's tradition; '' when the word has no vowel points.
 *  Shared by the Dictionary and global Search (M-02), so both match the same spelling. */
export function translitFor(e, tradition) {
  if (!e?.pointed) return '';
  try { return transliterate(e.pointed, { scheme: 'siddur', tradition: TRAD[tradition] ? tradition : 'sephardi' }); } catch { return ''; }
}
