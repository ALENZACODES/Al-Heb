// Writing (#/write): the journal, typed Hebrew answers and sentence rewriting. Unit tier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WRITING_KEY, NAME_SHOWN, showName, dayKey, promptFor, normalizeState, saveEntry, journalStreak, exportText, heKey, spellingKey, gradeHebrew, freeTextItems, rewriteItems, pickRound, recordAnswer, REWRITE_ASK, MAX_ANSWERS } from '../src/writing/writing.js';
import { ROUTES, matchRoute } from '../src/shell/router.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const prompts = json('data/curriculum/prompts.json'); const pack = json('data/talk/pack.json');
const at = (y, m, d, h = 9) => new Date(y, m - 1, d, h).getTime();
const NAME = 'יהוה';

test('the Name is shown as ה׳ in every prompt, with its prefix kept, and never spelled out', () => {
  assert.equal(showName(`שְׁמַע יִשְׂרָאֵל יְְהוָה אֱלֹהֵינוּ`).includes(NAME_SHOWN), true);
  assert.equal(showName(`הודו ל${NAME} כי טוב`), `הודו ל${NAME_SHOWN} כי טוב`);
  assert.equal(showName('שלום עולם'), 'שלום עולם');
  let withName = 0;
  for (const p of [...prompts.morning, ...prompts.evening, ...prompts.shabbatEve, ...Object.values(prompts.holidays).flat()]) {
    const shown = showName(p.he).replace(/[֑-ׇ]/g, '');
    assert.ok(!shown.includes(NAME), `${p.id} still spells the Name`);
    if (p.he.replace(/[֑-ׇ]/g, '').includes(NAME)) { withName++; assert.ok(shown.includes(NAME_SHOWN), p.id); }
  }
  assert.ok(withName > 0, 'the bank does hold lines with the Name, so the check means something');
});

test('one prompt a day: Shabbat-eve lines on Friday, morning lines before three, evening lines after, a new line each day', () => {
  assert.equal(promptFor(prompts, at(2026, 11, 13)).kind, 'shabbatEve');           // a Friday
  assert.equal(promptFor(prompts, at(2026, 11, 11, 9)).kind, 'morning'); assert.equal(promptFor(prompts, at(2026, 11, 11, 20)).kind, 'evening');
  assert.equal(promptFor(prompts, at(2026, 11, 11, 8)).id, promptFor(prompts, at(2026, 11, 11, 11)).id, 'the same line all morning');
  const ids = new Set(); for (let d = 1; d <= 15; d++) { const p = promptFor(prompts, at(2026, 3, d, 9)); if (p.kind === 'morning') ids.add(p.id); }
  assert.ok(ids.size >= 12, 'the lines go round');
  assert.equal(promptFor({}, at(2026, 11, 11)), null);
  const used = new Set(); for (let d = 0; d < 60; d++) for (const h of [9, 20]) used.add(promptFor(prompts, at(2026, 1, 1, h) + d * 86400000).id);
  assert.equal(used.size, prompts.morning.length + prompts.evening.length + prompts.shabbatEve.length, 'every morning, evening and Shabbat-eve line is reached');
});

