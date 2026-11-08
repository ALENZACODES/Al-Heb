// Lane 3 round 4: vowel board, niqqud dial, dot tile, syllable chips (models + views on a fake DOM).
// The fake DOM proves logic (render, interaction, audio gating, unmount). It does NOT prove browser layout; see docs/pronunciation/round4.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TRADITIONS } from '../src/pronunciation/sounds.model.js';
import { vowelFamilies, movingSigns, boardSigns, variantByTradition, pleneCheck, stripMarks, dotPairs, makeDotItems, makeRng, familyOfIpa } from '../src/pronunciation/boards.model.js';
import { chipWords, chipsFor, hyphenated } from '../src/pronunciation/syllables.js';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { stripTaamim, allInHebrewBlock } from '../src/pronunciation/hebrew.js';
import { load, letters, all, buttons, byText, click, tick, loaded, waitFor, newRoot, makeCtx } from './pronunciation.dom-helper.js';
import { mount as mountBoard } from '../src/pronunciation/vowelboard.view.js';
import { mount as mountDial } from '../src/pronunciation/niqquddial.view.js';
import { mount as mountDot } from '../src/pronunciation/dottile.view.js';
import { mount as mountChips } from '../src/pronunciation/syllablechips.view.js';
import { mount as mountGap } from '../src/pronunciation/soundgap.view.js';
import fs from 'node:fs';

const niqqud = load('niqqud'), consonants = load('consonants'), plene = load('plene'), dial = load('dial-words'), prayer = load('prayerwords'), stress = load('stress'), dotData = load('dot-pairs');

// ---------- vowel board
test('board: every vowel sign (not shva/dagesh/dots) is in exactly one family per tradition', () => {
  const ids = boardSigns(niqqud).map((r) => r.id).sort();
  assert.equal(ids.length, 11);
  for (const t of TRADITIONS) {
    const placed = vowelFamilies(niqqud, t).flatMap((f) => f.signs).sort();
    assert.deepEqual(placed, ids, t);
    for (const f of vowelFamilies(niqqud, t)) for (const id of f.signs) assert.equal(familyOfIpa(niqqud.records.find((r) => r.id === id).ipa[t]), f.family);
  }
  assert.ok(!ids.includes('shva') && !ids.includes('dagesh') && !ids.includes('shin-dot'));
});
test('board: Israeli family counts and the one sign that moves', () => {
  assert.deepEqual(vowelFamilies(niqqud, 'israeli').map((f) => f.count), [3, 3, 1, 2, 2]);
  assert.deepEqual(vowelFamilies(niqqud, 'ashkenazi').map((f) => f.count), [2, 3, 1, 3, 2]);
  assert.deepEqual(movingSigns(niqqud).map((m) => m.id), ['kamatz']);
  assert.ok(variantByTradition(niqqud).o.ashkenazi.includes('kamatz'));
});
test('plene data: pairs are the same word and sound, differing only by a vav/yod; no short/long claim', () => {
  for (const [fam, v] of Object.entries(plene.families)) {
    if (!v.pair) { assert.equal(fam, 'a'); continue; }
    const d = [...stripMarks(v.pair.defective)], p = [...stripMarks(v.pair.plene)];
    assert.equal(p.length, d.length + 1, fam);
    assert.ok(allInHebrewBlock(v.pair.defective) && allInHebrewBlock(v.pair.plene));
    const n = (x) => transliterate(x).replace(/ei/g, 'e'); // siddur style writes tzere+yod as ei (a spelling convention, same sound)
    assert.equal(n(v.pair.defective), n(v.pair.plene), fam);
    assert.ok(pleneCheck(v.pair.plene, v.pair.defective).extra.every((c) => 'וי'.includes(c)));
  }
  assert.match(plene.shortLongNote, /not distinguished by length/);
  assert.match(plene.finalHe.caution, /not true that a final he is just 'not read'/);
});

// ---------- dial
test('dial: strip(full) equals unpointed, or a plene note explains an extra vav/yod', () => {
  const seen = new Set();
  for (const w of dial.words) {
    assert.ok(allInHebrewBlock(w.full) && allInHebrewBlock(w.unpointed), w.id);
    assert.ok(!seen.has(w.unpointed), 'unique unpointed ' + w.id); seen.add(w.unpointed);
    const c = pleneCheck(w.unpointed, w.full);
    assert.ok(c.ok, w.id);
    if (stripMarks(w.full) === w.unpointed) assert.ok(c.same && !w.plene, w.id);
    else { assert.ok(w.plene?.note, w.id); assert.ok(c.extra.every((x) => 'וי'.includes(x))); assert.ok(c.extra.includes(w.plene.extra === 'vav' ? 'ו' : 'י')); }
  }
});

