// Owner decisions (John Khan, 2026-11-07): the Sephardi setting plays the Israeli clips (he-IL voices Ari/Noa) for every kind
// and expresses the Sephardi tradition in the on-screen English-letter reading; since 22:56 the Ashkenazi setting does the same,
// and both traditions get clips of their own made by the Israeli voices reading the tradition's respelling. A Sephardi or Ashkenazi
// row plays as itself only when its `source` is an admitted accent provenance (src/audio/player.js ACCENT_SOURCES) or it is a human
// recording; the older respelled `paid-cloud` files are retired. Checked here against the REAL manifests (no admitted rows exist yet,
// so nothing changes for the learner) and against a fixture row of the new provenance (the own file plays).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, PLAYBACK_TRADITION, ACCENT_SOURCES, isAccentClip } from '../src/audio/player.js';
import { describeResult, playbackLine } from '../src/shell/audio.js';
import { lookupClip, alternateClip, clipCaption, buildClipLookup } from '../src/vocab/clips.js';
import { playLine } from '../src/pronunciation/forTradition.js';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { readFileSync } from 'node:fs';

const all = loadManifestFull();
const KINDS = ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer'];
const ACCENT = ['sephardi', 'ashkenazi'];
const player = (voice, congregation, manifest = all) => createAudio({ settings: { voice, congregation }, manifest, AudioCtor: class {}, speech: null, UtteranceCtor: null });

test('rule table: sephardi and ashkenazi fall back to israeli; the two admitted provenances are named', () => {
  assert.deepEqual(PLAYBACK_TRADITION, { israeli: 'israeli', sephardi: 'israeli', ashkenazi: 'israeli' });
  assert.deepEqual(ACCENT_SOURCES, { israeliVoice: 'tts-respelled-israeli-voice', tempoCapped: 'tts-respelled-tempo-capped' });
});

test('real manifest: admitted Sephardi and Ashkenazi rows are the Brain Lab game-word recordings of 2026-11-10', () => {
  const admitted = all.filter((e) => isAccentClip(e)).map((e) => e.path).sort();
  const expected = JSON.parse(readFileSync(new URL('./fixtures/admitted-accent-clips.json', import.meta.url), 'utf8'));
  assert.deepEqual(admitted, expected);
});

for (const setting of ACCENT) {
  test(`real manifest, ${setting} setting: every id with an Israeli file of that voice plays that Israeli file, unless an admitted ${setting} clip of the same id exists`, () => {
    const counts = {};
    for (const voice of ['m', 'f']) {
      const audio = player(voice, setting);
      for (const kind of KINDS) {
        const ids = all.filter((e) => e.tradition === 'israeli' && e.voice === voice && e.kind === kind && e.status !== 'missing');
        assert.ok(ids.length > 0, `${voice} ${kind}: Israeli clips exist`);
        for (const isr of ids) {
          const r = audio.status(kind, isr.id);
          assert.equal(r.source, 'file', `${voice} ${kind} ${isr.id}: ${r.reason || r.source}`);
          assert.equal(r.voice, voice);
          const own = all.find((e) => e.tradition === setting && e.voice === voice && e.kind === kind && e.id === isr.id && e.status !== 'missing');
          if (isr.scope === 'israeli-only') {
            assert.equal(r.path, isr.path, `${voice} ${kind} ${isr.id} is Israeli-only`);
            assert.equal(r.tradition, 'israeli', `${isr.id}: israeli-only items ignore the setting, as before`);
            assert.equal(r.fileTradition, undefined);
          } else if (isAccentClip(own)) {
            assert.equal(r.path, own.path, `${voice} ${kind} ${isr.id} plays its admitted ${setting} file`);
            assert.equal(r.tradition, setting, isr.id);
            assert.equal(r.fileTradition, undefined, isr.id);
          } else {
            assert.equal(r.path, isr.path, `${voice} ${kind} ${isr.id} plays its Israeli file`);
            assert.equal(r.tradition, setting, isr.id);
            assert.equal(r.fileTradition, 'israeli', isr.id);
          }
        }
        counts[`${voice}|${kind}`] = ids.length;
      }
    }
    assert.ok(Object.values(counts).reduce((a, b) => a + b, 0) > 8000, JSON.stringify(counts));
  });

  test(`real manifest, ${setting} setting: retired own-tradition files stay unused, admitted game-word clips play as themselves, and nothing falls silent`, () => {
    for (const voice of ['m', 'f']) {
      const audio = player(voice, setting);
      const own = all.filter((e) => e.tradition === setting && e.voice === voice && e.status !== 'missing');
      assert.ok(own.filter((e) => e.kind === 'line').length >= 100, `the retired ${setting} line clips are still in the manifest`);
      for (const e of own) {
        const r = audio.status(e.kind, e.id);
        assert.equal(r.source, 'file', `${e.path}: an Israeli counterpart exists for every ${setting} clip, so this must still play`);
        if (isAccentClip(e)) {
          assert.equal(r.path, e.path, `${e.path} is admitted and plays as itself`);
          assert.equal(r.tradition, setting, e.path);
          assert.equal(r.fileTradition, undefined, e.path);
        } else {
          assert.doesNotMatch(r.path, new RegExp(`/${setting}/`), `${e.path} was selected`);
        }
      }
    }
  });
}

