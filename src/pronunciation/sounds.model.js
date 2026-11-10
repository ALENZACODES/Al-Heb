// @ts-check
// Pure helpers that turn the pronunciation data files into display strings.
// No DOM; unit-tested in tests/pronunciation.view.test.js.

export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];

export const TRADITION_LABELS = {
  israeli: 'Modern Israeli',
  sephardi: 'Sephardi (American synagogue default)',
  ashkenazi: 'Ashkenazi',
};

/** @param {unknown} t */
export const normalizeTradition = (t) => (TRADITIONS.includes(/** @type {string} */ (t)) ? /** @type {string} */ (t) : 'israeli');

/**
 * What to show for one sign in the chosen tradition.
 * @param {any} rec  niqqud.json record or variant
 * @param {string} tradition
 * @param {any} [parent]  parent record (variants inherit ipa/english)
 */
export function describeSign(rec, tradition, parent) {
  const t = normalizeTradition(tradition);
  const src = rec.ipa ? rec : parent ?? rec;
  const eng = rec.english ?? parent?.english;
  return {
    id: rec.id,
    shape: rec.shape,
    name: rec.name ?? rec.id,
    ipa: src.ipa?.[t] ?? '',
    english: eng?.[t] ?? '',
    americanSynagogue: t === 'sephardi' ? eng?.american_synagogue ?? '' : '',
    inherited: !rec.ipa,
  };
}

/** Consonant rows that change sound, with the value for the tradition. */
export function soundChangingLetters(consonants, tradition) {
  const t = normalizeTradition(tradition);
  return Object.values(consonants.letters)
    .filter((l) => l.changesSound)
    .map((l) => ({ id: l.id, he: l.he, name: l.name, ipa: l.ipa[t], english: l.english[t], verified: l.verified }));
}

/** Which form of a same-word pair belongs to the tradition (sephardi uses the israeli spelling). */
export function pairFormFor(pair, tradition) {
  return normalizeTradition(tradition) === 'ashkenazi' ? pair.ashkenazi : pair.israeli;
}
