// Site check 2026-11-11, audio lane: C-04/D-03 (Sephardi and Ashkenazi rows that play the Israeli clip are not missing),
// S-04 (the Moses pages that say the divine name are held and say so), S-10 (no clip file outside the catalogue is shipped),
// S-11 (a held clip never plays on any screen, and the screen says what plays instead), M-11 (service lines have clips).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createAudio, PLAYS_ISRAELI } from '../src/audio/player.js';
import { audioAccess, HELD_DEVICE, HELD_NONE } from '../src/shell/audio-access.js';
import { describeResult, playbackLine } from '../src/shell/audio.js';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { EXTRA_FOLDERS, SFX_FOLDERS, OTHER_FOLDERS, torahLinePaths } from '../tools/audio/summary.mjs';
import { HELD_PAGE } from '../src/books/book.view.js';

const ROOT = new URL('..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const all = loadManifestFull(ROOT);
const summary = J('data/audio/summary.json');

test('C-04: plays-israeli rows have no file of their own, name the Israeli clip they play, and the summary reconciles exactly', () => {
  const rows = all.filter((e) => e.status === PLAYS_ISRAELI);
  assert.ok(rows.length > 3000);
  for (const e of rows) {
    assert.ok(['sephardi', 'ashkenazi'].includes(e.tradition), e.path);
    assert.equal(existsSync(join(ROOT, e.path)), false, e.path);
    assert.ok(e.plays.startsWith(`audio/${e.voice}/israeli/`) && existsSync(join(ROOT, e.plays)), e.plays);
  }
  assert.equal(summary.playsIsraeli, rows.length);
  assert.equal(summary.total, all.length);
  assert.equal(summary.recorded + summary.tts + summary.playsIsraeli + summary.viaOther + summary.missing, summary.total);
  // and the player plays exactly that file for the setting
  const p = createAudio({ settings: { voice: 'f', congregation: 'sephardi' }, manifest: all, AudioCtor: class {}, speech: null });
  const row = rows.find((e) => e.voice === 'f' && e.tradition === 'sephardi' && e.kind === 'letter');
  const s = p.status(row.kind, row.id);
  assert.equal(s.source, 'file'); assert.equal(s.path, row.plays); assert.equal(s.fileTradition, 'israeli');
});

test('S-11: a held clip never plays; the plan falls to the device voice (or nothing) and every screen says it is held', () => {
  const manifest = [{ path: 'audio/f/israeli/syllable/bet-u.mp3', voice: 'f', tradition: 'israeli', kind: 'syllable', id: 'bet-u', text: 'בּוּ', status: 'tts', source: 'paid-cloud' }];
  class Utt { constructor(t) { this.text = t; } }
  const speech = { getVoices: () => [{ lang: 'he-IL' }], speak() {}, cancel() {} };
  const a = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest, AudioCtor: class {}, speech, UtteranceCtor: Utt });
  assert.equal(a.status('syllable', 'bet-u').source, 'file');
  a.setHeld(['audio/f/israeli/syllable/bet-u.mp3']);
  const s = a.status('syllable', 'bet-u');
  assert.equal(s.source, 'tts-fallback'); assert.equal(s.held, true); assert.equal(s.heldPath, 'audio/f/israeli/syllable/bet-u.mp3');
  assert.equal(audioAccess(a, 'syllable', 'bet-u').label, HELD_DEVICE);
  assert.match(describeResult(s).text, /held for review, so your device's Hebrew voice reads it instead/);
  assert.match(playbackLine({ type: 'playing', held: true }).text, /held for review/);
  const quiet = createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest, AudioCtor: class {}, speech: null, held: ['audio/f/israeli/syllable/bet-u.mp3'] });
  const q = quiet.status('syllable', 'bet-u');
  assert.equal(q.source, 'none'); assert.equal(q.held, true);
  assert.equal(audioAccess(quiet, 'syllable', 'bet-u').label, HELD_NONE);
  assert.match(describeResult(q).text, /held for review/);
  // the shell loads the list of held clips with the recording list
  assert.match(readFileSync(join(ROOT, 'src/app.js'), 'utf8'), /loadHolds: \(\) => fetch\('data\/lab\/clip-holds\.json'\)/);
});

test('S-04: the Moses pages that say the divine name are held, marked, and say so; the shelf line counts them', () => {
  const book = J('data/books/book63.json');
  const held = book.pages.filter((p) => p.audioHeld === 'divine-name');
  assert.equal(held.length, 4);
  for (const p of held) { assert.equal(p.hasAudio, false); assert.match(p.he, /אֱלֹהִים/); }
  const idx = J('data/books/index.json').books.find((b) => b.id === 'book63');
  assert.equal(idx.audioHeldPages, held.length); assert.equal(idx.audioPages + held.length, idx.pageCount);
  assert.match(HELD_PAGE, /divine name/);
  assert.match(readFileSync(join(ROOT, 'src/books/books.view.js'), 'utf8'), /the divine name .* not read aloud until its reading is decided/);
});

