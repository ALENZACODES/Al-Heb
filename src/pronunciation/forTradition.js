// @ts-check
// One place for "what does the learner's tradition change here?". Pure helpers, no DOM, no fetch.
// Views adopt these instead of each re-implementing the congregation lookup, the fallback and the write.
// Every Latin respelling comes from transliterate.js (rule-generated, not checked by a native speaker).
//
// Honest limits, repeated in docs/accents/PLAN.md:
//  - 'israeli' and 'sephardi' give identical Latin letters; only IPA and the English vowel wording differ.
//  - Device (browser) speech is Israeli whatever the setting; audioNote() says so.
import { transliterate } from './transliterate.js';
import { fileLabel } from '../shell/audio-labels.js';

export const TRADITIONS = Object.freeze(['israeli', 'sephardi', 'ashkenazi']);
/** The app default (src/shell/settings.js DEFAULTS.congregation): "American synagogue, Sephardi values". */
export const DEFAULT_TRADITION = 'sephardi';
export const LABELS = Object.freeze({ israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' });

/** @param {any} t @param {string} [fallback] */
export const normalize = (t, fallback = DEFAULT_TRADITION) => (TRADITIONS.includes(t) ? t : fallback);

/** Read the congregation from either settings shape (object with .congregation, or one with .get()). */
export function congregationOf(settings, fallback = DEFAULT_TRADITION) {
  let v;
  try { v = settings && (settings.congregation ?? (typeof settings.get === 'function' ? settings.get('congregation') : undefined)); } catch { v = undefined; }
  return normalize(v, fallback);
}

/**
 * Write the congregation. The real settings object (src/shell/settings.js) takes a PATCH OBJECT: set({congregation:'ashkenazi'}).
 * Calling set('congregation','ashkenazi') on it silently rejects every character as a key and changes nothing.
 * Older test doubles implement set(key, value) (arity 2); those are still served.
 * @returns {boolean} true when the value was accepted
 */
export function setCongregation(settings, t) {
  if (!TRADITIONS.includes(t) || !settings) return false;
  try {
    if (typeof settings.set === 'function') {
      if (settings.set.length >= 2) { settings.set('congregation', t); return true; }
      const rejected = settings.set({ congregation: t });
      return !(Array.isArray(rejected) && rejected.includes('congregation'));
    }
    settings.congregation = t; return true;
  } catch { return false; }
}

/** Latin respelling of pointed Hebrew in a tradition ('' when it cannot be produced). */
export function respell(he, tradition, opts = {}) {
  try { return transliterate(String(he ?? ''), { scheme: 'siddur', ...opts, tradition: normalize(tradition) }); } catch { return ''; }
}

/** All three respellings plus whether Israeli and Sephardi came out identical (they always do in this engine). */
export function respellAll(he) {
  const r = { israeli: respell(he, 'israeli'), sephardi: respell(he, 'sephardi'), ashkenazi: respell(he, 'ashkenazi') };
  return { ...r, sameIsraeliSephardi: r.israeli === r.sephardi, differs: r.israeli !== r.ashkenazi };
}

/**
 * Vowel wording and IPA for one niqqud record (data/pronunciation/niqqud.json) in a tradition.
 * Sephardi falls back to the American-synagogue wording, then Israeli.
 */
export function vowelSound(rec, tradition) {
  const t = normalize(tradition); const e = rec?.english || {};
  return { en: e[t] || e.american_synagogue || e.israeli || '', ipa: rec?.ipa?.[t] || rec?.ipa?.israeli || '' };
}

/**
 * Letter sound in a tradition from data/pronunciation/consonants.json (`rec` = consonants.letters[id]).
 * `dagesh` (true/false) picks the matching variant when the record has one (tav: Ashkenazi s without dagesh). Omit it for the general line.
 * Falls back to `fallbackEn` (e.g. data/letters/letters.json sound.en, which is Israeli only).
 */
export function letterSound(rec, tradition, { dagesh, fallbackEn = '' } = {}) {
  const t = normalize(tradition);
  const pick = (o) => o?.[t] || (t === 'sephardi' ? o?.american_synagogue : '') || o?.israeli || '';
  if (!rec) return { en: fallbackEn, ipa: '', changes: false };
  let src = rec;
  if (typeof dagesh === 'boolean' && Array.isArray(rec.variants)) {
    const v = rec.variants.find((x) => (dagesh ? /^with dagesh/ : /^without dagesh/).test(x.condition));
    if (v) src = v;
  }
  return { en: pick(src.english) || fallbackEn, ipa: pick(src.ipa), changes: !!rec.changesSound };
}

/** Honest line about what the device voice does with the chosen setting. */
export function audioNote(tradition, { hasRecording = false } = {}) {
  const t = normalize(tradition);
  if (hasRecording) return '';
  if (t === 'israeli') return 'No recording yet: this plays the device voice, which speaks Israeli Hebrew.';
  // Owner decision 2026-11-07: the Sephardi setting plays Israeli sound (clips and device voice) and shows the Sephardi reading in English letters.
  if (t === 'sephardi') return 'No recording yet: Sephardi plays the Israeli clips, or the device voice, which speak Israeli Hebrew; the Sephardi reading is shown in English letters.';
  // Owner decision 2026-11-07 22:56: Ashkenazi plays its own clip only when it is an admitted accent clip (an Israeli voice reading the
  // Ashkenazi spelling, src/audio/player.js isAccentClip), otherwise the Israeli clips; the device voice stays off for it.
  return `There is no ${LABELS[t]} recording yet. ${LABELS[t]} plays the Israeli clips where one exists (the ${LABELS[t]} reading is shown in English letters); the device voice speaks Israeli Hebrew, so it will not match your ${LABELS[t]} setting. Read the English-letter spelling instead.`;
}

/** Tradition for content that exists only in Modern Israeli Hebrew (phrasebook, Israel track): never the congregation. */
export const israeliOnly = () => 'israeli';

/**
 * One honest sentence for the result of audio.play(). Views show this instead of each wording their own claim.
 * file: the shared label (human or synthetic); a file from another tradition (via 'equivalent') is named as such.
 * tts-fallback / mismatch: the device voice is Israeli Hebrew, never presented as the learner's tradition.
 * @param {any} r result of ctx.audio.play  @param {string} tradition  @param {string} [what]
 */
export function playLine(r, tradition, what = 'this') {
  const t = normalize(tradition);
  if (r && r.source === 'file') {
    const other = r.fileTradition && r.fileTradition !== t
      ? (t === 'sephardi' && normalize(r.fileTradition) === 'israeli' ? ' It is the Israeli voice; the Sephardi reading is shown in English letters.' : ` It is the ${LABELS[normalize(r.fileTradition)]} reading, used here as a stand-in for ${LABELS[t]}.`)
      : '';
    return `Playing ${what}: ${fileLabel(r.entryStatus, r.fileTradition || t, r.entrySource)}.${other}`;
  }
  if (r && r.source === 'tts-fallback') return `Playing ${what} with the browser voice: a computer voice, not a person. ${t === 'israeli' ? 'It speaks Israeli Hebrew' : t === 'sephardi' ? 'It speaks Israeli Hebrew (Sephardi plays Israeli sound; the Sephardi reading is shown in English letters)' : `It speaks Israeli Hebrew, not ${LABELS[t]}`} and may ignore the vowel points.`;
  if (r && r.source === 'none' && r.reason === 'tts-pronunciation-mismatch') return `Not played: ${audioNote(t)}`;
  if (r && (r.source === 'none' || r.played === false || r.ok === false)) return `No audio for ${what} (${r.reason || r.error || 'unavailable'}).`;
  return `Played ${what}.`;
}

/** Line for views that cannot know whether a recording exists: names the setting and what is shown instead. */
export function settingLine(tradition) {
  const t = normalize(tradition);
  return `Your setting: ${LABELS[t]}. The English-letter spelling below follows it${t === 'israeli' ? '' : ` (made by rules, not checked by a native ${LABELS[t]} speaker)`}.`;
}

/**
 * The one-sentence beginner line for a letter in a tradition ("Bet says B, like the b in ball; no dot, V as in van.").
 * Reads `say` from data/pronunciation/consonants.json; falls back to letterSound() wording when a record has none.
 * @param {any} rec @param {string} tradition @param {{fallbackEn?: string}} [opts]
 */
export function saySound(rec, tradition, { fallbackEn = '' } = {}) {
  const t = normalize(tradition);
  const s = rec?.say?.[t] || rec?.say?.israeli;
  return s || letterSound(rec, t, { fallbackEn }).en;
}

/**
 * What sound the learner can expect with this setting, before any button is pressed. Used by the first-run pronunciation step and
 * the first-day screen so the promise is made once, plainly. No recorded clip exists; this never claims one. The synthetic clips (count in data/audio/summary.json) are named as such.
 * @param {string} tradition @param {{browserVoiceAnyway?: boolean, audioFree?: boolean, recorded?: number}} [o]
 * @returns {{tradition:string, recorded:boolean, deviceVoice:boolean, supported:'recorded'|'device'|'device-mismatch'|'none'|'off', line:string}}
 */
export function audioSupport(tradition, { browserVoiceAnyway = false, audioFree = false, recorded = 0 } = {}) {
  const t = normalize(tradition); const L = LABELS[t];
  const base = { tradition: t, recorded: recorded > 0 };
  if (audioFree) return { ...base, deviceVoice: false, supported: 'off', line: 'Sound is off: you chose to learn without audio. Every step can be done by reading.' };
  if (recorded > 0) return { ...base, deviceVoice: t === 'israeli', supported: 'recorded', line: `Some items have recorded audio. Anything else is read by your device voice, which is Israeli Hebrew${t === 'israeli' ? '' : `, not ${L}`}.` };
  if (t === 'israeli') return { ...base, deviceVoice: true, supported: 'device', line: 'No recorded audio yet. The Hebrew clips use a synthetic voice (a man\'s and a woman\'s); where none exists, Listen uses your device\'s Hebrew voice if it has one: a computer voice, not a teacher.' };
  // Owner decision 2026-11-07 (src/audio/player.js PLAYBACK_TRADITION): the Sephardi setting plays the Israeli clips and shows the
  // Sephardi reading in English letters. The device voice, also Israeli, is no mismatch for it.
  if (t === 'sephardi') return { ...base, deviceVoice: true, supported: 'device', line: 'No recorded audio yet. Sephardi plays the Israeli clips (a synthetic man\'s or woman\'s voice) and shows the Sephardi reading in English letters; where no clip exists, Listen uses your device\'s Hebrew voice if it has one: a computer voice, not a teacher.' };
  if (browserVoiceAnyway) return { ...base, deviceVoice: true, supported: 'device-mismatch', line: `No ${L} audio yet. The device voice is on: it speaks Israeli Hebrew, so it will not sound ${L}.` };
  return { ...base, deviceVoice: false, supported: 'none', line: `No ${L} audio yet. ${L} plays the Israeli clips where one exists and shows the ${L} reading in English letters; the device voice speaks only Israeli Hebrew, so Listen stays off for ${L} items with no clip. Read the English-letter spelling instead.` };
}
