import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RULES, lintString, scanDir } from '../tools/hebrew-lint/lint.mjs';
import { fingerprint, summarize, renderReport } from '../tools/hebrew-lint/cli.mjs';

const rules = (s, p) => [...new Set(lintString(s, p).map((h) => h.rule))].sort();
const SHIN = '\u05e9', SHIN_DOT = '\u05c1', SIN_DOT = '\u05c2', QAMATS = '\u05b8', PATAH = '\u05b7', DAGESH = '\u05bc', SHEVA = '\u05b0', HIRIQ = '\u05b4';

test('clean pointed text raises nothing', () => {
  assert.deepEqual(rules(SHIN + QAMATS + SHIN_DOT.replace(SHIN_DOT, '') + '\u05dc\u05d5\u05b9\u05dd'), []);
  assert.deepEqual(rules('\u05e9' + QAMATS + SHIN_DOT + '\u05dc\u05d5\u05b9\u05dd'), []);
  assert.deepEqual(rules('plain English only'), []);
});

test('mark-order: dot before vowel is reported, canonical order is not', () => {
  assert.deepEqual(rules(SHIN + SHIN_DOT + QAMATS), ['mark-order']);
  assert.deepEqual(rules(SHIN + QAMATS + SHIN_DOT), []);
  assert.deepEqual(rules('\u05d1' + DAGESH + PATAH), ['mark-order']);
  assert.deepEqual(rules('\u05d1' + PATAH + DAGESH), []);
});

test('stray-mark: no base, after space, after Latin; specimens are allowed', () => {
  assert.deepEqual(rules(QAMATS + '\u05d0'), ['stray-mark']);
  assert.deepEqual(rules('\u05d0 ' + QAMATS + '\u05d1'), ['stray-mark']);
  assert.deepEqual(rules('a' + QAMATS + '\u05d1'), ['latin-in-hebrew-word', 'stray-mark']);
  assert.deepEqual(rules(QAMATS), []);
  assert.deepEqual(rules('Kamatz (' + QAMATS + ') \u05d0'), []);
  assert.deepEqual(rules('\u25cc' + QAMATS + ' \u05d0'), []);
});

test('conflicting and duplicate marks', () => {
  assert.deepEqual(rules('\u05d1' + PATAH + QAMATS), ['conflicting-marks']);
  assert.deepEqual(rules(SHIN + SHIN_DOT + SIN_DOT), ['conflicting-marks']);
  assert.deepEqual(rules('\u05d1' + SHIN_DOT), ['conflicting-marks']);
  assert.deepEqual(rules('\u05de' + SHEVA + SHEVA), ['duplicate-mark']);
  assert.deepEqual(rules('\u05d1' + DAGESH + PATAH), ['mark-order']);
});

test('final and non-final letters', () => {
  assert.deepEqual(rules('\u05dd\u05d0'), ['final-letter-mid-word']);
  assert.deepEqual(rules('\u05d0\u05dd'), []);
  assert.deepEqual(rules('\u05e9\u05dc\u05d5\u05de'), ['nonfinal-letter-at-end']);
  assert.deepEqual(rules('\u05e9\u05dc\u05d5\u05dd \u05de'), []);
  assert.deepEqual(rules('\u05d2\u05f3\u05e6\u05f3'), []);
  assert.deepEqual(rules('\u05de\u05d5"\u05de'), ['ascii-gershayim']);
  assert.deepEqual(rules('\u05d8\u05d9\u05e4'), ['nonfinal-pe-at-end']);
  assert.deepEqual(rules('\u05d8\u05d9\u05e4' + DAGESH), []);
  assert.deepEqual(rules('\u05e2\u05d1\u05db', '.syllables[0][1]'), []);
  assert.deepEqual(rules('\u05e2\u05d1\u05db', '.title'), ['nonfinal-letter-at-end']);
});

test('Latin letters touching Hebrew', () => {
  assert.deepEqual(rules('\u05e9\u05dc\u05d5\u05dd' + 'x'), ['latin-in-hebrew-word', 'nonfinal-letter-at-end'].slice(0, 1).concat([]));
  assert.deepEqual(rules('shalom \u05e9\u05dc\u05d5\u05dd'), []);
  assert.deepEqual(rules('a\u05d0'), ['latin-in-hebrew-word']);
  assert.deepEqual(rules('\u05d0 1'), []);
});

