// 12 Nov site check, lane 2: M-04/R-08 deploy-time asset check, M-05 sitemap, M-06 hold sets, plan #6 Torah chapter audio
// from verse clips, M-09 book completion (all 63 books), M-11 Siddur line coverage, R-12 one build stamp.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { N, tick, memStore } from './torahread.fakedom.js';

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => fs.readFileSync(path.join(R, rel), 'utf8');
const json = (rel) => JSON.parse(src(rel));
const { checkAssets, writeEvidence, AUDIO_LISTS, EVIDENCE_FILE } = await import('../tools/deploy/check-assets.mjs');
const { reconcileHoldSets, HOLD_SETS } = await import('../tools/audio/hold_sets.mjs');
const { buildSitemap, buildSitemapPlan, OPEN_ENDED } = await import('../tools/seo/build-sitemap.mjs');
const { ROUTES } = await import('../src/shell/router.js');
const { createAudio } = await import('../src/audio/player.js');
const { loadManifestFull } = await import('../tools/audio/manifest_io.mjs');
const { expandTorahHebrew } = await import('../src/shell/torah-he-index.js');

const tmpDirs = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-l2-')); tmpDirs.push(d); return d; };
test.after(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
const put = (root, rel, data) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof data === 'string' ? data : JSON.stringify(data)); };

// ---------- M-04: deploy-time asset check ----------
/** A small site: eight lists, one held clip, one plays-israeli row, one declared-missing row, one chirpHeld row, the clips on disk. */
function fixture({ skipFile = null, holds = ['audio/m/israeli/word/held.mp3'], extraRows = [], summary } = {}) {
  const root = tmp();
  const row = (p, o = {}) => ({ path: p, voice: 'm', tradition: 'israeli', kind: 'word', id: path.basename(p, '.mp3'), status: 'tts', ...o });
  const lists = {
    'data/audio/manifest.json': [row('audio/m/israeli/word/a.mp3', { chirpHeld: true }), row('audio/m/sephardi/word/a.mp3', { tradition: 'sephardi', status: 'plays-israeli', plays: 'audio/m/israeli/word/a.mp3' }), row('audio/m/israeli/word/gone.mp3', { status: 'missing' }), ...extraRows],
    'data/audio/manifest-kind-word.json': [row('audio/m/israeli/word/held.mp3')],
    'data/audio/manifest-words-israeli.json': [row('audio/m/israeli/word/b.mp3', { status: 'synthetic-unreviewed' })],
    'data/audio/manifest-words-sephardi.json': [],
    'data/audio/manifest-words-ashkenazi.json': [],
    'data/audio/manifest-torah.json': [row('audio/m/english/torah-chapter-en/torah-en-genesis-1.mp3', { tradition: 'english', kind: 'torah-chapter-en' })],
    'data/audio/manifest-torah-he.json': { schema: 'alef-torah-he/1', status: 'tts', verses: { m: { genesis: { 1: '1-2' } } } },
    'data/audio/manifest-book63.json': [row('audio/f/israeli/book/book63-p01.mp3', { voice: 'f', kind: 'book' })],
  };
  for (const [rel, data] of Object.entries(lists)) put(root, rel, data);
  put(root, 'data/lab/clip-holds.json', { paths: holds });
  const five = Object.keys(lists).slice(0, 5).flatMap((k) => lists[k]);
  put(root, 'data/audio/summary.json', summary || { total: five.length, playsIsraeli: five.filter((e) => e.status === 'plays-israeli').length });
  put(root, 'src/lib/counts.generated.js', 'export const BUILD = {"version":"9.9.9","builtAt":"2026-11-12T10:00:00Z"};\n');
  const files = [...Object.values(lists).filter(Array.isArray).flat().filter((e) => e.status !== 'missing' && e.status !== 'plays-israeli').map((e) => e.path),
    'audio/m/israeli/line/torah-genesis-1-1.mp3', 'audio/m/israeli/line/torah-genesis-1-2.mp3'];
  for (const f of files) if (f !== skipFile) put(root, f, 'x');
  return root;
}

