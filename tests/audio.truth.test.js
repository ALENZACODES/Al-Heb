// The statement about audio (what the clips are, and are not) is tied to the shipped data: counts are read from
// data/audio/summary.json at run time, and the summary is checked against the manifests and the files on disk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { audioTruthLine, audioTruthDetail, audioTruthNode, loadAudioSummary, clipCoverage, spokenClips, AUDIO_UNKNOWN } from '../src/shell/audio-truth.js';
import { isSyntheticStatus } from '../src/shell/audio-labels.js';
import { EXTRA_FOLDERS, SFX_FOLDERS, OTHER_FOLDERS, torahLinePaths } from '../tools/audio/summary.mjs';
import { readinessLines } from '../src/shell/readiness.js';
import { bannerText } from '../src/shell/audio-access.js';

const root = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const summary = json('data/audio/summary.json');
const SHARDS = ['israeli', 'sephardi', 'ashkenazi'].map((t) => `data/audio/manifest-words-${t}.json`);
const listOf = (m) => (Array.isArray(m) ? m : (m.entries || m.clips || Object.values(m)));
const all = [json('data/audio/manifest.json'), json('data/audio/manifest-kind-word.json'), ...SHARDS.map(json)].flatMap(listOf);

const mp3sUnder = (dir) => { const out = []; const walk = (d) => { if (!existsSync(join(root, d))) return; for (const n of readdirSync(join(root, d))) { const p = `${d}/${n}`; if (statSync(join(root, p)).isDirectory()) walk(p); else if (n.endsWith('.mp3')) out.push(p); } }; walk(dir); return out; };

test('summary.json matches the manifests: total, recorded, synthetic and per-kind counts', () => {
  assert.equal(summary.total, all.length);
  assert.equal(summary.recorded, all.filter((e) => e.status === 'recorded').length);
  assert.equal(summary.tts, all.filter((e) => ['tts', 'synthetic-unreviewed', 'synthetic-reviewed'].includes(e.status)).length);
  const kinds = {};
  for (const e of all) if (isSyntheticStatus(e.status)) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  assert.deepEqual(summary.kinds, kinds);
  assert.equal(Object.values(summary.kinds).reduce((a, b) => a + b, 0), summary.tts);
});

test('summary.json counts the clips outside the manifests (book pages, arcade lines, opening prayers) from the folders on disk', () => {
  for (const [name, dirs] of Object.entries(EXTRA_FOLDERS)) assert.equal(summary.extra[name], dirs.flatMap(mp3sUnder).length, name);
  assert.equal(summary.spoken, summary.tts + Object.values(summary.extra).reduce((a, b) => a + b, 0));
  assert.equal(summary.sfx, SFX_FOLDERS.flatMap(mp3sUnder).length);
  assert.equal(spokenClips(summary), summary.spoken);
  // every clip outside the manifests really is outside them
  const listed = new Set(all.map((e) => e.path));
  for (const dirs of Object.values(EXTRA_FOLDERS)) for (const f of dirs.flatMap(mp3sUnder)) assert.ok(!listed.has(f), `${f} is in a manifest and would be counted twice`);
  // an older summary without the breakdown gives the manifest count and no coverage list
  assert.equal(spokenClips({ total: 10, recorded: 0, tts: 3 }), 3);
  assert.equal(clipCoverage({ total: 10, recorded: 0, tts: 3 }), '');
});

test('"unreviewed" and "no recorded teacher" hold in the data: every clip has a synthetic status that no human has reviewed, none is recorded', () => {
  const syn = all.filter((e) => e.status !== 'missing');
  assert.ok(syn.length > 0);
  for (const e of syn) {
    assert.ok(isSyntheticStatus(e.status), `${e.kind}/${e.id}: status ${e.status} is neither missing nor synthetic`);
    assert.notEqual(e.status, 'synthetic-reviewed', `${e.kind}/${e.id}: a clip was marked reviewed; update the audio wording (src/shell/audio-truth.js) and the docs`);
  }
  assert.equal(all.filter((e) => e.status === 'recorded').length, 0, 'a human recording exists: rewrite the audio statement');
  assert.match(read('docs/review/STATUS.md'), /\*\*Reviewed: 0 of \d+ rows\.\*\*/);
});

