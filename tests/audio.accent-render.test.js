// Sephardi and Ashkenazi clips made by the Israeli voices reading the tradition's respelling (owner decision 2026-11-07 22:56),
// and the tempo cap (a tradition clip may be at most 1.26 x its Israeli counterpart). No network: the provider is fed a fake fetch
// that returns ffmpeg-generated tones, so the cap is proved on real audio. Skips the ffmpeg parts when ffmpeg is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as google from '../tools/audio/tts/google.mjs';
import { selectEntries, estimate, warnedRows, renderBatch, textToSend, traditionList, countByKind } from '../tools/audio/render_tts.mjs';
import { tempoFactor, atempoChain, respellFor, israeliRef, clipDuration, capClip, markAccentRows, haveFfmpeg, ACCENT_SOURCES, ACCENT_STATUS, TEMPO_CAP } from '../tools/audio/accent.mjs';
import { isAccentClip } from '../src/audio/player.js';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const ffmpeg = haveFfmpeg();

const manifest = [
  { path: 'audio/m/sephardi/word/shabbat.mp3', voice: 'm', tradition: 'sephardi', kind: 'word', id: 'shabbat', text: 'שַׁבָּת', status: 'missing', source: 'none', equivalentTo: ['israeli'] },
  { path: 'audio/m/ashkenazi/word/shabbat.mp3', voice: 'm', tradition: 'ashkenazi', kind: 'word', id: 'shabbat', text: 'שַׁבָּת', status: 'missing', source: 'none' },
  { path: 'audio/m/israeli/word/shabbat.mp3', voice: 'm', tradition: 'israeli', kind: 'word', id: 'shabbat', text: 'שַׁבָּת', status: 'tts', source: 'paid-cloud' },
  { path: 'audio/f/sephardi/line/bless-priestly-1.mp3', voice: 'f', tradition: 'sephardi', kind: 'line', id: 'bless-priestly-1', text: 'יְבָרֶכְךָ אֲדֹנָי וְיִשְׁמְרֶךָ׃', status: 'tts', source: 'paid-cloud' },
  { path: 'audio/f/ashkenazi/line/bless-priestly-1.mp3', voice: 'f', tradition: 'ashkenazi', kind: 'line', id: 'bless-priestly-1', text: 'יְבָרֶכְךָ אֲדֹנָי וְיִשְׁמְרֶךָ׃', status: 'tts', source: 'paid-cloud' },
  { path: 'audio/f/sephardi/prayer/bless-priestly-1.mp3', voice: 'f', tradition: 'sephardi', kind: 'prayer', id: 'bless-priestly-1', text: 'יְבָרֶכְךָ אֲדֹנָי וְיִשְׁמְרֶךָ׃', status: 'missing', aliasOf: 'line/bless-priestly-1' },
  { path: 'audio/f/sephardi/letter/alef-sound.mp3', voice: 'f', tradition: 'sephardi', kind: 'letter', id: 'alef-sound', text: 'א', status: 'missing' },
  { path: 'audio/f/sephardi/word/challah.mp3', voice: 'f', tradition: 'sephardi', kind: 'word', id: 'challah', text: 'חַלָּה', status: 'missing' },
  { path: 'audio/f/sephardi/word/tzedek.mp3', voice: 'f', tradition: 'sephardi', kind: 'word', id: 'tzedek', text: 'צֶדֶק', status: 'missing' },
];

test('respelling: the text sent is the tradition\'s English-letter line (Ashkenazi says shabos), cleaned of sof pasuq and maqaf first', () => {
  assert.equal(respellFor('שַׁבָּת', 'sephardi'), 'shabat');
  assert.equal(respellFor('שַׁבָּת', 'ashkenazi'), 'shabos');
  assert.equal(respellFor('יְבָרֶכְךָ אֲדֹנָי וְיִשְׁמְרֶךָ׃', 'sephardi'), 'yevarekhkha adonai veyishmerekha');
  assert.equal(respellFor('יְבָרֶכְךָ אֲדֹנָי וְיִשְׁמְרֶךָ׃', 'ashkenazi'), 'yevorekhkho adonoy veyishmerekho');
  assert.equal(respellFor('בָּרוּךְ־אַתָּה', 'ashkenazi'), 'borukh atoh', 'maqaf becomes a space before respelling');
  assert.equal(respellFor('א', 'sephardi'), '', 'a bare silent letter has no respelling');
  assert.throws(() => respellFor('שַׁבָּת', 'israeli'), /not a respelled tradition/);
  assert.equal(israeliRef('audio/m/sephardi/line/x.mp3'), 'audio/m/israeli/line/x.mp3');
  assert.equal(israeliRef('audio/f/ashkenazi/word/y.mp3'), 'audio/f/israeli/word/y.mp3');
});