test('M-04: the asset check reads all eight lists and passes a complete site; the evidence file names the build, counts, zero gaps and the time', async () => {
  assert.equal(AUDIO_LISTS.length, 8);
  for (const rel of AUDIO_LISTS) assert.ok(fs.existsSync(path.join(R, rel)), `${rel} is a real list`);
  const root = fixture();
  const now = new Date('2026-11-12T11:22:33.456Z');
  const r = await checkAssets({ root, now });
  assert.deepEqual(r.gaps, []);
  assert.equal(r.ok, true);
  assert.equal(Object.keys(r.report.lists).length, 8);
  assert.deepEqual(r.report.counts, { rows: 9, shouldPlay: 7, playsIsraeli: 1, declaredMissing: 1, held: 1, playsIsraeliTargetHeld: 0, chirpHeld: 1, alsoOnMediaHost: 0 });
  assert.equal(r.report.lists['manifest-torah-he.json'].rows, 2, 'the Torah verse index is expanded to one row per verse clip');
  const file = writeEvidence(r.report, root);
  assert.equal(file, path.join(root, EVIDENCE_FILE));
  const ev = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(ev.build, { version: '9.9.9', builtAt: '2026-11-12T10:00:00Z' });
  assert.equal(ev.gaps, 0); assert.equal(ev.checkedAt, '2026-11-12T11:22:33Z'); assert.equal(ev.filesChecked, true);
  assert.ok(fs.statSync(file).size < 2048, 'a small served file');
});

test('M-04: every kind of gap fails the check (exit 1) and writes no evidence', async () => {
  const cases = [
    [fixture({ skipFile: 'audio/m/israeli/word/b.mp3' }), /b\.mp3: no file at its path/],
    [fixture({ skipFile: 'audio/m/israeli/word/a.mp3' }), /plays target has no file: audio\/m\/israeli\/word\/a\.mp3/],
    [fixture({ skipFile: 'audio/m/israeli/word/held.mp3' }), /held clip has no file/],
    [fixture({ skipFile: 'audio/m/israeli/line/torah-genesis-1-2.mp3' }), /torah-genesis-1-2\.mp3: no file/],
    [fixture({ holds: ['audio/m/israeli/word/nowhere.mp3'] }), /clip-holds names .*nowhere\.mp3, which no audio list catalogues/],
    [fixture({ holds: ['audio/m/israeli/word/a.mp3'] }), /chirpHeld .* and in clip-holds/],
    [fixture({ extraRows: [{ path: 'audio/m/ashkenazi/word/z.mp3', voice: 'm', tradition: 'ashkenazi', kind: 'word', id: 'z', status: 'plays-israeli' }] }), /no plays target/],
    [fixture({ summary: { total: 99, playsIsraeli: 1 } }), /summary total 99/],
  ];
  for (const [root, re] of cases) {
    const r = await checkAssets({ root });
    assert.equal(r.ok, false);
    assert.ok(r.gaps.some((g) => re.test(`${g.path || ''}: ${g.why}`) || re.test(g.why)), `${re}: ${JSON.stringify(r.gaps)}`);
    const cli = spawnSync(process.execPath, [path.join(R, 'tools/deploy/check-assets.mjs'), '--root', root], { encoding: 'utf8' });
    assert.equal(cli.status, 1, cli.stdout + cli.stderr);
    assert.match(cli.stderr, /ASSET CHECK FAILED/);
    assert.equal(fs.existsSync(path.join(root, EVIDENCE_FILE)), false, 'a failed check writes no evidence');
  }
  const ok = spawnSync(process.execPath, [path.join(R, 'tools/deploy/check-assets.mjs'), '--root', fixture()], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr); assert.match(ok.stdout, /0 gaps/);
});

