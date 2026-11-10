// Syllable tables for the level 2 arcade games (Israeli pronunciation). Consonants carry the dagesh
// where it changes the sound, so every card reads one way. Names in English for the vowel marks.
export const CONSONANTS = Object.freeze([
  { he: 'בּ', tr: 'b', name: 'bet' }, { he: 'ג', tr: 'g', name: 'gimel' }, { he: 'ד', tr: 'd', name: 'dalet' }, { he: 'ה', tr: 'h', name: 'he' },
  { he: 'ו', tr: 'v', name: 'vav' }, { he: 'ז', tr: 'z', name: 'zayin' }, { he: 'ח', tr: 'ch', name: 'chet' }, { he: 'ט', tr: 't', name: 'tet' },
  { he: 'י', tr: 'y', name: 'yod' }, { he: 'כּ', tr: 'k', name: 'kaf' }, { he: 'ל', tr: 'l', name: 'lamed' }, { he: 'מ', tr: 'm', name: 'mem' },
  { he: 'נ', tr: 'n', name: 'nun' }, { he: 'ס', tr: 's', name: 'samekh' }, { he: 'פּ', tr: 'p', name: 'pe' }, { he: 'צ', tr: 'tz', name: 'tsadi' },
  { he: 'ק', tr: 'k', name: 'qof' }, { he: 'ר', tr: 'r', name: 'resh' }, { he: 'שׁ', tr: 'sh', name: 'shin' }, { he: 'ת', tr: 't', name: 'tav' },
]);

export const VOWELS = Object.freeze([
  { mark: 'ַ', tr: 'a', name: 'patach', en: 'a as in father' },
  { mark: 'ָ', tr: 'a', name: 'kamatz', en: 'a as in father' },
  { mark: 'ֶ', tr: 'e', name: 'segol', en: 'e as in bed' },
  { mark: 'ֵ', tr: 'e', name: 'tzere', en: 'e as in bed' },
  { mark: 'ִ', tr: 'i', name: 'chirik', en: 'i as in ski' },
  { mark: 'ֹ', tr: 'o', name: 'cholam', en: 'o as in more' },
  { mark: 'ֻ', tr: 'u', name: 'kubutz', en: 'u as in flute' },
]);

/** Distinct vowel sounds (a, e, i, o, u) with one representative mark each. */
export const VOWEL_SOUNDS = Object.freeze(['a', 'e', 'i', 'o', 'u'].map((s) => VOWELS.find((v) => v.tr === s)));

/** One syllable card: consonant + vowel mark, with its reading. */
export function syllable(c, v) {
  return { he: c.he + v.mark, tr: c.tr + v.tr, consonant: c, vowel: v };
}

/** All consonant x vowel-sound combinations (100 cards). */
export function allSyllables() {
  const out = [];
  for (const c of CONSONANTS) for (const v of VOWEL_SOUNDS) out.push(syllable(c, v));
  return out;
}
