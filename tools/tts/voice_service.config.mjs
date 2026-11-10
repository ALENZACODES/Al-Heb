// The ONE place that names the outside voice service (its web address necessarily contains its name): its address, its key variable, its endpoint paths and its fixed request settings.
// Nothing else in the repo may hold these. The key itself is never in a file: it is read from the environment variable named below.
// Endpoint paths, field names and the output-format list were read from the service's public API reference (OpenAPI file) on 2026-11-05.
// None of it has been exercised against the live service with a key (no key was available when this was written); only against a local
// stand-in server in tests/tts.voice.test.js and in --mock mode.

export const SERVICE = Object.freeze({
  baseUrl: 'https://api.elevenlabs.io',
  baseUrlOverrideEnv: 'VOICE_SERVICE_BASE_URL', // for tests and proxies; accepted only if https, or http on loopback
  keyEnv: 'VOICE_SERVICE_API_KEY',
  keyHeader: 'xi-api-key',
  requestIdHeaders: ['request-id', 'x-request-id'],
  paths: Object.freeze({ tts: '/v1/text-to-speech/{voice_id}', voices: '/v2/voices', stt: '/v1/speech-to-text' }),
});

/** Fixed render settings. Same for every call of a take; only the seed differs between take 1 and take 2. Owner overrides live in voices.config.json "settings". */
export const RENDER_DEFAULTS = Object.freeze({
  modelId: 'eleven_multilingual_v2',
  // The reference says language_code is NOT supported for multilingual_v2 models, so none is sent by default (the model guesses from the text).
  languageCode: null,
  voiceSettings: Object.freeze({ stability: 0.8, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1 }),
  seedTake1: 20261105,
  seedTake2: 7740123,
  // pcm_24000 is raw 16-bit mono PCM at 24 kHz (wrapped into WAV here, no lossy step before our own trim and encode). Per the reference,
  // 44.1 kHz PCM/WAV needs a higher plan than 24 kHz; mp3_* formats are also accepted. Check your plan before changing it.
  outputFormat: 'pcm_24000',
  applyTextNormalization: 'off', // send the respelling exactly as stored; do not let the service rewrite digits or symbols
});

export const STT_DEFAULTS = Object.freeze({ modelId: 'scribe_v2', languageCode: 'he' });