test('cleanHebrewForTts passes Latin input through: ch/kh/tz/sh digraphs, apostrophes and hyphens survive; Hebrew is still cleaned', () => {
  for (const s of ['chalah', 'tzedek', 'shabos', 'yevarekhkha adonai veyishmerekha', "ha'olam", 'borukh-atoh', 'eretz.']) assert.equal(google.cleanHebrewForTts(s), s, s);
  assert.equal(google.cleanHebrewForTts('  shabat   shalom '), 'shabat shalom');
  assert.equal(google.cleanHebrewForTts('יְבָרֶכְךָ אֲדֹנָי׃'), 'יְבָרֶכְךָ אֲדֹנָי');
  assert.deepEqual(google.textWarnings('shabos'), [], 'a Latin respelling is not "Latin mixed into Hebrew"');
  // the request the Israeli voice gets: plain Latin text, he-IL, the same WaveNet voice as an Israeli run
  const req = google.buildRequest({ text: 'shabos', voice: 'm', env: { GOOGLE_TTS_API_KEY: 'k' }, languageCode: 'he-IL' });
  const body = JSON.parse(req.body);
  assert.deepEqual(body.input, { text: 'shabos' }); assert.deepEqual(body.voice, { languageCode: 'he-IL', name: 'he-IL-Wavenet-B' });
  assert.equal(req.spokenText, 'shabos'); assert.equal(req.billedChars, 6);
  assert.throws(() => google.buildRequest({ text: 'shabos', voice: 'm', env: { GOOGLE_TTS_API_KEY: 'k', GOOGLE_TTS_VOICE_M: 'he-IL-Chirp3-HD-Charon' } }), /multilingual HD voice/, 'Chirp still needs the allow flag');
});

test('selection for sephardi/ashkenazi: that tradition\'s missing rows (every row with --redo), each with spokenText and israeliRef; dry-run cost per tradition', () => {
  const sep = selectEntries(manifest, { voice: 'both', tradition: 'sephardi', kinds: ['letter', 'word', 'line', 'prayer'] });
  assert.deepEqual(sep.map((r) => r.id), ['shabbat', 'alef-sound', 'challah', 'tzedek'], 'missing rows only; the alias prayer row is skipped in kind mode');
  assert.deepEqual(sep.map(textToSend), ['shabat', '', 'chalah', 'tzedek']);
  assert.equal(sep[0].israeliRef, 'audio/m/israeli/word/shabbat.mp3');
  const redo = selectEntries(manifest, { voice: 'f', tradition: 'sephardi', kinds: ['line'], onlyMissing: false });
  assert.deepEqual(redo.map(textToSend), ['yevarekhkha adonai veyishmerekha']);
  const ash = selectEntries(manifest, { voice: 'both', tradition: 'ashkenazi', kinds: ['word', 'line'], onlyMissing: false });
  assert.deepEqual(ash.map(textToSend), ['shabos', 'yevorekhkho adonoy veyishmerekho']);
  assert.deepEqual(countByKind(ash), { word: 1, line: 1 });
  const est = estimate(ash, google, {});
  assert.equal(est.clips, 2); assert.equal(est.chars, 'shabos'.length + 'yevorekhkho adonoy veyishmerekho'.length);
  assert.ok(Math.abs(est.usd - (est.chars / 1e6) * 4) < 1e-12, 'WaveNet rate');
  const warned = warnedRows(sep, google);
  assert.deepEqual(warned.map((w) => w.row.id), ['alef-sound']); assert.match(warned[0].warnings.join('; '), /no respelling/);
  assert.deepEqual(traditionList('both'), ['sephardi', 'ashkenazi']); assert.deepEqual(traditionList(undefined), ['israeli']); assert.deepEqual(traditionList('sephardi,ashkenazi'), ['sephardi', 'ashkenazi']);
  assert.throws(() => traditionList('yemenite'), /not one of/);
  // Israeli rows are unchanged: no spokenText, pointed Hebrew is sent
  const isr = selectEntries(manifest, { voice: 'm', tradition: 'israeli', kinds: ['word'], onlyMissing: false });
  assert.equal(isr.length, 1); assert.equal(isr[0].spokenText, undefined); assert.equal(textToSend(isr[0]), 'שַׁבָּת');
});

test('tempoFactor: 1 within the cap or with unknown durations; exactly new/(cap x israeli) above it; never below 1', () => {
  assert.equal(tempoFactor(2.0, 2.0), 1);
  assert.equal(tempoFactor(2.52, 2.0), 1, 'exactly at the cap is within it');
  assert.equal(tempoFactor(1.0, 2.0), 1, 'a shorter clip is never slowed down');
  assert.ok(Math.abs(tempoFactor(4.0, 2.0) - 4 / 2.52) < 1e-12);
  assert.ok(Math.abs(tempoFactor(6.7, 2.7) - 6.7 / (1.26 * 2.7)) < 1e-12, 'the live priestly-blessing case');
  assert.equal(tempoFactor(4.0, null), 1); assert.equal(tempoFactor(null, 2.0), 1); assert.equal(tempoFactor(4.0, 0), 1);
  assert.equal(tempoFactor(5.0, 2.0, 2.5), 1); assert.ok(tempoFactor(5.1, 2.0, 2.5) > 1);
  assert.equal(TEMPO_CAP, 1.26);
});

