// Inbox checker: Windows source paths / tool names, and the optional placeholder allowlist.
// Fixtures are written to a temp dir at run time; tool names are built from parts so this file stays clean under the text scan.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkInbox } from '../tools/drafts/check_inbox.mjs';
import { textHit } from '../tools/meta/text.mjs';

const CLI = new URL('../tools/drafts/check_inbox.mjs', import.meta.url).pathname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-inbox-pp-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const vocab = path.join(tmp, 'words.json'); fs.writeFileSync(vocab, JSON.stringify({ words: [] }));
const urls = path.join(tmp, 'urls.json'); fs.writeFileSync(urls, JSON.stringify({ hosts: [] }));
const phFile = path.join(tmp, 'ph.json');
fs.writeFileSync(phFile, JSON.stringify({ placeholders: ['PENDING-HUMAN', 'UNASSIGNED'], columns: ['Tester', 'script_revision'] }));
let n = 0;
function inbox(files) {
  const dir = path.join(tmp, 'in' + n++);
  for (const [rel, body] of Object.entries(files)) { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); }
  return dir;
}
const run = (dir, extra = {}) => checkInbox({ inbox: dir, vocab, urls, ...extra });
const rules = (r, sev) => r.findings.filter((x) => !sev || x.sev === sev).map((x) => x.rule);
const CODEX = 'Cod' + 'ex';
const winPath = `C:\\Users\\user\\Documents\\${CODEX}\\2026\\work\\src\\app.js`;
const q = (s) => '"' + s.replace(/"/g, '""') + '"';

test('the shared pattern list: checker and scan --text agree on tool names', () => {
  for (const w of ['Chat' + 'GPT', 'Open' + 'AI', 'Anth' + 'ropic', 'Cla' + 'ude']) assert.ok(textHit(w), w);
  const r = run(inbox({ 'lane5/lane5-1-a.csv': `id,note\na,Made with ${'Cla' + 'ude'}\n` }));
  assert.ok(rules(r, 'error').includes('banned-name'));
});

test('a Windows source path in a csv cell is an error and is never echoed', () => {
  const r = run(inbox({ 'lane5/lane5-1-a.csv': `id,source\na,${q(winPath)}\n` }));
  assert.ok(rules(r, 'error').includes('windows-path'));
  assert.equal(r.exit, 1);
  assert.ok(r.findings.every((x) => !x.sample.includes('Users')));
});

test('windows paths in json values, md lines and file names are errors; unix-style user paths too', () => {
  const r = run(inbox({
    'lane5/lane5-2-a.json': JSON.stringify({ a: { src: winPath } }),
    'lane5/lane5-3-a.md': `# Notes\n\nSee ${winPath}\n`,
    'lane5/lane5-4-b.md': 'See D:/work/x.js\n',
    'lane5/lane5-5-c.md': 'See \\\\fileserver\\share\\x\n',
  }));
  for (const f of ['lane5-2-a.json', 'lane5-3-a.md', 'lane5-4-b.md', 'lane5-5-c.md']) assert.ok(r.findings.some((x) => x.rule === 'windows-path' && x.file.endsWith(f)), f);
});

test('a path segment named after the tool is an error even without a drive letter; the bare word is only a warning', () => {
  const seg = run(inbox({ 'lane5/lane5-1-a.md': `src/${CODEX}/work/app.js\n` }));
  assert.ok(rules(seg, 'error').includes('windows-path'));
  const word = run(inbox({ 'lane5/lane5-1-a.md': `The Leningrad ${CODEX} is a manuscript.\n` }));
  assert.equal(word.errors, 0); assert.deepEqual(rules(word, 'warn'), ['codex-word']); assert.equal(word.exit, 0);
});

test('ordinary text with a colon or a slash is not a path', () => {
  const r = run(inbox({ 'lane5/lane5-1-a.md': 'Time 10:30. Use and/or. Step A: do it. Users want it. see 1/2\n' }));
  assert.equal(r.errors, 0); assert.deepEqual(rules(r, 'warn'), []);
});

test('placeholders: off by default (unchanged behaviour); empty cells still fail', () => {
  const d = inbox({ 'lane5/lane5-1-a.csv': 'id,Tester,other\na,PENDING-HUMAN,x\nb,,y\n' });
  const r = run(d);
  assert.deepEqual(rules(r, 'error'), ['empty-cell']);
  assert.equal(r.placeholders, 0);
});

test('placeholders: accepted only as the whole cell in an allowlisted column (case-insensitive header)', () => {
  const d = inbox({ 'lane5/lane5-1-a.csv': 'id,Tester,script_revision,other\na,PENDING-HUMAN,UNASSIGNED,x\nb,PENDING-HUMAN,UNASSIGNED,y\n' });
  const r = run(d, { placeholders: phFile });
  assert.equal(r.errors, 0); assert.equal(r.exit, 0); assert.equal(r.placeholders, 4);
});

test('placeholders: refused in a column that is not on the allowlist, and an empty allowlisted cell still fails', () => {
  const d = inbox({ 'lane5/lane5-1-a.csv': 'id,Tester,other\na,PENDING-HUMAN,UNASSIGNED\nb,,y\n' });
  const r = run(d, { placeholders: phFile });
  assert.deepEqual(rules(r, 'error').sort(), ['empty-cell', 'placeholder-column']);
  assert.equal(r.placeholders, 1); assert.equal(r.exit, 1);
});

test('placeholders: a token with extra words in the cell is ordinary text, not a placeholder', () => {
  const d = inbox({ 'lane5/lane5-1-a.csv': 'id,Tester\na,PENDING-HUMAN maybe\n' });
  const r = run(d, { placeholders: phFile });
  assert.equal(r.placeholders, 0);
});

test('placeholders: a placeholder cell does not hide other content problems in the same file', () => {
  const d = inbox({ 'lane5/lane5-1-a.csv': `id,Tester,src\na,PENDING-HUMAN,${q(winPath)}\n` });
  const r = run(d, { placeholders: phFile });
  assert.ok(rules(r, 'error').includes('windows-path')); assert.equal(r.placeholders, 1);
});

test('CLI: --placeholders turns the rule on and prints the count', () => {
  const d = inbox({ 'lane5/lane5-1-a.csv': 'id,Tester\na,PENDING-HUMAN\n' });
  const base = ['--inbox', d, '--vocab', vocab, '--urls', urls, '--no-report'];
  const on = spawnSync(process.execPath, [CLI, ...base, '--placeholders', phFile], { encoding: 'utf8' });
  assert.equal(on.status, 0); assert.match(on.stdout, /1 placeholder cell/);
  const bad = spawnSync(process.execPath, [CLI, ...base, '--placeholders', path.join(tmp, 'nope.json')], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
});
