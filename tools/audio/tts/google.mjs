// Google Cloud Text-to-Speech REST adapter. NOT run in this session.
// Env: GOOGLE_TTS_API_KEY (or GOOGLE_TTS_ACCESS_TOKEN for OAuth bearer). Optional GOOGLE_TTS_VOICE_M / _F override voice names.
// Default voices are Chirp 3 HD names from the notes (m Charon, f Kore) - an arbitrary starting pick for the listening test, not a recommendation.
// DOCUMENTED LIMITS (Chirp 3: HD page): custom pronunciations and pause control are NOT available for he-IL. SSML <phoneme> is in the
// tag list but the page does not say it works for Hebrew; do not rely on it. Therefore this adapter sends plain pointed text by default.
// SSML tags count as billed characters (except <mark>). Price US$30 per 1M chars for Chirp 3 HD (first 1M free/month), notes dated 2026-11-03.
export const id = 'google';
export const env = ['GOOGLE_TTS_API_KEY'];
export const pricePerMillionChars = 30;
export const voices = { m: 'he-IL-Chirp3-HD-Charon', f: 'he-IL-Chirp3-HD-Kore' };
export const outputFormat = 'MP3';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildRequest({ text, voice, ssml = false, speakingRate, env: e = process.env }) {
  const name = (voice === 'm' ? e.GOOGLE_TTS_VOICE_M : e.GOOGLE_TTS_VOICE_F) || voices[voice];
  if (!name) throw new Error(`google: no voice for ${voice}`);
  const headers = { 'Content-Type': 'application/json' };
  if (e.GOOGLE_TTS_ACCESS_TOKEN) headers.Authorization = `Bearer ${e.GOOGLE_TTS_ACCESS_TOKEN}`;
  else if (e.GOOGLE_TTS_API_KEY) headers['X-Goog-Api-Key'] = e.GOOGLE_TTS_API_KEY;
  else throw new Error('google: set GOOGLE_TTS_API_KEY or GOOGLE_TTS_ACCESS_TOKEN');
  const payload = ssml ? `<speak>${esc(text)}</speak>` : text;
  const body = {
    input: ssml ? { ssml: payload } : { text: payload },
    voice: { languageCode: 'he-IL', name },
    audioConfig: { audioEncoding: outputFormat, ...(speakingRate ? { speakingRate } : {}) },
  };
  return { url: 'https://texttospeech.googleapis.com/v1/text:synthesize', method: 'POST', headers, body: JSON.stringify(body), billedChars: payload.length, voiceName: name };
}
export async function parseResponse(res) {
  if (!res.ok) throw new Error(`google: HTTP ${res.status} ${await res.text()}`);
  const j = await res.json();
  if (!j.audioContent) throw new Error('google: response has no audioContent');
  return Buffer.from(j.audioContent, 'base64');
}
export async function synthesize(opts, fetchImpl = fetch) {
  const r = buildRequest(opts);
  return parseResponse(await fetchImpl(r.url, { method: r.method, headers: r.headers, body: r.body }));
}
