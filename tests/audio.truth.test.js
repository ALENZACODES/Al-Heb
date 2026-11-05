// The statement about audio (what the clips are, and are not) is tied to the shipped data: counts are read from
// data/audio/summary.json at run time, and the summary is checked against the manifests and the files on disk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { audioTruthLine, audioTruthDetail, audioTruthNode, loadAudioSummary, AUDIO_UNKNOWN } from '../src/shell/audio-truth.js';
import { readinessLines } from '../src/shell/readiness.js';
import { bannerText } from '../src/shell/audio-access.js';

const root = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const summary = json('data/audio/summary.json');
const SHARDS = ['israeli', 'sephardi', 'ashkenazi'].map((t) => `data/audio/manifest-words-${t}.json`);
const listOf = (m) => (Array.isArray(m) ? m : (m.entries || m.clips || Object.values(m)));
const all = [json('data/audio/manifest.json'), ...SHARDS.map(json)].flatMap(listOf);

test('summary.json matches the manifests: total, recorded and synthetic counts', () => {
  assert.equal(summary.total, all.length);
  assert.equal(summary.recorded, all.filter((e) => e.status === 'recorded').length);
  assert.equal(summary.tts, all.filter((e) => ['tts', 'synthetic-unreviewed', 'synthetic-reviewed'].includes(e.status)).length);
});

test('"unreviewed" and "no recorded teacher" hold in the data: every synthetic clip is synthetic-unreviewed, none is recorded', () => {
  const syn = all.filter((e) => e.status !== 'missing');
  assert.ok(syn.length > 0);
  for (const e of syn) assert.equal(e.status, 'synthetic-unreviewed', `${e.kind}/${e.id}: a clip changed review state; update the audio wording (src/shell/audio-truth.js) and the docs`);
  assert.equal(all.filter((e) => e.status === 'recorded').length, 0, 'a human recording exists: rewrite the audio statement');
  assert.match(read('docs/review/STATUS.md'), /\*\*Reviewed: 0 of \d+ rows\.\*\*/);
});

test('every counted clip has its mp3 on disk, and there is no mp3 the summary does not count', () => {
  const files = [];
  const walk = (d) => { for (const n of readdirSync(join(root, d))) { const p = `${d}/${n}`; if (statSync(join(root, p)).isDirectory()) walk(p); else if (n.endsWith('.mp3')) files.push(p); } };
  walk('audio');
  assert.equal(files.length, summary.tts);
  for (const e of all.filter((x) => x.status !== 'missing')) assert.ok(existsSync(join(root, e.path || e.file || e.src || '')) || files.some((f) => f.endsWith(`/${e.id}.mp3`)), `${e.id}: file missing`);
});

test('the statement: exact wording, count read from the summary', () => {
  assert.equal(audioTruthLine(summary), `${summary.tts.toLocaleString('en-US')} short word clips with a synthetic voice, unreviewed by native speakers; no recorded teacher; the rest of the app uses your device voice when it has a Hebrew voice.`);
  assert.equal(audioTruthLine({ total: 10, recorded: 0, tts: 3 }), '3 short word clips with a synthetic voice, unreviewed by native speakers; no recorded teacher; the rest of the app uses your device voice when it has a Hebrew voice.');
  assert.match(audioTruthLine({ total: 10, recorded: 0, tts: 1 }), /^1 short word clip with /);
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
  assert.match(a, /^Audio: not ready\. 7 short word clips with a synthetic voice/); assert.match(a, /7 of 1,234 planned clips exist, and none is a person recording/);
  const b = readinessLines({ audio: { total: 99, recorded: 0, tts: 2 } }).find((l) => l.id === 'audio').text;
  assert.match(b, /^Audio: not ready\. 2 short word clips/); assert.match(b, /2 of 99 planned/); assert.doesNotMatch(b, /\b7\b|1,234/);
  const c = readinessLines({ audio: summary }).find((l) => l.id === 'audio').text;
  assert.ok(c.includes(summary.total.toLocaleString('en-US')) && c.includes(`${summary.tts.toLocaleString('en-US')} short word clips`));
  assert.match(readinessLines({}).find((l) => l.id === 'audio').text, /could not be checked right now/);
});

test('no source file types the clip count into a sentence', () => {
  const bad = [];
  const walk = (d) => { for (const n of readdirSync(join(root, d))) { const p = `${d}/${n}`; if (statSync(join(root, p)).isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(n)) { const t = read(p); if (new RegExp(`\\b${summary.tts}\\b[^.\\n]{0,40}(short )?(word )?clips?`, 'i').test(t) || new RegExp(`\\b${summary.tts} (synthetic|short)`).test(t)) bad.push(p); } } };
  walk('src');
  assert.deepEqual(bad, []);
});

test('audioTruthNode: drawn with no number, then filled from the fetched summary; a failed fetch keeps the no-number wording', async () => {
  const h = (tag, attrs = {}, ...kids) => ({ tag, attrs, textContent: kids.join('') });
  const ok = async (u) => { assert.equal(u, 'data/audio/summary.json'); return { ok: true, json: async () => ({ total: 50, recorded: 0, tts: 4 }) }; };
  const n = audioTruthNode(h, { fetchFn: ok });
  assert.match(n.textContent, /could not be checked right now/); assert.doesNotMatch(n.textContent, /\d/);
  await new Promise((r) => setTimeout(r, 0));
  assert.match(n.textContent, /^Sound: 4 short word clips with a synthetic voice, unreviewed by native speakers; no recorded teacher; the rest of the app uses your device voice when it has a Hebrew voice\./);
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
