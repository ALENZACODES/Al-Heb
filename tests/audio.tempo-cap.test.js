// tools/audio/tempo_cap.mjs: the cap applied to EXISTING Sephardi/Ashkenazi clips on disk, and how a capped file is re-admitted
// (manifest source 'tts-respelled-tempo-capped'). Runs on a temp root with ffmpeg tones; the CLI dry run is checked against the
// real repo for a few line clips. Skips the ffmpeg parts when ffmpeg is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { selectExisting, measure, ALL_KINDS } from '../tools/audio/tempo_cap.mjs';
import { capClip, markAccentRows, readMeta, writeMeta, haveFfmpeg, ACCENT_SOURCES, ACCENT_STATUS, clipDuration, isAccentSource } from '../tools/audio/accent.mjs';
import { isAccentClip } from '../src/audio/player.js';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const ffmpeg = haveFfmpeg();
const tone = (file, seconds) => { fs.mkdirSync(path.dirname(file), { recursive: true }); const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', file]); assert.equal(r.status, 0, String(r.stderr)); };

const row = (voice, tradition, kind, id, status = 'tts', extra = {}) => ({ path: `audio/${voice}/${tradition}/${kind}/${id}.mp3`, voice, tradition, kind, id, text: 'x', status, source: 'paid-cloud', ...extra });

test('selectExisting: own-tradition rows with a file on disk, not missing, not alias; voice and kind filters', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-tc-'));
  const m = [row('m', 'sephardi', 'line', 'a'), row('f', 'sephardi', 'line', 'a'), row('m', 'sephardi', 'word', 'w'), row('m', 'sephardi', 'word', 'gone'),
    row('m', 'sephardi', 'prayer', 'a', 'missing', { aliasOf: 'line/a' }), row('m', 'ashkenazi', 'line', 'a'), row('m', 'israeli', 'line', 'a')];
  for (const p of ['audio/m/sephardi/line/a.mp3', 'audio/f/sephardi/line/a.mp3', 'audio/m/sephardi/word/w.mp3', 'audio/m/ashkenazi/line/a.mp3']) { fs.mkdirSync(path.join(root, path.dirname(p)), { recursive: true }); fs.writeFileSync(path.join(root, p), 'x'); }
  assert.deepEqual(selectExisting(m, { tradition: 'sephardi', voice: 'both', root }).map((e) => e.path), ['audio/m/sephardi/line/a.mp3', 'audio/f/sephardi/line/a.mp3', 'audio/m/sephardi/word/w.mp3']);
  assert.deepEqual(selectExisting(m, { tradition: 'sephardi', voice: 'f', root }).map((e) => e.path), ['audio/f/sephardi/line/a.mp3']);
  assert.deepEqual(selectExisting(m, { tradition: 'sephardi', voice: 'both', kinds: ['word'], root }).map((e) => e.id), ['w']);
  assert.deepEqual(selectExisting(m, { tradition: 'ashkenazi', voice: 'both', root, limit: 5 }).map((e) => e.id), ['a']);
  assert.throws(() => selectExisting(m, { tradition: 'israeli', voice: 'both', root }), /sephardi or ashkenazi/);
  assert.deepEqual(ALL_KINDS, ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer']);
  fs.rmSync(root, { recursive: true, force: true });
});

test('measure + execute path on tones: files over the cap are listed with current/target, rewritten to 1.26x, re-admitted as tempo-capped; within-cap and no-reference files are left alone', { skip: !ffmpeg && 'ffmpeg not installed' }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-tc2-'));
  const m = [row('f', 'sephardi', 'line', 'slow'), row('f', 'israeli', 'line', 'slow'), row('f', 'sephardi', 'word', 'fine'), row('f', 'israeli', 'word', 'fine'), row('f', 'sephardi', 'word', 'lone'),
    row('f', 'sephardi', 'line', 'made', 'synthetic-unreviewed', { source: ACCENT_SOURCES.israeliVoice }), row('f', 'israeli', 'line', 'made')];
  tone(path.join(root, 'audio/f/sephardi/line/slow.mp3'), 5); tone(path.join(root, 'audio/f/israeli/line/slow.mp3'), 2);
  tone(path.join(root, 'audio/f/sephardi/word/fine.mp3'), 1); tone(path.join(root, 'audio/f/israeli/word/fine.mp3'), 1);
  tone(path.join(root, 'audio/f/sephardi/word/lone.mp3'), 3);
  tone(path.join(root, 'audio/f/sephardi/line/made.mp3'), 4); tone(path.join(root, 'audio/f/israeli/line/made.mp3'), 2);
  writeMeta(path.join(root, 'audio/f/sephardi/line/made.mp3'), { status: ACCENT_STATUS, source: ACCENT_SOURCES.israeliVoice, spokenText: 'x' });
  fs.mkdirSync(path.join(root, 'data/audio'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(m, null, 1) + '\n');
  const rows = selectExisting(m, { tradition: 'sephardi', voice: 'f', root });
  const { records, totals } = measure(rows, { root });
  const by = Object.fromEntries(records.map((r) => [r.row.id, r]));
  assert.equal(by.slow.over, true); assert.ok(Math.abs(by.slow.before - 5) < 0.01); assert.ok(Math.abs(by.slow.israeliSec - 2) < 0.01); assert.ok(Math.abs(by.slow.target - 2.52) < 0.01); assert.ok(Math.abs(by.slow.factor - 5 / 2.52) < 1e-9);
  assert.equal(by.fine.over, false); assert.equal(by.fine.factor, 1); assert.ok(Math.abs(by.fine.target - 1) < 0.01);
  assert.equal(by.lone.noRef, true); assert.equal(by.lone.over, false); assert.equal(by.lone.target, null);
  assert.equal(by.made.over, true);
  assert.deepEqual(totals.line, { files: 2, over: 2, within: 0, noRef: 0, secondsOver: totals.line.secondsOver });
  assert.ok(Math.abs(totals.line.secondsOver - ((5 - 2.52) + (4 - 2.52))) < 0.05);
  assert.deepEqual({ ...totals.word, secondsOver: 0 }, { files: 2, over: 0, within: 1, noRef: 1, secondsOver: 0 });
  // the execute path as tempo_cap.mjs runs it: cap, sidecar, mark (source: tempo-capped for an old file, kept for a renderer-made one)
  const marks = new Map();
  for (const r of records) {
    if (r.noRef || !r.over) continue;
    const abs = path.join(root, r.row.path);
    const meta = readMeta(abs);
    const source = isAccentSource(meta.source) ? meta.source : ACCENT_SOURCES.tempoCapped;
    const res = capClip(abs, path.join(root, r.israeliRef), { israeliRef: r.israeliRef });
    writeMeta(abs, { ...meta, status: ACCENT_STATUS, source, tempo: res });
    marks.set(r.row.path, { source });
  }
  const marked = markAccentRows(root, marks);
  assert.deepEqual(marked.marked.sort(), ['audio/f/sephardi/line/made.mp3', 'audio/f/sephardi/line/slow.mp3']);
  assert.ok(Math.abs(clipDuration(path.join(root, 'audio/f/sephardi/line/slow.mp3')) - 2.52) <= 0.05);
  assert.ok(Math.abs(clipDuration(path.join(root, 'audio/f/sephardi/line/made.mp3')) - 2.52) <= 0.05);
  assert.ok(Math.abs(clipDuration(path.join(root, 'audio/f/sephardi/word/fine.mp3')) - 1) < 0.01, 'within the cap: untouched');
  assert.ok(Math.abs(clipDuration(path.join(root, 'audio/f/sephardi/word/lone.mp3')) - 3) < 0.01, 'no reference: untouched');
  const slowMeta = readMeta(path.join(root, 'audio/f/sephardi/line/slow.mp3'));
  assert.equal(slowMeta.source, 'tts-respelled-tempo-capped'); assert.equal(slowMeta.status, ACCENT_STATUS); assert.equal(slowMeta.tempo.applied, true); assert.equal(slowMeta.tempo.israeliRef, 'audio/f/israeli/line/slow.mp3');
  assert.ok(Math.abs(slowMeta.tempo.before - 5) < 0.01); assert.ok(Math.abs(slowMeta.tempo.after - 2.52) <= 0.05); assert.ok(Math.abs(slowMeta.tempo.israeliSec - 2) < 0.01);
  assert.equal(readMeta(path.join(root, 'audio/f/sephardi/line/made.mp3')).source, 'tts-respelled-israeli-voice', 'a renderer-made clip keeps its provenance');
  const after = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'));
  const get = (id) => after.find((e) => e.tradition === 'sephardi' && e.id === id);
  assert.equal(get('slow').source, 'tts-respelled-tempo-capped'); assert.equal(get('slow').status, ACCENT_STATUS); assert.equal(isAccentClip(get('slow')), true, 're-admitted: the player plays it as the Sephardi file');
  assert.equal(get('made').source, 'tts-respelled-israeli-voice');
  assert.equal(get('fine').source, 'paid-cloud'); assert.equal(isAccentClip(get('fine')), false, 'within the cap but not rewritten: stays retired without --admit-all');
  assert.equal(get('lone').source, 'paid-cloud'); assert.equal(isAccentClip(get('lone')), false, 'no Israeli counterpart: stays retired');
  assert.equal(after.find((e) => e.tradition === 'israeli' && e.id === 'slow').source, 'paid-cloud', 'Israeli rows untouched');
  fs.rmSync(root, { recursive: true, force: true });
});

test('CLI dry run on the real repo (4 Sephardi line clips): lists current -> target durations, totals per kind, changes nothing', { skip: !ffmpeg && 'ffmpeg not installed' }, () => {
  const before = fs.statSync(path.join(REPO, 'audio/m/sephardi/line/adon-olam-1-l1.mp3')).mtimeMs;
  const r = spawnSync(process.execPath, ['tools/audio/tempo_cap.mjs', '--tradition', 'sephardi', '--voice', 'm', '--kinds', 'line', '--limit', '4'], { cwd: REPO, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /DRY RUN: tempo cap 1\.26x the Israeli clip, tradition=sephardi voice=m kinds=line; 4 own-tradition file\(s\) on disk/);
  assert.match(r.stdout, /audio\/m\/sephardi\/line\/\S+\.mp3  \d+\.\d\d -> \d+\.\d\d  \(Israeli \d+\.\d\d, x\d\.\d{3}\)/);
  assert.match(r.stdout, /per kind: kind files over within noRef secondsOver\n  line 4 \d \d \d/);
  assert.match(r.stdout, /total: files=4 over=\d within=\d noRef=\d/); assert.match(r.stdout, /Dry run only: no file was changed/);
  assert.equal(fs.statSync(path.join(REPO, 'audio/m/sephardi/line/adon-olam-1-l1.mp3')).mtimeMs, before);
  assert.equal(spawnSync('git', ['status', '--porcelain', 'audio/m/sephardi/line', 'data/audio'], { cwd: REPO, encoding: 'utf8' }).stdout.trim(), '', 'nothing on disk changed');
  const bad = spawnSync(process.execPath, ['tools/audio/tempo_cap.mjs', '--tradition', 'israeli', '--voice', 'm'], { cwd: REPO, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(bad.status, 2);
});
