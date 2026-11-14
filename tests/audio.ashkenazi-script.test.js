// The Ashkenazi reading written in pointed Hebrew letters (tools/audio/ashkenazi_script.mjs): the three Ashkenazi rules the
// transliteration engine applies to its Latin letters, applied to the Hebrew itself. The check is the engine's own: the Israeli
// transliteration of the Hebrew-letter text must equal the engine's Ashkenazi transliteration of the original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ashkenaziScript, checkAgainstEngine } from '../tools/audio/ashkenazi_script.mjs';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';

const same = (s) => s.replace(/oi/g, 'oy');   // the engine writes the holam+yod diphthong 'oi' in the Israeli scheme and 'oy' in the Ashkenazi one

test('kamatz becomes holam, tav without dagesh becomes samekh, tzere gains a yod', () => {
  assert.equal(ashkenaziScript('בָּרוּךְ אַתָּה'), 'בֹּרוּךְ אַתֹּה'.normalize('NFC'));
  assert.equal(ashkenaziScript('שַׁבָּת'), 'שַׁבֹּס'.normalize('NFC'));
  assert.equal(ashkenaziScript('לֵישֵׁב'), 'לֵישֵׁיב'.normalize('NFC'));
  assert.equal(ashkenaziScript('בְּמִצְוֹתָיו'), 'בְּמִצְוֹסֹב'.normalize('NFC'));
  assert.equal(ashkenaziScript('תָּו'), 'תֹּב'.normalize('NFC'));
});

test('cantillation and maqaf are cleaned as for any Israeli render', () => {
  assert.equal(ashkenaziScript('כִּי־לְשִׁמְךָ'), 'כִּי לְשִׁמְךֹ'.normalize('NFC'));
});

test('the Hebrew-letter text reads as the engine\'s Ashkenazi reading on at least 99% of the Ashkenazi rows that play the Israeli clip', () => {
  const rows = loadManifestFull().filter((e) => e.tradition === 'ashkenazi' && e.status === 'plays-israeli' && !e.aliasOf);
  if (!rows.length) return;
  const ok = rows.filter((r) => { const c = checkAgainstEngine(r.text); return same(c.want) === same(c.got); }).length;
  assert.ok(ok / rows.length >= 0.99, `${ok} of ${rows.length}`);
});

test('owner decision A: Sephardi rows given the Israeli clip are only rows whose two readings are the same, each a byte copy, captioned as the same reading', async () => {
  const fs = await import('node:fs');
  const { respell } = await import('../src/pronunciation/forTradition.js');
  const { statusLabel } = await import('../src/shell/audio-labels.js');
  const rows = loadManifestFull().filter((e) => e.source === 'israeli-clip-same-reading');
  if (!rows.length) return;
  for (const e of rows.slice(0, 400)) {
    // 13 Nov 2026 letter audit: an Ashkenazi letter clip that said the wrong thing may also be a copy of the Israeli clip.
    const ashkenaziLetter = e.tradition === 'ashkenazi' && e.kind === 'letter';
    assert.ok(e.tradition === 'sephardi' || ashkenaziLetter, e.path); assert.equal(e.status, 'synthetic-unreviewed', e.path);
    if (!ashkenaziLetter) assert.equal(respell(e.text, 'sephardi'), respell(e.text, 'israeli'), e.path);
    const meta = JSON.parse(fs.readFileSync(`${e.path}.meta.json`, 'utf8'));
    assert.ok(fs.readFileSync(e.path).equals(fs.readFileSync(meta.copyOf)), e.path);
  }
  assert.equal(statusLabel('synthetic-unreviewed', 'sephardi', 'israeli-clip-same-reading'), 'Sephardi voice, the same reading as Israeli');
});