test('journal: one entry a day, saved text kept as written, an empty save removes it, the run of days forgives Friday and Saturday', () => {
  let s = normalizeState(null);
  s = saveEntry(s, { ms: at(2026, 11, 9), prompt: { id: 'm01', kind: 'morning' }, text: '  Thankful for coffee.  ' });
  s = saveEntry(s, { ms: at(2026, 11, 10), prompt: { id: 'm02', kind: 'morning' }, text: 'A long day.' });
  s = saveEntry(s, { ms: at(2026, 11, 10, 21), prompt: { id: 'e02', kind: 'evening' }, text: 'A long day, a good one.' });
  assert.equal(s.entries.length, 2); assert.equal(s.entries[0].day, '2026-11-10'); assert.equal(s.entries[0].text, 'A long day, a good one.'); assert.equal(s.entries[1].text, 'Thankful for coffee.');
  assert.equal(journalStreak(s.entries, at(2026, 11, 10)), 2); assert.equal(journalStreak(s.entries, at(2026, 11, 11)), 2, 'today not written yet does not break it');
  assert.equal(journalStreak(s.entries, at(2026, 11, 12)), 0);
  const week = ['2026-11-11', '2026-11-12', '2026-11-15', '2026-11-16'].map((day) => ({ day }));   // Wed, Thu, (Fri, Sat skipped), Sun, Mon
  assert.equal(journalStreak(week, at(2026, 11, 16)), 4);
  assert.equal(journalStreak([{ day: '2026-11-12' }, { day: '2026-11-16' }], at(2026, 11, 16)), 1, 'a missed Sunday does break it');
  assert.equal(saveEntry(s, { ms: at(2026, 11, 10), prompt: null, text: '   ' }).entries.length, 1);
  const text = exportText(s, (id) => prompts.morning.find((p) => p.id === id) || prompts.evening.find((p) => p.id === id));
  assert.match(text, /^My Aleph Journal/); assert.match(text, /2026-11-10\n.*\nA long day, a good one\./); assert.ok(!text.replace(/[֑-ׇ]/g, '').includes(NAME));
  assert.equal(dayKey(at(2026, 1, 5)), '2026-01-05'); assert.equal(WRITING_KEY, 'writing.v1');
  assert.deepEqual(normalizeState({ entries: [{ text: 5 }, null], answers: 'x' }), { entries: [], answers: [] });
});

test('typed answers: vowel points, punctuation and final letters do not count; a helper letter more or less is still right; one letter off is shown, not counted', () => {
  const item = { he: 'שולחן לשלושה, בבקשה', accept: ['שולחן לשלוש, בבקשה'] };
  assert.deepEqual(gradeHebrew('שולחן לשלושה בבקשה', item), { ok: true, kind: 'exact', model: item.he });
  assert.equal(gradeHebrew('שֻׁלְחָן לִשְׁלוֹשָׁה, בְּבַקָּשָׁה!', item).kind, 'spelling');
  assert.equal(gradeHebrew('שולחנ לשלושה בבקשה', item).kind, 'exact', 'a final letter typed as an ordinary one');
  assert.equal(gradeHebrew('שולחן לשלוש בבקשה', item).kind, 'exact', 'another stored wording');
  assert.equal(gradeHebrew('שלחן לשלושה בבקשה', item).kind, 'spelling'); assert.equal(gradeHebrew('שלחן לשלושה בבקשה', item).ok, true);
  assert.deepEqual([gradeHebrew('שולחן לשלושה בבקשת', item).kind, gradeHebrew('שולחן לשלושה בבקשת', item).ok], ['close', false]);
  assert.equal(gradeHebrew('כיסא לשניים', item).kind, 'wrong'); assert.equal(gradeHebrew('   ', item).kind, 'empty'); assert.equal(gradeHebrew('shulchan', item).kind, 'latin');
  assert.equal(heKey('מַה־שְּׁלוֹמְךָ?'), 'מה שלומכ'); assert.equal(spellingKey('שולחן אימא'), spellingKey('שלחן אמא'));
  const items = freeTextItems(pack);
  assert.ok(items.length >= 200);
  for (const it of items) { assert.ok(it.en && it.he && it.id); assert.equal(gradeHebrew(it.he, it).kind, 'exact', it.he); for (const a of it.accept) assert.equal(gradeHebrew(a, it).ok, true, a); assert.ok(!it.he.includes(NAME)); }
  const man = items.find((x) => x.he === 'אני לא מבין'); assert.equal(gradeHebrew('אני לא מבינה', man).ok, true, 'the woman\'s form of a line is a right answer');
});