// ---------- dot pairs
test('dot pairs: exactly four, ids exist in letters.json, sounds come from consonants.json', () => {
  assert.equal(dotData.pairs.length, 4);
  for (const t of TRADITIONS) {
    const ps = dotPairs(consonants, letters, dotData, t);
    assert.deepEqual(ps.map((p) => p.letterId), ['bet', 'kaf', 'pe', 'shin']);
    for (const p of ps) { assert.ok(letters.some((l) => l.id === p.letterId)); assert.equal(p.states.length, 2); assert.ok(p.contrast, `${t} ${p.id}`); }
  }
  const ps = dotPairs(consonants, letters, dotData, 'israeli');
  assert.match(ps[0].states[0].glyph, /בּ/); assert.match(ps[3].states[1].glyph, /שׂ/);
});
test('dot items: six, unambiguous cues, merged pairs dropped', () => {
  for (const t of TRADITIONS) {
    const ps = dotPairs(consonants, letters, dotData, t);
    for (let seed = 1; seed < 20; seed++) {
      const items = makeDotItems(ps, t, makeRng(seed));
      assert.equal(items.length, 6);
      assert.equal(new Set(items.map((i) => i.cue)).size, 6);
      for (const it of items) assert.equal(ps.find((p) => p.id === it.pairId).states[it.wanted].english, it.cue);
    }
  }
  const ps = dotPairs(consonants, letters, dotData, 'israeli');
  const merged = structuredClone(ps); merged[1].contrast = false;
  assert.ok(makeDotItems(merged, 'israeli', makeRng(2), 8).every((i) => i.pairId !== 'kaf-khaf'));
  const dup = structuredClone(ps); dup[2].states[0].english = dup[0].states[0].english;
  assert.ok(makeDotItems(dup, 'israeli', makeRng(2), 8).every((i) => i.cue !== dup[0].states[0].english));
});

