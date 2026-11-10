// Learner labels for a word or line clip: pointed Hebrew, English meaning, tradition phonetic, and an
// English-sounds reading a North American learner can say out loud.
// Phonetics are rule-generated (siddur style). Sephardi audio labels use a Moroccan-adjacent reading
// and are not a copy of Modern Israeli. Nobody who speaks the tradition has signed off on every row.
import { transliterate } from '../pronunciation/transliterate.js';

export const SAY_LEGEND = 'How to read the English sounds: ah as in father, eh as in bed, ee as in see, oh as in go, oo as in food, ay as in day, oy as in boy, igh as in high. kh is the throat sound in loch, not the ch in chair. hh is a deeper throat h. th is the th in this. A mark like \' is a small catch in the throat.';

/** File and device-voice speeds. normal is full speed; slow and slower are for learning a word or line. */
export const FILE_RATES = Object.freeze({ normal: 1, slow: 0.85, slower: 0.7 });
export const SPEED_CHOICES = Object.freeze([['normal', 'Normal'], ['slow', 'Slow'], ['slower', 'Slower']]);

const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];

/** Tradition phonetic for audio labels. Sephardi is Moroccan-adjacent; it is not the Israeli string. */
export function clipPhonetic(he, tradition) {
  const t = TRADITIONS.includes(tradition) ? tradition : 'israeli';
  try {
    if (t === 'ashkenazi') return transliterate(String(he ?? ''), { scheme: 'siddur', tradition: 'ashkenazi' });
    if (t === 'sephardi') return transliterate(String(he ?? ''), { scheme: 'siddur', tradition: 'sephardi', moroccan: true });
    return transliterate(String(he ?? ''), { scheme: 'siddur', tradition: 'israeli' });
  } catch { return ''; }
}

const VSAY = { a: 'ah', e: 'eh', i: 'ee', o: 'oh', u: 'oo', ai: 'igh', ei: 'ay', oy: 'oy', oi: 'oy' };

function lex(s) {
  const u = [];
  let i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    if (two === 'oy' || two === 'oi' || two === 'ei' || two === 'ai') { u.push({ t: 'v', x: two }); i += 2; continue; }
    if (two === 'sh' || two === 'kh' || two === 'ts' || two === 'tz' || two === 'th' || two === 'hh' || two === 'ch') {
      const x = two === 'tz' ? 'ts' : two === 'ch' ? 'kh' : two;
      u.push({ t: 'c', x }); i += 2; continue;
    }
    const ch = s[i];
    u.push({ t: 'aeiou'.includes(ch) ? 'v' : 'c', x: ch });
    i++;
  }
  return u;
}

/** One phonetic token → hyphenated English sounds (shah-lohm, ah-doh-noy, moh-lahkh). */
export function sayToken(token) {
  const units = lex(String(token || '').toLowerCase());
  const chunks = [];
  let i = 0;
  while (i < units.length) {
    let cons = '';
    if (units[i].t === 'c') { cons = units[i].x; i++; }
    if (i < units.length && units[i].t === 'v') {
      chunks.push(cons + (VSAY[units[i].x] || units[i].x));
      i++;
      while (i < units.length && units[i].t === 'c' && (i + 1 >= units.length || units[i + 1].t === 'c')) {
        chunks[chunks.length - 1] += units[i].x;
        i++;
      }
    } else if (cons) {
      if (chunks.length) chunks[chunks.length - 1] += cons;
      else chunks.push(cons);
    } else i++;
  }
  return chunks.join('-');
}

/** English-sounds reading of a tradition phonetic. Spaces and maqaf hyphens separate words. */
export function englishSay(phonetic) {
  const raw = String(phonetic || '').trim();
  if (!raw) return '';
  return raw.split(/[\s-]+/).filter(Boolean).map(sayToken).join(' ');
}

/**
 * The four learner fields for one manifest row. `say` is stored when present, otherwise derived from the phonetic.
 * @param {{text?:string, english?:string, phonetic?:string, say?:string, tradition?:string}|null} entry
 */
export function learnerFields(entry) {
  if (!entry) return null;
  const text = String(entry.text || '').trim();
  const english = String(entry.english || '').trim();
  const phonetic = String(entry.phonetic || '').trim();
  const say = String(entry.say || '').trim() || englishSay(phonetic);
  return {
    text,
    english: english && english !== 'UNKNOWN' ? english : '',
    phonetic,
    say,
  };
}