test('rewrite: every answer comes from a stored form, differs from the sentence given, and is graded like any typed answer', () => {
  const items = rewriteItems(pack); const kinds = {};
  for (const it of items) {
    kinds[it.kind] = (kinds[it.kind] || 0) + 1;
    assert.ok(REWRITE_ASK[it.kind], it.kind); assert.notEqual(heKey(it.from), heKey(it.he), it.id); assert.equal(gradeHebrew(it.he, it).kind, 'exact'); assert.equal(gradeHebrew(it.from, it).ok, false, `${it.id}: the sentence as given is not the answer`);
    assert.ok(it.en && it.answerEn);
  }
  assert.ok(kinds.feminine >= 20 && kinds.toWoman >= 5 && kinds.plural >= 20 && kinds.negative >= 20, JSON.stringify(kinds));
  const pl = items.find((x) => x.id === 'n-כרטיס-pl'); assert.equal(pl.from, 'איפה הכרטיס?'); assert.equal(pl.he, 'איפה הכרטיסים?'); assert.equal(pl.answerEn, 'Where are the tickets?');
  const neg = items.find((x) => x.id === 'n-כרטיס-neg'); assert.equal(neg.he, 'אין לי כרטיס'); assert.equal(neg.answerEn, 'I do not have a ticket.');
  assert.equal(new Set(items.map((x) => x.id)).size, items.length);
});

test('rounds put lines not yet seen first; typed answers are kept, newest first, up to a limit', () => {
  const items = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `i${n}` })); let k = 0; const rng = () => ((k = (k * 7 + 3) % 11) / 11);
  const round = pickRound(items, 4, rng, new Set(['i1', 'i2', 'i3']));
  assert.deepEqual(round.slice(0, 3).map((x) => x.id).sort(), ['i4', 'i5', 'i6']); assert.equal(round.length, 4);
  let s = normalizeState(null);
  for (let i = 0; i < MAX_ANSWERS + 5; i++) s = recordAnswer(s, { at: i, drill: 'answer', ask: `i${i}`, typed: 'x', ok: i % 2 === 0 });
  assert.equal(s.answers.length, MAX_ANSWERS); assert.equal(s.answers[0].at, MAX_ANSWERS + 4);
});

test('the route: #/write opens the Writing screen, fetched on demand, with copy in plain words', async () => {
  const r = ROUTES.find((x) => x.name === 'write');
  assert.equal(r.pattern, '/write'); assert.equal(matchRoute('/write').route.name, 'write');
  const pre = readFileSync(join(root, 'precache-manifest.js'), 'utf8');
  const installed = JSON.parse(/self\.ALEF_PRECACHE\s*=\s*(\[[\s\S]*?\]);/.exec(pre)[1]);
  assert.ok(!installed.some((f) => f.startsWith('src/writing/')), 'not in the first install'); assert.ok(pre.includes('src/writing/writing.view.js'), 'listed on demand');
  const { COPY } = await import('../src/writing/writing.view.js');
  for (const s of [...Object.values(COPY), ...Object.values(REWRITE_ASK)]) assert.ok(!/\bAI\b|artificial|machine|model|algorithm/i.test(s), s);
});

