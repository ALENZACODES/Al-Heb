// tools/audio/ingest.mjs --origin respelled: clips made by the outside-voice pipeline (tools/tts/voice_*.mjs), delivered in the repo's own layout
// audio/<m|f>/<sephardi|ashkenazi>/word/<id>.mp3. Checks tradition and voice come from the path, the provenance and the in-app label are honest (made from a
// respelling, accent not verified, licence not cleared, never recorded), the default origin is unchanged, and the packet builder can take one slice at a time.
// Fixtures are mock tones. They say nothing about any voice.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadListing, run, RESPELLED_SOURCE, OUTSIDE_SOURCE, ORIGINS, detectTools, report } from '../tools/audio/ingest.mjs';
import { sha256Text } from '../tools/audio/sidecar.mjs';
import { checkMp3 } from '../tools/tts/post.mjs';
import { buildVoicePlan } from '../tools/tts/voice_plan.mjs';
import { renderItems } from '../tools/tts/voice_render.mjs';
import { clipAll } from '../tools/tts/voice_clip.mjs';
import { runJudges, makeRecogniser } from '../tools/tts/voice_judge.mjs';
import { buildHandoff } from '../tools/tts/voice_handoff.mjs';
import { loadVoiceConfig, readJsonl, workPaths } from '../tools/tts/voice_lib.mjs';
import { fileLabel, isSyntheticStatus, syntheticLabel } from '../src/shell/audio-labels.js';
import { collectClips } from '../tools/review/audio_packet_lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = detectTools(); const HAVE_FF = T.ffmpeg && T.ffprobe;
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `respelled-${p}-`));
const rm = (d) => fs.rmSync(d, { recursive: true, force: true });

async function handoffFolder() {
  const work = tmp('work'); const plan = await buildVoicePlan(REPO, { words: 2, includeExisting: true }); const cfg = loadVoiceConfig(path.join(REPO, 'tools/tts/voices.config.json'));
  await renderItems(plan.items, { work, take: 1, cfg, mock: true }); await renderItems(plan.items, { work, take: 2, cfg, mock: true });
  await clipAll({ work, take: 1, log: () => {} }); await clipAll({ work, take: 2, log: () => {} });
  await runJudges({ work, recogniser: makeRecogniser({ cfg, mode: 'mock', items: readJsonl(workPaths(work).log).filter((l) => l.event === 'rendered') }), log: () => {} });
  const h = buildHandoff({ work, out: path.join(work, 'h', 'OUT'), allowMock: true });
  return { work, plan, h };
}
function scratchRoot(plan) {
  const root = tmp('root'); fs.mkdirSync(path.join(root, 'data/audio'), { recursive: true }); fs.mkdirSync(path.join(root, 'src'));
  const entries = plan.items.map((i) => ({ path: i.path, voice: i.voice, tradition: i.tradition, kind: i.kind, id: i.id, text: i.he, status: 'missing', source: 'none', group: i.group }));
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(entries, null, 1) + '\n');
  fs.writeFileSync(path.join(root, 'data/audio/summary.json'), JSON.stringify({ total: entries.length }) + '\n');
  fs.copyFileSync(path.join(REPO, 'sw.js'), path.join(root, 'sw.js'));
  for (const f of ['index.html', 'offline.html', 'manifest.webmanifest']) fs.writeFileSync(path.join(root, f), '<!-- fixture -->');
  return root;
}

test('origins: respelled is a separate, honest source; labels say made from a respelling and accent not verified; never human', () => {
  assert.equal(ORIGINS.respelled, RESPELLED_SOURCE); assert.equal(ORIGINS.outside, OUTSIDE_SOURCE); assert.notEqual(RESPELLED_SOURCE, OUTSIDE_SOURCE);
  for (const t of ['sephardi', 'ashkenazi']) {
    const l = fileLabel('synthetic-unreviewed', t, RESPELLED_SOURCE);
    assert.equal(l, `${t[0].toUpperCase()}${t.slice(1)} voice`);
    assert.ok(!/outside generator/.test(l)); assert.ok(isSyntheticStatus('synthetic-unreviewed'));
  }
  assert.equal(fileLabel('synthetic-unreviewed', 'sephardi', OUTSIDE_SOURCE), 'Sephardi voice');
});

test('an unknown --origin is refused', async () => {
  await assert.rejects(run({ input: os.tmpdir(), root: os.tmpdir(), origin: 'whatever' }), /--origin must be/);
});

