// Fix #21: every clip sidecar carries engine, voice id, tradition, respelled input
// text, inputSha256, ingestedAt and licence — never invented, null when unknown.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSidecar, sha256Text, sidecarComplete, missingSidecarFields } from '../tools/audio/sidecar.mjs';
import { planSidecar, backfill, PRODUCTION_VOICES } from '../tools/audio/backfill-sidecars.mjs';
import { renderBatch } from '../tools/audio/render_tts.mjs';
import * as azure from '../tools/audio/tts/azure.mjs';
import * as google from '../tools/audio/tts/google.mjs';
import * as eleven from '../tools/audio/tts/elevenlabs.mjs';

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `sidecar-${p}-`));
const rm = (d) => fs.rmSync(d, { recursive: true, force: true });

test('sha256Text: known vector, and the hash is of the text, not the file', () => {
  assert.equal(sha256Text('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.notEqual(sha256Text('שָׁב'), sha256Text('שב'));
});

test('buildSidecar: canonical order, the seven audit fields, nulls stay null', () => {
  const s = buildSidecar({
    status: 'tts', source: 'tts:google', engine: 'google', voiceId: 'he-IL-Wavenet-B',
    tradition: 'israeli', inputText: 'שָׁב', ingestedAt: '2026-11-07T00:00:00.000Z',
    licence: 'not cleared', note: 'n', renderedAt: '2026-11-07T00:00:00.000Z', redistributionCleared: false,
  });
  assert.deepEqual(Object.keys(s), ['status', 'source', 'engine', 'voiceId', 'tradition', 'inputText', 'inputSha256', 'ingestedAt', 'licence', 'note', 'renderedAt', 'redistributionCleared']);
  assert.equal(s.inputSha256, sha256Text('שָׁב'));
  assert.ok(sidecarComplete(s));
  assert.deepEqual(missingSidecarFields(s), []);
  const empty = buildSidecar({ status: 'tts', source: 'tts:google' });
  assert.equal(empty.inputText, null); assert.equal(empty.inputSha256, null);
  assert.equal(empty.engine, null); assert.equal(empty.licence, 'not cleared');
  assert.ok(!sidecarComplete(empty));
});

test('sidecarComplete: the old five-field render_tts shape is incomplete', () => {
  const old = { status: 'tts', source: 'tts:google', renderedAt: '2026-11-07T00:00:00.000Z', redistributionCleared: false, note: 'TTS output redistribution rights not confirmed by counsel' };
  assert.deepEqual(missingSidecarFields(old), ['engine', 'voiceId', 'tradition', 'inputText', 'inputSha256', 'ingestedAt', 'licence']);
  assert.ok(!sidecarComplete(old));
});

test('provider voiceName: the id the request actually uses', () => {
  assert.equal(azure.voiceName({ voice: 'm' }), 'he-IL-AvriNeural');
  assert.equal(azure.voiceName({ voice: 'f' }), 'he-IL-HilaNeural');
  assert.equal(google.voiceName({ voice: 'm', env: {} }), 'he-IL-Wavenet-B', 'the default is the approved WaveNet pair, not the Chirp 3 HD voice (main advanced the default after this test was written)');
  assert.equal(google.voiceName({ voice: 'm', env: { GOOGLE_TTS_VOICE_M: 'he-IL-Wavenet-B' } }), 'he-IL-Wavenet-B');
  assert.equal(eleven.voiceName({ voice: 'f', env: { ELEVENLABS_VOICE_F: 'VF' } }), 'VF');
  assert.equal(eleven.voiceName({ voice: 'f', env: {} }), null);
});

test('renderBatch writes the full sidecar (fake fetch, temp dir, no network)', async () => {
  const root = tmp('render');
  const fetchImpl = async () => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode('fake').buffer });
  const rows = [{ path: 'audio/m/israeli/word/a.mp3', voice: 'm', tradition: 'israeli', kind: 'word', id: 'a', text: 'שָׁלוֹם', status: 'missing' }];
  try {
    const w = await renderBatch({ provider: azure, rows, root, fetchImpl, env: { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'r' }, now: () => 'T', log: () => {} });
    assert.deepEqual(w, ['audio/m/israeli/word/a.mp3']);
    const meta = JSON.parse(fs.readFileSync(path.join(root, 'audio/m/israeli/word/a.mp3.meta.json'), 'utf8'));
    assert.deepEqual([meta.status, meta.source, meta.redistributionCleared], ['tts', 'tts:azure', false]);
    assert.equal(meta.engine, 'azure');
    assert.equal(meta.voiceId, 'he-IL-AvriNeural');
    assert.equal(meta.tradition, 'israeli');
    assert.equal(meta.inputText, 'שָׁלוֹם');
    assert.equal(meta.inputSha256, sha256Text('שָׁלוֹם'));
    assert.equal(meta.ingestedAt, 'T');
    assert.equal(meta.renderedAt, 'T');
    assert.equal(meta.licence, 'not cleared');
    assert.ok(sidecarComplete(meta));
  } finally { rm(root); }
});