test('the screen: an entry is saved and listed; a typed answer is checked, shown with the answer, and kept', async () => {
  const { createDocument, ev, flush } = await import('./rimon.fakedom.js');
  const doc = createDocument(); globalThis.document = doc;
  const { mount } = await import('../src/writing/writing.view.js');
  const sel = (n, q) => n.querySelector(q); const tick = () => flush(10); const press = (n) => n.dispatchEvent(ev('click'));
  const mem = {}; const store = { get: (k) => mem[k], set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); } };
  const host = doc.createElement('div'); doc.body.append(host);
  const unmount = await mount(host, { store, writingData: { prompts, pack }, clock: { now: () => at(2026, 11, 11, 9) }, rng: () => 0.42 });
  assert.equal(sel(host, '#wr-title').textContent, 'Writing');
  assert.match(sel(host, '#wr-streak').textContent, /No entries yet/);
  assert.ok(!host.textContent.replace(/[֑-ׇ]/g, '').includes(NAME));
  sel(host, '#wr-entry').value = 'Grateful for a quiet morning.'; press(sel(host, '#wr-save')); await tick();
  assert.equal(mem[WRITING_KEY].entries[0].text, 'Grateful for a quiet morning.'); assert.equal(mem[WRITING_KEY].entries[0].day, '2026-11-11');
  assert.match(sel(host, '#wr-streak').textContent, /1 day in a row\. 1 entry in all\./); assert.match(sel(host, '#wr-history').textContent, /Grateful for a quiet morning\./);
  press(sel(host, '[data-tab=answer]'));
  press(sel(host, '#wr-check')); await tick();
  assert.match(sel(host, '#wr-feedback').textContent, /Type your answer in Hebrew first/);
  sel(host, '#wr-answer').value = 'זה לא נכון בכלל'; press(sel(host, '#wr-check')); await tick();
  assert.match(sel(host, '#wr-feedback').textContent, /Answer: /); assert.equal(mem[WRITING_KEY].answers.length, 1); assert.equal(mem[WRITING_KEY].answers[0].drill, 'answer');
  assert.equal(mem[WRITING_KEY].entries.length, 1, 'the journal is untouched by a drill');
  press(sel(host, '[data-tab=rewrite]'));
  assert.ok(Object.values(REWRITE_ASK).includes(host.querySelector('h2').textContent));
  unmount();
});

test('copy-work: letter by letter, with missing and extra letters counted and a speed in letters a minute', async () => {
  const { copyCheck, copySpeed, copyItems } = await import('../src/writing/writing.js');
  assert.deepEqual((({ exact, accuracy, missing, extra }) => ({ exact, accuracy, missing, extra }))(copyCheck('שלום עולם', 'שָׁלוֹם  עוֹלָם')), { exact: true, accuracy: 100, missing: 0, extra: 0 });
  const r = copyCheck('שלום עילם', 'שלום עולם'); assert.equal(r.exact, false); assert.deepEqual(r.marks.filter((m) => !m.ok).map((m) => m.ch), ['י']); assert.equal(r.accuracy, 89);
  assert.equal(copyCheck('שלום', 'שלום עולם').missing, 5); assert.equal(copyCheck('שלום עולם!!', 'שלום עולם').extra, 2); assert.equal(copyCheck('תודה', 'תודה.').exact, false, 'punctuation is part of the line');
  assert.equal(copySpeed(30, 30000), 60); assert.equal(copySpeed(30, 0), 0);
  const items = copyItems(pack); assert.ok(items.length >= 100); for (const it of items) assert.equal(copyCheck(it.he, it.he).exact, true);
});

test('the portfolio: journal entries and every typed line in one dated list, searchable, saved as text', async () => {
  const { portfolio, searchPortfolio, portfolioText } = await import('../src/writing/writing.js');
  let s = saveEntry(normalizeState(null), { ms: at(2026, 11, 9), prompt: { id: 'm01', kind: 'morning' }, text: 'Thankful for coffee.' });
  s = recordAnswer(s, { at: at(2026, 11, 10), drill: 'answer', ask: 'a', typed: 'קפה, בבקשה', ok: true });
  s = recordAnswer(s, { at: at(2026, 11, 11), drill: 'copy', ask: 'b', typed: 'שלום עילם', ok: false });
  const all = portfolio(s);
  assert.deepEqual(all.map((x) => [x.day, x.kind, x.ok]), [['2026-11-11', 'copy', false], ['2026-11-10', 'answer', true], ['2026-11-09', 'journal', null]]);
  assert.equal(searchPortfolio(all, 'COFFEE').length, 1); assert.equal(searchPortfolio(all, 'קָפֶה')[0].kind, 'answer'); assert.equal(searchPortfolio(all, '').length, 3); assert.equal(searchPortfolio(all, 'zebra').length, 0);
  const text = portfolioText(all); assert.match(text, /^My Aleph Writing\n\n2026-11-11 {2}Copy-Work {2}\(not yet\)\nשלום עילם\n/); assert.match(text, /2026-11-09 {2}Journal\nThankful for coffee\./);
});