test('M-04: the real lists pass the list-only check (this checkout may have no audio folder); a list-only run writes no evidence', async () => {
  const r = await checkAssets({ files: false });
  assert.deepEqual(r.gaps, []);
  assert.equal(r.report.filesChecked, false);
  assert.equal(r.report.counts.held, json('data/lab/clip-holds.json').paths.length);
  assert.equal(r.report.counts.rows, AUDIO_LISTS.reduce((s, rel) => s + (rel.endsWith('torah-he.json') ? expandTorahHebrew(json(rel)).length : json(rel).length), 0));
  const cli = spawnSync(process.execPath, [path.join(R, 'tools/deploy/check-assets.mjs'), '--no-files'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /lists only, no file check/);
  assert.doesNotMatch(cli.stdout, /wrote/);
});

test('M-04: wired into CI and the release build (a gap stops the stamp); audit/ ships; Render runs the check as its build command', () => {
  assert.match(src('.github/workflows/ci.yml'), /node tools\/deploy\/check-assets\.mjs/);
  const pre = src('tools/build-precache.mjs');
  const gate = pre.indexOf('checkAssets('), stamp = pre.indexOf('writeCounts({ force: release })');
  assert.ok(gate > 0 && stamp > gate, 'the check runs before the stamp moves');
  assert.match(pre, /if \(checked && !checked\.ok\)[\s\S]{0,200}process\.exit\(1\)/);
  assert.match(pre, /writeEvidence\(\{ \.\.\.checked\.report, build: c\.build \}\)/, 'the evidence names the new stamp');
  return import('../tools/deploy/make-dist.mjs').then(({ EXTRAS }) => {
    assert.ok(EXTRAS.some(([p]) => p === 'audit/asset-check.json'));
    assert.match(src('tools/build-static.mjs'), /audit\/asset-check\.json/);
    const road = src('docs/plan/ROAD-TO-950.md');
    assert.match(road, /How Render Would Run It/);
    assert.match(road, /Build Command to `node tools\/deploy\/check-assets\.mjs`/);
    // Owner approved on 12 Nov 2026 ("yes deploy"): Render runs the check as its build command, so a gap fails the deploy there too.
    assert.match(src('render.yaml'), /buildCommand: node tools\/deploy\/check-assets\.mjs/);
  });
});

// ---------- R-12: one build stamp, moved by every release ----------
test('R-12: npm run release stamps, rebuilds the precache, writes the docs and runs the asset check', () => {
  const rel = json('package.json').scripts.release;
  assert.match(rel, /node tools\/build-precache\.mjs --stamp/);
  assert.match(rel, /build-sitemap\.mjs/);
  assert.match(rel, /coverage\.mjs --write/);
  assert.match(src('tools/build-precache.mjs'), /const release = process\.argv\.includes\('--stamp'\);[\s\S]*checkAssets/);
});

test('R-12: the About build line and the alef-build meta read the same stamp', async () => {
  const { BUILD, buildStamp } = await import('../src/lib/counts.js');
  const meta = /<meta name="alef-build" content="([^"]+)">/.exec(src('index.html'));
  assert.ok(meta, 'index.html carries the meta');
  assert.equal(meta[1], `${BUILD.version} ${BUILD.builtAt}`, 'index.html and src/lib/counts.generated.js name one build');
  const about = src('src/shell/about.view.js');
  assert.match(about, /'data-built': BUILD\.builtAt \}, buildStamp\(\)/, 'About shows BUILD through buildStamp');
  assert.equal(buildStamp(BUILD), `Version ${BUILD.version}, built ${BUILD.builtAt.replace('T', ' ').replace(/:\d\dZ$/, ' UTC')}`);
  const { stampAgrees } = await import('../tools/counts/build-counts.mjs');
  assert.equal(stampAgrees(), true);
});

test('R-12: a release stamp moves the build time and keeps index.html in step; a plain rebuild keeps it', async () => {
  const { writeCounts, stampAgrees, check } = await import('../tools/counts/build-counts.mjs');
  const root = tmp();
  fs.symlinkSync(path.join(R, 'data'), path.join(root, 'data'));
  put(root, 'package.json', { version: '0.1.0' });
  put(root, 'index.html', '<head>\n  <meta charset="utf-8">\n</head>');
  const a = await writeCounts({ root, now: new Date('2026-11-01T00:00:00Z') });
  const b = await writeCounts({ root, now: new Date('2026-11-02T00:00:00Z') });
  assert.equal(b.build.builtAt, a.build.builtAt, 'a plain rebuild is reproducible');
  const c = await writeCounts({ root, now: new Date('2026-11-03T04:05:06Z'), force: true });
  assert.equal(c.build.builtAt, '2026-11-03T04:05:06Z', 'the release stamp moves');
  assert.ok(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('content="0.1.0 2026-11-03T04:05:06Z"'));
  assert.equal(stampAgrees(root), true);
  assert.equal(await check(root), true);
  put(root, 'index.html', '<head>\n  <meta charset="utf-8">\n  <meta name="alef-build" content="0.1.0 2026-11-01T00:00:00Z">\n</head>');
  assert.equal(stampAgrees(root), false, 'a meta that names another build is caught');
  assert.equal(await check(root), false, 'build-counts --check fails on it');
});

