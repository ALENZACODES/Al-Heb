// Inbox checker: small fixtures are written to a temp dir at run time (no binary or tool-named files are committed).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync, spawnSync } from 'node:child_process';
import { checkInbox, renderReport, parseCsv } from '../tools/drafts/check_inbox.mjs';

const CLI = new URL('../tools/drafts/check_inbox.mjs', import.meta.url).pathname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-inbox-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const vocab = path.join(tmp, 'words.json');
fs.writeFileSync(vocab, JSON.stringify({ words: [{ he: 'שָׁלוֹם' }, { he: 'תּוֹדָה' }, { he: 'בְּבַקָּשָׁה' }] }));
const urls = path.join(tmp, 'urls.json');
fs.writeFileSync(urls, JSON.stringify({ hosts: ['en.wikipedia.org'] }));

let n = 0;
function inbox(files) {
  const dir = path.join(tmp, 'in' + n++);
  for (const [rel, body] of Object.entries(files)) { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const run = (dir, extra = {}) => checkInbox({ inbox: dir, vocab, urls, ...extra });
const rules = (r, sev) => r.findings.filter((x) => !sev || x.sev === sev).map((x) => x.rule);

const crcT = Array.from({ length: 256 }, (_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type, 'latin1'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
function png(w, h, extra = []) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  const row = Buffer.alloc(w + 1); const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), ...extra, chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('clean csv passes; known words are quiet, unknown words are information not errors', () => {
  const d = inbox({ 'lane2/lane2-18-greetings.csv': 'id,he,gloss\ng1,שָׁלוֹם,hello\ng2,תּוֹדָה,thanks\ng3,סַבָּא,grandpa\n' });
  const r = run(d);
  assert.equal(r.errors, 0); assert.equal(r.exit, 0);
  assert.deepEqual(r.unknown.map((u) => u.word), ['סַבָּא']);
  assert.match(renderReport(r), /Result: \*\*PASS\*\*/);
});

test('same letters with different pointing is reported as unknown, with the reason', () => {
  const r = run(inbox({ 'lane2/lane2-18-a.csv': 'id,he\na,שֶׁלוֹם\n' }));
  assert.equal(r.errors, 0);
  assert.match(r.unknown[0].why, /different pointing; the app has שָׁלוֹם/);
});

test('malformed Hebrew (final letter mid-word, stray mark) is an error', () => {
  const r = run(inbox({ 'lane2/lane2-18-a.csv': 'id,he\na,שלםו\nb,ָ \n' }));
  assert.ok(rules(r, 'error').includes('hebrew-final-letter-mid-word'));
  assert.ok(rules(r, 'error').some((x) => x.startsWith('hebrew-')));
  assert.equal(r.exit, 1);
});

test('?? CHECK lines are flagged; they fail only with --strict', () => {
  const d = inbox({ 'lane2/lane2-33-idioms.md': '# Idioms\n\nשָׁלוֹם ?? CHECK\n' });
  const r = run(d); assert.equal(r.flags, 1); assert.equal(r.exit, 0);
  assert.equal(run(d, { strict: true }).exit, 1);
});

test('banned content: tool names, divine names, bad links, lyric-like lines, markers', () => {
  const tool = ['Chat', 'GPT'].join('');
  const d = inbox({
    'lane5/lane5-80-notes.md': [`made with ${tool}`, 'say Adonai here', 'see https://example.com/x and https://en.wikipedia.org/wiki/Hebrew', 'פעם אחת הלכתי לשוק וקניתי לחם חם וטרי מאוד מאוד', '(c) 2024 someone', 'lyrics: la la'].join('\n'),
    'lane2/lane2-19-b.csv': 'id,he\nz,אֱלֹהִים\n',
  });
  const r = run(d); const e = rules(r, 'error');
  for (const k of ['banned-name', 'divine-name', 'url-not-allowed', 'lyric-like', 'attribution-marker', 'lyrics-marker']) assert.ok(e.includes(k), k);
  assert.equal(r.findings.filter((x) => x.rule === 'url-not-allowed').length, 1, 'allowlisted host passes');
  const rep = renderReport(r);
  assert.ok(!rep.includes(tool) && !rep.includes('Adonai'), 'report never echoes banned text');
});

test('duplicate ids (csv and json), empty cells, ragged rows', () => {
  const r = run(inbox({
    'lane2/lane2-18-a.csv': 'id,he,gloss\na,שָׁלוֹם,x\na,תּוֹדָה,\nb,בְּבַקָּשָׁה\n',
    'lane2/lane2-19-b.json': JSON.stringify([{ id: 'k', t: 'x' }, { id: 'k', t: '' }]),
  }));
  const e = rules(r, 'error');
  assert.equal(e.filter((x) => x === 'duplicate-id').length, 2);
  assert.ok(e.filter((x) => x === 'empty-cell').length >= 2);
  assert.ok(e.includes('bad-format'));
});

test('file-name rule: pattern, lane match, placement, type', () => {
  const r = run(inbox({ 'lane2/greetings.csv': 'id\na\n', 'lane3/lane2-5-x.csv': 'id\na\n', 'lane9/lane9-1-x.csv': 'id\na\n', 'lane1/lane1-1-x.txt': 'x', 'stray.md': 'x', 'lane2/Lane2-1-X.csv': 'id\na\n' }));
  const by = (f) => r.findings.filter((x) => x.file === f).map((x) => x.rule);
  assert.ok(by('lane2/greetings.csv').includes('file-name'));
  assert.ok(by('lane3/lane2-5-x.csv').includes('file-name'));
  assert.ok(by('lane9/lane9-1-x.csv').includes('misplaced'));
  assert.ok(by('lane1/lane1-1-x.txt').includes('unsupported-type'));
  assert.ok(by('stray.md').includes('misplaced'));
  assert.ok(by('lane2/Lane2-1-X.csv').includes('file-name'));
});

test('png: good file passes; size, dimensions, metadata chunks, truncation fail', () => {
  const good = png(300, 300);
  const d = inbox({
    'lane1/lane1-1-alef.png': good,
    'lane1/lane1-2-small.png': png(64, 64),
    'lane1/lane1-3-text.png': png(300, 300, [chunk('tEXt', Buffer.from('Software\0x'))]),
    'lane1/lane1-4-cut.png': good.subarray(0, good.length - 20),
    'lane1/lane1-5-bad.png': Buffer.from('not a png'),
  });
  const r = run(d); const by = (f) => r.findings.filter((x) => x.file === f && x.sev === 'error').map((x) => x.rule);
  assert.deepEqual(by('lane1/lane1-1-alef.png'), []);
  assert.deepEqual(by('lane1/lane1-2-small.png'), ['png-dimensions']);
  assert.deepEqual(by('lane1/lane1-3-text.png'), ['png-metadata']);
  assert.ok(by('lane1/lane1-4-cut.png').includes('png-bad'));
  assert.ok(by('lane1/lane1-5-bad.png').includes('png-bad'));
  assert.ok(rules(run(d, { maxBytes: 100 })).includes('png-size'));
});

test('csv parser: quotes, embedded commas and newlines, CRLF', () => {
  const { rows } = parseCsv('a,b\r\n"x,1","y\nz"\r\n');
  assert.deepEqual(rows.map((r) => r.cells), [['a', 'b'], ['x,1', 'y\nz']]);
});

test('CLI: writes the report, exits 1 on errors, 0 when clean; empty inbox passes; inbox files are untouched', () => {
  const bad = inbox({ 'lane2/lane2-18-a.csv': 'id,he\na,\n' });
  const rep = path.join(tmp, 'REPORT.md');
  const before = fs.readFileSync(path.join(bad, 'lane2/lane2-18-a.csv'));
  const res = spawnSync('node', [CLI, '--inbox', bad, '--vocab', vocab, '--urls', urls, '--report', rep], { encoding: 'utf8' });
  assert.equal(res.status, 1); assert.match(fs.readFileSync(rep, 'utf8'), /Result: \*\*FAIL\*\*/);
  assert.deepEqual(fs.readFileSync(path.join(bad, 'lane2/lane2-18-a.csv')), before);
  const ok = execFileSync('node', [CLI, '--inbox', inbox({}), '--vocab', vocab, '--urls', urls, '--no-report'], { encoding: 'utf8' });
  assert.match(ok, /0 file\(s\), 0 error/);
  assert.equal(spawnSync('node', [CLI, '--bogus']).status, 2);
});

test('the real inbox report on disk is current for the default (empty or not) inbox', () => {
  const r = checkInbox({});
  assert.ok(r.vocabCount > 1000);
});

test('csv locations name the row id, and duplicate/empty/ragged messages are plain', () => {
  const r = run(inbox({ 'lane2/lane2-18-a.csv': 'id,he,gloss\ng1,שָׁלוֹם,hi\ng1,תּוֹדָה,\ng3,שָׁלוֹם\n' }));
  const by = (rule) => r.findings.find((x) => x.rule === rule);
  assert.match(by('empty-cell').loc, /row 3 \(id g1\), column gloss/);
  assert.match(by('duplicate-id').detail, /every id must be different/);
  assert.match(by('bad-format').detail, /2 cells but the header row has 3/);
});

test('crlf, BOM and quoted commas parse cleanly; markdown link with trailing dot is read', () => {
  const r = run(inbox({
    'lane2/lane2-18-a.csv': '﻿id,he,gloss\r\na1,שָׁלוֹם,"hello, friend"\r\na2,תּוֹדָה,thanks\r\n\r\n',
    'lane4/lane4-52-a.md': 'See [x](https://en.wikipedia.org/wiki/Hebrew).\n',
  }));
  assert.equal(r.errors, 0);
});

test('report gives a status per file and a what-to-do column', () => {
  const rep = renderReport(run(inbox({ 'lane2/lane2-18-a.csv': 'id,he\na,שָׁלוֹם\na,תּוֹדָה\n', 'lane2/lane2-19-b.csv': 'id,he\nb,שָׁלוֹם ?? CHECK\n', 'lane2/lane2-20-c.csv': 'id,he\nc,תּוֹדָה\n' })));
  assert.match(rep, /FIX FIRST/); assert.match(rep, /needs native check/); assert.match(rep, /nothing mechanical found/);
  assert.match(rep, /What to do/);
});

// ---- promote ----
import { promote } from '../tools/drafts/promote.mjs';
const pro = (d, rel, dest, extra = {}) => promote(path.join(d, rel), dest, { inbox: d, log: path.join(tmp, 'PROMOTED.md'), check: { vocab, urls }, ...extra });

test('promote refuses a file with errors and leaves it in place', () => {
  const d = inbox({ 'lane2/lane2-18-a.csv': 'id,he\na,שָׁלוֹם\na,תּוֹדָה\n' });
  const dest = path.join(tmp, 'out1');
  const r = pro(d, 'lane2/lane2-18-a.csv', dest);
  assert.equal(r.ok, false); assert.match(r.msg, /Refused: 1 error/);
  assert.ok(fs.existsSync(path.join(d, 'lane2/lane2-18-a.csv'))); assert.ok(!fs.existsSync(dest));
});

test('promote moves (not copies) a clean file and logs it; refuses to overwrite', () => {
  const d = inbox({ 'lane2/lane2-18-a.csv': 'id,he\na,שָׁלוֹם ?? CHECK\n' });
  const dest = path.join(tmp, 'out2'); const log = path.join(tmp, 'PROMOTED.md');
  const r = pro(d, 'lane2/lane2-18-a.csv', dest);
  assert.equal(r.ok, true, r.msg);
  assert.ok(!fs.existsSync(path.join(d, 'lane2/lane2-18-a.csv'))); assert.ok(fs.existsSync(path.join(dest, 'lane2-18-a.csv')));
  const txt = fs.readFileSync(log, 'utf8'); assert.match(txt, /lane2\/lane2-18-a\.csv/); assert.match(txt, /\| 1 \| 0 \|\n$/);
  const d2 = inbox({ 'lane2/lane2-18-a.csv': 'id,he\na,שָׁלוֹם\n' });
  const r2 = pro(d2, 'lane2/lane2-18-a.csv', dest);
  assert.equal(r2.ok, false); assert.match(r2.msg, /already exists/); assert.ok(fs.existsSync(path.join(d2, 'lane2/lane2-18-a.csv')));
});

test('promote refuses files outside the inbox, destinations inside it, and --strict flags', () => {
  const d = inbox({ 'lane2/lane2-18-a.csv': 'id,he\na,שָׁלוֹם ?? CHECK\n' });
  assert.equal(pro(d, '../elsewhere.csv', path.join(tmp, 'o3')).ok, false);
  assert.match(pro(d, 'lane2/lane2-18-a.csv', path.join(d, 'lane3')).msg, /inside the inbox/);
  assert.match(pro(d, 'lane2/lane2-18-a.csv', path.join(tmp, 'o3'), { strict: true }).msg, /\?\? CHECK/);
  assert.ok(fs.existsSync(path.join(d, 'lane2/lane2-18-a.csv')));
});
