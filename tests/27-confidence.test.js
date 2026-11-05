// Proposed test for handoff item 27 (pronunciation engines: declared heuristics, thin exceptions).
// Pins what is already in the working tree: rule-generated readings carry a confidence object, every reason code has
// plain-language text, nothing is ever "verified", and the stress-exception list stays reviewer-sourced.
// Run with: node --test tests/27-confidence.test.js (the root is found by walking up).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let root = dirname(fileURLToPath(import.meta.url));
while (!existsSync(join(root, 'package.json')) && dirname(root) !== root) root = dirname(root);
const { syllabifyWord, CONFIDENCE_REASONS, STRESS_EXCEPTIONS } = await import(pathToFileURL(join(root, 'src/photo/syllabify.js')));

const SAMPLE = ['שָׁלוֹם', 'בְּגָדִים', 'סֵפֶר', 'יַלְדָּה', 'לִלְמֹד', 'תּוֹרָה', 'כָּל', 'מֶלֶךְ', 'בֹּקֶר', 'חֶדֶר'];

test('every sample reading exposes a confidence object that is never "verified"', () => {
  for (const w of SAMPLE) {
    const s = syllabifyWord(w);
    assert.ok(s.length, w);
    assert.ok(['low', 'draft'].includes(s.confidence?.level), `${w}: ${s.confidence?.level}`);
    assert.equal(s.confidence.checked, false, w);
    assert.ok(Array.isArray(s.confidence.reasons), w);
  }
});

test('a multi-syllable word on the default stress rule is "low" with the final-stress reason', () => {
  const s = syllabifyWord('שָׁלוֹם');
  assert.equal(s.stressRule?.startsWith('default-final'), true);
  assert.equal(s.confidence.level, 'low');
  assert.ok(s.confidence.reasons.includes('final-stress-assumed'));
});

test('a word with a vocal or silent shva always carries the partial-rules reason', () => {
  assert.ok(syllabifyWord('בְּגָדִים').confidence.reasons.includes('shva-rules-partial'));
});

test('a listed stress exception is not marked as an assumed-stress guess', () => {
  const s = syllabifyWord('סֵפֶר');
  assert.equal(s.stressRule, 'exception-list');
  assert.ok(!s.confidence.reasons.includes('final-stress-assumed'));
});

test('every reason code the engine can emit has plain-language text', () => {
  const seen = new Set(SAMPLE.flatMap((w) => syllabifyWord(w).confidence.reasons));
  for (const r of seen) assert.ok(CONFIDENCE_REASONS[r] && CONFIDENCE_REASONS[r].length > 20, r);
  for (const [k, v] of Object.entries(CONFIDENCE_REASONS)) assert.ok(typeof v === 'string' && v.trim(), k);
});

test('stress exceptions are pointed Hebrew keys with integer offsets (rows must come from a reviewer)', () => {
  for (const [k, v] of Object.entries(STRESS_EXCEPTIONS)) {
    assert.ok(/[ְ-ׇ]/.test(k) && /[א-ת]/.test(k), `not a pointed word: ${k}`);
    assert.ok(Number.isInteger(v), k);
  }
});

test('the photo scan screen shows the reasons next to a generated reading', () => {
  const src = readFileSync(join(root, 'src/photo/scan.view.js'), 'utf8');
  assert.match(src, /CONFIDENCE_REASONS/);
  assert.match(src, /confidence\?\.reasons/);
});