// ---------- M-05: sitemap ----------
test('M-05: sitemap.xml lists every route without a parameter, every game, and the finite parameterised routes from data', async () => {
  const xml = src('sitemap.xml');
  assert.equal(xml, await buildSitemap(), 'stale: run node tools/seo/build-sitemap.mjs');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://alef-review.onrender.com/', '').replace(/^#/, '') || '/');
  const set = new Set(locs);
  assert.equal(set.size, locs.length, 'no duplicates');
  for (const r of ROUTES) if (!r.pattern.includes(':')) assert.ok(set.has(r.pattern), r.pattern);
  const games = ROUTES.filter((r) => /^\/(hanukkah-|tg-|g[1-5]-)/.test(r.pattern));
  assert.ok(games.length >= 100, `${games.length} game routes`);
  for (const g of games) assert.ok(set.has(g.pattern), g.pattern);
  for (const b of json('data/books/index.json').books) assert.ok(set.has(`/book/${b.id}`), b.id);
  for (const l of json('data/letters/letters.json')) assert.ok(set.has(`/letters/${l.id}`), l.id);
  // every listed URL is a route the router knows
  const res = ROUTES.map((r) => new RegExp('^' + r.pattern.replace(/:[A-Za-z]+/g, '[^/]+') + '$'));
  for (const p of locs) assert.ok(res.some((re) => re.test(p)), `not a router pattern: ${p}`);
  const { report } = await buildSitemapPlan();
  assert.equal(report.routes, ROUTES.length);
  assert.deepEqual(report.failed, [], 'every finite parameterised route is enumerated');
  assert.deepEqual(report.openEnded, Object.keys(OPEN_ENDED));
  assert.equal(report.patternsListed, ROUTES.length - report.openEnded.length);
});

// ---------- M-06: the three hold sets ----------
const allRows = () => [...AUDIO_LISTS.filter((r) => !r.endsWith('torah-he.json')).flatMap((rel) => json(rel)), ...expandTorahHebrew(json('data/audio/manifest-torah-he.json'))];

test('M-06: clip-holds, plays-israeli and chirpHeld do not contradict one another in the shipped data', () => {
  const rows = allRows(), holds = json('data/lab/clip-holds.json').paths;
  const r = reconcileHoldSets(rows, holds);
  assert.deepEqual(r.problems, []);
  assert.equal(r.counts.chirpHeld, rows.filter((e) => e.chirpHeld).length);
  assert.equal(r.counts.chirpHeldAndHeld, 0, 'a chirpHeld clip plays, so it is never withheld too');
  assert.equal(r.counts.clipHolds, holds.length);
  assert.equal(r.counts.playsIsraeli, rows.filter((e) => e.status === 'plays-israeli').length);
  for (const k of ['clipHolds', 'playsIsraeli', 'chirpHeld']) assert.ok(HOLD_SETS[k]);
  assert.match(HOLD_SETS.chirpHeld, /current clip plays/);
  assert.match(HOLD_SETS.clipHolds, /Withheld from playback/);
});

test('M-06: each contradiction between the sets is named', () => {
  const own = (p, o = {}) => ({ path: p, voice: 'm', tradition: 'israeli', kind: 'word', id: p, status: 'tts', ...o });
  const pi = (p, plays, o = {}) => ({ path: p, voice: 'm', tradition: 'sephardi', kind: 'word', id: p, status: 'plays-israeli', plays, ...o });
  const cases = [
    [[own('a', { chirpHeld: true })], ['a'], /chirpHeld \(the current clip plays\) and in clip-holds/],
    [[own('a', { status: 'missing', chirpHeld: true })], [], /chirpHeld on a row with no clip of its own/],
    [[own('a'), pi('b', 'a', { chirpHeld: true })], [], /chirpHeld on a row with no clip of its own/],
    [[own('a'), pi('b', 'a')], ['b'], /plays-israeli row has no file of its own to hold/],
    [[pi('b', 'zzz')], [], /which no audio list catalogues/],
    [[own('a', { voice: 'f' }), pi('b', 'a')], [], /not a present Israeli clip of the same voice/],
    [[own('a', { status: 'missing' })], ['a'], /no clip of its own \(status missing\)/],
  ];
  for (const [rows, holds, re] of cases) assert.ok(reconcileHoldSets(rows, holds).problems.some((p) => re.test(p)), String(re));
  const fine = reconcileHoldSets([own('a'), pi('b', 'a')], ['a']);
  assert.deepEqual(fine.problems, []);
  assert.equal(fine.counts.playsIsraeliTargetHeld, 1, 'a fallback to a held clip is withheld with it, and counted');
});

