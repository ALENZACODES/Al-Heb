// Pure helpers for the vocabulary screen (no DOM).
import { newCard } from '../curriculum/srs.js';

export const TIER_LABEL = { 500: 'Words 1-500', 1000: 'Words 501-1,000', 2000: 'Words 1,001-2,000', 5000: 'Words 2,001-5,000' };
export const CARD_PREFIX = 'vocab:';
export const VOCAB_CARDS_KEY = 'srs.vocab'; // { [cardId]: srs card + {tier, topic} }; separate from lesson cards (srs.cards) on purpose

/** Remove niqqud, cantillation, maqaf and other non-letter marks, so pointed and unpointed text compare equal. */
export function stripPoints(s) {
  return String(s ?? '').normalize('NFD').replace(/[֑-ׇ־]/g, '').replace(/[‎‏"'`]/g, '').normalize('NFC');
}
const HEB = /[֐-׿]/;

/** @param {{lemma:string,pointed?:string|null,gloss:string,pos:string,topic:string}[]} entries */
export function filterEntries(entries, { topic = '', query = '' } = {}) {
  const q = String(query).trim();
  const he = HEB.test(q);
  const hq = he ? stripPoints(q) : '';
  const eq = he ? '' : q.toLowerCase();
  return entries.filter((e) => {
    if (topic && e.topic !== topic) return false;
    if (!q) return true;
    if (he) return stripPoints(e.lemma).includes(hq) || stripPoints(e.pointed).includes(hq);
    return e.gloss.toLowerCase().includes(eq);
  });
}

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
