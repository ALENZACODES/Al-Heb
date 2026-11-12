// 10 November 2026: the Sephardi and Ashkenazi settings play their own present bank clips
// (including the existing paid-cloud files). Missing own rows fall back to the Israeli file of
// the same voice and say so. israeli-only items stay Israeli. These clips are not claimed as
// human recordings or as clergy-certified accents.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, PLAYBACK_TRADITION, FALLBACK_TRADITION, ACCENT_SOURCES, isAccentClip, isPlayableOwnClip } from '../src/audio/player.js';
import { describeResult, playbackLine } from '../src/shell/audio.js';
import { lookupClip, alternateClip, clipCaption, buildClipLookup } from '../src/vocab/clips.js';
import { playLine } from '../src/pronunciation/forTradition.js';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { readFileSync } from 'node:fs';

const all = loadManifestFull();
const KINDS = ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer'];
const ACCENT = ['sephardi', 'ashkenazi'];
const player = (voice, congregation, manifest = all) => createAudio({ settings: { voice, congregation }, manifest, AudioCtor: class {}, speech: null, UtteranceCtor: null });

test('rule table: each setting prefers its own bank and falls back to Israeli', () => {
  assert.deepEqual(PLAYBACK_TRADITION, { israeli: 'israeli', sephardi: 'sephardi', ashkenazi: 'ashkenazi' });
  assert.deepEqual(FALLBACK_TRADITION, { israeli: 'israeli', sephardi: 'israeli', ashkenazi: 'israeli' });
  assert.deepEqual(ACCENT_SOURCES, { israeliVoice: 'tts-respelled-israeli-voice', tempoCapped: 'tts-respelled-tempo-capped', sameReading: 'israeli-clip-same-reading' });
});

test('real manifest: older paid-cloud Sephardi and Ashkenazi rows are playable own clips, even when they are not the newer accent provenance', () => {
  const playable = all.filter((e) => isPlayableOwnClip(e));
  assert.ok(playable.length > 8000, `playable ${playable.length}`);
  assert.ok(playable.some((e) => e.source === 'paid-cloud'));
});

test('real manifest: admitted Sephardi and Ashkenazi rows include the Brain Lab game-word recordings of 2026-11-10', () => {
  const admitted = all.filter((e) => isAccentClip(e)).map((e) => e.path).sort();
  const expected = JSON.parse(readFileSync(new URL('./fixtures/admitted-accent-clips.json', import.meta.url), 'utf8'));
  for (const p of expected) assert.ok(admitted.includes(p), p);
});

