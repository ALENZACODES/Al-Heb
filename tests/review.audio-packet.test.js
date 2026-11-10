// Tests for the audio listening packet (build_audio_packet.mjs) and the returned-answers importer (import_audio_review.mjs).
// All on a small FAKE repo built in a temp dir; the real audio and manifest are never touched. The Hebrew in the fixtures is
// written as code points (placeholder words); no sound is played here, so nothing below says a clip sounds right.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { collectClips, glossIndex, readAnswerCsv, normVerdict, SHEET_COLUMNS, VERDICT_VALUES } from '../tools/review/audio_packet_lib.mjs';
import { buildPage, buildSheetCsv, buildZip, crc32, zipFiles, main as buildMain } from '../tools/review/build_audio_packet.mjs';
import { analyse, patchOf, reportMd, main as importMain } from '../tools/review/import_audio_review.mjs';

const H = {
  a: 'אָב', // placeholder pointed words
  b: 'בַּיִת',
  c: 'גָּמָל',
  d: 'דֶּרֶךְ',
  e: 'הֵן',
  f: 'וָו',
};
const sha = (b) => createHash('sha256').update(b).digest('hex');
const entry = (voice, id, text, status, group = 'vocab-word') => ({ path: `audio/${voice}/israeli/word/${id}.mp3`, voice, tradition: 'israeli', kind: 'word', id, text, status, source: status === 'missing' ? 'none' : 'outside-synthetic', group });

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-audio-packet-'));
  const w = (rel, data) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
  const clips = {
    'il01-w1': ['m', H.a, 'synthetic-unreviewed'], // gloss from a lesson word
    'greet-01': ['m', H.b, 'synthetic-unreviewed'], // gloss from the phrasebook
    'h0000001': ['m', H.c, 'synthetic-unreviewed'], // gloss from the donor script csv
    'h0000002': ['m', H.d, 'synthetic-unreviewed'], // gloss from vocab words
    'h0000003': ['m', H.e, 'synthetic-unreviewed'], // no gloss anywhere
    'h0000004': ['m', H.f, 'synthetic-reviewed'], // already reviewed: not in the packet
    'h0000005': ['m', H.a, 'synthetic-unreviewed'], // file missing: left out
    'h0000006': ['f', H.a, 'missing'],
  };
  const manifest = [];
  for (const [id, [v, t, st]] of Object.entries(clips)) {
    manifest.push(entry(v, id, t, st, id.startsWith('il') ? 'lesson-word' : id.startsWith('greet') ? 'phrasebook' : 'vocab-word'));
    if (st !== 'missing' && id !== 'h0000005') w(`audio/${v}/israeli/word/${id}.mp3`, Buffer.from(`fake-mp3-${id}`));
  }
  w('data/audio/manifest.json', JSON.stringify(manifest, null, 1));
  w('data/curriculum/lessons.json', JSON.stringify({ lessons: [{ id: 'il01', track: 'israel', words: [{ he: H.a, en: 'gloss-lesson' }] }] }));
  w('data/corpus/phrasebook.json', JSON.stringify({ entries: [{ id: 'greet-01', he: H.b, en: 'gloss-phrasebook' }] }));
  w('docs/voices/recording-script-israeli.csv', `order,id,pointed_hebrew,gloss\n1,h0000001,${H.c},"gloss, from csv"\n`);
  w('data/vocab/words.json', JSON.stringify({ words: [{ id: 'h0000002', he: H.d, en: 'gloss-vocab' }] }));
  return root;
}
const tree = (root) => {
  const out = {};
  const walk = (d) => { for (const n of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, n.name); n.isDirectory() ? walk(p) : (out[path.relative(root, p)] = sha(fs.readFileSync(p))); } };
  walk(root); return out;
};