test('the screen: a copied line is marked and kept, and shows up under My Writing', async () => {
  const { createDocument, ev, flush } = await import('./rimon.fakedom.js');
  const doc = createDocument(); globalThis.document = doc;
  const { mount } = await import('../src/writing/writing.view.js');
  const mem = {}; const store = { get: (k) => mem[k], set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); } };
  const host = doc.createElement('div'); doc.body.append(host); let t = at(2026, 11, 11, 9);
  const press = async (n) => { n.dispatchEvent(ev('click')); await flush(10); };
  const unmount = await mount(host, { store, writingData: { prompts, pack }, clock: { now: () => (t += 1000) }, rng: () => 0.3, query: { part: 'copy' } });
  const box = host.querySelector('#wr-copy'); box.value = 'שלום'; box.dispatchEvent(ev('input'));
  await press(host.querySelector('#wr-copy-check'));
  assert.match(host.querySelector('#wr-copy-result').textContent, /letters a minute/); assert.equal(mem[WRITING_KEY].answers[0].drill, 'copy'); assert.equal(mem[WRITING_KEY].answers[0].typed, 'שלום');
  await press(host.querySelector('[data-tab=portfolio]'));
  assert.match(host.querySelector('#wr-count').textContent, /^1 of 1 piece\./); assert.match(host.querySelector('#wr-portfolio').textContent, /Copy-Work, not yet/);
  unmount();
});

test('translation gym, error-spotting and story endings', async () => {
  const W = await import('../src/writing/writing.js');
  const gym = W.gymItems(pack); assert.ok(gym.length >= 50); for (const g of gym) assert.ok(heKey(g.he).split(' ').length >= 4);
  const errs = W.errorItems(pack); assert.ok(errs.length >= 50);
  for (const e of errs) { assert.notEqual(heKey(e.wrong), heKey(e.he)); assert.equal(gradeHebrew(e.he, e).kind, 'exact'); assert.equal(gradeHebrew(e.wrong, e).ok, false, e.id); assert.ok(W.ERROR_RULE[e.rule]); }
  const t = errs.find((e) => e.id === 'e-כרטיס-number'); assert.equal(t.wrong, 'יש לי שני כרטיס'); assert.equal(t.he, 'יש לי שני כרטיסים'); assert.equal(t.en, 'I have two tickets.');
  const f = errs.find((e) => e.id === 'e-קערה-gender'); assert.equal(f.wrong, 'יש לי שני קערות'); assert.equal(f.he, 'יש לי שתי קערות');
  let opened = 0;
  for (let n = 1; n <= 62; n++) {
    let book; try { book = json(`data/books/book${n}.json`); } catch { continue; }
    const cut = W.storyCut(book); if (!cut) continue; opened++;
    assert.equal(cut.lines.length, book.pages.filter((p) => p.he && p.en).length - 1); assert.ok(cut.ending.he && cut.ending.en);
    assert.ok(![...cut.lines, cut.ending].some((l) => l.he.replace(/[֑-ׇ]/g, '').includes(NAME)), `book ${n}`);
  }
  assert.ok(opened >= 55, `${opened} books can be cut`); assert.equal(W.storyCut({ pages: [{ he: 'א', en: 'a' }] }), null);
  let s = W.saveEnding(normalizeState(null), { at: 5, bookId: 'book1', text: ' And they all went home. ' });
  s = W.saveEnding(s, { at: 9, bookId: 'book1', text: 'And they slept.' });
  assert.equal(s.answers.length, 1); assert.equal(s.answers[0].typed, 'And they slept.');
  assert.deepEqual(W.portfolio(s).map((x) => [x.kind, x.ok]), [['story', null]]); assert.equal(W.saveEnding(s, { at: 10, bookId: 'book1', text: '' }).answers.length, 0);
});

