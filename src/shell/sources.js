// One small, consistent "Sources" line for screens that show word meanings (Wiktionary-derived) or example sentences (Tatoeba),
// plus the per-sentence credit for a Tatoeba example. `mk` is the screen's own element factory (el or h: tag, attrs, ...kids).
// Full credits and licences: #/credits. Not legal advice.
const TATOEBA_HOST = /^https:\/\/tatoeba\.org\//;

/** Footer paragraph: what the data came from, plus a link to the credits screen. Static text, so nothing shifts after load. */
export function sourcesLine(mk, { examples = false } = {}) {
  const what = examples
    ? 'Word meanings: Wiktionary contributors (CC BY-SA 4.0). Example sentences: Tatoeba contributors (CC BY 2.0 FR).'
    : 'Word meanings: Wiktionary contributors (CC BY-SA 4.0).';
  return mk('p', { class: 'src-line' }, what + ' ', mk('a', { class: 'src-link', href: '#/credits' }, 'Sources and licences'));
}

/** Credit for one example sentence. Returns null unless the example came from Tatoeba. Uses the authors and ids stored with the sentence. */
export function exampleCredit(mk, example) {
  const s = example && example.source;
  if (!s || s.type !== 'tatoeba') return null;
  const authors = [s.heAuthor ? `${s.heAuthor} (Hebrew)` : null, s.enAuthor ? `${s.enAuthor} (English)` : null].filter(Boolean);
  const by = authors.length ? authors.join(' and ') + ', Tatoeba contributors' : 'Tatoeba contributors';
  const ids = [s.heId, s.enId].filter((n) => Number.isInteger(n));
  const link = TATOEBA_HOST.test(s.url || '') ? mk('a', { class: 'src-link', href: s.url, rel: 'noopener' }, `Tatoeba sentence ${ids[0] ?? ''}`.trim()) : null;
  return mk('p', { class: 'src-line src-example' }, `Sentence by ${by}, ${s.license || 'CC BY 2.0 FR'}. `, link);
}