test('collectClips: only synthetic-unreviewed clips whose file exists; gloss comes from repo data', () => {
  const root = makeRepo();
  const { clips, missing, glossMissing } = collectClips(root);
  assert.deepEqual(clips.map((c) => c.id), ['greet-01', 'h0000001', 'h0000002', 'h0000003', 'il01-w1']);
  assert.deepEqual(missing, ['h0000005']);
  assert.deepEqual(glossMissing, ['h0000003']);
  const g = Object.fromEntries(clips.map((c) => [c.id, c.gloss]));
  assert.equal(g['il01-w1'], 'gloss-lesson'); assert.equal(g['greet-01'], 'gloss-phrasebook');
  assert.equal(g['h0000001'], 'gloss, from csv'); assert.equal(g['h0000002'], 'gloss-vocab');
  for (const c of clips) { assert.equal(c.sha256, sha(Buffer.from(`fake-mp3-${c.id}`))); assert.equal(c.tradition, 'Israeli'); }
  assert.ok(glossIndex(root).size >= 4);
});

test('collectClips refuses an id that exists for two voices (the packet keys on id)', () => {
  const root = makeRepo();
  const mp = path.join(root, 'data/audio/manifest.json');
  const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
  m.push(entry('f', 'h0000001', H.c, 'synthetic-unreviewed'));
  fs.writeFileSync(mp, JSON.stringify(m));
  fs.mkdirSync(path.join(root, 'audio/f/israeli/word'), { recursive: true });
  fs.writeFileSync(path.join(root, 'audio/f/israeli/word/h0000001.mp3'), 'x');
  assert.throws(() => collectClips(root), /more than one voice/);
});

test('listen sheet: one row per clip, Hebrew exactly the manifest text, reviewer columns empty', () => {
  const root = makeRepo();
  const { clips } = collectClips(root);
  const { header, records } = readAnswerCsv(buildSheetCsv(clips));
  assert.deepEqual(header, SHEET_COLUMNS);
  assert.equal(records.length, clips.length);
  const man = new Map(JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8')).map((e) => [e.id, e]));
  for (const r of records) {
    assert.equal(r.hebrew, man.get(r.id).text);
    assert.equal(r.file, man.get(r.id).path);
    for (const c of ['verdict', 'issues', 'accent_heard', 'note', 'reviewer_name', 'reviewer_role', 'review_date']) assert.equal(r[c], '');
  }
  assert.ok(buildSheetCsv(clips).startsWith('﻿'));
});

test('page: offline, relative audio, RTL Hebrew, labelled controls, no copy of any mp3', () => {
  const root = makeRepo();
  const { clips } = collectClips(root);
  const out = path.join(root, 'docs/review/audio-packet');
  const html = buildPage(clips, '../../../audio');
  assert.ok(/<html lang="en">/.test(html));
  assert.doesNotMatch(html, /https?:\/\//, 'no absolute URL of any kind');
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|<link |@import|<iframe|<img /);
  const srcs = [...html.matchAll(/<audio[^>]* src="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(srcs.length, clips.length);
  for (const [i, s] of srcs.entries()) { assert.doesNotMatch(s, /^(\/|[a-z]+:)/i); assert.ok(fs.existsSync(path.resolve(out, s)), s); assert.equal(path.resolve(out, s), path.join(root, clips[i].file)); }
  assert.equal([...html.matchAll(/class="he" lang="he" dir="rtl">([^<]*)</g)].map((m) => m[1]).join('|'), clips.map((c) => c.hebrew).join('|'));
  // every radio sits inside a fieldset with a legend and is wrapped by a label with text; every form control has a label
  assert.equal((html.match(/type="radio"/g) || []).length, clips.length * VERDICT_VALUES.length);
  for (const f of html.split('<fieldset>').slice(1)) assert.match(f.slice(0, 80), /^<legend>/);
  assert.equal((html.match(/<fieldset>/g) || []).length, (html.match(/<\/fieldset>/g) || []).length);
  for (const m of html.matchAll(/<(?:select|textarea|input type="(?:text|date)")[^>]* id="([^"]+)"/g)) if (m[1] !== 'csv-text') assert.match(html, new RegExp(`<label for="${m[1]}"`), m[1]);
  assert.match(html, /id="status" role="status" aria-live="polite"/);
  assert.match(html, /class="skip"/);
  assert.match(html, /<title>[^<]+<\/title>/);
  // ids are unique
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  // building does not put an mp3 anywhere under docs/
  buildMain(['--root', root]);
  assert.deepEqual(fs.readdirSync(out).sort(), ['listen-sheet.csv', 'listen.html']);
});

test('page scripts parse, and the export CSV round-trips awkward notes', () => {
  const root = makeRepo();
  const { clips } = collectClips(root);
  const html = buildPage(clips, 'audio');
  const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
  const page = html.match(/<script id="page">([\s\S]*?)<\/script>/)[1];
  new vm.Script(page); // syntax only
  const ctx = {}; vm.createContext(ctx); vm.runInContext(core, ctx);
  const C = vm.runInContext('AlefCore', ctx);
  assert.deepEqual([...C.COLUMNS], SHEET_COLUMNS);
  const row = Object.fromEntries(SHEET_COLUMNS.map((c) => [c, '']));
  Object.assign(row, { id: 'x1', hebrew: H.a, verdict: 'reject', issues: 'wrong-word;unclear', note: 'said "ab", not\nab, with comma', reviewer_name: 'A, B' });
  const csv = C.buildCsv([row, { ...row, id: 'x2', verdict: '' }]);
  assert.ok(csv.startsWith('﻿') && csv.includes('\r\n'));
  const { records } = readAnswerCsv(csv);
  assert.equal(records[0].note, 'said "ab", not\nab, with comma'); assert.equal(records[0].reviewer_name, 'A, B'); assert.equal(records[0].hebrew, H.a);
  assert.deepEqual({ ...C.progress([row, { ...row, verdict: '' }]) }, { marked: 1, total: 2 });
  // the packet id changes when a clip file changes
  const other = clips.map((c, i) => (i ? c : { ...c, sha256: 'f'.repeat(64) }));
  assert.notEqual(buildPage(other, 'audio').match(/data-packet="(\w+)"/)[1], html.match(/data-packet="(\w+)"/)[1]);
});

function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const out = {};
  for (let i = 0; i < n; i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50);
    const crc = buf.readUInt32LE(p + 16), size = buf.readUInt32LE(p + 24), nl = buf.readUInt16LE(p + 28), off = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nl).toString('utf8');
    assert.equal(buf.readUInt32LE(off), 0x04034b50);
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const data = buf.subarray(start, start + size);
    assert.equal(crc32(data), crc, name);
    out[name] = data; p += 46 + nl;
  }
  return out;
}