test('the screen: a story is cut one line early, the learner\'s ending is saved, then the real ending is shown', async () => {
  const { createDocument, ev, flush } = await import('./rimon.fakedom.js');
  const doc = createDocument(); globalThis.document = doc;
  const { mount } = await import('../src/writing/writing.view.js');
  const mem = {}; const store = { get: (k) => mem[k], set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); } };
  const host = doc.createElement('div'); doc.body.append(host); const book = json('data/books/book1.json');
  const unmount = await mount(host, { store, writingData: { prompts, pack, books: { 1: book } }, clock: { now: () => at(2026, 11, 13) }, query: { part: 'story', book: '1' } });
  await flush(10);
  const last = book.pages[book.pages.length - 1];
  assert.ok(!host.textContent.includes(last.en), 'the last line is kept back');
  host.querySelector('#wr-ending').value = 'Everyone is happy.'; host.querySelector('#wr-story-show').dispatchEvent(ev('click')); await flush(10);
  assert.ok(host.querySelector('#wr-story-end').textContent.includes(last.en)); assert.equal(mem[WRITING_KEY].answers[0].drill, 'story'); assert.equal(mem[WRITING_KEY].answers[0].ask, book.id);
  host.querySelector('[data-tab=errors]').dispatchEvent(ev('click')); await flush(5);
  assert.equal(host.querySelector('h2').textContent, 'One Thing Is Wrong. Type It Right.');
  unmount();
});

test('postcards: built only from stored greetings, places, lines and sign-offs, plus what the learner types; the Name is never spelled', async () => {
  const W = await import('../src/writing/writing.js'); const stored = new Set(pack.phrases.map((p) => p.he)); const places = new Set(pack.places.map((p) => p.he));
  const c = W.postcardChoices(pack);
  assert.ok(c.greeting.length >= 3 && c.signoff.length >= 2 && c.line.length >= 6); assert.equal(c.place.length, 9);
  for (const x of [...c.greeting, ...c.line, ...c.signoff]) assert.ok(stored.has(x.he), x.he); for (const x of c.place) assert.ok(places.has(x.he));
  const picks = { greeting: c.greeting[0].id, place: 'haifa', line: c.line[0].id, signoff: c.signoff[0].id };
  const card = W.postcard(c, picks, { to: 'דנה', from: 'John' });
  assert.deepEqual(card.he, [`${c.greeting[0].he}, דנה!`, 'חיפה', c.line[0].he, c.signoff[0].he, 'John']); assert.equal(card.en[1], 'Haifa');
  assert.equal(W.postcard(c, picks, { own: `ברוך ${NAME}` }).he[2], `ברוך ${NAME_SHOWN}`); assert.equal(W.postcard(c, picks, {}).he[0], `${c.greeting[0].he}!`);
  assert.equal(W.postcard(c, { ...picks, place: 'mars' }, {}), null);
});

test('the screen: a postcard is put together and kept under My Writing', async () => {
  const { createDocument, ev, flush } = await import('./rimon.fakedom.js');
  const doc = createDocument(); globalThis.document = doc;
  const { mount } = await import('../src/writing/writing.view.js');
  const mem = {}; const store = { get: (k) => mem[k], set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); } };
  const host = doc.createElement('div'); doc.body.append(host);
  const unmount = await mount(host, { store, writingData: { prompts, pack }, clock: { now: () => at(2026, 11, 13) }, query: { part: 'postcard' } });
  assert.ok(host.querySelector('#wr-pc-card').textContent.includes('ירושלים'), 'the card shows the first place');
  const to = host.querySelector('#wr-pc-to'); to.value = 'דנה'; to.dispatchEvent(ev('input'));
  assert.ok(host.querySelector('#wr-pc-card').textContent.includes('דנה'));
  host.querySelector('#wr-pc-save').dispatchEvent(ev('click')); await flush(10);
  assert.equal(mem[WRITING_KEY].answers[0].drill, 'postcard'); assert.ok(mem[WRITING_KEY].answers[0].typed.includes('דנה'));
  unmount();
});