test('bidi, invisible, double space, normalisation', () => {
  assert.deepEqual(rules('\u05d0\u200f'), ['bidi-control']);
  assert.deepEqual(rules('\u05d0\u200e\u200f'), ['bidi-control', 'bidi-mixed-direction']);
  assert.deepEqual(rules('\u202b\u05d0'), ['bidi-control', 'bidi-unbalanced']);
  assert.deepEqual(rules('\u05d0\u202c'), ['bidi-control', 'bidi-unbalanced']);
  assert.deepEqual(rules('\u05d0\u200b\u05d1'), ['invisible-char']);
  assert.deepEqual(rules('\u05d0\ufeff'), ['invisible-char']);
  assert.deepEqual(rules('\u05d0  \u05d1'), ['double-space']);
  assert.deepEqual(rules('\ufb2a'), ['not-nfc']);
  assert.deepEqual(rules('e\u0301 \u05d0'), ['not-nfc']);
});

test('sof pasuq, maqaf, hyphen, geresh and gershayim', () => {
  assert.deepEqual(rules('\u05d0 \u05c3'), ['sof-pasuq-space-before']);
  assert.deepEqual(rules('\u05d0\u05c3\u05d1'), ['sof-pasuq-no-space-after']);
  assert.deepEqual(rules('\u05d0\u05c3 \u05d1'), []);
  assert.deepEqual(rules('\u05d0 \u05be\u05d1'), ['maqaf-spacing']);
  assert.deepEqual(rules('\u05d0\u05be\u05d1'), []);
  assert.deepEqual(rules('\u05de' + PATAH + '-\u05d8' + '\u05b9' + '\u05d1'), ['ascii-hyphen-in-pointed-text']);
  assert.deepEqual(rules('\u05d1\u05d9\u05ea-\u05e1\u05e4\u05e8'), []);
  assert.deepEqual(rules('\u05e6\u05d4"\u05dc'), ['ascii-gershayim']);
  assert.deepEqual(rules('\u05e6\u05d4\u05f4\u05dc'), []);
  assert.deepEqual(rules("\u05d2'"), ['ascii-geresh']);
  assert.deepEqual(rules("'\u05d0\u05d1' x"), []);
  assert.deepEqual(rules('\u05d2\u05f3'), []);
});

test('tags are transparent and CGJ separates mark groups', () => {
  assert.deepEqual(rules('\u05e9' + QAMATS + SHIN_DOT + '<s t="large">\u05e2</s>'), []);
  assert.deepEqual(rules('\u05d0' + DAGESH + '\u034f' + PATAH), []);
});

test('every rule is classified with a reason; synthetic scan and report work, files untouched', () => {
  for (const [id, r] of Object.entries(RULES)) { assert.ok(r.cls === 'definite' || r.cls === 'style', id); assert.ok(r.reason.length > 10, id); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlint-'));
  const data = path.join(dir, 'data'); fs.mkdirSync(path.join(data, 'sub'), { recursive: true });
  const body = JSON.stringify({ a: ['\u05dd\u05d0', 'fine \u05e9\u05dc\u05d5\u05dd'], b: { k: '\u05d0  \u05d1' } });
  fs.writeFileSync(path.join(data, 'sub', 'x.json'), body);
  fs.writeFileSync(path.join(data, 'bad.json'), '{oops');
  const res = scanDir(data, dir);
  assert.equal(res.scannedFiles, 2);
  assert.equal(res.parseErrors.length, 1);
  const sum = summarize(res);
  assert.equal(sum.perRule['final-letter-mid-word'].count, 1);
  assert.equal(sum.perRule['double-space'].count, 1);
  const md = renderReport(sum);
  assert.match(md, /NOT proof of correct Hebrew/);
  assert.equal(fs.readFileSync(path.join(data, 'sub', 'x.json'), 'utf8'), body);
  fs.rmSync(dir, { recursive: true });
});

test('baseline: no NEW definite errors in data/ (style findings never fail)', () => {
  const root = new URL('../', import.meta.url).pathname;
  const base = JSON.parse(fs.readFileSync(new URL('../tools/hebrew-lint/baseline.json', import.meta.url), 'utf8'));
  const known = new Map(); for (const f of base.definiteFingerprints) known.set(f, (known.get(f) || 0) + 1);
  const res = scanDir(path.join(root, 'data'), root);
  const fresh = [];
  for (const f of res.findings) {
    if (RULES[f.rule].cls !== 'definite') continue;
    const k = fingerprint(f);
    if (known.get(k)) known.set(k, known.get(k) - 1); else fresh.push(`${f.rule} ${f.file} ${f.path} ${f.snippet}`);
  }
  assert.deepEqual(fresh.slice(0, 20), [], `new definite Hebrew errors (${fresh.length}); fix them or deliberately run: node tools/hebrew-lint/cli.mjs --update-baseline`);
});
