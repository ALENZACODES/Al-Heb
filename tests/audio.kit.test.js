import { test } from 'node:test';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildKit, allFiles, SCENARIOS, MARKERS, clipMinutes, clipSeconds, hebLetters, KIT_TRADITIONS } from '../tools/audio/session_kit.mjs';
import { section } from '../tools/audio/recording_script.mjs';

const R = new URL('..', import.meta.url).pathname;
const manifest = loadManifestFull(R);

for (const t of KIT_TRADITIONS) for (const v of ['m', 'f']) {
  test(`kit ${t}-${v}: every required clip appears exactly once, in session order, none optional/alias`, () => {
    const kit = buildKit(manifest, t, v);
    const want = manifest.filter((e) => e.tradition === t && e.voice === v && !e.optional && !e.aliasOf).map((e) => e.path.replace(/\.mp3$/, '.wav')).sort();
    assert.deepEqual(kit.rows.map((r) => r.file).sort(), want);
    assert.deepEqual(kit.rows.map((r) => r.seq), kit.rows.map((_, i) => i + 1));
    assert.ok(kit.rows.every((r, i) => i === 0 || r.session >= kit.rows[i - 1].session));
    assert.ok(kit.rows.every((r) => r.file.startsWith(`audio/${v}/${t}/`)));
  });
  test(`kit ${t}-${v}: markers: room tone opens each session, reference+room tone closes it, breaks exist, all markers defined`, () => {
    const kit = buildKit(manifest, t, v);
    for (const s of kit.sessions) {
      const rows = kit.rows.filter((r) => r.session === s.n);
      assert.ok(rows[0].marker.split('+').includes('RT'), `session ${s.n} start`);
      assert.match(rows.at(-1).marker, /REF\+RT$/);
    }
    const used = new Set(kit.rows.flatMap((r) => r.marker.split('+')));
    for (const m of used) assert.ok(m in MARKERS, m);
    assert.ok(used.has('B'));
  });
}

test('estimate: fast < likely < slow, positive, and the labels say assumption', () => {
  const kit = buildKit(manifest, 'israeli', 'm');
  const e = kit.estimate;
  assert.ok(e.fast.boothHours > 0 && e.fast.boothHours < e.likely.boothHours && e.likely.boothHours < e.slow.boothHours);
  assert.ok(e.fast.recordingOnlyHours < e.fast.boothHours);
  assert.match(SCENARIOS.likely.label, /assumption/);
  assert.equal(e.clips, kit.rows.length);
});

test('clip time model: longer text takes longer; takes multiply', () => {
  const short = { kind: 'word', group: 'lesson-word', text: 'אָב' };
  const longLine = { kind: 'line', group: 'prayer-line', text: 'שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ יְהוָה אֶחָד' };
  assert.ok(clipSeconds(longLine) > clipSeconds(short));
  assert.equal(hebLetters('שָׁלוֹם'), 4);
  assert.ok(clipMinutes(longLine, SCENARIOS.slow) > clipMinutes(longLine, SCENARIOS.fast));
  assert.equal(section(short), 'lesson-word');
});

test('ashkenazi kit has no israeli-only content; israeli kit includes phrasebook and anchors', () => {
  const a = buildKit(manifest, 'ashkenazi', 'm').rows.map((r) => r.section);
  assert.ok(!a.includes('phrase') && !a.includes('anchor'));
  const i = buildKit(manifest, 'israeli', 'f').rows.map((r) => r.section);
  assert.ok(i.includes('phrase') && i.includes('anchor') && i.includes('letter-variant') && i.includes('letter-sound'));
});

test('prayer block starts a fresh session and keeps lines before words per prayer', () => {
  const kit = buildKit(manifest, 'israeli', 'm');
  const firstPrayer = kit.rows.find((r) => r.section.startsWith('prayer'));
  const before = kit.rows.filter((r) => r.session === firstPrayer.session);
  assert.ok(before.every((r) => r.section.startsWith('prayer') || r.section === 'word' || r.section === 'line'), 'no alphabet/phrasebook in the prayer session');
  const sh = kit.rows.filter((r) => r.id.startsWith('adon-olam-1'));
  assert.ok(sh.findIndex((r) => r.section === 'prayer-line') < sh.findIndex((r) => r.section === 'prayer-word'));
});

test('kit files on disk are current, and the docs are honest: no recordings, unmeasured', () => {
  for (const [rel, text] of allFiles(manifest)) {
    assert.equal(fs.readFileSync(path.join(R, rel), 'utf8'), text, `${rel} is stale (node tools/audio/session_kit.mjs --write)`);
  }
  const plan = fs.readFileSync(path.join(R, 'docs/voices/kit/israeli-m/session-plan.md'), 'utf8');
  assert.match(plan, /No recordings exist/); assert.match(plan, /NOT measured/); assert.match(plan, /\[ \] /);
  assert.match(fs.readFileSync(path.join(R, 'docs/voices/kit/README.md'), 'utf8'), /nothing has been recorded/);
});