test('S-10: every clip file in the tree is catalogued or lives in a counted folder (retired clips are not shipped)', () => {
  const listed = new Set(all.filter((e) => e.path).map((e) => e.path));
  for (const f of ['data/audio/manifest-book63.json', 'data/audio/manifest-torah.json']) for (const e of J(f)) listed.add(e.path);
  for (const p of torahLinePaths(ROOT)) listed.add(p);
  const dirs = [...Object.values(EXTRA_FOLDERS).flat(), ...SFX_FOLDERS, ...Object.values(OTHER_FOLDERS).flat()];
  const walk = (d, out = []) => { for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p, out); else if (/\.mp3$/.test(e.name)) out.push(p); } return out; };
  const stray = walk('audio').filter((f) => !listed.has(f) && !dirs.some((d) => f.startsWith(d + '/')));
  assert.deepEqual(stray, []);
});

test('M-11: every line and prayer the service screens play has an Israeli clip in both voices', () => {
  const orders = J('data/service/orders.json').orders;
  const ids = new Set(Object.values(orders).flatMap((o) => o.items.map((i) => i.id)));
  for (const v of ['m', 'f']) {
    const p = createAudio({ settings: { voice: v, congregation: 'israeli' }, manifest: all, AudioCtor: class {}, speech: null });
    for (const id of ids) {
      const s = p.status('prayer', id).source === 'file' ? p.status('prayer', id) : p.status('line', id);
      assert.equal(s.source, 'file', `${v}/${id}`);
      assert.ok(existsSync(join(ROOT, s.path)), s.path);
    }
  }
});

test('M-11: each line of a multi-line service text has its own Play, and the coverage tab counts lines with a clip', async () => {
  const { lineClipFor, audioCoverage } = await import('../src/service/model.js');
  const files = new Set(['line|x-l1', 'line|x-l2', 'prayer|x', 'line|one']);
  const audio = { status: (kind, id) => (files.has(`${kind}|${id}`) ? { source: 'file' } : { source: 'none' }) };
  const two = { id: 'x', he: ['א', 'ב', 'ג'] }, one = { id: 'one', he: ['ד'] };
  assert.deepEqual(lineClipFor(audio, two, 0, 'israeli'), { kind: 'line', id: 'x-l1' });
  assert.equal(lineClipFor(audio, two, 2, 'israeli'), null);
  assert.deepEqual(lineClipFor(audio, one, 0, 'israeli'), { kind: 'line', id: 'one' });
  assert.deepEqual(audioCoverage(audio, [two, one], 'israeli'), { lines: 4, withClip: 3, pct: 75 });
  assert.match(readFileSync(join(ROOT, 'src/service/service.view.js'), 'utf8'), /Play line \$\{k \+ 1\}/);
});

test('D-07: gender pairs, role-plays and Israel dialogues have Israeli clips in both voices (or are held), and their screens ask for them', async () => {
  const { d07Items } = await import('../tools/audio/d07_rows.mjs');
  const holds = new Set(J('data/lab/clip-holds.json').paths);
  const byPath = new Map(all.map((e) => [e.path, e]));
  const items = d07Items(ROOT);
  assert.equal(items.filter((i) => i.group === 'gender-pair').length, 32);
  assert.equal(items.filter((i) => i.group === 'gender-paradigm').length, 24);
  assert.equal(items.filter((i) => i.group === 'dialogue-line').length, 54);
  for (const i of items) for (const v of ['m', 'f']) {
    const e = byPath.get(`audio/${v}/israeli/${i.kind}/${i.id}.mp3`);
    assert.ok(e, `${v}/${i.id} catalogued`); assert.equal(e.text, i.text); assert.equal(e.scope, 'israeli-only');
    assert.ok(e.status === 'tts' && existsSync(join(ROOT, e.path)), `${e.path} has its clip`);
    const meta = J(`${e.path}.meta.json`); assert.equal(meta.inputText, i.text);
    if (meta.review.reviewersFailing >= 2) assert.ok(holds.has(e.path), `${e.path} failed 2 of 3 reviewers and must be held`);
  }
  const src = (p) => readFileSync(join(ROOT, p), 'utf8');
  assert.match(src('src/curriculum/gender.view.js'), /audioStatus\(ctx, "word", pid\(c\)/);
  assert.match(src('src/phrases/model.js'), /slotsFor\(g\.he, index, `\$\{ref\.sourceId\}-\$\{g\.speaker\}\$\{g\.addressee\}`\)/);
  assert.match(src('src/curriculum/dialogues.view.js'), /voiceButton\(ctx, "line", l\.id, voiceOf\[l\.speaker\]/);
  const { speakerVoice } = await import('../src/curriculum/dialogues.view.js');
  assert.equal(speakerVoice('Dana (woman)'), 'f'); assert.equal(speakerVoice('Waiter (man)'), 'm'); assert.equal(speakerVoice('Host and waiter (woman)'), 'f');
});

test('D-12: the Shin sound rows list the pointed shin (shin dot), not a bare letter', () => {
  for (const e of all.filter((x) => (x.kind === 'letter' && x.id === 'shin-sound') || (x.kind === 'syllable' && x.id === 'dot-shin-sin-0'))) assert.equal(e.text, 'שׁ', e.path);
});