test('end to end (mock tones): hand-off folder -> ingest dry run writes nothing -> apply sets respelled provenance for all four tradition x voice slices', { skip: !HAVE_FF && 'ffmpeg/ffprobe not installed' }, async () => {
  const { work, plan, h } = await handoffFolder(); const root = scratchRoot(plan);
  try {
    const listing = path.join(h.dest, 'listing.csv'); const input = path.join(h.dest, 'audio');
    const dry = await run({ input, root, listing, origin: 'respelled', tryConvert: 0, noDeliveryCheck: true });
    assert.equal(dry.errors.length, 0, dry.errors.join()); assert.ok(!fs.existsSync(path.join(root, 'audio')), 'dry run writes nothing');
    assert.equal(dry.files.filter((f) => f.state === 'ready').length, 8, JSON.stringify(dry.files.map((f) => [f.rel, f.state, f.reason, f.fails])));
    const res = await run({ input, root, listing, origin: 'respelled', apply: true, batch: 'neutral fixture batch', now: () => '2026-01-01T00:00:00.000Z', noDeliveryCheck: true });
    assert.equal(res.applied, 8, res.errors.join());
    const m = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'));
    assert.equal(m.filter((e) => e.status === 'synthetic-unreviewed').length, 8);
    for (const e of m) {
      assert.equal(e.status, 'synthetic-unreviewed'); assert.equal(e.source, RESPELLED_SOURCE); assert.notEqual(e.status, 'recorded');
      assert.equal(e.synth.origin, RESPELLED_SOURCE); assert.equal(e.synth.madeFrom, 'respelling'); assert.equal(e.synth.accentVerified, false); assert.equal(e.synth.reviewed, false);
      assert.equal(e.synth.redistributionCleared, false); assert.equal(e.synth.licence, 'licence not cleared');
      assert.ok(checkMp3(path.join(root, e.path)).ok);
      const side = JSON.parse(fs.readFileSync(path.join(root, `${e.path}.meta.json`), 'utf8')); assert.equal(side.source, RESPELLED_SOURCE); assert.deepEqual(side.synth, e.synth); assert.match(side.note, /respelling/); assert.match(side.note, /not verified/);
      // Fix #21: the sidecar also carries the audit fields at top level.
      assert.equal(side.engine, null, 'the outside engine is not recorded, so it stays null rather than guessed');
      assert.equal(side.voiceId, null);
      assert.equal(side.tradition, e.tradition); assert.equal(side.voice, e.voice);
      assert.equal(side.inputTextKind, 'manifest-text', 'the listing carries the Hebrew the clip is filed under, not the respelling that was spoken');
      assert.equal(side.inputText, e.text);
      assert.equal(side.inputSha256, sha256Text(e.text));
      assert.equal(side.ingestedAt, '2026-01-01T00:00:00.000Z'); assert.equal(side.licence, 'licence not cleared');
      assert.match(side.inputFileSha256, /^[0-9a-f]{64}$/);
      assert.equal(fileLabel(e.status, e.tradition, e.source), `${e.tradition[0].toUpperCase()}${e.tradition.slice(1)} voice`, 'learner caption names the voice style only (status and source stay in the manifest)');
      assert.equal(Object.keys(e).pop(), 'synth');
    }
    assert.match(report(res), /outside-respelled/);
    // the packet builder: the same ids exist for several voices and traditions, so a slice is required
    assert.throws(() => collectClips(root), /more than one voice or tradition/);
    for (const t of ['sephardi', 'ashkenazi']) for (const v of ['m', 'f']) { const { clips } = collectClips(root, path.join(root, 'audio'), { tradition: t, voice: v }); assert.equal(clips.length, 2); assert.ok(clips.every((c) => c.traditionKey === t && c.voice === v)); }
  } finally { rm(work); rm(root); }
});

test('hand-off listing carries Hebrew text: a clip filed under the wrong word is rejected by the consonant check', { skip: !HAVE_FF && 'ffmpeg/ffprobe not installed' }, async () => {
  const { work, plan, h } = await handoffFolder(); const root = scratchRoot(plan);
  try {
    const m = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8')); m[0].text = 'ארץ'; fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(m));
    const dry = await run({ input: path.join(h.dest, 'audio'), root, listing: path.join(h.dest, 'listing.csv'), origin: 'respelled', tryConvert: 0, noDeliveryCheck: true });
    assert.ok(dry.files.some((f) => f.state === 'rejected' || f.state === 'unmatched' || f.state === 'ambiguous'), JSON.stringify(dry.files.map((f) => f.state)));
  } finally { rm(work); rm(root); }
});

test('listing: the same file name in different folders is told apart by path; a bare file name works only when it is unique; audio/ prefix is optional', () => {
  const d = tmp('listing'); const f = path.join(d, 'l.csv');
  fs.writeFileSync(f, 'file,id,voice,tradition,kind,text\naudio/m/sephardi/word/r01-w1.mp3,r01-w1,m,sephardi,word,a\naudio/f/sephardi/word/r01-w1.mp3,r01-w1,f,sephardi,word,a\naudio/m/sephardi/word/r01-w2.mp3,r01-w2,m,sephardi,word,b\n');
  try {
    const { map } = loadListing(f);
    assert.equal(map.get('m/sephardi/word/r01-w1.mp3').voice, 'm'); assert.equal(map.get('f/sephardi/word/r01-w1.mp3').voice, 'f');
    assert.equal(map.get('audio/f/sephardi/word/r01-w1.mp3').voice, 'f');
    assert.equal(map.has('r01-w1.mp3'), false, 'ambiguous bare name is not guessed');
    assert.equal(map.get('r01-w2.mp3').id, 'r01-w2', 'unique bare name still works');
  } finally { rm(d); }
});
