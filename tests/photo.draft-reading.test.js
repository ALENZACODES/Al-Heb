// Generated readings of arbitrary words must say they are drafts, and the photo path must not claim IPA output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { syllabifyWord, CONFIDENCE_REASONS } from '../src/photo/syllabify.js';
import { runPipeline } from '../src/photo/pipeline.js';
import { createMockEngine } from '../src/photo/engines/mock.js';
import { buildWordCards, loadTransliterator, DRAFT_READING_NOTE } from '../src/photo/word-card.js';
import { createPhonikudPlaceholder, describeAdapters } from '../src/photo/engines/web.js';
import { createPhotoEngines } from '../src/photo/engines/index.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('syllabifyWord attaches a confidence object without changing the syllable array', () => {
  const s = syllabifyWord('כְּנִיסָה');
  assert.ok(Array.isArray(s)); assert.equal(s.length, 3);
  assert.equal(s.confidence.checked, false);
  assert.equal(s.confidence.level, 'low');
  assert.ok(s.confidence.reasons.includes('final-stress-assumed'));
  assert.ok(s.confidence.reasons.includes('shva-rules-partial'));
  for (const r of s.confidence.reasons) assert.ok(CONFIDENCE_REASONS[r], r);
});

test('confidence never reports verified; a listed stress exception drops the stress caveat', () => {
  const sefer = syllabifyWord('סֵפֶר');
  assert.equal(sefer.stressRule, 'exception-list');
  assert.ok(!sefer.confidence.reasons.includes('final-stress-assumed'));
  assert.notEqual(sefer.confidence.level, 'verified');
  assert.equal(syllabifyWord('הַסְּכוּם').confidence.level, 'low');
  assert.deepEqual(syllabifyWord('לא'), []); // unpointed: nothing is guessed, so no reading and no confidence
});

test('shva after a long vowel is flagged as a guess (L3 style word)', () => {
  assert.ok(syllabifyWord('קוֹלְךָ').confidence.reasons.includes('shva-after-long-vowel-guess'));
});

test('pipeline words and word cards carry the confidence and the draft note', async () => {
  const r = await runPipeline({}, createMockEngine(), { mode: 'sign' });
  const w = r.lines[0].words.find((x) => x.kind === 'hebrew');
  assert.equal(w.confidence.checked, false);
  const c = buildWordCards(r, { transliterate: await loadTransliterator() })[0];
  assert.equal(c.draftNote, DRAFT_READING_NOTE);
  assert.match(c.draftNote, /draft guess/);
  assert.equal(c.confidence.checked, false);
});

test('unpointed words get no draft note because no reading is shown', async () => {
  const r = await runPipeline({}, { ocr: () => [{ text: 'שלום', x: 0, y: 0, w: 50, h: 20 }] }, { mode: 'sign' });
  const c = buildWordCards(r, { transliterate: await loadTransliterator() })[0];
  assert.equal(c.draftNote, null); assert.equal(c.confidence, null);
});

test('scan view renders the draft note on every card that has a reading', () => {
  const src = read('src/photo/scan.view.js');
  assert.match(src, /c\.draftNote/); assert.match(src, /photo-draft/); assert.match(src, /CONFIDENCE_REASONS/);
});

test('no IPA engine is wired in the photo path and no product text says otherwise', () => {
  assert.equal(createPhonikudPlaceholder().ipa, undefined);
  assert.equal(createPhonikudPlaceholder().installed, false);
  assert.ok(describeAdapters().some((d) => /not wired/.test(d)));
  assert.equal(typeof createPhotoEngines({}).ipa, 'undefined');
  assert.match(read('docs/photo/ENGINES.md'), /No IPA engine/);
  for (const f of ['README.md', 'src/shell/about.view.js', 'src/shell/how.view.js']) {
    for (const line of read(f).split('\n')) assert.ok(!(/\b(photo|scan|camera)\b/i.test(line) && /\bIPA\b/.test(line)), `${f}: ${line.slice(0, 120)}`);
  }
});
