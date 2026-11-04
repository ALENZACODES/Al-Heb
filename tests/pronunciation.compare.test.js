// Compare traditions: runtime lookup data (data/pronunciation/runtime/), pure model, and the view (fake DOM; proves logic, not real-browser layout,
// focus rings or screen-reader behaviour). All content is rule-generated and unverified by a native speaker.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { newRoot, all, buttons, click, tick, loaded, waitFor } from './pronunciation.dom-helper.js';
import { mount } from '../src/pronunciation/compare.view.js';
import { wordKey, shardOf, shardFile, tokenize, variantsOf, syllablesOf, describeDifferences, speechPlan, ssmlFor, STORE_KEY, NOTICE } from '../src/pronunciation/compare.model.js';
import { buildRuntime, RUNTIME_DIR, SHARD_BYTES } from '../tools/pronunciation/build_runtime.mjs';

const read = (f) => JSON.parse(fs.readFileSync(join(RUNTIME_DIR, f), 'utf8'));
const index = read('index.json'); const reasons = read('reasons.json'); const picks = read('picks.json');
const shards = Object.fromEntries(Array.from({ length: index.shards }, (_, i) => [shardFile(i), read(shardFile(i))]));
const compareData = { index, reasons, picks, shards };
const lookup = (he) => { const k = wordKey(he); return shards[shardFile(shardOf(k, index.shards))].w[k]; };

test('runtime files: shards < 150 KB, not underscore-prefixed, current with a fresh build, marked unverified', () => {
  for (const f of fs.readdirSync(RUNTIME_DIR)) { assert.ok(!f.startsWith('_'), f); assert.ok(fs.statSync(join(RUNTIME_DIR, f)).size < SHARD_BYTES, f); }
  const fresh = buildRuntime();
  assert.equal(fresh.shards, index.shards);
  for (const [f, text] of fresh.files) assert.equal(fs.readFileSync(join(RUNTIME_DIR, f), 'utf8'), text, `${f} stale: run node tools/pronunciation/build_runtime.mjs`);
  assert.equal(index.proofread, false); assert.match(index.status, /not verified by a native speaker/);
  assert.equal(Object.values(shards).reduce((n, s) => n + Object.keys(s.w).length, 0), index.words);
});

test('every entry has three IPA variants, a stressed syllable in each, and valid codes and rule ids', () => {
  for (const [f, s] of Object.entries(shards)) for (const [k, e] of Object.entries(s.w)) {
    assert.equal(shardFile(shardOf(k, index.shards)), f, k);
    assert.equal(e.length, 7, k);
    const v = variantsOf(e);
    for (const t of ['israeli', 'sephardi', 'ashkenazi']) { assert.ok(v[t].ipa && v[t].simple, k + t); assert.ok(syllablesOf(v[t].ipa).index >= 0, `${k} ${t} stress`); }
    for (const c of e[5] ? e[5].split(' ') : []) assert.ok(c === 'st' || reasons.codes[c], c);
    for (const ch of e[6]) assert.ok(reasons.stressRules[parseInt(ch, 36)], k);
  }
});

