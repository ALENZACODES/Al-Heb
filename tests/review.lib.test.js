import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, parseCsv, parseCsvObjects } from '../tools/review/lib/csv.mjs';
import { parseSpans, nodeAt, setKeyEdits, applyEdits } from '../tools/review/lib/jsonspan.mjs';
import { shortDiff, norm } from '../tools/review/apply_review.mjs';

test('csv: round trip with Hebrew, quotes, commas, embedded newlines and a BOM', () => {
  const cols = ['id', 'hebrew', 'english'];
  const rows = [{ id: 'a:1', hebrew: 'שָׁלוֹם\nבֹּקֶר', english: 'say "hi", please' }, { id: 'a:2', hebrew: '', english: ' padded ' }];
  const text = toCsv(cols, rows);
  assert.equal(text.charCodeAt(0), 0xfeff);
  assert.ok(text.includes('\r\n'));
  const back = parseCsvObjects(text);
  assert.deepEqual(back.header, cols);
  assert.equal(back.records[0].hebrew, 'שָׁלוֹם\nבֹּקֶר');
  assert.equal(back.records[0].english, 'say "hi", please');
  assert.equal(back.records[1].english, ' padded ');
  assert.equal(parseCsv('a,b\n1,2').length, 2); // LF-only and no trailing newline
});

test('csv: headers are matched case-insensitively and spaces become underscores', () => {
  const { header } = parseCsvObjects('ID,Review Date\n1,2\n');
  assert.deepEqual(header, ['id', 'review_date']);
});

test('csv: unterminated quote throws', () => { assert.throws(() => parseCsv('a,"b\n1')); });

function patch(text, path, key, value) {
  const tree = parseSpans(text);
  return applyEdits(text, setKeyEdits(text, nodeAt(tree, path), key, value));
}

test('jsonspan: appends a key in pretty, compact and spaced-compact styles; output stays valid', () => {
  const pretty = '{\n "a": [\n  {\n   "x": 1,\n   "y": "z"\n  }\n ]\n}\n';
  const out1 = patch(pretty, ['a', 0], 'proofread', true);
  assert.ok(out1.includes('   "y": "z",\n   "proofread": true\n'));
  assert.equal(JSON.parse(out1).a[0].proofread, true);
  const compact = '{"a":[{"x":1,"y":"z"}]}';
  assert.equal(patch(compact, ['a', 0], 'p', true), '{"a":[{"x":1,"y":"z","p":true}]}');
  const spaced = '{"a": [{"x": 1, "y": "z"}]}';
  assert.equal(patch(spaced, ['a', 0], 'p', 'v'), '{"a": [{"x": 1, "y": "z", "p": "v"}]}');
  assert.equal(patch('{"o":{}}', ['o'], 'k', 1), '{"o":{"k": 1}}');
});

test('jsonspan: replaces an existing value in place and keeps creation order for several inserts', () => {
  const t = '{"r":{"proofread":false,"n":1}}';
  const tree = parseSpans(t);
  const node = nodeAt(tree, ['r']);
  const out = applyEdits(t, [...setKeyEdits(t, node, 'proofread', true), ...setKeyEdits(t, node, 'a', 'A'), ...setKeyEdits(t, node, 'b', 'B')]);
  assert.equal(out, '{"r":{"proofread":true,"n":1,"a":"A","b":"B"}}');
});

test('jsonspan: Hebrew, escapes and numbers are located correctly; bad JSON throws', () => {
  const t = '{"he":"שָׁלוֹם \\"q\\" \\u05d0","n":-1.5e2,"l":[true,null]}';
  const tree = parseSpans(t);
  assert.equal(nodeAt(tree, ['he']).v, 'שָׁלוֹם "q" א');
  assert.equal(nodeAt(tree, ['n']).v, -150);
  assert.equal(nodeAt(tree, ['l', 1]).v, null);
  assert.equal(nodeAt(tree, ['missing']), null);
  assert.throws(() => parseSpans('{"a":1,}'));
});

test('importer helpers: norm ignores bidi marks, NFD/NFC, CRLF and extra spaces; shortDiff trims context', () => {
  assert.equal(norm('‏שָׁלוֹם\r\nבֹּקֶר '), norm('שָׁלוֹם\nבֹּקֶר'));
  assert.equal(norm('שָׁ'), norm('שָׁ'));
  const [a, b] = shortDiff('x'.repeat(50) + 'AB' + 'y'.repeat(50), 'x'.repeat(50) + 'AC' + 'y'.repeat(50));
  assert.ok(a.length < 40 && b.length < 40);
  assert.ok(a.includes('B') && b.includes('C'));
});