const paid = (voice, tradition, extra = {}) => ({
  path: `audio/${voice}/${tradition}/word/x.mp3`, voice, tradition, kind: 'word', id: 'x',
  text: 'שָׁב', status: 'tts', source: 'paid-cloud', group: 'lesson-word', ...extra,
});

test('planSidecar: israeli paid-cloud maps to the WaveNet pair the owner passed', () => {
  const { action, sidecar } = planSidecar(paid('m', 'israeli'));
  assert.equal(action, 'create');
  assert.equal(sidecar.engine, 'google-cloud-tts');
  assert.equal(sidecar.voiceId, PRODUCTION_VOICES.m);
  assert.equal(sidecar.voiceId, 'he-IL-Wavenet-B');
  assert.equal(sidecar.tradition, 'israeli');
  assert.equal(sidecar.inputText, 'שָׁב');
  assert.equal(sidecar.inputSha256, sha256Text('שָׁב'));
  assert.equal(sidecar.inputTextKind, 'hebrew');
  assert.equal(sidecar.ingestedAt, null);
  assert.equal(sidecar.licence, 'not cleared');
  assert.match(sidecar.note, /CASTING-REPORT/);
});

test('planSidecar: sephardi paid-cloud keeps the respelling honest', () => {
  const { action, sidecar } = planSidecar(paid('f', 'sephardi'));
  assert.equal(action, 'create');
  assert.equal(sidecar.voiceId, 'he-IL-Wavenet-A');
  assert.equal(sidecar.inputTextKind, 'respelling-unrecorded');
  assert.match(sidecar.note, /respelling/);
  assert.match(sidecar.note, /not recorded/);
  assert.equal(sidecar.inputText, 'שָׁב');
  assert.equal(sidecar.inputSha256, sha256Text('שָׁב'));
});

test('planSidecar: tts:google prayer clips get no invented voice id', () => {
  const prayer = { path: 'audio/m/israeli/prayer/hamotzi.mp3', voice: 'm', tradition: 'israeli', kind: 'prayer', id: 'hamotzi', text: 'הַמּוֹצִיא', status: 'tts', source: 'tts:google', group: 'prayer-whole' };
  const fresh = planSidecar(prayer);
  assert.equal(fresh.action, 'create');
  assert.equal(fresh.sidecar.engine, 'google-cloud-tts');
  assert.equal(fresh.sidecar.voiceId, null);
  assert.match(fresh.sidecar.note, /ISRAELI-VOICE/);
  assert.ok(!sidecarComplete(fresh.sidecar), 'voiceId null means the sidecar is honestly incomplete');
  const old = { status: 'tts', source: 'tts:google', renderedAt: '2026-11-07T10:00:00.000Z', redistributionCleared: false, note: 'Israeli prayer completion, Nov 7 sprint' };
  const up = planSidecar(prayer, old);
  assert.equal(up.action, 'upgrade');
  assert.equal(up.sidecar.ingestedAt, '2026-11-07T10:00:00.000Z', 'the recorded render time carries forward');
  assert.equal(up.sidecar.renderedAt, '2026-11-07T10:00:00.000Z');
});