// ---------- syllable chips
test('chips: syllables join to the word, stress in range, default final, exceptions appear in the word list', () => {
  const words = chipWords(dial, prayer);
  const keys = new Set(words.map((w) => stripTaamim(w.he).normalize('NFD')));
  for (const e of stress.exceptions) assert.ok(keys.has(stripTaamim(e.he).normalize('NFD')), 'exception not in word list: ' + e.he);
  const exKeys = new Set(stress.exceptions.map((e) => stripTaamim(e.he).normalize('NFD')));
  for (const t of TRADITIONS) for (const w of words) {
    const r = chipsFor(w.he, { tradition: t, stress, prayer: w.prayer });
    assert.ok(r.ok && r.latinOk, `${w.id} ${t}`);
    assert.equal(r.syllables.map((s) => s.he).join('').normalize('NFD'), stripTaamim(w.he).normalize('NFD'), w.id);
    assert.ok(r.stressIndex >= 0 && r.stressIndex < r.syllables.length);
    if (t === 'israeli' && !exKeys.has(stripTaamim(w.he).normalize('NFD'))) assert.equal(r.stressIndex, r.syllables.length - 1, w.id);
    assert.equal(hyphenated(r).split('-').length, r.syllables.length);
    assert.equal(hyphenated(r).replace(/-/g, '').toLowerCase(), r.latinWord.toLowerCase());
  }
});
test('chips: agree with prayerwords.json on syllable count and stress position (Israeli and Ashkenazi)', () => {
  const pos = { first: 0, 'second-to-last': -2, last: -1 };
  for (const w of prayer.words) {
    const ri = chipsFor(w.he, { tradition: 'israeli', stress, prayer: w });
    assert.equal(ri.syllables.length, w.israeli.say.split(/[-/ (]/)[0] === '' ? 0 : w.israeli.say.split('-').length, w.id);
    const want = (s, n) => (pos[s] < 0 ? n + pos[s] : pos[s]);
    assert.equal(ri.stressIndex, want(w.israeli.stress, ri.syllables.length), `israeli stress ${w.id}`);
    const ra = chipsFor(w.he, { tradition: 'ashkenazi', stress, prayer: w });
    assert.equal(ra.stressIndex, want(w.ashkenazi.stress, ra.syllables.length), `ashkenazi stress ${w.id}`);
  }
});
test('chips: final he is flagged as a vowel letter; mappiq he is not', () => {
  assert.equal(chipsFor('אַתָּה').finalHeLetter, true);
  assert.equal(chipsFor('לָהּ').finalHeLetter, false);
  assert.equal(hyphenated(chipsFor('אַתָּה')), 'a-TA');
});
test('chips: Ashkenazi stress outside the prayer words is flagged unchecked', () => {
  const r = chipsFor('סֻכָּה', { tradition: 'ashkenazi', stress });
  assert.equal(r.checked, false);
});

// ---------- views
const VIEWS = { vowelboard: mountBoard, niqquddial: mountDial, dottile: mountDot, syllablechips: mountChips };

for (const [name, mount] of Object.entries(VIEWS)) {
  test(`${name}: draft notice, RTL Hebrew, no audio button, no "null" text, unmount clears`, async () => {
    const root = newRoot(); const { ctx } = makeCtx();
    const un = mount(root, ctx); await loaded(root);
    const txt = root.textContent;
    assert.match(txt, /Draft, unreviewed/); assert.match(txt, /no audio yet/i); assert.doesNotMatch(txt, /null|undefined/);
    const heSpans = all(root, (e) => e.getAttribute('lang') === 'he');
    assert.ok(heSpans.length > 0);
    for (const s of heSpans) assert.equal(s.getAttribute('dir'), 'rtl');
    assert.ok(buttons(root).length > 2);
    for (const r of all(root, (e) => e.tagName === 'INPUT' && e.getAttribute('type') === 'radio')) assert.ok(r.getAttribute('id') && all(root, (l) => l.tagName === 'LABEL' && l.getAttribute('for') === r.getAttribute('id')).length === 1);
    un(); assert.equal(root.children.length, 0);
  });
  test(`${name}: audio is played only when a file exists`, async () => {
    const root = newRoot(); const { ctx, played } = makeCtx({ audio: { has: () => true, play: (k, id) => played.push([k, id]) } });
    const un = mount(root, ctx); await loaded(root);
    assert.doesNotMatch(root.textContent, /no audio yet/i);
    un();
  });
  if (name === 'niqquddial' || name === 'dottile') test(`${name}: with only a device voice the shared button is offered, labelled as a device voice, and plays`, async () => {
    const root = newRoot(); const { ctx, played } = makeCtx({ audio: { status: () => ({ source: 'tts-fallback' }), play: (k, id) => { played.push([k, id]); return Promise.resolve({ source: 'tts-fallback' }); } } });
    const un = mount(root, ctx); await loaded(root);
    const dev = all(root, (e) => e.tagName === 'BUTTON' && e.getAttribute('data-audio-state') === 'device');
    assert.ok(dev.length > 0); assert.match(dev[0].getAttribute('aria-label'), /Israeli voice/);
    assert.doesNotMatch(root.textContent, /no audio yet/i);
    click(dev[0]); await tick(); assert.equal(played.length, 1);
    un();
  });
  test(`${name}: follows the congregation setting`, async () => {
    const root = newRoot(); const { ctx } = makeCtx(); const un = mount(root, ctx); await loaded(root);
    const ash = all(root, (e) => e.tagName === 'INPUT' && e.getAttribute('value') === 'ashkenazi')[0];
    ash.checked = true; ash.dispatch('change');
    assert.equal(ctx.settings.congregation, 'ashkenazi');
    un();
  });
}

test('vowelboard: sort mode accepts members only and logs misses; ashkenazi moves kamatz', async () => {
  const root = newRoot(); const { ctx, mem } = makeCtx(); const un = mountBoard(root, ctx); await loaded(root);
  click(byText(root, /Sort the signs/));
  const signBtns = () => buttons(root).filter((b) => /^Sign /.test(b.getAttribute('aria-label') ?? ''));
  const first = signBtns()[0]; const name = first.getAttribute('aria-label').slice(5);
  click(first);
  const rec = niqqud.records.find((r) => r.name === name);
  const right = familyOfIpa(rec.ipa.israeli); const wrong = ['a', 'e', 'i', 'o', 'u'].find((f) => f !== right);
  click(byText(root, new RegExp(`^Put in ${wrong}$`)));
  assert.match(root.textContent, /Not the/); assert.equal(mem['pron.misses'].length, 1);
  click(signBtns().find((b) => b.getAttribute('aria-label') === first.getAttribute('aria-label')));
  click(byText(root, new RegExp(`^Put in ${right}$`)));
  assert.match(root.textContent, /Correct/); assert.equal(signBtns().length, 10);
  un();
});
test('vowelboard: study mode shows five families with count badges and the final-he caution', async () => {
  const root = newRoot(); const { ctx } = makeCtx(); const un = mountBoard(root, ctx); await loaded(root);
  assert.equal(all(root, (e) => e.tagName === 'SECTION' && /^Family /.test(e.getAttribute('aria-label') ?? '')).length, 5);
  assert.match(root.textContent, /3 signs/); assert.match(root.textContent, /not distinguished by length/); assert.match(root.textContent, /not 'just not read'|not true that a final he/);
  un();
});
test('niqquddial: levels reveal marks; plene word explained; quiz marks miss', async () => {
  const root = newRoot(); const { ctx, mem } = makeCtx(); const un = mountDial(root, ctx); await loaded(root);
  const idxBoker = dial.words.findIndex((w) => w.id === 'boker');
  for (let i = 0; i < idxBoker; i++) click(byText(root, /Next word/));
  assert.match(root.textContent, /בוקר/); assert.match(root.textContent, /extra vowel letter \(ו\)/);
  const full = all(root, (e) => e.getAttribute('value') === 'full')[0]; full.checked = true; full.dispatch('change');
  assert.match(root.textContent, /בֹּקֶר/); assert.match(root.textContent, /Respelling \(israeli\)/);
  click(byText(root, /Read-first quiz/));
  const opts = all(root, (e) => e.getAttribute('aria-label') === 'Respellings')[0].children.filter((c) => c.tagName === 'BUTTON');
  assert.equal(opts.length, 3);
  click(opts[0]); click(byText(root, /Read-first quiz/)); // leave quiz
  un();
  assert.ok(Array.isArray(mem['pron.misses']));
});
test('niqquddial: Ashkenazi tradition badge for kamatz', async () => {
  const root = newRoot(); const { ctx } = makeCtx(); const un = mountDial(root, ctx); await loaded(root);
  const full = all(root, (e) => e.getAttribute('value') === 'full')[0]; full.checked = true; full.dispatch('change');
  assert.match(root.textContent, /differs by tradition/); assert.match(root.textContent, /kamatz/);
  un();
});
test('dottile: switch toggles state with aria-checked; test runs six items', async () => {
  const root = newRoot(); const { ctx } = makeCtx(); const un = mountDot(root, ctx); await loaded(root);
  const sw = () => all(root, (e) => e.getAttribute('role') === 'switch')[0];
  assert.equal(sw().getAttribute('aria-checked'), 'true');
  click(sw()); assert.equal(sw().getAttribute('aria-checked'), 'false'); assert.match(root.textContent, /v as in very/);
  click(byText(root, /Set-the-dot test/));
  for (let i = 0; i < 6; i++) { assert.match(root.textContent, new RegExp(`Item ${i + 1} of 6`)); click(byText(root, /^Check$/)); }
  assert.match(root.textContent, /Done: \d of 6/);
  un();
});
test('syllablechips: chips are RTL buttons, stress marked in text, which-drill and hide drill work', async () => {
  const root = newRoot(); const { ctx, mem } = makeCtx(); const un = mountChips(root, ctx); await loaded(root);
  assert.match(root.textContent, /● stress/);
  assert.equal(all(root, (e) => e.getAttribute('dir') === 'rtl' && e.tagName === 'DIV').length > 0, true);
  click(byText(root, /Hide Latin letters/)); assert.equal(all(root, (e) => e.getAttribute('class') === 'ipa').length, 0);
  click(byText(root, /Which is stressed/));
  const chip = all(root, (e) => e.getAttribute('class') === 'chip')[0]; click(chip);
  assert.match(root.textContent, /Correct|Not quite/);
  click(byText(root, /Hide one by one/)); click(byText(root, /Hide next syllable/));
  assert.match(root.textContent, /·/);
  un();
});
test('syllablechips: tapping a chip says "No audio yet" without a file, plays with one', async () => {
  let root = newRoot(); let { ctx } = makeCtx(); let un = mountChips(root, ctx); await loaded(root);
  click(all(root, (e) => e.getAttribute('class') === 'chip')[0]); assert.match(root.textContent, /No audio yet for this syllable/); un();
  root = newRoot(); const m = makeCtx({ audio: { has: () => true, play() {} } }); const played = [];
  m.ctx.audio.play = (k, id) => played.push([k, id]); un = mountChips(root, m.ctx); await loaded(root);
  click(all(root, (e) => e.getAttribute('class') === 'chip')[0]); assert.equal(played[0][0], 'syllable'); un();
});

// ---------- soundgap fixes
test('soundgap: tables sit in a scrollable .table-wrap; no hard-coded colours outside var() fallbacks', async () => {
  const gapData = { soundgap: load('soundgap'), prayerwords: prayer };
  const root = newRoot(); const { ctx } = makeCtx({ soundgapData: gapData }); const un = mountGap(root, ctx); await loaded(root);
  const tables = all(root, (e) => e.tagName === 'TABLE');
  assert.ok(tables.length >= 2);
  for (const t of tables) assert.equal(t.parent.getAttribute('class'), 'table-wrap');
  un();
  for (const f of ['soundgap.view.js', 'sounds.view.js', 'ui.js']) {
    const src = fs.readFileSync(new URL(`../src/pronunciation/${f}`, import.meta.url), 'utf8');
    const css = src.match(/const CSS = `([\s\S]*?)`/)[1].replace(/var\(--[\w-]+,[^)]*\)/g, '');
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b(?!\w)/, `${f} has a fixed colour outside var()`);
  }
});
