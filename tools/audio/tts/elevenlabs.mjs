// ElevenLabs REST adapter. NOT run in this session.
// Env: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_M, ELEVENLABS_VOICE_F (voice ids: deliberately not hardcoded; pick them in the listening test).
// Notes: Multilingual v2 was reported unintelligible for Hebrew; v3 needs language_code "he". Commercial rights only for output generated
// during a paid subscription. Price US$80 per 1M chars for v3/v4: verified on elevenlabs.io/pricing/api 2026-11-03; Hebrew listed for v3/v4 only (docs/overview/models). See data/audio/tts-prices.json. No documented Hebrew phoneme control.
export const id = 'elevenlabs';
export const env = ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_M', 'ELEVENLABS_VOICE_F'];
export const pricePerMillionChars = 80;
export const voices = { m: '$ELEVENLABS_VOICE_M', f: '$ELEVENLABS_VOICE_F' };
/** The voice id a render with this voice actually uses (for the clip sidecar). Env only — the ids are deliberately not hardcoded. */
export function voiceName({ voice, env: e = process.env } = {}) {
  return (voice === 'm' ? e.ELEVENLABS_VOICE_M : voice === 'f' ? e.ELEVENLABS_VOICE_F : undefined) || null;
}
export const outputFormat = 'mp3_44100_128';
export const modelId = 'eleven_v3';

export function buildRequest({ text, voice, env: e = process.env }) {
  const voiceId = voice === 'm' ? e.ELEVENLABS_VOICE_M : voice === 'f' ? e.ELEVENLABS_VOICE_F : undefined;
  if (!voiceId) throw new Error(`elevenlabs: set ELEVENLABS_VOICE_${String(voice).toUpperCase()}`);
  if (!e.ELEVENLABS_API_KEY) throw new Error('elevenlabs: set ELEVENLABS_API_KEY');
  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${outputFormat}`,
    method: 'POST',
    headers: { 'xi-api-key': e.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: modelId, language_code: 'he' }),
    billedChars: text.length, voiceName: voiceId,
  };
}
export async function parseResponse(res) {
  if (!res.ok) throw new Error(`elevenlabs: HTTP ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
export async function synthesize(opts, fetchImpl = fetch) {
  const r = buildRequest(opts);
  return parseResponse(await fetchImpl(r.url, { method: r.method, headers: r.headers, body: r.body }));
}
