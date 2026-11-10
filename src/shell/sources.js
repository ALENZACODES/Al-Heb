// One small, consistent "Sources" line for screens that show word meanings (Wiktionary-derived) or example sentences (Tatoeba),
// plus the per-sentence credit for a Tatoeba example. `mk` is the screen's own element factory (el or h: tag, attrs, ...kids).
// Full credits and licences: #/credits. Not legal advice.
const TATOEBA_HOST = /^https:\/\/tatoeba\.org\//;

/** Credits live in one place: the tiny site-wide "Terms & sources" link (index.html) opens #/terms, which links #/credits.
 *  Screens still call this so the hook stays in one spot; it renders nothing visible. */
export function sourcesLine(mk) {
  return mk('span', { class: 'src-line', hidden: '' });
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