test('real manifest: the #/read priestly blessing line and the shalom lesson words play Israeli under both settings, with honest captions', () => {
  for (const setting of ACCENT) {
    const f = player('f', setting);
    const line = f.status('line', 'bless-priestly-1');
    assert.equal(line.source, 'file'); assert.equal(line.path, 'audio/f/israeli/line/bless-priestly-1.mp3');
    const name = setting === 'sephardi' ? 'Sephardi' : 'Ashkenazi';
    assert.equal(describeResult(line).text, `Sound: Israeli voice (woman, Israeli voice; ${name} reading shown in English letters).`);
    assert.match(playbackLine({ type: 'playing', rate: 1, ...line }).text, new RegExp(`\\(woman, Israeli voice; ${name} reading shown in English letters\\)\\. Normal speed\\.`));
    for (const id of ['r03-w1', 'r04-w2', 'r04-w3']) {
      const w = player('m', setting).status('word', id);
      assert.equal(w.source, 'file', id); assert.match(w.path, /^audio\/m\/israeli\/word\//, id);
    }
  }
});

test('fixture rows of the new provenance: the own file plays as itself under its setting, with the new label; the Israeli setting is untouched', () => {
  for (const setting of ACCENT) {
    const name = setting === 'sephardi' ? 'Sephardi' : 'Ashkenazi';
    for (const source of Object.values(ACCENT_SOURCES)) {
      const fixture = all.map((e) => (e.tradition === setting && e.voice === 'f' && e.kind === 'line' && e.id === 'bless-priestly-1'
        ? { ...e, status: 'synthetic-unreviewed', source } : e));
      const f = player('f', setting, fixture);
      const line = f.status('line', 'bless-priestly-1');
      assert.equal(line.source, 'file'); assert.equal(line.path, `audio/f/${setting}/line/bless-priestly-1.mp3`);
      assert.equal(line.tradition, setting); assert.equal(line.fileTradition, undefined); assert.equal(line.via, 'exact'); assert.equal(line.entrySource, source);
      const text = describeResult(line).text;
      assert.equal(text, `Sound: ${name} voice (woman, ${name}).`);
      assert.doesNotMatch(text, /Recorded by a human|Israeli only|reading shown in English letters/);
      assert.match(playLine(line, setting, 'the line'), new RegExp(`^Playing the line: ${name} voice`));
      assert.doesNotMatch(playLine(line, setting, 'the line'), /stand-in|Israeli reading/);
      // the prayer alias row of the same id follows the admitted line
      const prayer = f.status('prayer', 'bless-priestly-1');
      assert.equal(prayer.path, `audio/f/${setting}/line/bless-priestly-1.mp3`); assert.equal(prayer.via, 'alias');
      // the man's voice has no admitted row in this fixture: it still plays Israeli
      const m = player('m', setting, fixture).status('line', 'bless-priestly-1');
      assert.equal(m.path, 'audio/m/israeli/line/bless-priestly-1.mp3'); assert.equal(m.fileTradition, 'israeli');
      // the other settings are untouched by this row
      assert.equal(player('f', 'israeli', fixture).status('line', 'bless-priestly-1').path, 'audio/f/israeli/line/bless-priestly-1.mp3');
      const other = ACCENT.find((t) => t !== setting);
      assert.equal(player('f', other, fixture).status('line', 'bless-priestly-1').path, 'audio/f/israeli/line/bless-priestly-1.mp3');
      // the dictionary lookup built from the same fixture offers the own slot under the setting only
      const lookup = buildClipLookup(fixture.filter((e) => e.kind === 'line' && e.id === 'bless-priestly-1'));
      const text0 = Object.keys(lookup.clips)[0];
      const own = lookupClip(lookup, text0, 'f', setting);
      assert.equal(own.path, `audio/f/${setting}/line/bless-priestly-1.mp3`); assert.equal(own.tradition, setting); assert.equal(own.setting, setting);
      assert.match(clipCaption(own), new RegExp(`^${name} voice`)); assert.doesNotMatch(clipCaption(own), /reading shown in English letters/);
      assert.equal(lookupClip(lookup, text0, 'f', other).path, 'audio/f/israeli/line/bless-priestly-1.mp3');
      assert.equal(lookupClip(lookup, text0, 'm', setting).path, 'audio/m/israeli/line/bless-priestly-1.mp3');
    }
  }
});

test('dictionary lookup (data/vocab/clip-lookup.json): both settings get the Israeli slot today and the caption names both', () => {
  const lookup = JSON.parse(readFileSync(new URL('../data/vocab/clip-lookup.json', import.meta.url), 'utf8'));
  let checked = 0;
  for (const [text, row] of Object.entries(lookup.clips)) {
    for (const setting of ACCENT) {
      const name = setting === 'sephardi' ? 'Sephardi' : 'Ashkenazi';
      for (const voice of ['m', 'f']) {
        const clip = lookupClip(lookup, text, voice, setting);
        const isr = row[`${voice}|israeli`];
        if (!isr) { assert.equal(clip, null, `${text} ${voice}: no Israeli slot, so no ${setting} clip is offered`); continue; }
        assert.equal(clip.path, isr.path); assert.equal(clip.tradition, 'israeli'); assert.equal(clip.setting, setting);
        assert.match(clipCaption(clip), new RegExp(`Israeli voice; ${name} reading shown in English letters`));
        assert.doesNotMatch(clipCaption(clip), new RegExp(`${name}\\)`));
        checked += 1;
      }
      const alt = alternateClip(lookup, text, 'm', setting);
      if (alt) assert.doesNotMatch(alt.path, /\/(sephardi|ashkenazi)\//, `${text}: a retired slot is never offered as an alternative`);
    }
  }
  assert.ok(checked > 2000, String(checked));
  // the Israeli setting keeps the plain Israeli caption
  const [text, row] = Object.entries(lookup.clips).find(([, r]) => r['f|israeli']);
  assert.equal(clipCaption(lookupClip(lookup, text, 'f', 'israeli')).includes('reading shown'), false, row['f|israeli'].path);
});
