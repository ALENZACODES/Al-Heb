import test from 'node:test';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runPipeline } from '../src/photo/pipeline.js';
import { createMockEngine } from '../src/photo/engines/mock.js';
import { buildWordCards, wordAudioId, loadTransliterator, loadLetterInfo, TRADITIONS } from '../src/photo/word-card.js';
import { ACCURACY_NOTICE, NO_TRANSLATION_NOTICE } from '../src/photo/scan.view.js';
import { isLocalHelperUrl } from '../src/photo/engines/local-server.js';

const registry = JSON.parse(readFileSync(new URL('../data/corpus/registry.json', import.meta.url), 'utf8'));
const manifest = loadManifestFull();

test('word card: letters with names, syllables, three transliterations, audio hook', async () => {
  const r = await runPipeline({}, createMockEngine(), { mode: 'sign' });
  const transliterate = await loadTransliterator(); const letterInfo = await loadLetterInfo();
  assert.equal(typeof transliterate, 'function');
  const c = buildWordCards(r, { transliterate, letterInfo })[0];
  assert.equal(c.he, 'בָּרוּךְ');
  assert.equal(c.letters[0].id, 'bet'); assert.equal(c.letters[0].name, 'Bet');
  assert.ok(c.letters.some((l) => l.silent), 'the vav/mater is marked silent');
  assert.equal(c.syllables.length, 2);
  for (const t of TRADITIONS) assert.match(c.translit[t], /^[a-z' ]+$/i);
  assert.notEqual(c.translit.ashkenazi, c.translit.israeli, 'ashkenazi differs (baruch vs boruch)');
  assert.equal(c.audio.kind, 'word'); assert.equal(c.audio.text, c.he); assert.equal(c.audio.canSpeak, true);
});
test('word card: unpointed word gets no invented breakdown or transliteration', async () => {
  const r = await runPipeline({}, { ocr: () => [{ text: 'שלום', x: 0, y: 0, w: 50, h: 20 }] }, { mode: 'sign' });
  const c = buildWordCards(r, { transliterate: await loadTransliterator() })[0];
  assert.equal(c.translit, null); assert.equal(c.letters.length, 0); assert.equal(c.audio.canSpeak, false); assert.match(c.unpointedNote, /no vowel points/);
  assert.equal(r.lines[0].englishStatus, 'unavailable'); assert.equal(r.translationAvailable, false);
});
test('audio hook ids agree with the audio manifest for the real registry (divine name aside)', () => {
  const ids = new Map(manifest.filter((e) => e.kind === 'word' && e.voice === 'm' && e.tradition === 'israeli').map((e) => [e.id, e.text]));
  let checked = 0; const bad = [];
  for (const e of registry.entries) {
    const lines = e.he.split(/\n|׃/u).map((l) => l.trim()).filter(Boolean);
    lines.forEach((ln, li) => {
      const toks = ln.split(/[\s־]+/u).filter(Boolean);
      toks.forEach((tok, ti) => {
        const id = wordAudioId({ matched: true, source: 'registry', id: e.id, lineIndex: li }, registry, ti);
        const text = ids.get(id);
        if (text === undefined) return; // entry not in the manifest
        checked++;
        const norm = (s) => s.normalize('NFC').replace(/[׃]/g, '');
        if (!norm(text).includes(norm(tok)) && !/יְהוָה|אֲדֹנָי/.test(tok + text)) bad.push(`${id}: ${text} vs ${tok}`);
      });
    });
  }
  assert.ok(checked > 50, `only ${checked} words cross-checked`);
  assert.deepEqual(bad.slice(0, 5), []);
});
test('audio hook is null for fuzzy / unmatched lines', () => {
  assert.equal(wordAudioId(null, registry, 0), null);
  assert.equal(wordAudioId({ matched: false }, registry, 0), null);
  assert.equal(wordAudioId({ matched: true, source: 'fixture', id: 'x', lineIndex: 0 }, registry, 0), null);
});
test('notices are honest: synthetic-only, real photos unmeasured; translation unavailable stated; helper URL must be local', () => {
  assert.match(ACCURACY_NOTICE, /145 computer-generated/); assert.match(ACCURACY_NOTICE, /not been measured on real photos/);
  assert.match(NO_TRANSLATION_NOTICE, /unavailable offline/); assert.match(NO_TRANSLATION_NOTICE, /Nothing was sent/);
  assert.ok(isLocalHelperUrl('http://127.0.0.1:8787')); assert.ok(isLocalHelperUrl('http://localhost:8787'));
  assert.ok(!isLocalHelperUrl('https://translate.example.com')); assert.ok(!isLocalHelperUrl('http://127.0.0.1.evil.com')); assert.ok(!isLocalHelperUrl('nonsense'));
});
