import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, ROUTES } from '../src/shell/router.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';
import { ROUTE_SECTION } from '../src/shell/nav-model.js';
import { en } from '../src/shell/i18n.js';
import '../src/shell/nav.strings.js';
import { labelKey } from '../src/shell/nav-model.js';
import { apiUrl, configured, alefHrefFromId, passageHref, OFFLINE_COPY, INTRO } from '../src/ask/model.js';
import { isOnDemand } from '../tools/build-precache.mjs';

test('ask route matches #/ask and is in the Read section', () => {
  const m = matchRoute('#/ask');
  assert.equal(m.route?.name, 'ask');
  assert.equal(m.route.module, '../ask/ask.view.js');
  assert.equal(ROUTE_SECTION.ask, 'read');
  assert.equal(en[labelKey(m.route)], 'Ask the Torah');
  assert.ok(VIEW_FILES.includes('ask/ask.view.js'));
});

test('ask view is on-demand, not first-install precache', () => {
  assert.equal(isOnDemand('src/ask/ask.view.js'), true);
  assert.equal(isOnDemand('src/ask/model.js'), true);
});

test('apiUrl and configured read only explicit settings', () => {
  assert.equal(apiUrl({}), '');
  assert.equal(configured({}), false);
  assert.equal(apiUrl({ ALEF_ASK_TORAH_URL: 'https://ask.example/api/' }), 'https://ask.example/api');
  assert.equal(configured({ ALEF_ASK_TORAH_URL: 'https://ask.example/api' }), true);
  const document = { querySelector: (s) => (s === 'meta[name="alef-ask-torah"]' ? { getAttribute: () => ' https://x.test/v1/ ' } : null) };
  assert.equal(apiUrl({ document }), 'https://x.test/v1');
});

test('alef reader links for Torah verses, Sefaria otherwise', () => {
  assert.equal(alefHrefFromId('genesis.2.7'), '#/torahreader?book=genesis&chapter=2&verse=7');
  assert.equal(alefHrefFromId('deuteronomy.6.4'), '#/torahreader?book=deuteronomy&chapter=6&verse=4');
  assert.equal(alefHrefFromId('esther.9.20'), null);
  assert.equal(passageHref({ id: 'exodus.20.1', link_kind: 'alef', href: '#/torahreader?book=exodus&chapter=20&verse=1' }), '#/torahreader?book=exodus&chapter=20&verse=1');
  assert.equal(passageHref({ id: 'esther.1.1', href: 'https://www.sefaria.org/Esther.1.1', link_kind: 'sefaria' }), 'https://www.sefaria.org/Esther.1.1');
});

test('user-facing copy names no AI product', () => {
  const banned = /chatgpt|claude|gemini|openai|anthropic|google cloud|vertex|gradio|llm/i;
  assert.equal(banned.test(OFFLINE_COPY), false);
  assert.equal(banned.test(INTRO), false);
  const route = ROUTES.find((r) => r.name === 'ask');
  assert.equal(banned.test(route.title), false);
});

// ---------- static answers, no server (2026-11-10) ----------
import { readFileSync, readdirSync } from 'node:fs';
import { buildIndex, buildTopics, lookup, parseRef, tokens, shardOf } from '../src/ask/match.js';
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const bank = JSON.parse(read('data/ask/bank.json'));
const topics = JSON.parse(read('data/ask/topics.json'));
const ctxM = { ix: buildIndex(bank.questions), topicIx: buildTopics(topics.topics), rw: topics.rewrite };
const answer = (id) => JSON.parse(read(`data/ask/answers/${String(shardOf(id, bank.shards)).padStart(2, '0')}.json`))[id];

test('the answer bank ships every vetted question, its answers in 32 files, and never spells the Name', () => {
  assert.ok(bank.questions.length >= 10000);
  assert.equal(bank.shards, 32);
  assert.equal(readdirSync(new URL('../data/ask/answers/', import.meta.url)).length, 32);
  const name = /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה/;
  for (const f of readdirSync(new URL('../data/ask/answers/', import.meta.url))) assert.doesNotMatch(read('data/ask/answers/' + f), name, f);
  assert.doesNotMatch(read('data/ask/bank.json'), name); assert.doesNotMatch(read('data/ask/topics.json'), name);
  for (const s of bank.starters) assert.ok(lookup(ctxM, s), 'every starter has a vetted answer: ' + s);
});
test('the bank and its code stay out of the first install', () => {
  for (const f of ['data/ask/bank.json', 'data/ask/topics.json', 'data/ask/answers/00.json', 'src/ask/match.js']) assert.equal(isOnDemand(f), true, f);
});
test('a named verse matches only that verse; a verse with no note is shown as the verse itself', () => {
  assert.equal(parseRef('what does gen 1 1 say'), 'genesis.1.1');
  assert.equal(parseRef('Exodus chapter 20 verse 2'), 'exodus.20.2');
  const m = lookup(ctxM, 'What does Deuteronomy 6:4 say?');
  assert.ok(m.answerId || m.verseId);
  if (m.answerId) assert.ok((answer(m.answerId).passages || []).some((p) => p.ref === 'Deuteronomy 6:4'));
});
test('messy wording reaches the right topic; nonsense gets no answer instead of a guess', () => {
  const evil = lookup(ctxM, 'like what is evle according to the 5 books');
  assert.ok(evil && /in_torah/.test(answer(evil.answerId).verdict));
  const rabbi = lookup(ctxM, 'is rabbi in torah tho or did they make that up later');
  assert.equal(answer(rabbi.answerId).verdict, 'not_in_torah');
  assert.equal(lookup(ctxM, 'zxqv plorb wimble'), null);
  assert.deepEqual(tokens('Shabbos'), ['shabbat']);
});
test('the page answers from the bank with no network call to a server', async () => {
  const src = read('src/ask/ask.view.js');
  assert.doesNotMatch(src, /method:\s*'POST'|\/ask'\s*,|apiUrl\(/, 'no server endpoint on the learner path');
  const { N } = await import('./torahread.fakedom.js');
  const { mount, NO_ANSWER } = await import('../src/ask/ask.view.js');
  const root = new N('div');
  const fetchJson = async (p) => JSON.parse(read(p));
  await mount(root, { fetchJson, query: { q: 'Is the Shema in the Torah?' } });
  await new Promise((r) => setTimeout(r, 50));
  const text = root.textContent;
  assert.match(text, /Deuteronomy 6:4/);
  assert.ok(root.queryAll('.ask-starter').length >= 4, 'starter questions on the empty screen');
  assert.ok(NO_ANSWER.includes('vetted'));
});
test('placement: a Home tile, the Torah reader asks about any verse, and Hebrew and English labels', () => {
  assert.match(read('src/shell/home.view.js'), /\['ask', '#\/ask'\]/);
  assert.match(read('src/torahreader/torahreader.view.js'), /#\/ask\?q=\$\{encodeURIComponent\(`What does \$\{chapterData\.ref\}:\$\{v\.n\} say\?`\)\}/);
  assert.match(read('src/shell/i18n.js'), /'nav\.ask': 'שאלות על התורה'/);
});