test('zip: page + sheet + guide + the clips, page finds the clips in ./audio, bytes are stable', () => {
  const root = makeRepo();
  const guide = path.join(root, 'docs/review/audio-packet/REVIEWER-GUIDE.md');
  fs.mkdirSync(path.dirname(guide), { recursive: true }); fs.writeFileSync(guide, '# guide\n');
  const zip = path.join(root, '..', `zip-${path.basename(root)}.zip`);
  assert.equal(buildMain(['--root', root, '--zip', zip]), 0);
  const z = readZip(fs.readFileSync(zip));
  const names = Object.keys(z).sort();
  assert.ok(names.includes('alef-audio-review/listen.html') && names.includes('alef-audio-review/listen-sheet.csv') && names.includes('alef-audio-review/REVIEWER-GUIDE.md'));
  const mp3 = names.filter((n) => n.endsWith('.mp3'));
  assert.equal(mp3.length, 5);
  for (const n of mp3) assert.deepEqual(z[n], fs.readFileSync(path.join(root, n.replace('alef-audio-review/', ''))));
  const html = z['alef-audio-review/listen.html'].toString('utf8');
  for (const m of html.matchAll(/<audio[^>]* src="([^"]+)"/g)) assert.ok(z[`alef-audio-review/${m[1]}`], m[1]);
  // the zip refuses to build without the guide, and is byte-stable
  const again = buildZip(zipFiles(collectClips(root).clips, '# guide\n'));
  assert.deepEqual(again, buildZip(zipFiles(collectClips(root).clips, '# guide\n')));
  fs.rmSync(zip);
});