test('every counted clip has its mp3 on disk, and there is no mp3 the summary does not count', () => {
  const files = mp3sUnder('audio');
  const other = summary.other || {};
  assert.equal(files.length, summary.recorded + summary.spoken + summary.sfx + Object.values(other).reduce((n, x) => n + x, 0));
  const listed = new Set(all.filter((x) => x.status !== 'missing').map((e) => e.path || e.file || e.src || ''));
  for (const p of listed) assert.ok(existsSync(join(root, p)), `${p}: file missing`);
  const extraDirs = [...Object.values(EXTRA_FOLDERS).flat(), ...SFX_FOLDERS, ...Object.values(OTHER_FOLDERS).flat()];
  for (const p of torahLinePaths(root)) listed.add(p);
  for (const f of files) assert.ok(listed.has(f) || extraDirs.some((d) => f.startsWith(d + '/')), `${f}: on disk but in no manifest and no counted folder`);
});

test('the statement: exact wording, count and coverage read from the summary', () => {
  assert.equal(audioTruthLine(summary), `${summary.spoken.toLocaleString('en-US')} Hebrew clips in a synthetic voice (a man's and a woman's; no recorded teacher, unreviewed by native speakers) cover letters, vowels, syllables, words, lines, prayers, book pages and games; where none exists the app uses your device voice when it has a Hebrew voice.`);
  assert.equal(clipCoverage(summary), 'letters, vowels, syllables, words, lines, prayers, book pages and games');
  for (const k of ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer']) assert.ok(summary.kinds[k] > 0, `${k} clips exist, so the list may name them`);
  for (const k of ['book', 'games']) assert.ok(summary.extra[k] > 0, `${k} clips exist, so the list may name them`);
  assert.equal(audioTruthLine({ total: 10, recorded: 0, tts: 3 }), "3 Hebrew clips in a synthetic voice (a man's and a woman's; no recorded teacher, unreviewed by native speakers); where none exists the app uses your device voice when it has a Hebrew voice.");
  assert.match(audioTruthLine({ total: 10, recorded: 0, tts: 1 }), /^1 Hebrew clip in /);
  assert.equal(clipCoverage({ kinds: { word: 2 }, extra: { games: 1 } }), 'words and games');
  assert.equal(clipCoverage({ kinds: { word: 2 } }), 'words');
  assert.match(audioTruthLine({ total: 10, recorded: 0, tts: 0 }), /^No audio clips are included; no recorded teacher/);
});

test('the statement never claims more: unknown counts give no number; recordings stop the "no recorded teacher" claim', () => {
  for (const bad of [null, undefined, {}, { total: 5 }, { total: 5, recorded: 0 }, { total: 'x', recorded: 0, tts: 1 }]) { assert.equal(audioTruthLine(bad), AUDIO_UNKNOWN); assert.doesNotMatch(AUDIO_UNKNOWN, /\d/); }
  const withRec = audioTruthLine({ total: 10, recorded: 2, tts: 3 });
  assert.doesNotMatch(withRec, /no recorded teacher/); assert.match(withRec, /2 recorded clips/);
  const lines = [audioTruthLine(summary), audioTruthDetail(summary), AUDIO_UNKNOWN, bannerText(summary, 'yes')].join(' ');
  assert.doesNotMatch(lines, /audio (is )?available|native[- ](speaker )?(recorded|voice)|recorded by (a )?native|\bnative audio\b|human[- ]recorded|professionally/i);
  assert.match(audioTruthDetail(summary), /Israeli style has not been verified/);
  assert.equal(audioTruthDetail({ total: 10, recorded: 0, tts: 0 }), '');
});

test('readiness audio line takes every number from the data it is given', () => {
  const a = readinessLines({ audio: { total: 1234, recorded: 0, tts: 7 } }).find((l) => l.id === 'audio').text;
  assert.match(a, /^Audio: not ready\. 7 Hebrew clips in a synthetic voice/); assert.match(a, /7 of 1,234 planned clips exist, and none is a person recording/);
  assert.doesNotMatch(a, /outside that plan/, 'no extra clips were given, so none are claimed');
  const b = readinessLines({ audio: { total: 99, recorded: 0, tts: 2 } }).find((l) => l.id === 'audio').text;
  assert.match(b, /^Audio: not ready\. 2 Hebrew clips/); assert.match(b, /2 of 99 planned/); assert.doesNotMatch(b, /\b7\b|1,234/);
  const c = readinessLines({ audio: summary }).find((l) => l.id === 'audio').text;
  assert.ok(c.includes(summary.total.toLocaleString('en-US')) && c.includes(`${summary.spoken.toLocaleString('en-US')} Hebrew clips`));
  assert.ok(c.includes(`${(summary.spoken - summary.tts).toLocaleString('en-US')} more clips (book pages, arcade lines and opening prayers) are outside that plan`), c);
  assert.match(readinessLines({}).find((l) => l.id === 'audio').text, /could not be checked right now/);
});

test('no source file types the clip count into a sentence', () => {
  const bad = [];
  const walk = (d) => { for (const n of readdirSync(join(root, d))) { const p = `${d}/${n}`; if (statSync(join(root, p)).isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(n)) { const t = read(p); for (const count of [summary.tts, summary.spoken, summary.tts.toLocaleString('en-US'), summary.spoken.toLocaleString('en-US')]) if (new RegExp(`\\b${count}\\b[^.\\n]{0,40}(short |Hebrew )?(word )?clips?`, 'i').test(t) || new RegExp(`\\b${count} (synthetic|short|Hebrew)`).test(t)) bad.push(p); } } };
  walk('src');
  assert.deepEqual(bad, []);
});

test('audioTruthNode: drawn with no number, then filled from the fetched summary; a failed fetch keeps the no-number wording', async () => {
  const h = (tag, attrs = {}, ...kids) => ({ tag, attrs, textContent: kids.join('') });
  const ok = async (u) => { assert.equal(u, 'data/audio/summary.json'); return { ok: true, json: async () => ({ total: 50, recorded: 0, tts: 4 }) }; };
  const n = audioTruthNode(h, { fetchFn: ok });
  assert.match(n.textContent, /could not be checked right now/); assert.doesNotMatch(n.textContent, /\d/);
  await new Promise((r) => setTimeout(r, 0));
  assert.match(n.textContent, /^Sound: 4 Hebrew clips in a synthetic voice \(a man's and a woman's; no recorded teacher, unreviewed by native speakers\); where none exists the app uses your device voice when it has a Hebrew voice\./);
  const bad = audioTruthNode(h, { fetchFn: async () => { throw new Error('offline'); } }); await new Promise((r) => setTimeout(r, 0));
  assert.match(bad.textContent, /could not be checked/); assert.equal(await loadAudioSummary(async () => ({ ok: false })), null);
});

test('about, settings and how screens use the data-driven node, not typed counts', () => {
  for (const f of ['src/shell/about.view.js', 'src/shell/settings.view.js', 'src/shell/how.view.js']) assert.match(read(f), /audioTruthNode\(/, f);
  assert.doesNotMatch(read('src/shell/how.view.js'), /no synthetic voice files exist/i);
});

test('the sound bar and the banner mention the synthetic clips without a count', () => {
  assert.match(bannerText(summary, 'yes'), /synthetic voice that native speakers have not reviewed/);
  assert.doesNotMatch(bannerText({ recorded: 0, tts: 0 }, 'yes'), /synthetic/);
});
