// Lane 4 static tables used to derive audio manifest entries when other lanes' data is absent.
// Pointed letter names and the consonant IPA table are lane-4 authored, NOT native-speaker verified.
export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const VOICES = ['m', 'f'];
export const KINDS = ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer'];

// [id, glyph, pointed name, israeli consonant IPA (null = no isolated sound clip), final?]
export const LETTERS = [
  ['alef', 'א', 'אָלֶף', 'ʔ'], ['bet', 'ב', 'בֵּית', 'b'], ['gimel', 'ג', 'גִּימֶל', 'ɡ'],
  ['dalet', 'ד', 'דָּלֶת', 'd'], ['he', 'ה', 'הֵא', 'h'], ['vav', 'ו', 'וָו', 'v'],
  ['zayin', 'ז', 'זַיִן', 'z'], ['chet', 'ח', 'חֵית', 'χ'], ['tet', 'ט', 'טֵית', 't'],
  ['yod', 'י', 'יוֹד', 'j'], ['kaf', 'כ', 'כַּף', 'k'], ['lamed', 'ל', 'לָמֶד', 'l'],
  ['mem', 'מ', 'מֵם', 'm'], ['nun', 'נ', 'נוּן', 'n'], ['samekh', 'ס', 'סָמֶך', 's'],
  ['ayin', 'ע', 'עַיִן', 'ʔ'], ['pe', 'פ', 'פֵּא', 'p'], ['tsadi', 'צ', 'צָדִי', 'ts'],
  ['qof', 'ק', 'קוֹף', 'k'], ['resh', 'ר', 'רֵישׁ', 'ʁ'], ['shin', 'ש', 'שִׁין', 'ʃ'],
  ['tav', 'ת', 'תָּו', 't'],
];
export const FINAL_LETTERS = [
  ['kaf-final', 'ך', 'כַּף סוֹפִית'], ['mem-final', 'ם', 'מֵם סוֹפִית'], ['nun-final', 'ן', 'נוּן סוֹפִית'],
  ['pe-final', 'ף', 'פֵּא סוֹפִית'], ['tsadi-final', 'ץ', 'צָדִי סוֹפִית'],
];
// Letters whose syllable-grid form needs a mark to give the "hard" sound (bet/kaf/pe + dagesh; shin + shin dot).
export const GRID_MARKS = { bet: 'ּ', kaf: 'ּ', pe: 'ּ', shin: 'ׁ' };

// five vowel sounds -> representative sign
export const GRID_VOWELS = [
  ['a', 'ַ', 'patach'], ['e', 'ֶ', 'segol'], ['i', 'ִ', 'chirik'],
  ['o', 'ֹ', 'cholam'], ['u', 'ֻ', 'kubutz'],
];
export const GRID_VOWEL_IPA_ISRAELI = { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u' };

// shared vowel/mark ids -> text carrying the mark (alef carrier unless noted)
export const VOWELS = [
  ['kamatz', 'אָ'], ['patach', 'אַ'], ['tzere', 'אֵ'], ['segol', 'אֶ'],
  ['chirik', 'אִ'], ['cholam', 'אֹ'], ['kubutz', 'אֻ'], ['shuruk', 'וּ'],
  ['shva', 'בְ'], ['chataf-patach', 'אֲ'], ['chataf-segol', 'אֱ'], ['chataf-kamatz', 'אֳ'],
  ['dagesh', 'בּ'], ['shin-dot', 'שׁ'], ['sin-dot', 'שׂ'],
];

// Visually / aurally confusable letter pairs for the minimal-pair section (syllable ids reused; no new clips).
export const CONFUSABLE_LETTER_PAIRS = [
  ['bet', 'vav'], ['kaf', 'qof'], ['chet', 'kaf'], ['tet', 'tav'], ['alef', 'ayin'],
  ['samekh', 'shin'], ['dalet', 'resh'], ['zayin', 'resh'], ['gimel', 'nun'], ['tsadi', 'ayin'],
];

export function normalizeId(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}
export function audioPath(voice, tradition, kind, id) {
  return `audio/${voice}/${tradition}/${kind}/${id}.mp3`;
}