// ---------- importer ----------
const answerRow = (c, over = {}) => ({ id: c.id, hebrew: c.hebrew, gloss: c.gloss, tradition: c.tradition, file: c.file, clip_sha256: c.sha256, verdict: '', issues: '', accent_heard: '', note: '', reviewer_name: 'Dana Levi', reviewer_role: 'Native Hebrew speaker', review_date: '2026-11-20', ...over });
const csvOf = (rows) => { const esc = (v) => (/[",\n]/.test(v ?? '') ? `"${String(v).replace(/"/g, '""')}"` : (v ?? '')); return '﻿' + [SHEET_COLUMNS.join(','), ...rows.map((r) => SHEET_COLUMNS.map((c) => esc(r[c])).join(','))].join('\r\n') + '\r\n'; };
const run = (root, rows, o = {}) => analyse({ root, files: [{ name: 'r.csv', text: csvOf(rows) }], ...o });

test('importer: approvals become proposals; everything else is held back, with reasons', () => {
  const root = makeRepo();
  const { clips } = collectClips(root);
  const by = Object.fromEntries(clips.map((c) => [c.id, c]));
  const before = tree(root);
  const res = run(root, [
    answerRow(by['il01-w1'], { verdict: 'approve', accent_heard: 'israeli' }),
    answerRow(by['greet-01'], { verdict: 'reject', issues: 'wrong-vowels', note: 'second vowel' }),
    answerRow(by['h0000001'], { verdict: 'approve-with-note', note: 'slightly fast' }),
    answerRow(by['h0000002'], { verdict: 'cannot-tell' }),
    answerRow(by['h0000003'], { verdict: '' }),
  ]);
  assert.deepEqual(res.proposals.map((p) => p.id), ['il01-w1']);
  assert.equal(res.proposals[0].proposedStatus, 'synthetic-reviewed'); assert.equal(res.proposals[0].sidecar, 'audio/m/israeli/word/il01-w1.mp3.meta.json');
  assert.deepEqual(res.proposals[0].accentHeard, ['israeli']);
  const dec = Object.fromEntries(res.clips.map((c) => [c.id, c.decision]));
  assert.deepEqual(dec, { 'greet-01': 'rejected', h0000001: 'owner-decision', h0000002: 'unresolved', 'il01-w1': 'proposed' });
  assert.equal(res.counts.blank, 1); assert.equal(res.counts.refused, 0);
  assert.deepEqual(tree(root), before, 'the importer changed no file');
  const md = reportMd(res);
  assert.match(md, /nothing applied/i); assert.match(md, /build_manifest\.mjs/); assert.match(md, /No clip is approved by this report/);
  const patch = patchOf(res);
  assert.equal(patch.schema, 'alef-audio-approval-patch/1'); assert.match(patch.note, /PROPOSAL ONLY/);
  assert.equal(JSON.stringify(patch).includes('"applied"'), false);
});

test('importer refuses stale, edited, changed-file, unknown and duplicate rows', () => {
  const root = makeRepo();
  const { clips } = collectClips(root);
  const by = Object.fromEntries(clips.map((c) => [c.id, c]));
  const res = run(root, [
    answerRow(by['il01-w1'], { verdict: 'approve', hebrew: H.b }), // Hebrew cell edited
    answerRow(by['greet-01'], { verdict: 'approve', clip_sha256: 'a'.repeat(64) }), // file changed since the packet
    answerRow(by['h0000001'], { verdict: 'ok' }), // not a verdict: "ok" is not an approval
    answerRow(by['h0000002'], { verdict: 'approve' }), answerRow(by['h0000002'], { verdict: 'approve' }), // same reviewer twice
    answerRow({ ...by['h0000003'], id: 'nope', file: '' }, { verdict: 'approve' }), // unknown id
    { ...answerRow(by['h0000003'], { verdict: 'approve' }), id: 'h0000004', file: 'audio/m/israeli/word/h0000004.mp3', hebrew: H.f }, // already reviewed
  ]);
  assert.deepEqual(res.proposals, []);
  assert.equal(res.counts.refused, 7);
  const why = res.refused.map((r) => r.why).join('\n');
  assert.match(why, /Hebrew cell differs/); assert.match(why, /sha256 differs/); assert.match(why, /unknown verdict "ok"/);
  assert.match(why, /more than once/); assert.match(why, /not in the audio manifest/); assert.match(why, /not synthetic-unreviewed/);
});

test('importer: no name or date cannot approve; two reviewers; --min-approvals; conflict', () => {
  const root = makeRepo();
  const { clips } = collectClips(root);
  const by = Object.fromEntries(clips.map((c) => [c.id, c]));
  const rows = [
    answerRow(by['il01-w1'], { verdict: 'approve', reviewer_name: '' }),
    answerRow(by['greet-01'], { verdict: 'approve', review_date: '2026-13-45' }),
    answerRow(by['h0000001'], { verdict: 'approve', reviewer_name: 'A' }), answerRow(by['h0000001'], { verdict: 'approve', reviewer_name: 'B' }),
    answerRow(by['h0000002'], { verdict: 'approve', reviewer_name: 'A' }), answerRow(by['h0000002'], { verdict: 'reject', issues: 'unclear', reviewer_name: 'B' }),
    answerRow(by['h0000003'], { verdict: 'approve', issues: 'wrong-stress' }), // approve with an issue ticked
  ];
  let res = run(root, rows);
  const dec = Object.fromEntries(res.clips.map((c) => [c.id, c.decision]));
  assert.deepEqual(dec, { 'il01-w1': 'unnamed', 'greet-01': 'unnamed', h0000001: 'proposed', h0000002: 'conflict', h0000003: 'owner-decision', });
  assert.deepEqual(res.proposals.map((p) => p.id), ['h0000001']); assert.equal(res.proposals[0].reviewers.length, 2);
  assert.ok(res.warnings.some((w) => /name or a valid/.test(w.why)));
  res = run(root, rows, { minApprovals: 3 });
  assert.deepEqual(res.proposals, []); assert.equal(res.clips.find((c) => c.id === 'h0000001').decision, 'needs-more');
});

test('importer CLI: needs the columns, never writes into audio/ or data/, exit codes, no file changed', () => {
  const root = makeRepo();
  const { clips } = collectClips(root);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-ret-'));
  const f = path.join(dir, 'returned.csv');
  fs.writeFileSync(f, csvOf([answerRow(clips[0], { verdict: 'approve' }), answerRow(clips[1], { verdict: 'approve', clip_sha256: '0'.repeat(64) })]));
  const before = tree(root);
  assert.throws(() => importMain([f, '--root', root, '--patch', path.join(root, 'audio', 'p.json')]), /never writes inside/);
  assert.throws(() => importMain([f, '--root', root, '--report', path.join(root, 'data', 'r.md')]), /never writes inside/);
  const patch = path.join(dir, 'patch.json'), report = path.join(dir, 'report.md');
  const log = console.log; console.log = () => {};
  let code; try { code = importMain([f, '--root', root, '--patch', patch, '--report', report]); } finally { console.log = log; }
  assert.equal(code, 1, 'one row was refused');
  assert.equal(JSON.parse(fs.readFileSync(patch, 'utf8')).proposals.length, 1);
  assert.match(fs.readFileSync(report, 'utf8'), /Refused rows/);
  assert.deepEqual(tree(root), before);
  const bad = path.join(dir, 'bad.csv'); fs.writeFileSync(bad, 'a,b\n1,2\n');
  assert.throws(() => importMain([bad, '--root', root]), /missing required column/);
  assert.throws(() => importMain([]), /usage/);
  assert.throws(() => importMain([f, '--root', root, '--min-approvals', '0']), /whole number/);
});

test('verdict words are exact: no synonyms count as approval', () => {
  assert.equal(normVerdict(' Approve '), 'approve'); assert.equal(normVerdict('approve_with_note'), 'approve-with-note');
  assert.equal(normVerdict(''), ''); for (const bad of ['ok', 'yes', 'approved', 'fine']) assert.equal(normVerdict(bad), null);
});

test('reviewer guide: committed, covers the four verdicts, says nothing is approved until the owner records it', () => {
  const g = fs.readFileSync(new URL('../docs/review/audio-packet/REVIEWER-GUIDE.md', import.meta.url), 'utf8');
  for (const w of ['Approve with note', 'Reject', 'Cannot tell', 'not a person', 'Israeli, Sephardi or Ashkenazi']) assert.ok(g.includes(w), w);
  assert.match(g, /only treated as approved once the owner records it/);
  assert.ok(g.split('\n').length < 70, 'one page');
});
