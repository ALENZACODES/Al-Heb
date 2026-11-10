// The 200 Rimon stills (tools/images/rimon/stills.mjs) and the files built from them: every still has a place in the
// app, every trigger has a still, the prompts carry the same character blocks word for word, and nothing is stale.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STILLS, TRIGGER_DOCS, CHARACTER, STYLE, FRAMING, NEVER, RESPECT, PALETTE, REFERENCE, promptFor, pathOf } from '../tools/images/rimon/stills.mjs';
import { validate, buildOutputs, stillIds, scanPresent, presentText, OUT } from '../tools/images/rimon/build.mjs';
import { TRIGGERS, SURFACES, STILL_COUNT, stillPath, QUIET_DAYS } from '../src/shell/rimon-triggers.js';
import { STILL_IDS } from '../src/shell/rimon-stills.generated.js';
import { parseCsv } from '../tools/images/ingest_lib.mjs';
import { specFor, loadTargets } from '../tools/images/ingest_queue.mjs';
import { TEXT_RE, PROVENANCE_RE } from '../tools/meta/text.mjs';
import { listShipFiles } from '../tools/deploy/make-dist.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('exactly 200 stills, numbered 1..200, unique slugs, every one tied to a known trigger and group', () => {
  assert.equal(STILLS.length, 200);
  assert.equal(STILL_COUNT, 200);
  assert.deepEqual(validate(), []);
  assert.equal(new Set(STILLS.map((s) => s.slug)).size, 200);
});

test('every trigger has at least one still, a surface, and a plain-words screen and moment', () => {
  const ids = stillIds();
  for (const [t, def] of Object.entries(TRIGGERS)) {
    assert.ok(ids[t]?.length, `${t} has no still`);
    assert.ok(SURFACES.includes(def.surface), `${t} surface ${def.surface}`);
    assert.ok(TRIGGER_DOCS[t]?.[0] && TRIGGER_DOCS[t]?.[1], `${t} docs`);
    if (def.fallback) assert.ok(TRIGGERS[def.fallback], `${t} falls back to unknown ${def.fallback}`);
  }
  // the moments Duolingo uses its owl for are all covered, several with variety
  assert.ok(ids['answer.correct'].length >= 8 && ids['answer.wrong'].length >= 6);
  for (const g of ['onboarding', 'lessons', 'streak', 'idle', 'greetings', 'shabbat', 'festivals', 'lab', 'books', 'awards', 'reminders', 'screens'])
    assert.ok(STILLS.some((s) => s.group === g), g);
});

test('generated files are up to date (run node tools/images/rimon/build.mjs --present if this fails)', () => {
  for (const [rel, text] of Object.entries(buildOutputs())) assert.equal(read(rel), text, `${rel} is stale`);
  assert.deepEqual(STILL_IDS, stillIds());
  assert.equal(read(OUT.present), presentText(scanPresent()), 'data/images/rimon/present.json does not match the files on disk');
});

test('each prompt carries the four character blocks word for word, the still number and the reference', () => {
  for (const s of STILLS) {
    const p = promptFor(s);
    for (const block of [CHARACTER, STYLE, FRAMING, NEVER]) assert.ok(p.includes(block), `#${s.n} lost a block`);
    assert.ok(p.includes(`#${String(s.n).padStart(3, '0')}`) && p.includes(REFERENCE));
    assert.equal(p.includes(RESPECT), !!s.respect, `#${s.n} respect line`);
  }
  for (const c of Object.values(PALETTE)) assert.match(CHARACTER + STYLE, new RegExp(c));
  // the palette really is the reference picture's (spot colours from the 800 px mascot)
  assert.equal(PALETTE.body, '#DA2933'); assert.equal(PALETTE.sash, '#0A567C');
});

test('festival, Shabbat and synagogue stills carry the respect rules; Yom Kippur has no food; nothing asks for writing', () => {
  for (const s of STILLS.filter((x) => x.group === 'festivals' || x.group === 'shabbat')) assert.equal(s.respect, true, `#${s.n}`);
  for (const s of STILLS.filter((x) => x.trigger === 'holiday.yom-kippur')) assert.match(s.props, /No food/);
  const asks = /\b(writing|lettering|labelled|inscribed|text|words? on)\b/i;
  for (const s of STILLS) assert.doesNotMatch((s.pose + ' ' + s.props).replace(/\bno (writing|letters|numerals|words)[^.;]*/gi, ''), asks, `#${s.n} asks for writing`);
  for (const s of STILLS.filter((x) => /chanukiah/.test(x.props))) assert.match(s.props, /nine candles/);
  // no still for the days Rimon steps aside
  for (const d of QUIET_DAYS) assert.ok(!TRIGGERS[`holiday.${d}`], d);
});

test('no assistant, tool or vendor names in the catalogue, prompts or Rimon code', () => {
  const files = ['tools/images/rimon/stills.mjs', 'tools/images/rimon/build.mjs', OUT.md, OUT.csv, OUT.json, 'src/shell/rimon-triggers.js', 'src/shell/rimon-stage.js', 'docs/images/rimon-stills.html'];
  for (const f of files) for (const ln of read(f).split('\n')) assert.ok(!TEXT_RE.test(ln) && !PROVENANCE_RE.test(ln), `${f}: ${ln.slice(0, 80)}`);
});

test('the order sheet feeds the image ingest: 200 rows, every path has the 512 x 512 WebP spec', () => {
  const [head, ...rows] = parseCsv(read(OUT.csv));
  assert.equal(rows.length, 200);
  const pi = head.indexOf('path'), qi = head.indexOf('prompt');
  rows.forEach((r, i) => {
    assert.equal(r[pi], pathOf(i + 1)); assert.equal(r[pi], stillPath(i + 1));
    assert.deepEqual(specFor(r[pi]), { format: 'webp', width: 512, height: 512, alpha: true, quality: 88, kind: 'still' });
    assert.equal(r[qi], promptFor(STILLS[i]));
  });
  const targets = loadTargets(ROOT);
  assert.equal([...targets.values()].filter((t) => t.group === 'rimon-stills').length, 200);
});

test('stills and present.json ship with the app; the catalogue and prompts do not', () => {
  const ship = new Set(listShipFiles());
  assert.ok(ship.has('data/images/rimon/present.json'));
  for (const n of scanPresent()) assert.ok(ship.has(stillPath(n)), stillPath(n));
  for (const f of [OUT.md, OUT.csv, OUT.json, 'tools/images/rimon/stills.mjs']) assert.ok(!ship.has(f), f);
});

test('the contact sheet reads the generated JSON and the present list', () => {
  const html = read('docs/images/rimon-stills.html');
  assert.match(html, /rimon-stills\.json/);
  assert.match(html, /present\.json/);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/, 'no outside scripts');
});
