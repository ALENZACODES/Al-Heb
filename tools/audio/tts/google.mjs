// Google Cloud Text-to-Speech REST adapter.
// Env: GOOGLE_TTS_API_KEY (or GOOGLE_TTS_ACCESS_TOKEN for OAuth bearer).
// Optional GOOGLE_TTS_VOICE_M / _F / GOOGLE_TTS_LANGUAGE_CODE override defaults.
// Per-call overrides: voiceName, languageCode (used for sephardi/ashkenazi accent paths — John t995u).
//
// DEFAULT VOICES are the two Israeli Hebrew WaveNet voices John passed for production on 2026-11-05
// (docs/audio/CASTING-REPORT.md): m = he-IL-Wavenet-B, f = he-IL-Wavenet-A. They are trained on Hebrew and
// read pointed text (niqqud) the way a learner expects. The multilingual "Chirp 3: HD" voices (Charon, Kore, ...)
// are NOT the default any more: they have no custom pronunciation or pause control for he-IL, take no SSML, and
// on 2026-11-07 a batch of 124 prayer clips rendered through them came back sounding wrong on common words
// ("shalom"). To use an HD voice on purpose pass voiceName plus allowHd: true (or the env override + GOOGLE_TTS_ALLOW_HD=1).
//
// TEXT HYGIENE: every request runs cleanHebrewForTts() first. It keeps the letters and vowel points and removes
// what a reader never says aloud: cantillation marks, sof pasuq (׃), paseq (׀), meteg, rafe; a maqaf (־) becomes a
// space; stray trailing full stops and colons go. Question and exclamation marks stay (they shape the prosody).
// A clip whose Hebrew is unpointed, or that mixes Latin letters into Hebrew, is reported by textWarnings() so the
// batch tool can refuse it before paying for it.
//
// Prices (cloud.google.com/text-to-speech/pricing, verified 2026-11-03, see data/audio/tts-prices.json):
// WaveNet US$4 per 1M characters (first 4M free each month); Chirp 3 HD US$30 per 1M (first 1M free). SSML tags count as characters.
// pricePerMillionChars is the rate of the DEFAULT voices (WaveNet); priceFor(name) gives the rate for a named voice.
// Learner-facing copy: never name the TTS brand.
export const id = 'google';
export const env = ['GOOGLE_TTS_API_KEY'];
export const PRICES = Object.freeze({ wavenet: 4, 'chirp3-hd': 30 }); // ids as in data/audio/tts-prices.json
export const pricePerMillionChars = PRICES.wavenet;
export const voices = { m: 'he-IL-Wavenet-B', f: 'he-IL-Wavenet-A' };
export const APPROVED_VOICES = Object.freeze(['he-IL-Wavenet-B', 'he-IL-Wavenet-A']);
export const outputFormat = 'MP3';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isHd = (name) => /Chirp3|Chirp-HD|Chirp_HD|HD-/.test(String(name));
/** US$ per million characters for a voice name: Chirp 3 HD or WaveNet (the only two types this adapter sends). */
export const priceFor = (name) => (isHd(name) ? PRICES['chirp3-hd'] : PRICES.wavenet);
/** The voice name a slot resolves to under the given env (per-call voiceName wins in buildRequest). */
export const voiceNameFor = (voice, e = process.env) => (voice === 'm' ? e.GOOGLE_TTS_VOICE_M : e.GOOGLE_TTS_VOICE_F) || voices[voice];

/**
 * Pointed Hebrew in, speakable pointed Hebrew out. Pure; safe on non-Hebrew text (returns it trimmed).
 * Removed: U+0591–U+05AF cantillation, U+05BD meteg, U+05BF rafe, U+05C0 paseq, U+05C3 sof pasuq, U+05C4–U+05C6 marks.
 * Kept: U+05B0–U+05BC and U+05C7 vowel points and dagesh, U+05C1/U+05C2 shin and sin dots, U+05F3/U+05F4 geresh/gershayim.
 */