test('lookup covers the words of the course vocabulary, phrasebook and prayer registry', () => {
  const words = JSON.parse(fs.readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words;
  let missing = 0; let checked = 0;
  for (const w of words.slice(0, 1500)) for (const t of tokenize(w.he)) { if (!t.pointed) continue; checked++; if (!lookup(t.he)) missing++; }
  assert.ok(checked > 1000); assert.equal(missing, 0);
  const reg = JSON.parse(fs.readFileSync(new URL('../data/corpus/registry.json', import.meta.url), 'utf8')).entries;
  for (const e of reg.slice(0, 20)) for (const t of tokenize(e.he)) if (t.pointed) assert.ok(lookup(t.he), t.he);
});

test('known examples: shabbat/shabbos, torah/toyreh, bereshit/bereishis', () => {
  assert.deepEqual([variantsOf(lookup('שַׁבָּת')).israeli.simple, variantsOf(lookup('שַׁבָּת')).ashkenazi.simple], ['shabbat', 'shabbos']);
  assert.equal(variantsOf(lookup('תּוֹרָה')).ashkenazi.simple, 'toyreh');
  assert.equal(variantsOf(lookup('בְּרֵאשִׁית')).ashkenazi.simple, 'bereishis');
  assert.equal(variantsOf(lookup('שַׁבָּת')).ashkenazi.ipa, 'ˈʃa.bɔs');
});

test('model: key ignores accents, tokenizer splits on space and maqaf and drops punctuation, reasons name the rules', () => {
  assert.equal(wordKey('שָׁלוֹם֙'), wordKey('שָׁלוֹם'));
  const t = tokenize('בְּכָל־לְבָבְךָ וּבְכָל, abc ׃');
  assert.deepEqual(t.map((x) => x.sep), ['', '-', ' ']);
  assert.equal(t.length, 3); assert.ok(t.every((x) => x.pointed));
  assert.equal(tokenize('שלום')[0].pointed, false);
  const d = describeDifferences([{ entry: lookup('שַׁבָּת') }], reasons);
  assert.equal(d.same, false);
  assert.ok(d.sentences.some((s) => /Kamatz/.test(s)) && d.sentences.some((s) => /Tav without/.test(s)) && d.sentences.some((s) => /^Stress: Israeli and Sephardi stress syllable 2 of 2/.test(s) && /Ashkenazi stresses syllable 1/.test(s)));
  const same = describeDifferences([{ entry: lookup('לֹא') }], reasons);
  assert.equal(same.sentences.some((s) => /^Stress:/.test(s)), false);
});

test('speech plan: Hebrew voice for Israeli, labelled English-voice respelling for the others, SSML only when asked', () => {
  const w = [{ he: 'שַׁבָּת', entry: lookup('שַׁבָּת') }];
  assert.deepEqual(speechPlan('israeli', w), { kind: 'hebrew', lang: 'he-IL', text: 'שַׁבָּת', note: 'a Hebrew voice reading the pointed text' });
  const a = speechPlan('ashkenazi', w); assert.equal(a.kind, 'respelling'); assert.equal(a.text, 'shabbos'); assert.equal(a.lang, 'en-US'); assert.match(a.note, /approximation/);
  assert.equal(speechPlan('sephardi', w).kind, 'respelling');
  const s = speechPlan('ashkenazi', w, { ssml: true }); assert.equal(s.kind, 'ssml'); assert.match(s.text, /ph="ˈʃabɔs"/);
  assert.equal(ssmlFor([{ he: 'a&b', entry: null }], 'israeli'), '<speak version="1.1" xml:lang="he-IL">a&amp;b</speak>');
  assert.equal(speechPlan('israeli', []), null);
});

function setup(over = {}) {
  const root = newRoot();
  const mem = {}; const spoken = []; let cancelled = 0;
  const speech = { speak: (u) => spoken.push(u), cancel: () => { cancelled++; } };
  class U { constructor(t) { this.text = t; } }
  const ctx = { compareData, store: { get: (k) => mem[k], set: (k, v) => { mem[k] = v; } }, speech, UtteranceCtor: U, ...over };
  const unmount = mount(root, ctx);
  return { root, ctx, mem, spoken, unmount, cancelled: () => cancelled };
}
const textOf = (n) => n.textContent;
const inputOf = (root) => all(root, (x) => x.tagName === 'INPUT')[0];
const submit = (root) => all(root, (x) => x.tagName === 'FORM')[0].dispatch('submit');

test('view: typing a word shows three labelled readings with stress, the notice, and the why-sentences; state is stored', async () => {
  const { root, mem } = setup();
  await loaded(root);
  assert.match(textOf(root), /Rule-generated and unverified/);
  assert.equal(NOTICE.includes('native speaker'), true);
  inputOf(root).value = 'שַׁבָּת'; submit(root); await waitFor(() => mem[STORE_KEY]?.text === 'שַׁבָּת' && all(root, (x) => x.tagName === 'SECTION' && x.getAttribute('data-tradition')).length === 3, { message: "result cards and stored state" });
  const cards = all(root, (x) => x.tagName === 'SECTION' && x.getAttribute('data-tradition'));
  assert.deepEqual(cards.map((c) => c.getAttribute('data-tradition')), ['israeli', 'sephardi', 'ashkenazi']);
  assert.match(textOf(cards[0]), /ʃa\.bat/); assert.match(textOf(cards[2]), /ʃa\.bɔs/); assert.match(textOf(cards[2]), /shabbos/);
  assert.ok(all(cards[2], (x) => x.tagName === 'STRONG').length === 1); // exactly one stressed syllable marked
  assert.match(textOf(root), /What differs and why/); assert.match(textOf(root), /Tav without a dagesh/);
  assert.deepEqual(mem[STORE_KEY], { text: 'שַׁבָּת', recent: ['שַׁבָּת'] });
});

test('view: Listen buttons speak Hebrew for Israeli and the respelling (en-US) for Ashkenazi', async () => {
  const { root, spoken } = setup();
  await loaded(root); inputOf(root).value = 'שַׁבָּת'; submit(root); await waitFor(() => all(root, (x) => x.tagName === 'BUTTON' && x.getAttribute('data-play') === 'ashkenazi').length === 1, { message: "all(root, (x) => x.tagName === 'BUTTON' && x.getAttribute('data-play') === 'ashkenazi').length === 1" });
  const play = (t) => all(root, (x) => x.tagName === 'BUTTON' && x.getAttribute('data-play') === t)[0];
  click(play('israeli')); click(play('ashkenazi'));
  assert.deepEqual(spoken.map((u) => [u.text, u.lang]), [['שַׁבָּת', 'he-IL'], ['shabbos', 'en-US']]);
  assert.match(textOf(root), /approximation/);
});

test('view: no speech synthesis => Listen disabled, text still shown', async () => {
  const { root } = setup({ speech: null });
  await loaded(root); inputOf(root).value = 'תּוֹרָה'; submit(root); await waitFor(() => /toyreh/.test(textOf(root)), { message: "/toyreh/.test(textOf(root))" });
  const play = all(root, (x) => x.tagName === 'BUTTON' && x.getAttribute('data-play'));
  assert.equal(play.length, 3); assert.ok(play.every((b) => b.getAttribute('disabled') === ''));
  assert.match(textOf(root), /toyreh/);
});

test('view: phrase with an unknown or unpointed word reports it and compares the rest; pure unknown text says so', async () => {
  const { root } = setup();
  await loaded(root); inputOf(root).value = 'שַׁבָּת שלום'; submit(root); await waitFor(() => /Not in the table, so left out: שלום/.test(textOf(root)), { message: "/Not in the table, so left out: \u05e9\u05dc\u05d5\u05dd/.test(textOf(root))" });
  assert.match(textOf(root), /Not in the table, so left out: שלום/); assert.match(textOf(root), /need vowel points/);
  assert.match(textOf(root), /shabbos/);
  inputOf(root).value = 'zzz'; submit(root); await waitFor(() => /Type a Hebrew word/.test(textOf(root)), { message: "/Type a Hebrew word/.test(textOf(root))" });
  assert.match(textOf(root), /Type a Hebrew word/);
  inputOf(root).value = 'אֲבַרַקְדַבְרָא'; submit(root); await waitFor(() => /Not in the table/.test(textOf(root)) && !/Type a Hebrew word/.test(textOf(root)), { message: "unknown-word result replaces the empty-input message" });
  assert.match(textOf(root), /Not in the table/);
});

test('view: picking an example compares it; the saved text is restored on the next mount', async () => {
  const a = setup(); await loaded(a.root);
  const sel = all(a.root, (x) => x.tagName === 'SELECT')[0];
  assert.ok(all(sel, (x) => x.tagName === 'OPTION').length > 10);
  sel.value = picks.picks[0].he; sel.dispatch('change'); await waitFor(() => /What differs and why/.test(textOf(a.root)), { message: "/What differs and why/.test(textOf(a.root))" });
  assert.match(textOf(a.root), /What differs and why/);
  const b = setup({ store: { get: () => a.mem[STORE_KEY], set: () => {} } }); await waitFor(() => inputOf(b.root).value === picks.picks[0].he, { message: "inputOf(b.root).value === picks.picks[0].he" });
  assert.equal(inputOf(b.root).value, picks.picks[0].he);
  assert.match(textOf(b.root), /Israeli/);
});

test('view: keyboard access (native form, input with a label, real buttons) and unmount cancels speech', async () => {
  const { root, unmount, cancelled } = setup();
  await loaded(root); inputOf(root).value = 'שַׁבָּת'; submit(root); await waitFor(() => all(root, (x) => x.tagName === 'SECTION' && x.getAttribute('data-tradition')).length === 3, { message: "all(root, (x) => x.tagName === 'SECTION' && x.getAttribute('data-tradition')).length === 3" });
  const inp = inputOf(root);
  assert.ok(all(root, (x) => x.tagName === 'LABEL' && x.getAttribute('for') === inp.getAttribute('id')).length === 1);
  assert.ok(all(root, (x) => x.getAttribute('role') === 'status').length === 1);
  assert.ok(all(root, (x) => x.getAttribute('tabindex') === '0').length === 0); // no fake focusable divs
  for (const b of buttons(root)) assert.ok(b.textContent.trim() || b.getAttribute('aria-label'));
  assert.equal(inp.getAttribute('lang'), 'he'); assert.equal(inp.getAttribute('dir'), 'rtl');
  unmount(); assert.equal(cancelled(), 1);
});

test('view: lookup data that cannot load shows a calm message, not a crash', async () => {
  const root = newRoot();
  mount(root, { compareData: { index: undefined }, store: null });
  const orig = globalThis.fetch; globalThis.fetch = async () => ({ ok: false, status: 500 });
  try { await waitFor(() => /could not be loaded|Loading|Type a Hebrew/.test(textOf(root)), { message: 'no load message' }); assert.match(textOf(root), /could not be loaded|Loading|Type a Hebrew/); } finally { globalThis.fetch = orig; }
});