for (const setting of ACCENT) {
  test(`real manifest, ${setting} setting: a present own clip plays as itself; a missing own row falls back to the Israeli file`, () => {
    const counts = { own: 0, fallback: 0, israeliOnly: 0 };
    for (const voice of ['m', 'f']) {
      const audio = player(voice, setting);
      for (const kind of KINDS) {
        const ids = all.filter((e) => e.tradition === 'israeli' && e.voice === voice && e.kind === kind && e.status !== 'missing');
        assert.ok(ids.length > 0, `${voice} ${kind}: Israeli clips exist`);
        for (const isr of ids) {
          const r = audio.status(kind, isr.id);
          assert.equal(r.source, 'file', `${voice} ${kind} ${isr.id}: ${r.reason || r.source}`);
          assert.equal(r.voice, voice);
          if (isr.scope === 'israeli-only') {
            assert.equal(r.tradition, 'israeli', `${isr.id}: israeli-only items ignore the setting`);
            assert.equal(r.path, isr.path);
            assert.equal(r.fileTradition, undefined);
            counts.israeliOnly++;
            continue;
          }
          assert.equal(r.tradition, setting, isr.id);
          if ((r.path || '').includes(`/${setting}/`)) {
            assert.equal(r.fileTradition, undefined, `${voice} ${kind} ${isr.id} ${r.path}`);
            counts.own++;
          } else {
            assert.match(r.path, /\/israeli\//, `${voice} ${kind} ${isr.id} falls back to Israeli, got ${r.path}`);
            assert.equal(r.fileTradition, 'israeli', isr.id);
            counts.fallback++;
          }
        }
      }
    }
    assert.ok(counts.own > 1000, JSON.stringify(counts));
    assert.ok(counts.fallback > 0, JSON.stringify(counts));
  });

  test(`real manifest, ${setting} setting: present own files are selected, and nothing falls silent when the Israeli counterpart exists`, () => {
    for (const voice of ['m', 'f']) {
      const audio = player(voice, setting);
      const own = all.filter((e) => e.tradition === setting && e.voice === voice && e.status !== 'missing' && e.status !== 'plays-israeli');
      assert.ok(own.filter((e) => e.kind === 'line').length >= 100, `${setting} line clips are in the manifest`);
      for (const e of own) {
        const r = audio.status(e.kind, e.id);
        assert.equal(r.source, 'file', `${e.path}: ${r.reason || r.source}`);
        assert.equal(r.path, e.path, `${e.path} should play as itself`);
      }
    }
  });
}

test('real manifest: the priestly blessing line and the shalom lesson words play the setting\'s own bank file, with honest captions', () => {
  for (const setting of ACCENT) {
    const name = setting === 'sephardi' ? 'Sephardi' : 'Ashkenazi';
    const f = player('f', setting);
    const line = f.status('line', 'bless-priestly-1');
    assert.equal(line.source, 'file');
    assert.equal(line.path, `audio/f/${setting}/line/bless-priestly-1.mp3`);
    assert.equal(line.fileTradition, undefined);
    assert.equal(describeResult(line).text, `Sound: ${name} voice (woman, ${name}).`);
    assert.doesNotMatch(describeResult(line).text, /Recorded by a human|reading shown in English letters/);
    assert.match(playbackLine({ type: 'playing', rate: 1, ...line }).text, new RegExp(`\\(woman, ${name}\\)\\. Normal speed\\.`));
    for (const id of ['r03-w1', 'r04-w2', 'r04-w3']) {
      const w = player('m', setting).status('word', id);
      assert.equal(w.source, 'file', id);
      assert.equal(w.path, `audio/m/${setting}/word/${id}.mp3`, id);
    }
  }
});

test('a missing own row falls back to the Israeli file and the caption says so', () => {
  const setting = 'ashkenazi';
  const fixture = all.map((e) => (e.tradition === setting && e.voice === 'm' && e.kind === 'word' && e.id === 'r03-w1'
    ? { ...e, status: 'missing', source: 'none' } : e));
  const r = player('m', setting, fixture).status('word', 'r03-w1');
  assert.equal(r.source, 'file');
  assert.equal(r.path, 'audio/m/israeli/word/r03-w1.mp3');
  assert.equal(r.fileTradition, 'israeli');
  assert.match(describeResult(r).text, /Israeli voice; Ashkenazi reading shown in English letters/);
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
      assert.equal(text, source === ACCENT_SOURCES.sameReading ? `Sound: ${name} voice, the same reading as Israeli (woman, ${name}).` : `Sound: ${name} voice (woman, ${name}).`);
      assert.doesNotMatch(text, /Recorded by a human|Israeli only|reading shown in English letters/);
      assert.match(playLine(line, setting, 'the line'), new RegExp(`^Playing the line: ${name} voice`));
      assert.doesNotMatch(playLine(line, setting, 'the line'), /stand-in|Israeli reading/);
      const prayer = f.status('prayer', 'bless-priestly-1');
      // the one-line prayer plays its line, or its own copy of that line (tools/audio/alias_copies.mjs)
      assert.ok([`audio/f/${setting}/line/bless-priestly-1.mp3`, `audio/f/${setting}/prayer/bless-priestly-1.mp3`].includes(prayer.path), prayer.path);
      // the man's existing bank clip still plays as itself (paid-cloud is playable)
      const m = player('m', setting, fixture).status('line', 'bless-priestly-1');
      assert.equal(m.path, `audio/m/${setting}/line/bless-priestly-1.mp3`);
      assert.equal(player('f', 'israeli', fixture).status('line', 'bless-priestly-1').path, 'audio/f/israeli/line/bless-priestly-1.mp3');
      const other = ACCENT.find((t) => t !== setting);
      assert.equal(player('f', other, fixture).status('line', 'bless-priestly-1').path, `audio/f/${other}/line/bless-priestly-1.mp3`);
      const lookup = buildClipLookup(fixture.filter((e) => e.kind === 'line' && e.id === 'bless-priestly-1'));
      const text0 = Object.keys(lookup.clips)[0];
      const own = lookupClip(lookup, text0, 'f', setting);
      assert.equal(own.path, `audio/f/${setting}/line/bless-priestly-1.mp3`); assert.equal(own.tradition, setting); assert.equal(own.setting, setting);
      assert.match(clipCaption(own), new RegExp(`^${name} voice`)); assert.doesNotMatch(clipCaption(own), /reading shown in English letters/);
      assert.equal(lookupClip(lookup, text0, 'f', other).path, `audio/f/${other}/line/bless-priestly-1.mp3`);
    }
  }
});

test('dictionary lookup (data/vocab/clip-lookup.json): a present own slot is offered; otherwise the Israeli slot is the stand-in', () => {
  const lookup = JSON.parse(readFileSync(new URL('../data/vocab/clip-lookup.json', import.meta.url), 'utf8'));
  let checked = 0, own = 0, fallback = 0;
  for (const [text, row] of Object.entries(lookup.clips)) {
    for (const setting of ACCENT) {
      const name = setting === 'sephardi' ? 'Sephardi' : 'Ashkenazi';
      for (const voice of ['m', 'f']) {
        const clip = lookupClip(lookup, text, voice, setting);
        const isr = row[`${voice}|israeli`];
        const mine = row[`${voice}|${setting}`];
        if (mine) {
          assert.equal(clip.path, mine.path);
          assert.equal(clip.tradition, setting);
          assert.equal(clip.setting, setting);
          assert.doesNotMatch(clipCaption(clip), /reading shown in English letters/);
          own += 1;
        } else if (!isr) {
          assert.equal(clip, null, `${text} ${voice}: no Israeli or ${setting} slot`);
          continue;
        } else {
          assert.equal(clip.path, isr.path);
          assert.equal(clip.tradition, 'israeli');
          assert.equal(clip.setting, setting);
          assert.match(clipCaption(clip), new RegExp(`Israeli voice; ${name} reading shown in English letters`));
          fallback += 1;
        }
        checked += 1;
      }
    }
  }
  assert.ok(checked > 2000, String(checked));
  assert.ok(own > 0 && fallback > 0, JSON.stringify({ own, fallback }));
  const [text, row] = Object.entries(lookup.clips).find(([, r]) => r['f|israeli']);
  assert.equal(clipCaption(lookupClip(lookup, text, 'f', 'israeli')).includes('reading shown'), false, row['f|israeli'].path);
});
