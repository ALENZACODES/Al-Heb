// English search intents that point at an existing 5,000-list row.
// The stored gloss is not changed. The phrasebook file is not changed.
// “hi” is the same greeting intent as the phrasebook’s hello line for שָׁלוֹם.
// The phrasebook’s own line for the English word “hi” is הֵי (greetings-02). That spelling
// is not added here, because it is not a row in the 5,000-word list.

export const GREETING_ALIAS = Object.freeze({
  queries: Object.freeze(['hi', 'hello']),
  targetId: 'v1c1c9b93',
  lemma: 'שלום',
  pos: 'noun',
  intent: 'English greeting',
  provenance: Object.freeze({
    file: 'data/corpus/phrasebook.json',
    id: 'greetings-01',
    he: 'שָׁלוֹם',
    en: 'hello / goodbye / peace',
    hiLine: 'greetings-02',
    hiHe: 'הֵי',
    hiEn: 'hi',
  }),
});

/**
 * Alias rows for this query among entries already on screen.
 * @param {Array<{id:string,lemma?:string,pos?:string,pointed?:string}>} entries
 * @param {string} query folded or raw; compared with fold from the caller
 * @param {(s:string)=>string} fold
 */
export function aliasHits(entries, query, fold) {
  const q = fold(query);
  if (!GREETING_ALIAS.queries.includes(q)) return [];
  const entry = entries.find((e) => e.id === GREETING_ALIAS.targetId && e.lemma === GREETING_ALIAS.lemma && e.pos === GREETING_ALIAS.pos);
  if (!entry) return [];
  return [{ entry, band: -1, alias: GREETING_ALIAS }];
}

export function aliasNote(alias) {
  if (!alias) return '';
  return `English greeting. The stored gloss on this card is the list’s sense, not the word you typed. Project phrasebook ${alias.provenance.id} gives “${alias.provenance.en}” for this spelling. The phrasebook line for “${alias.provenance.hiEn}” is ${alias.provenance.hiHe} (${alias.provenance.hiLine}), and that spelling is not in this list.`;
}
