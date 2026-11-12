// The Ashkenazi reading written in pointed Hebrew letters, for the Israeli voice to read (tools/audio/accent_fill.mjs --script hebrew).
// The English-letter respelling ("borukh atoh") reads badly in a Hebrew voice: the 12 Nov accent run's held clips were heard by Google
// as English words ("cherev" as "chairs", "pesach" as "tasc"). The same three Ashkenazi rules that src/pronunciation/transliterate.js
// applies to its Latin letters are applied here to the Hebrew itself, so the Israeli voice reads Hebrew it knows:
//   kamatz (and kamatz katan) -> holam            "o"   (transliterate.js vowelLatin: kamatz -> 'o' when ashk)
//   tzere without a following yod -> tzere + yod  "ei"  (tzere -> 'ei' when ashk; tzere-male is already 'ei')
//   tav without dagesh -> samekh                  "s"   (ת -> 's' when !dagesh && ashk)
//   the suffix -ָיו ("-av") -> holam + vet        "-ov" (yod silent, final vav read as v: transliterate.js line ~200)
// Nothing else changes (stress and the "oy" holam are not written by the engine either). checkAgainstEngine() measures, row by row,
// whether the Israeli transliteration of this text equals the engine's own Ashkenazi transliteration of the original.
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { cleanHebrewForTts } from './tts/google.mjs';

const KAMATZ = 'ָ', KAMATZ_KATAN = 'ׇ', HOLAM = 'ֹ', TZERE = 'ֵ', DAGESH = 'ּ';
const isLetter = (c) => c >= 'א' && c <= 'ת';
const isMark = (c) => (c >= '֑' && c <= 'ׇ' && c !== '־' && c !== '׀' && c !== '׃' && c !== '׆');

/** Split into clusters: {ch, marks} for letters, {text} for anything else. */
function clusters(s) {
  const out = [];
  for (const c of s) {
    if (isLetter(c)) out.push({ ch: c, marks: '' });
    else if (isMark(c) && out.length && out[out.length - 1].ch) out[out.length - 1].marks += c;
    else out.push({ text: c });
  }
  return out;
}
const bare = (cl) => cl && cl.ch && !/[ְ-ׇֻ]/.test(cl.marks) && !cl.marks.includes(DAGESH);
const wordEnd = (cl) => !cl || !cl.ch;

/** Pointed Hebrew -> the same words with the Ashkenazi sounds written in Hebrew letters. */
export function ashkenaziScript(he) {
  const cs = clusters(cleanHebrewForTts(String(he ?? '')));
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (!c.ch) continue;
    // -ָיו at the end of a word -> holam + vet
    if (c.marks.includes(KAMATZ) && cs[i + 1]?.ch === 'י' && bare(cs[i + 1]) && cs[i + 2]?.ch === 'ו' && bare(cs[i + 2]) && wordEnd(cs[i + 3])) {
      cs[i + 1] = { text: '' }; cs[i + 2] = { ch: 'ב', marks: '' };
    }
    // kamatz + a bare final vav (תָּו, וָו: "tav", "vav") -> holam + vet, so the vav stays a v after the new holam
    else if (c.marks.includes(KAMATZ) && cs[i + 1]?.ch === 'ו' && bare(cs[i + 1]) && wordEnd(cs[i + 2])) cs[i + 1] = { ch: 'ב', marks: '' };
    if (c.ch === 'ת' && !c.marks.includes(DAGESH)) c.ch = 'ס';
    c.marks = c.marks.replaceAll(KAMATZ, HOLAM).replaceAll(KAMATZ_KATAN, HOLAM);
    if (c.marks.includes(TZERE) && !(cs[i + 1]?.ch === 'י' && bare(cs[i + 1]))) c.marks += 'י';   // yod written after the letter's marks
  }
  return cs.map((c) => (c.ch ? c.ch + c.marks : c.text)).join('').normalize('NFC');
}

/** Row check: the Israeli reading of the Hebrew-script text against the engine's Ashkenazi reading of the original. */
export function checkAgainstEngine(he) {
  const want = transliterate(cleanHebrewForTts(he), { scheme: 'siddur', tradition: 'ashkenazi' });
  const script = ashkenaziScript(he);
  const got = transliterate(script, { scheme: 'siddur', tradition: 'israeli' });
  return { script, want, got, same: want === got };
}