export function cleanHebrewForTts(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/[֑-ֽֿ֯׀׃-׆]/g, '')
    .replace(/־/g, ' ')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*[.:;·]+\s*$/u, '')
    .trim();
}

/** Problems worth refusing a paid render for. Returns [] when the text looks fine. */
export function textWarnings(text) {
  const t = String(text || '');
  const out = [];
  const hasHebrew = /[א-ת]/.test(t);
  if (!t.trim()) out.push('empty text');
  if (hasHebrew && !/[ְ-ׇּׁׂ]/.test(t) && /[א-ת]{2,}/.test(t)) out.push('Hebrew without vowel points (the voice has to guess)');
  if (hasHebrew && /[A-Za-z]{2,}/.test(t)) out.push('Latin letters mixed into Hebrew (two languages in one clip)');
  return out;
}

export function buildRequest({ text, voice, ssml = false, speakingRate, env: e = process.env, languageCode, voiceName, allowHd = false, clean = true }) {
  const name = voiceName || (voice === 'm' ? e.GOOGLE_TTS_VOICE_M : e.GOOGLE_TTS_VOICE_F) || voices[voice];
  if (!name) throw new Error(`google: no voice for ${voice}`);
  if (isHd(name) && !(allowHd || e.GOOGLE_TTS_ALLOW_HD === '1')) {
    throw new Error(`google: ${name} is a multilingual HD voice, not an approved Israeli Hebrew voice (${APPROVED_VOICES.join(', ')}). Pass allowHd:true / GOOGLE_TTS_ALLOW_HD=1 to use it on purpose.`);
  }
  const lang = languageCode || e.GOOGLE_TTS_LANGUAGE_CODE || (String(name).match(/^([a-z]{2,3}-[A-Z]{2})/) || [])[1] || 'he-IL';
  const headers = { 'Content-Type': 'application/json' };
  if (e.GOOGLE_TTS_ACCESS_TOKEN) headers.Authorization = `Bearer ${e.GOOGLE_TTS_ACCESS_TOKEN}`;
  else if (e.GOOGLE_TTS_API_KEY) headers['X-Goog-Api-Key'] = e.GOOGLE_TTS_API_KEY;
  else throw new Error('google: set GOOGLE_TTS_API_KEY or GOOGLE_TTS_ACCESS_TOKEN');
  if (isHd(name) && ssml) throw new Error('google: Chirp 3 HD requires plain text, not SSML');
  const spoken = clean ? cleanHebrewForTts(text) : String(text);
  if (!spoken) throw new Error('google: nothing left to say after cleaning the text');
  const payload = ssml ? `<speak>${esc(spoken)}</speak>` : spoken;
  const body = {
    input: ssml ? { ssml: payload } : { text: payload },
    voice: { languageCode: lang, name },
    audioConfig: { audioEncoding: outputFormat, sampleRateHertz: 24000, ...(!isHd(name) && speakingRate ? { speakingRate } : {}) },
  };
  return { url: 'https://texttospeech.googleapis.com/v1/text:synthesize', method: 'POST', headers, body: JSON.stringify(body), billedChars: [...spoken].length, voiceName: name, languageCode: lang, spokenText: spoken, usdPerMillionChars: priceFor(name) };
}
export async function parseResponse(res) {
  if (!res.ok) throw new Error(`google: HTTP ${res.status} ${await res.text()}`);
  const j = await res.json();
  if (!j.audioContent) throw new Error('google: response has no audioContent');
  return Buffer.from(j.audioContent, 'base64');
}
export async function synthesize(opts, fetchImpl = fetch) {
  const r = buildRequest(opts);
  const buf = await parseResponse(await fetchImpl(r.url, { method: r.method, headers: r.headers, body: r.body, signal: opts.signal }));
  return Object.assign(buf, { voiceName: r.voiceName, spokenText: r.spokenText });
}
