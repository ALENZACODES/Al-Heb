// The 200 Rimon stills (tools/images/rimon/stills.mjs) and the files built from them: every still has a place in the
// app, every trigger has a still, the prompts carry the same character blocks word for word, and nothing is stale.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STILLS, TRIGGER_DOCS, CHARACTER, STYLE, FRAMING, NEVER, RESPECT, PALETTE, REFERENCE, promptFor, pathOf, fileId, fileStem } from '../tools/images/rimon/stills.mjs';
import { ART, HOLD, REDRAW } from '../tools/images/rimon/art-map.mjs';
import { validate, buildOutputs, stillIds, scanPresent, presentText, OUT, shortPrompt, MASTER_PROMPT } from '../tools/images/rimon/build.mjs';
import { TRIGGERS, SURFACES, STILL_COUNT, stillPath, QUIET_DAYS, pickStill, presentSet, lineFor } from '../src/shell/rimon-triggers.js';
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
    assert.ok(p.includes(`still ${fileId(s.n)} `) && p.includes(REFERENCE));
    assert.ok(shortPrompt(s).includes(s.pose) && shortPrompt(s).length < promptFor(s).length / 3, `#${s.n} short prompt`);
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
  const pi = head.indexOf('path'), qi = head.indexOf('prompt'), si = head.indexOf('prompt_short');
  rows.forEach((r, i) => {
    assert.equal(r[pi], pathOf(i + 1)); assert.equal(r[pi], stillPath(fileId(i + 1), { [fileId(i + 1)]: fileStem(i + 1) }));
    assert.equal(r[si], shortPrompt(STILLS[i]));
    assert.deepEqual(specFor(r[pi]), { format: 'webp', width: 512, height: 512, alpha: true, quality: 88, kind: 'still' });
    assert.equal(r[qi], promptFor(STILLS[i]));
  });
  const targets = loadTargets(ROOT);
  assert.equal([...targets.values()].filter((t) => t.group === 'rimon-stills').length, 200);
});

test('two sets, one map: drawn pictures keep plain numbers and come first; catalogue stills are the a set', () => {
  const ids = stillIds();
  for (const [t, drawn] of Object.entries(ART)) assert.deepEqual(ids[t].slice(0, drawn.length), drawn, t);
  for (const s of STILLS) { assert.match(fileId(s.n), /^a\d{3}$/); assert.ok(ids[s.trigger].includes(fileId(s.n))); assert.equal(pathOf(s.n), `data/images/rimon/v2/rimon-${String(s.n).padStart(3, '0')}-${s.slug}.webp`); }
  // the catalogue pictures already drawn into v2/ are found by their exact file name and listed as present
  const files = JSON.parse(read('data/images/rimon/present.json')).files;
  for (const id of scanPresent().filter((x) => x.startsWith('a'))) assert.ok(fs.existsSync(path.join(ROOT, stillPath(id, files))), id);
  assert.ok(Object.keys(ART).length >= 90, 'most triggers already have a drawn picture');
  for (const block of [CHARACTER, STYLE, FRAMING, NEVER, RESPECT]) assert.ok(MASTER_PROMPT.includes(block));
});

test('stills and present.json ship with the app; the catalogue and prompts do not', () => {
  const ship = new Set(listShipFiles());
  assert.ok(ship.has('data/images/rimon/present.json'));
  const listed = JSON.parse(read('data/images/rimon/present.json')).files;
  for (const n of scanPresent()) assert.ok(ship.has(stillPath(n, listed)), stillPath(n, listed));
  for (const f of [OUT.md, OUT.csv, OUT.json, 'tools/images/rimon/stills.mjs']) assert.ok(!ship.has(f), f);
});

test('the contact sheet reads the generated JSON and the present list', () => {
  const html = read('docs/images/rimon-stills.html');
  assert.match(html, /rimon-stills\.json/);
  assert.match(html, /present\.json/);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/, 'no outside scripts');
});

test('held stills stay off screen; held and redraw notes name real catalogue stills', () => {
  const present = JSON.parse(read('data/images/rimon/present.json')).ids;
  for (const id of Object.keys(HOLD)) {
    assert.ok(!present.includes(id), `${id} is held but listed in present.json`);
    assert.ok(!scanPresent().includes(id), `${id} is held but scanPresent returns it`);
  }
  for (const id of [...Object.keys(HOLD), ...Object.keys(REDRAW)]) assert.match(id, /^a\d{3}$/);
  assert.match(read(OUT.md), /## Held and To Redraw/);
  assert.deepEqual(validate(), []);
});

test('every line Rimon can say has a picture to say it with (its own or a fallback), so no written line goes dark', () => {
  const present = presentSet(JSON.parse(read('data/images/rimon/present.json')));
  const dark = Object.keys(TRIGGERS).filter((t) => TRIGGERS[t].line && !pickStill(t, { present }));
  assert.deepEqual(dark, []);
});

test('a festival with no drawing of its own still greets with its own words, on a borrowed picture', () => {
  const present = presentSet(JSON.parse(read('data/images/rimon/present.json')));
  const own = (STILL_IDS['holiday.hanukkah'] || []).filter((id) => present.has(id));
  const p = pickStill('holiday.hanukkah', { present });
  assert.ok(p, 'Hanukkah gets a picture');
  assert.equal(p.trigger === 'holiday.hanukkah', own.length > 0, 'its own drawing when there is one, a borrowed one otherwise');
  assert.equal(lineFor('holiday.hanukkah').en, 'Happy Hanukkah!');
  // with only the borrowed pictures listed it borrows; add one of its own and that one wins
  const mine = STILL_IDS['holiday.hanukkah'].find((id) => id.startsWith('a'));
  const borrowedOnly = new Set([...present].filter((id) => !STILL_IDS['holiday.hanukkah'].includes(id)));
  assert.notEqual(pickStill('holiday.hanukkah', { present: borrowedOnly })?.trigger, 'holiday.hanukkah');
  assert.equal(pickStill('holiday.hanukkah', { present: new Set([...borrowedOnly, mine]) }).id, mine);
});

test('catalogue file names travel in present.json (drawn ones only), not in the code every visitor loads', () => {
  const json = JSON.parse(read('data/images/rimon/present.json'));
  const drawnA = json.ids.filter((x) => x.startsWith('a'));
  assert.deepEqual(Object.keys(json.files).sort(), [...drawnA].sort());
  for (const id of drawnA) assert.equal(json.files[id], fileStem(Number(id.slice(1))));
  assert.doesNotMatch(read(OUT.js), /STILL_FILES|v2\/rimon-/);
});