test('atempoChain: one filter inside 0.5-2.0, chained atempo=2.0 steps beyond it, never a slow-down', () => {
  assert.equal(atempoChain(1.5), 'atempo=1.500000');
  assert.equal(atempoChain(2), 'atempo=2.000000');
  assert.equal(atempoChain(2.5), 'atempo=2.0,atempo=1.250000');
  assert.equal(atempoChain(5), 'atempo=2.0,atempo=2.0,atempo=1.250000');
  assert.throws(() => atempoChain(0.9), /slow the clip down/);
  assert.throws(() => atempoChain(0), /bad factor/);
});

function tone(file, seconds) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', file]);
  assert.equal(r.status, 0, String(r.stderr));
  return fs.readFileSync(file);
}

test('tempo cap on real audio: a 4 s clip against a 2 s Israeli reference comes out at 2.52 s (+-0.05), same pitch via atempo; a short clip is left alone', { skip: !ffmpeg && 'ffmpeg not installed' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-cap-'));
  const four = path.join(dir, 'four.mp3'), two = path.join(dir, 'two.mp3');
  tone(four, 4); tone(two, 2);
  assert.ok(Math.abs(clipDuration(four) - 4) < 0.01, 'decoded duration excludes encoder padding');
  assert.ok(Math.abs(clipDuration(two) - 2) < 0.01);
  const dry = capClip(four, two, { dry: true, israeliRef: 'audio/f/israeli/line/two.mp3' });
  assert.equal(dry.applied, false); assert.ok(Math.abs(dry.factor - 4 / 2.52) < 1e-9); assert.ok(Math.abs(clipDuration(four) - 4) < 0.01, 'dry run leaves the file');
  const res = capClip(four, two, { israeliRef: 'audio/f/israeli/line/two.mp3' });
  assert.equal(res.applied, true); assert.equal(res.cap, 1.26); assert.ok(Math.abs(res.before - 4) < 0.01); assert.ok(Math.abs(res.israeliSec - 2) < 0.01);
  assert.ok(Math.abs(res.after - 2.52) <= 0.05, `after=${res.after}`);
  assert.equal(res.israeliRef, 'audio/f/israeli/line/two.mp3');
  assert.ok(Math.abs(clipDuration(four) - 2.52) <= 0.05, 'the file on disk was rewritten');
  // within the cap: untouched
  const short = path.join(dir, 'short.mp3'); tone(short, 2.2);
  const none = capClip(short, two);
  assert.equal(none.applied, false); assert.equal(none.factor, 1); assert.ok(Math.abs(clipDuration(short) - 2.2) < 0.01);
  // no Israeli counterpart: nothing applied, israeliSec null
  const lone = capClip(short, path.join(dir, 'absent.mp3'));
  assert.equal(lone.applied, false); assert.equal(lone.israeliSec, null);
  // a factor beyond 2 (chained atempo): 9 s against 2 s
  const nine = path.join(dir, 'nine.mp3'); tone(nine, 9);
  const big = capClip(nine, two);
  assert.ok(big.factor > 2); assert.ok(Math.abs(big.after - 2.52) <= 0.05, `after=${big.after}`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('renderBatch for a sephardi row: the respelling is sent to the Israeli voice, the clip is tempo-capped against the Israeli file, the sidecar carries the accent provenance, and the manifest row is admitted', { skip: !ffmpeg && 'ffmpeg not installed' }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-accent-'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-tones-'));
  const fourBuf = tone(path.join(dir, 'four.mp3'), 4);
  fs.mkdirSync(path.join(root, 'audio/f/israeli/line'), { recursive: true });
  tone(path.join(root, 'audio/f/israeli/line/bless-priestly-1.mp3'), 2);
  const sent = [];
  const fetchImpl = async (url, init) => { sent.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ audioContent: fourBuf.toString('base64') }) }; };
  const rows = selectEntries(manifest, { voice: 'f', tradition: 'sephardi', kinds: ['line'], onlyMissing: false });
  const metas = [];
  const w = await renderBatch({ provider: google, rows, root, fetchImpl, env: { GOOGLE_TTS_API_KEY: 'k' }, now: () => 'T', log: () => {}, normalize: false, onMeta: (r, m) => metas.push([r.path, m]) });
  assert.deepEqual(w, ['audio/f/sephardi/line/bless-priestly-1.mp3']);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].input, { text: 'yevarekhkha adonai veyishmerekha' });
  assert.deepEqual(sent[0].voice, { languageCode: 'he-IL', name: 'he-IL-Wavenet-A' });
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'audio/f/sephardi/line/bless-priestly-1.mp3.meta.json'), 'utf8'));
  assert.equal(meta.status, ACCENT_STATUS); assert.equal(meta.source, ACCENT_SOURCES.israeliVoice); assert.equal(meta.source, 'tts-respelled-israeli-voice');
  assert.equal(meta.madeFrom, 'respelling'); assert.equal(meta.tradition, 'sephardi'); assert.equal(meta.voiceName, 'he-IL-Wavenet-A'); assert.equal(meta.languageCode, 'he-IL');
  assert.equal(meta.spokenText, 'yevarekhkha adonai veyishmerekha'); assert.equal(meta.hebrew, 'יְבָרֶכְךָ אֲדֹנָי וְיִשְׁמְרֶךָ׃');
  assert.equal(meta.israeliRef, 'audio/f/israeli/line/bless-priestly-1.mp3'); assert.equal(meta.redistributionCleared, false);
  assert.equal(meta.tempo.applied, true); assert.ok(Math.abs(meta.tempo.before - 4) < 0.01); assert.ok(Math.abs(meta.tempo.israeliSec - 2) < 0.01);
  assert.ok(Math.abs(meta.tempo.after - 2.52) <= 0.05, `after=${meta.tempo.after}`); assert.equal(meta.tempo.cap, 1.26);
  assert.ok(Math.abs(clipDuration(path.join(root, 'audio/f/sephardi/line/bless-priestly-1.mp3')) - 2.52) <= 0.05);
  assert.match(meta.note, /Israeli woman voice reading the sephardi English-letter respelling/); assert.match(meta.note, /Not a human recording/);
  assert.equal(metas.length, 1);
  // marking: a copy of the core manifest in the temp root takes the admitted provenance for exactly this path
  fs.mkdirSync(path.join(root, 'data/audio'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  const res = markAccentRows(root, new Map([[metas[0][0], { source: metas[0][1].source }], ['audio/x/not-there.mp3', { source: ACCENT_SOURCES.israeliVoice }]]));
  assert.deepEqual(res.marked, ['audio/f/sephardi/line/bless-priestly-1.mp3']); assert.deepEqual(res.notFound, ['audio/x/not-there.mp3']);
  const after = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'));
  const row = after.find((e) => e.path === 'audio/f/sephardi/line/bless-priestly-1.mp3');
  assert.equal(row.status, ACCENT_STATUS); assert.equal(row.source, 'tts-respelled-israeli-voice'); assert.equal(isAccentClip(row), true, 'the player now plays this row as the Sephardi file');
  const untouched = after.find((e) => e.path === 'audio/f/ashkenazi/line/bless-priestly-1.mp3');
  assert.equal(untouched.source, 'paid-cloud'); assert.equal(isAccentClip(untouched), false);
  assert.throws(() => markAccentRows(root, new Map([['audio/m/sephardi/word/shabbat.mp3', { source: 'paid-cloud' }]])), /not an admitted accent source/);
  const rec = markAccentRows(root, new Map([['audio/m/israeli/word/shabbat.mp3', { source: ACCENT_SOURCES.israeliVoice }]]));
  assert.deepEqual(rec.skipped, ['audio/m/israeli/word/shabbat.mp3'], 'an Israeli row is never marked as an accent clip');
  fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(dir, { recursive: true, force: true });
});

test('CLI dry run for --tradition sephardi: prints the respelling per row, rows per kind, cost, and makes no network call', () => {
  const r = spawnSync(process.execPath, ['tools/audio/render_tts.mjs', '--provider', 'google', '--tradition', 'sephardi', '--voice', 'both', '--kinds', 'line', '--redo', '--limit', '4'], { cwd: REPO, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /DRY RUN: provider=google tradition=sephardi voice=both \(m=he-IL-Wavenet-B, f=he-IL-Wavenet-A\) REDO/);
  assert.match(r.stdout, /text=English-letter sephardi respelling, language he-IL, tempo cap 1\.26x/);
  assert.match(r.stdout, /audio\/m\/sephardi\/line\/\S+\.mp3  [a-z' -]+  \[[֐-׿\s׃־]+\]/);
  assert.match(r.stdout, /rows per kind: line=4/); assert.match(r.stdout, /clips=4 characters=\d+ est\. cost=US\$/); assert.match(r.stdout, /No network calls made/);
  const bad = spawnSync(process.execPath, ['tools/audio/render_tts.mjs', '--provider', 'azure', '--tradition', 'ashkenazi', '--voice', 'f'], { cwd: REPO, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(bad.status, 2); assert.match(bad.stderr, /google provider only/);
});