test('M-06: the player reports chirpHeld as information and still plays the clip; clip-holds still withholds', () => {
  const rows = [
    { path: 'audio/m/israeli/prayer/p.mp3', voice: 'm', tradition: 'israeli', kind: 'prayer', id: 'p', status: 'tts', text: 'א', chirpHeld: true },
    { path: 'audio/m/israeli/prayer/q.mp3', voice: 'm', tradition: 'israeli', kind: 'prayer', id: 'q', status: 'tts', text: 'ב' },
  ];
  const audio = createAudio({ settings: { voice: 'm', congregation: 'israeli' }, manifest: rows, AudioCtor: class {}, speech: null });
  const p = audio.status('prayer', 'p');
  assert.equal(p.source, 'file'); assert.equal(p.chirpHeld, true); assert.equal(p.held, undefined);
  assert.equal(audio.status('prayer', 'q').chirpHeld, undefined);
  audio.setHeld(['audio/m/israeli/prayer/q.mp3']);
  assert.equal(audio.status('prayer', 'q').held, true);
  assert.notEqual(audio.status('prayer', 'q').source, 'file');
  // the real manifest: every chirpHeld row's clip is the one the player plays
  const full = loadManifestFull(R);
  const real = createAudio({ settings: { voice: 'm', congregation: 'israeli' }, manifest: full, AudioCtor: class {}, speech: null, held: json('data/lab/clip-holds.json').paths });
  const flagged = full.filter((e) => e.chirpHeld);
  assert.ok(flagged.length > 0);
  for (const e of flagged) { const s = real.status(e.kind, e.id, { voice: e.voice, tradition: e.tradition }); assert.equal(s.path, e.path, e.path); assert.equal(s.chirpHeld, true); }
});

