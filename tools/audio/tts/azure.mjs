// Azure AI Speech REST adapter. NOT run in this session (no credentials, no live calls).
// Env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. eastus).
// Voices (he-IL): m = he-IL-AvriNeural, f = he-IL-HilaNeural. Price ~US$15 per 1M chars (third-party figure, notes dated 2026-11-03).
// UNVERIFIED: whether Azure honours niqqud in input, and whether <phoneme> (IPA) is accepted for he-IL. Plain pointed text only here.
export const id = 'azure';
export const env = ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION'];
export const pricePerMillionChars = 15;
export const voices = { m: 'he-IL-AvriNeural', f: 'he-IL-HilaNeural' };
export const outputFormat = 'audio-24khz-96kbitrate-mono-mp3';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildRequest({ text, voice, env: e = process.env }) {
  const name = voices[voice];
  if (!name) throw new Error(`azure: no voice for ${voice}`);
  if (!e.AZURE_SPEECH_KEY || !e.AZURE_SPEECH_REGION) throw new Error('azure: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION');
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="he-IL"><voice name="${name}">${esc(text)}</voice></speak>`;
  return {
    url: `https://${e.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': e.AZURE_SPEECH_KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': outputFormat, 'User-Agent': 'alef-render-tts' },
    body: ssml, billedChars: text.length, voiceName: name,
  };
}
export async function parseResponse(res) {
  if (!res.ok) throw new Error(`azure: HTTP ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
export async function synthesize(opts, fetchImpl = fetch) {
  const r = buildRequest(opts);
  return parseResponse(await fetchImpl(r.url, { method: r.method, headers: r.headers, body: r.body }));
}
