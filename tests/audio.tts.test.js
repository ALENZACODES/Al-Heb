import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as azure from '../tools/audio/tts/azure.mjs';
import * as google from '../tools/audio/tts/google.mjs';
import * as eleven from '../tools/audio/tts/elevenlabs.mjs';
import { selectEntries, estimate, renderBatch, PRICE_LABEL } from '../tools/audio/render_tts.mjs';

const TEXT = 'בֵּית';
test('azure request: SSML he-IL voice, key header, escaped text', () => {
  const r = azure.buildRequest({ text: 'a<b', voice: 'f', env: { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'eastus' } });
  assert.equal(r.url, 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1');
  assert.equal(r.headers['Ocp-Apim-Subscription-Key'], 'k');
  assert.match(r.body, /xml:lang="he-IL"><voice name="he-IL-HilaNeural">a&lt;b</);
  assert.throws(() => azure.buildRequest({ text: TEXT, voice: 'm', env: {} }), /AZURE_SPEECH_KEY/);
  assert.match(azure.buildRequest({ text: TEXT, voice: 'm', env: { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'x' } }).body, /AvriNeural/);
});
test('google request: he-IL, pointed plain text, no phoneme/custom pronunciation payload', () => {
  const r = google.buildRequest({ text: TEXT, voice: 'm', env: { GOOGLE_TTS_API_KEY: 'k' } });
  const b = JSON.parse(r.body);
  assert.deepEqual(b.input, { text: TEXT }); assert.equal(b.voice.languageCode, 'he-IL'); assert.match(b.voice.name, /Chirp3-HD/);
  assert.ok(!r.body.includes('customPronunciations') && !r.body.includes('<phoneme'));
  assert.equal(r.headers['X-Goog-Api-Key'], 'k');
  const s = google.buildRequest({ text: TEXT, voice: 'f', ssml: true, env: { GOOGLE_TTS_ACCESS_TOKEN: 't' } });
  assert.equal(s.headers.Authorization, 'Bearer t'); assert.equal(s.billedChars, `<speak>${TEXT}</speak>`.length);
  assert.throws(() => google.buildRequest({ text: TEXT, voice: 'm', env: {} }), /GOOGLE_TTS/);
});
test('elevenlabs request: v3 with language_code he, voice ids from env only', () => {
  const r = eleven.buildRequest({ text: TEXT, voice: 'f', env: { ELEVENLABS_API_KEY: 'k', ELEVENLABS_VOICE_F: 'VF' } });
  assert.match(r.url, /text-to-speech\/VF\?/); assert.deepEqual(JSON.parse(r.body), { text: TEXT, model_id: 'eleven_v3', language_code: 'he' });
  assert.throws(() => eleven.buildRequest({ text: TEXT, voice: 'm', env: { ELEVENLABS_API_KEY: 'k' } }), /VOICE_M/);
});
test('parsing: google base64 audioContent, azure/eleven bytes, errors throw', async () => {
  const g = await google.parseResponse({ ok: true, json: async () => ({ audioContent: Buffer.from('abc').toString('base64') }) });
  assert.equal(g.toString(), 'abc');
  await assert.rejects(google.parseResponse({ ok: false, status: 403, text: async () => 'no' }), /403/);
  const a = await azure.parseResponse({ ok: true, arrayBuffer: async () => new TextEncoder().encode('zz').buffer });
  assert.equal(a.toString(), 'zz');
});

const manifest = [
  { path: 'audio/m/israeli/word/a.mp3', voice: 'm', tradition: 'israeli', kind: 'word', id: 'a', text: 'שָׁלוֹם', status: 'missing' },
  { path: 'audio/m/israeli/word/b.mp3', voice: 'm', tradition: 'israeli', kind: 'word', id: 'b', text: 'תּוֹדָה', status: 'recorded' },
  { path: 'audio/m/israeli/letter/c.mp3', voice: 'm', tradition: 'israeli', kind: 'letter', id: 'c', text: 'בֵּית', status: 'missing' },
  { path: 'audio/f/israeli/word/a.mp3', voice: 'f', tradition: 'israeli', kind: 'word', id: 'a', text: 'שָׁלוֹם', status: 'missing' },
];
test('selection: default kinds exclude letters/vowels, skip already-present, refuse non-israeli', () => {
  assert.deepEqual(selectEntries(manifest, { voice: 'm' }).map((r) => r.id), ['a']);
  assert.throws(() => selectEntries(manifest, { voice: 'm', tradition: 'ashkenazi' }), /no TTS provider offers it/);
});
test('estimate counts code points and prices from notes', () => {
  const e = estimate(selectEntries(manifest, { voice: 'm' }), google);
  assert.equal(e.chars, [...'שָׁלוֹם'].length); assert.ok(Math.abs(e.usd - (e.chars / 1e6) * 30) < 1e-12);
  assert.match(PRICE_LABEL, /list price verified on fetched pages 2026-11-03/);
});
test('renderBatch writes file + tts meta (fake fetch, temp dir, no network)', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alefr-'));
  const fetchImpl = async () => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode('fake').buffer });
  const rows = selectEntries(manifest, { voice: 'm' });
  const w = await renderBatch({ provider: azure, rows, root, fetchImpl, env: { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'r' }, now: () => 'T', log: () => {} });
  assert.deepEqual(w, ['audio/m/israeli/word/a.mp3']);
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'audio/m/israeli/word/a.mp3.meta.json'), 'utf8'));
  assert.deepEqual([meta.status, meta.source, meta.redistributionCleared], ['tts', 'tts:azure', false]);
});
test('CLI defaults to dry run and makes no network call', () => {
  const r = spawnSync(process.execPath, ['tools/audio/render_tts.mjs', '--provider', 'elevenlabs', '--voice', 'f', '--limit', '2'], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /DRY RUN/); assert.match(r.stdout, /No network calls made/); assert.match(r.stdout, /list price verified on fetched pages 2026-11-03/);
});