test('M-06: the coverage report shows the three sets and their counts', async () => {
  const md = src('docs/voices/coverage.md');
  assert.match(md, /## Hold sets/);
  assert.match(md, /chirpHeld: \d+ rows\. A Chirp re-take was held; the current clip plays/);
  assert.match(md, /The three sets do not contradict one another/);
});

// ---------- plan #6: Torah chapter audio from the verse clips ----------
const { mount: mountTorah } = await import('../src/torahreader/torahreader.view.js');
function controlledAudio() {
  const calls = [], pending = [];
  let stops = 0;
  return {
    calls, pending, get stops() { return stops; },
    play: (k, i, o) => new Promise((resolve) => { calls.push([k, i, o]); pending.push(resolve); }),
    stop() { stops++; while (pending.length) pending.shift()({ stopped: true }); },
    next() { const r = pending.shift(); if (r) r({ source: 'file', entryStatus: 'tts' }); },
  };
}
async function torahAt({ verses = null, audio, extra = [] } = {}) {
  const ch = JSON.parse(src('data/corpus/torah/genesis/01.json'));
  const ns = verses || ch.verses.map((v) => v.n);
  const manifest = [...ns.map((n) => ({ kind: 'line', id: `torah-genesis-1-${n}`, voice: 'm', tradition: 'israeli', status: 'tts' })), ...extra];
  const loadJson = async (rel) => (rel === 'data/audio/manifest-torah.json' ? manifest : rel === 'data/audio/manifest-torah-he.json' ? {} : JSON.parse(src(rel)));
  const root = new N('div'), store = memStore();
  store.m['torahreader.v1'] = { screen: 'chapter', book: 'genesis', chapter: 1, audioLang: 'he' };
  const ctx = { store, settings: { get: (k) => (k === 'congregation' ? 'israeli' : k === 'voice' ? 'm' : undefined) }, audio, loadJson, query: { book: 'genesis', chapter: '1' },
    clock: { setInterval: () => 0, clearInterval() {} } };
  const un = mountTorah(root, ctx); await un.ready;
  return { root, un, total: ch.verses.length };
}
const q1 = (root, s) => root.queryAll(s)[0];
const playingVerse = (root) => root.queryAll('[data-torah-verse]').filter((r) => / trd-playing/.test(r.className)).map((r) => r.attrs['data-torah-verse']);

test('plan #6: Play chapter plays the verse clips in order, highlighting the verse, with the per-verse buttons still there', async () => {
  const audio = controlledAudio();
  const { root, total } = await torahAt({ audio });
  const btn = q1(root, '.trd-play-verses');
  assert.ok(btn, 'Play chapter is offered from the verse clips');
  assert.equal(btn.textContent, 'Play chapter');
  assert.equal(root.queryAll('.trd-audio-wait').length, 0, 'no "not ready" message when every verse has a clip');
  assert.equal(root.queryAll('.trd-hear-verse').length, total, 'the per-verse Hear buttons stay');
  btn.click(); await tick(5);
  assert.deepEqual(audio.calls[0].slice(0, 2), ['line', 'torah-genesis-1-1']);
  assert.equal(audio.calls[0][2].tradition, 'israeli');
  assert.deepEqual(playingVerse(root), ['1']);
  assert.equal(btn.textContent, 'Pause');
  audio.next(); await tick(5);
  assert.deepEqual(audio.calls[1].slice(0, 2), ['line', 'torah-genesis-1-2']);
  assert.deepEqual(playingVerse(root), ['2']);
  for (let i = 2; i < total; i++) { audio.next(); await tick(2); }
  assert.equal(audio.calls.length, total, 'every verse once, no new files');
  assert.ok(audio.calls.every(([k, id], i) => k === 'line' && id === `torah-genesis-1-${i + 1}`));
  audio.next(); await tick(5);
  assert.deepEqual(playingVerse(root), [], 'the highlight clears at the end');
  assert.match(q1(root, '.trd-status').textContent, new RegExp(`Genesis 1 finished: ${total} verses`));
  assert.equal(btn.textContent, 'Play chapter');
});

test('plan #6: Pause keeps the place and Resume carries on from it; Stop ends it', async () => {
  const audio = controlledAudio();
  const { root } = await torahAt({ audio });
  const btn = q1(root, '.trd-play-verses');
  btn.click(); await tick(5); audio.next(); await tick(5);
  assert.equal(audio.calls.at(-1)[1], 'torah-genesis-1-2');
  const stopsBefore = audio.stops;
  btn.click(); await tick(5);
  assert.ok(audio.stops > stopsBefore, 'Pause stops the voice');
  assert.equal(btn.textContent, 'Resume chapter');
  assert.match(q1(root, '.trd-status').textContent, /Paused at Genesis 1:2/);
  const n = audio.calls.length;
  await tick(10);
  assert.equal(audio.calls.length, n, 'nothing plays while paused');
  btn.click(); await tick(5);
  assert.equal(audio.calls.at(-1)[1], 'torah-genesis-1-2', 'resumes at the paused verse');
  q1(root, '.trd-stop-chapter').click(); await tick(5);
  assert.equal(btn.textContent, 'Play chapter');
  assert.deepEqual(playingVerse(root), []);
  btn.click(); await tick(5);
  assert.equal(audio.calls.at(-1)[1], 'torah-genesis-1-1', 'after Stop, Play chapter starts again from the first verse');
});

test('plan #6: leaving the chapter, the screen or the route stops the chapter voice', async () => {
  for (const leave of ['next', 'home', 'unmount', 'verse']) {
    const audio = controlledAudio();
    const { root, un } = await torahAt({ audio });
    q1(root, '.trd-play-verses').click(); await tick(5);
    const stops = audio.stops, n = audio.calls.length;
    if (leave === 'next') await q1(root, '.trd-next-ch').click();
    else if (leave === 'home') await q1(root, '.trd-home-btn').click();
    else if (leave === 'verse') { q1(root, '.trd-hear-verse').click(); await tick(5); }
    else un();
    await tick(5);
    assert.ok(audio.stops > stops, `${leave}: the voice is stopped`);
    audio.next(); await tick(5);
    const chapterCalls = audio.calls.slice(n).filter(([, id]) => /^torah-genesis-1-/.test(id));
    assert.ok(leave === 'verse' ? chapterCalls.length <= 1 : chapterCalls.length === 0, `${leave}: the chapter does not carry on (${JSON.stringify(chapterCalls)})`);
  }
});

test('plan #6: "not ready" appears only when verse clips are missing', async () => {
  const some = await torahAt({ verses: [1, 2, 3], audio: controlledAudio() });
  assert.ok(q1(some.root, '.trd-play-verses'), 'the verses that have clips still play');
  const wait = q1(some.root, '.trd-audio-wait');
  assert.equal(wait.attrs['data-missing-verses'], String(some.total - 3));
  assert.match(wait.textContent, new RegExp(`${some.total - 3} of ${some.total} verses .* not ready yet; Play chapter skips them`));
  // no Hebrew verse clips at all, but an English chapter recording: the Hebrew choice says not ready
  const none = await torahAt({ verses: [], audio: controlledAudio(), extra: [{ kind: 'torah-chapter-en', id: 'torah-en-genesis-1', voice: 'm', tradition: 'english', status: 'tts', path: 'audio/x.mp3' }] });
  assert.equal(none.root.queryAll('.trd-play-verses').length, 0);
  assert.match(q1(none.root, '.trd-audio-wait').textContent, /Hebrew audio in Ari’s voice is not ready for this chapter yet/);
});

// ---------- M-09: book completion, all 63 books ----------
class B extends N {
  constructor(tag) { super(tag); const self = this; this.classList = { add: (c) => { self.className = `${self.className} ${c}`.trim(); }, remove: () => {} }; this.isConnected = true; }
  querySelectorAll(s) { return this.queryAll(s); }
  removeAttribute(k) { delete this.attrs[k]; }
  pause() {} load() {} play() { return Promise.resolve(); }
  replaceWith() {}
}
const { mount: mountBook } = await import('../src/books/book.view.js');
const { storyCheck } = await import('../src/books/check.js');

async function openBook(id) {
  const prev = globalThis.document.createElement;
  globalThis.document.createElement = (t) => new B(t);
  try {
    const root = new B('div'), store = memStore();
    const fetchFn = async (url) => ({ ok: true, json: async () => JSON.parse(src(url)) });
    await mountBook(root, { params: { id }, store, fetchFn });
    return { root, store };
  } finally { globalThis.document.createElement = prev; }
}
const withB = async (f) => { const prev = globalThis.document.createElement; globalThis.document.createElement = (t) => new B(t); try { return await f(); } finally { globalThis.document.createElement = prev; } };

test('M-09: in every one of the 63 books, a wrong answer to the story question does not finish the book and the right one does', async () => {
  const books = json('data/books/index.json').books;
  assert.equal(books.length, 63);
  let withCheck = 0;
  for (const { id } of books) {
    const book = json(`data/books/${id}.json`), check = storyCheck(book);
    const { root, store } = await openBook(id);
    const dots = root.queryAll('.book-dot');
    assert.equal(dots.length, book.pages.length, id);
    await withB(() => dots.at(-1).click()); await tick(2);
    const finished = () => !!(store.m['books.v1']?.[id]?.finishedAt) || !!(store.m['books.finished.v1']?.[id]);
    if (!check) { assert.ok(finished(), `${id}: no question, so the last page finishes it`); continue; }
    withCheck++;
    assert.equal(finished(), false, `${id}: reaching the last page alone does not finish a book with a question`);
    assert.ok(store.m['books.v1'][id].reachedEndAt, `${id}: the last page is recorded as reached`);
    const opts = root.queryAll('.book-check-option');
    assert.equal(opts.length, 3, id);
    const right = check.options.findIndex((o) => o.correct);
    for (let i = 0; i < 3; i++) {
      if (i === right) continue;
      await withB(() => opts[i].click()); await tick(1);
      assert.equal(finished(), false, `${id}: a wrong answer does not finish the book`);
      assert.equal(root.queryAll('.book-finished').length, 0, `${id}: no "You finished" after a wrong answer`);
    }
    // leave and come back: still not finished, the question is asked again
    await withB(() => root.queryAll('.book-dot')[0].click()); await tick(1);
    await withB(() => root.queryAll('.book-dot').at(-1).click()); await tick(1);
    assert.equal(finished(), false, `${id}: still not finished after leaving the last page`);
    const again = root.queryAll('.book-check-option');
    assert.equal(again.length, 3, `${id}: the question is asked again`);
    await withB(() => again[right].click()); await tick(2);
    assert.ok(finished(), `${id}: the right answer finishes the book`);
    assert.ok(store.m['books.v1'][id].checkedAt, `${id}: the check is recorded`);
    assert.match(root.queryAll('.book-finished')[0].textContent, /You finished/);
  }
  assert.equal(withCheck, 63, 'every book has its one question');
});

// ---------- M-11: Siddur line coverage ----------
test('M-11: every service line Aleph holds has a playable clip, in both voices and all three traditions (measured from the manifest)', async () => {
  const { buildCards, audioCoverageAll, ORDER_IDS, TRADITIONS } = await import('../src/service/model.js');
  const orders = json('data/service/orders.json'), reg = json('data/corpus/registry.json');
  const byId = new Map((reg.entries || reg).map((e) => [e.id, e]));
  const manifest = loadManifestFull(R), held = json('data/lab/clip-holds.json').paths;
  for (const voice of ['m', 'f']) for (const t of TRADITIONS) {
    const audio = createAudio({ settings: { voice, congregation: t }, manifest, AudioCtor: class {}, speech: null, held });
    const all = audioCoverageAll(audio, orders, byId, ORDER_IDS, t);
    assert.ok(all.lines > 0);
    assert.equal(all.withClip, all.lines, `${voice}/${t}: ${all.withClip} of ${all.lines}`);
    assert.equal(all.pct, 100);
    // a line counted twice across services counts once
    const perOrder = ORDER_IDS.reduce((s, oid) => s + buildCards(orders, oid, byId, t).reduce((a, c) => a + c.he.length, 0), 0);
    assert.ok(perOrder >= all.lines);
  }
});

test('M-11: the coverage tab shows line coverage, rounded down, and a held clip is not counted', async () => {
  const { audioCoverageAll, audioCoverage, ORDER_IDS } = await import('../src/service/model.js');
  const two = { id: 'x', he: ['a', 'b', 'c'] };
  const fake = (ok) => ({ status: (k, id) => (ok(id) ? { source: 'file', path: id } : { source: 'none' }) });
  assert.deepEqual(audioCoverage(fake((id) => id !== 'x-l3'), [two], 'israeli'), { lines: 3, withClip: 2, pct: 66 }, 'rounded down (2 of 3 is 66%)');
  const { mount } = await import('../src/service/service.view.js');
  const manifest = loadManifestFull(R);
  const audio = createAudio({ settings: { voice: 'm', congregation: 'ashkenazi' }, manifest, AudioCtor: class {}, speech: null, held: json('data/lab/clip-holds.json').paths });
  const root = new N('div'), store = memStore();
  await mount(root, { store, settings: { get: (k) => (k === 'congregation' ? 'ashkenazi' : undefined) }, audio });
  const total = q1(root, '[data-sv-audio-total]');
  assert.ok(total, 'the coverage tab carries the line coverage');
  const [have, of] = total.attrs['data-sv-audio-total'].split('/').map(Number);
  assert.equal(have, of);
  assert.match(total.textContent, new RegExp(`^Line coverage: ${have} of the ${of} service lines Aleph holds have a clip you can play \\(100%\\), in a synthetic voice, Ashkenazi pronunciation\\.$`));
  // withhold one of those clips: it stops counting
  const orders = json('data/service/orders.json'), reg = json('data/corpus/registry.json');
  const byId = new Map((reg.entries || reg).map((e) => [e.id, e]));
  // withhold every clip that would play this line (a line can be covered by more than one clip, e.g. its own and a prayer clip)
  const one = audio.status('line', 'shema-1', { tradition: 'ashkenazi' });
  if (one.source === 'file') {
    const held = [];
    for (let k = 0; k < 5; k++) { const st = audio.status('line', 'shema-1', { tradition: 'ashkenazi' }); if (st.source !== 'file') break; held.push(st.path); audio.setHeld(held); }
    const covered = (kind) => audio.status(kind, 'shema-1', { tradition: 'ashkenazi' }).source === 'file';
    for (let k = 0; k < 5 && covered('prayer'); k++) { held.push(audio.status('prayer', 'shema-1', { tradition: 'ashkenazi' }).path); audio.setHeld(held); }
    const after = audioCoverageAll(audio, orders, byId, ORDER_IDS, 'ashkenazi');
    assert.equal(after.withClip, of - 1);
  }
});