test('planSidecar: skips are counted, not guessed', () => {
  assert.deepEqual([planSidecar(paid('m', 'israeli', { status: 'missing' })).action, planSidecar(paid('m', 'israeli', { status: 'missing' })).reason], ['skip', 'no-clip']);
  assert.equal(planSidecar(paid('m', 'israeli', { status: 'recorded' })).reason, 'human-clip');
  assert.equal(planSidecar(paid('m', 'israeli', { source: 'mystery' })).reason, 'source-mystery');
  assert.equal(planSidecar(paid('m', 'israeli', { text: '' })).reason, 'no-text');
  const planned = planSidecar(paid('m', 'israeli')).sidecar;
  // A backfilled sidecar is never complete while its render date is unknown
  // (ingestedAt null) — the strict field check says so, honestly.
  assert.ok(!sidecarComplete(planned));
  const dated = { ...planned, ingestedAt: '2026-11-06T00:00:00.000Z' };
  assert.equal(planSidecar(paid('m', 'israeli'), dated).action, 'skip');
  assert.equal(planSidecar(paid('m', 'israeli'), dated).reason, 'already-complete');
  assert.equal(planSidecar(paid('m', 'israeli'), { ...dated, voiceId: 'he-IL-Wavenet-A' }).action, 'upgrade');
  assert.equal(planSidecar(paid('m', 'israeli'), { ...dated, voiceId: 'he-IL-Wavenet-A' }).reason, 'values-differ');
});

function scratchManifestRoot() {
  const root = tmp('root');
  fs.mkdirSync(path.join(root, 'data/audio'), { recursive: true });
  const core = [
    paid('m', 'israeli', { path: 'audio/m/israeli/word/a.mp3', id: 'a' }),
    paid('f', 'israeli', { path: 'audio/f/israeli/word/b.mp3', id: 'b' }),
    paid('m', 'israeli', { path: 'audio/m/israeli/word/c.mp3', id: 'c', status: 'missing' }),
  ];
  const sephardi = [paid('f', 'sephardi', { path: 'audio/f/sephardi/word/d.mp3', id: 'd' })];
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(core, null, 1) + '\n');
  fs.writeFileSync(path.join(root, 'data/audio/manifest-words-sephardi.json'), JSON.stringify(sephardi, null, 1) + '\n');
  return root;
}

test('backfill: --check writes nothing, --write creates, a second run is a no-op', () => {
  const root = scratchManifestRoot();
  try {
    const check = backfill({ root, write: false });
    assert.equal(check.total, 4);
    assert.equal(check.created, 3);
    assert.equal(check.upgraded, 0);
    assert.equal(check.skipped['no-clip'], 1);
    assert.ok(!fs.existsSync(path.join(root, 'audio')), 'check mode writes nothing');
    const first = backfill({ root, write: true });
    assert.equal(first.created, 3);
    const meta = JSON.parse(fs.readFileSync(path.join(root, 'audio/f/sephardi/word/d.mp3.meta.json'), 'utf8'));
    assert.equal(meta.voiceId, 'he-IL-Wavenet-A');
    assert.equal(meta.inputTextKind, 'respelling-unrecorded');
    assert.equal(meta.inputSha256, sha256Text('שָׁב'));
    const second = backfill({ root, write: true });
    assert.equal(second.created, 0);
    assert.equal(second.upgraded, 0);
    assert.equal(second.skipped['already-planned'], 3, 'a second run rewrites nothing: the sidecars already say what the plan would say');
    assert.equal(second.alreadyComplete, 0, 'backfilled sidecars stay incomplete while ingestedAt is unknown — that is the honest state, not a rewrite trigger');
    // Orphans are reported, never deleted.
    fs.mkdirSync(path.join(root, 'audio/m/israeli/word'), { recursive: true });
    fs.writeFileSync(path.join(root, 'audio/m/israeli/word/orphan.mp3.meta.json'), JSON.stringify({ status: 'tts', source: 'paid-cloud' }));
    const third = backfill({ root, write: false });
    assert.deepEqual(third.orphans, ['audio/m/israeli/word/orphan.mp3.meta.json']);
    assert.ok(fs.existsSync(path.join(root, 'audio/m/israeli/word/orphan.mp3.meta.json')), 'orphan left alone');
  } finally { rm(root); }
});
