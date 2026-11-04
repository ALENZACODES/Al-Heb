// derived/_ssml-*.json and ssml-profile.json
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { buildDerived, ssmlFor, phOf, DERIVED_DIR } from '../tools/pronunciation/build_derived.mjs';
import { TRADITIONS } from '../tools/pronunciation/build_variants.mjs';

const d = buildDerived();
const recs = d.shards.filter((s) => s.head.name === 'ssml').flatMap((s) => s.records);

test('every record has three well-formed SSML strings with one phoneme per pointed word', () => {
  assert.equal(recs.length, d.built.records.length);
  for (const r of recs) {
    const rendered = d.built.rendered.get(r.i);
    assert.deepEqual(Object.keys(r.ssml), TRADITIONS);
    for (const t of TRADITIONS) {
      const s = r.ssml[t];
      assert.match(s, /^<speak version="1\.1" xml:lang="he-IL">.*<\/speak>$/s, r.i);
      const opens = (s.match(/<phoneme /g) || []).length; const closes = (s.match(/<\/phoneme>/g) || []).length;
      assert.equal(opens, closes);
      assert.equal(opens, rendered.perWord.filter((w) => w.ipa[t]).length, r.i);
      assert.ok(!/[<>]/.test(s.replace(/<\/?(speak|phoneme)[^>]*>/g, '')), 'unescaped markup in ' + r.i);
    }
  }
});

test('known examples: shabbat / shabbos phonemes, no syllable dots, stress mark kept', () => {
  const shabbat = recs.find((r) => r.ssml.israeli.endsWith('ph="ʃaˈbat">שַׁבָּת</phoneme></speak>'));
  assert.ok(shabbat);
  assert.match(shabbat.ssml.israeli, /ph="ʃaˈbat"/);
  assert.match(shabbat.ssml.ashkenazi, /ph="ˈʃabɔs"/);
  assert.equal(phOf('ʃa.ˈbat'), 'ʃaˈbat');
});

test('ssmlFor escapes XML and leaves unpointed words as plain text', () => {
  const fake = { perWord: [{ he: 'a&b', ipa: { israeli: 'x"y', sephardi: '', ashkenazi: '' } }, { he: 'קאפּ', ipa: { israeli: '', sephardi: '', ashkenazi: '' } }] };
  assert.equal(ssmlFor(fake, 'israeli'), '<speak version="1.1" xml:lang="he-IL"><phoneme alphabet="ipa" ph="x&quot;y">a&amp;b</phoneme> קאפּ</speak>');
});

test('profile states the status and does not claim engine support', () => {
  const p = JSON.parse(fs.readFileSync(join(DERIVED_DIR, 'ssml-profile.json'), 'utf8'));
  assert.equal(p.proofread, false); assert.match(p.status, /not verified by a native speaker/);
  assert.match(p.engines, /NOT been checked/);
  assert.deepEqual(Object.keys(p.traditions), TRADITIONS);
});
