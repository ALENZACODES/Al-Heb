// Owner decision (John Khan, 2026-11-07): the Sephardi setting plays the Israeli clips (he-IL voices Ari/Noa) for every kind
// and expresses the Sephardi tradition only in the on-screen English-letter reading. Checked here against the REAL manifests:
// every id that has an Israeli file of the requested voice resolves to that file, never to a retired Sephardi file and never
// to 'none'. Ashkenazi has no ruling yet: it keeps its own files (and the per-id equivalentTo rules).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, PLAYBACK_TRADITION } from '../src/audio/player.js';
import { describeResult, playbackLine } from '../src/shell/audio.js';
import { lookupClip, alternateClip, clipCaption } from '../src/vocab/clips.js';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { readFileSync } from 'node:fs';

const all = loadManifestFull();
const index = new Map(all.map((e) => [`${e.voice}|${e.tradition}|${e.kind}|${e.id}`, e]));
const KINDS = ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer'];
const player = (voice, congregation) => createAudio({ settings: { voice, congregation }, manifest: all, AudioCtor: class {}, speech: null, UtteranceCtor: null });

test('rule table: sephardi -> israeli, ashkenazi and israeli unchanged', () => {
  assert.deepEqual(PLAYBACK_TRADITION, { israeli: 'israeli', sephardi: 'israeli', ashkenazi: 'ashkenazi' });
});

test('real manifest, Sephardi setting: every id with an Israeli file of that voice resolves to that Israeli file, for every kind and both voices', () => {
  const counts = {};
  for (const voice of ['m', 'f']) {
    const audio = player(voice, 'sephardi');
    for (const kind of KINDS) {
      const ids = all.filter((e) => e.tradition === 'israeli' && e.voice === voice && e.kind === kind && e.status !== 'missing');
      assert.ok(ids.length > 0, `${voice} ${kind}: Israeli clips exist`);
      for (const isr of ids) {
        const r = audio.status(kind, isr.id);
        assert.equal(r.source, 'file', `${voice} ${kind} ${isr.id}: ${r.reason || r.source}`);
        assert.equal(r.path, isr.path, `${voice} ${kind} ${isr.id} plays its Israeli file`);
        assert.equal(r.voice, voice);
        if (isr.scope === 'israeli-only') { assert.equal(r.tradition, 'israeli', `${isr.id}: israeli-only items ignore the setting, as before`); assert.equal(r.fileTradition, undefined); }
        else { assert.equal(r.tradition, 'sephardi', isr.id); assert.equal(r.fileTradition, 'israeli', isr.id); }
      }
      counts[`${voice}|${kind}`] = ids.length;
    }
  }
  assert.ok(Object.values(counts).reduce((a, b) => a + b, 0) > 8000, JSON.stringify(counts));
});

test('real manifest, Sephardi setting: no result ever points at a Sephardi file, including the 258 Sephardi line clips and the Sephardi word clips', () => {
  for (const voice of ['m', 'f']) {
    const audio = player(voice, 'sephardi');
    const own = all.filter((e) => e.tradition === 'sephardi' && e.voice === voice && e.status !== 'missing');
    assert.ok(own.filter((e) => e.kind === 'line').length >= 100, 'the retired Sephardi line clips are still in the manifest');
    for (const e of own) {
      const r = audio.status(e.kind, e.id);
      assert.equal(r.source, 'file', `${e.path}: an Israeli counterpart exists for every Sephardi clip, so this must still play`);
      assert.doesNotMatch(r.path, /\/sephardi\//, `${e.path} was selected`);
    }
  }
});

test('real manifest: the #/read priestly blessing line and the shalom lesson words play Israeli under the Sephardi setting', () => {
  const f = player('f', 'sephardi');
  const line = f.status('line', 'bless-priestly-1');
  assert.equal(line.source, 'file'); assert.equal(line.path, 'audio/f/israeli/line/bless-priestly-1.mp3');
  assert.equal(describeResult(line).text, 'Sound: Synthetic voice (Israeli only), not a recorded teacher (woman, Israeli voice; Sephardi reading shown in English letters).');
  assert.match(playbackLine({ type: 'playing', rate: 1, ...line }).text, /\(woman, Israeli voice; Sephardi reading shown in English letters\)\. Normal speed\./);
  for (const id of ['r03-w1', 'r04-w2', 'r04-w3']) {
    const w = player('m', 'sephardi').status('word', id);
    assert.equal(w.source, 'file', id); assert.match(w.path, /^audio\/m\/israeli\/word\//, id);
  }
});

test('real manifest, Ashkenazi setting: an Ashkenazi file of the requested voice still plays as itself (no ruling yet), and its caption names Ashkenazi', () => {
  for (const voice of ['m', 'f']) {
    const audio = player(voice, 'ashkenazi');
    const own = all.filter((e) => e.tradition === 'ashkenazi' && e.voice === voice && e.status !== 'missing');
    assert.ok(own.length > 1000);
    for (const e of own) {
      const r = audio.status(e.kind, e.id);
      assert.equal(r.path, e.path, `${e.path} plays as itself`);
      assert.equal(r.fileTradition, undefined);
    }
    const r = audio.status(own[0].kind, own[0].id);
    assert.match(describeResult(r).text, /\((man|woman), Ashkenazi\)\.$/);
  }
});

test('dictionary lookup (data/vocab/clip-lookup.json): the Sephardi setting gets the Israeli slot and the caption names both', () => {
  const lookup = JSON.parse(readFileSync(new URL('../data/vocab/clip-lookup.json', import.meta.url), 'utf8'));
  let checked = 0;
  for (const [text, row] of Object.entries(lookup.clips)) {
    for (const voice of ['m', 'f']) {
      const clip = lookupClip(lookup, text, voice, 'sephardi');
      const isr = row[`${voice}|israeli`];
      if (!isr) { assert.equal(clip, null, `${text} ${voice}: no Israeli slot, so no Sephardi clip is offered`); continue; }
      assert.equal(clip.path, isr.path); assert.equal(clip.tradition, 'israeli'); assert.equal(clip.setting, 'sephardi');
      assert.match(clipCaption(clip), /Israeli voice; Sephardi reading shown in English letters/);
      assert.doesNotMatch(clipCaption(clip), /Sephardi\)/);
      checked += 1;
    }
    const alt = alternateClip(lookup, text, 'm', 'sephardi');
    if (alt) assert.doesNotMatch(alt.path, /\/sephardi\//, `${text}: a retired Sephardi slot is never offered as an alternative`);
  }
  assert.ok(checked > 1000, String(checked));
  // the Israeli setting keeps the plain Israeli caption
  const [text, row] = Object.entries(lookup.clips).find(([, r]) => r['f|israeli']);
  assert.equal(clipCaption(lookupClip(lookup, text, 'f', 'israeli')).includes('reading shown'), false, row['f|israeli'].path);
});
