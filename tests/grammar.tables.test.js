// Grammar tables and drills (ideas O2 to O9): data/grammar/tables.json, src/grammar/tables.js, src/grammar/tables.view.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABS, PERSON_ORDER, DRAFT_NOTE, tablesFor, drill, have, adjFor, describe, compare, allHebrew } from '../src/grammar/tables.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const d = JSON.parse(read('data/grammar/tables.json'));
const words = JSON.parse(read('data/vocab/words.json')).words;
const bare = (w) => w.replace(/[֑-ׇ־]/g, '');
/** every letter with its marks in one order, so two spellings of the same pointing compare equal */
const canon = (w) => { let out = '', marks = []; for (const ch of w.normalize('NFC')) { if (ch >= '֑' && ch <= 'ׇ' && ch !== '־') marks.push(ch); else { out += marks.sort().join(''); marks = []; if (ch !== '־') out += ch; } } return out + marks.sort().join(''); };

/** Every single word typed into the data file (not the joined phrases). */
function typedWords() {
  const out = [];
  for (const k of Object.values(d.pronouns)) out.push(...Object.values(k.forms));
  for (const p of d.prepositions) out.push(p.base, ...Object.values(p.forms));
  out.push(...d.numbers.cardinal.m, ...d.numbers.cardinal.f, ...d.numbers.ordinal.m, ...d.numbers.ordinal.f);
  out.push(...d.questions.words.map((w) => w.he), d.existence.yes, d.existence.no, ...d.existence.things.map((t) => t.he));
  for (const a of d.agreement.adjectives) out.push(a.ms, a.fs, a.mp, a.fp);
  for (const n of d.agreement.nouns) out.push(n.s, n.p);
  out.push(...d.construct.pairs.map((c) => c.free));
  return [...new Set(out)];
}

test('every typed word the dictionary also holds has the dictionary\'s pointing, or is a listed look-alike of another word', () => {
  const dict = new Map();
  const add = (he) => { const k = bare(he); dict.set(k, [...(dict.get(k) || []), canon(he)]); };
  for (const w of words) { add(w.he); for (const f of Object.values(w.forms || {})) if (f) add(f); }
  const looks = new Set(d.homographs.words.map(canon));
  let confirmed = 0; const unexplained = [];
  for (const w of typedWords()) {
    const there = dict.get(bare(w));
    if (!there) continue;
    if (there.includes(canon(w))) confirmed++;
    else if (!looks.has(canon(w))) unexplained.push(w);
  }
  assert.deepEqual(unexplained, []);
  assert.ok(confirmed >= 100, `${confirmed} typed words confirmed by the dictionary`);
  for (const w of d.homographs.words) assert.ok(typedWords().some((x) => canon(x) === canon(w)), `stale look-alike entry ${w}`);
});

test('every table has all ten persons, and no two persons share a form unless Hebrew really has one form for both', () => {
  for (const set of [...Object.values(d.pronouns), ...d.prepositions]) {
    assert.deepEqual(Object.keys(set.forms), [...PERSON_ORDER]);
    assert.equal(new Set(Object.values(set.forms).map(canon)).size, 10, set.title || set.id);
  }
  assert.equal(d.prepositions.length, 10);
  // the same endings run through the regular tables: -i for "me", -nu for "us"
  for (const p of d.prepositions) { assert.ok(/י$/.test(bare(p.forms['1s'])), p.id); assert.ok(/נו$/.test(bare(p.forms['1p'])), p.id); }
});

test('numbers: ten of each, the two sets differ, the hour takes the feminine set and prices the masculine', () => {
  const n = d.numbers;
  for (const set of [n.cardinal.m, n.cardinal.f, n.ordinal.m, n.ordinal.f]) assert.equal(new Set(set).size, 10);
  n.cardinal.m.forEach((m, i) => assert.notEqual(canon(m), canon(n.cardinal.f[i])));
  const [, , time, money] = tablesFor(d, 'numbers');
  assert.equal(time.rows.length, 10); assert.ok(time.rows[2].cells[1].he.endsWith(n.cardinal.f[2]));
  assert.equal(money.rows.length, 8, 'prices start at three'); assert.ok(money.rows[0].cells[1].he.startsWith(n.cardinal.m[2]));
});

test('there is / I have: built from whole words only', () => {
  const water = d.existence.things[0];
  assert.equal(have(d, true, '', water).he, 'יֵשׁ מַיִם');
  assert.equal(have(d, false, '1s', water).he, `אֵין ${d.prepositions[0].forms['1s']} מַיִם`);
  assert.equal(have(d, true, '3fs', water).en, 'she has water');
  assert.equal(have(d, false, '1p', water).en, 'we do not have water');
});

test('describing words copy what the noun is, not how its ending looks', () => {
  const noun = (en) => d.agreement.nouns.find((n) => n.en === en); const adj = (en) => d.agreement.adjectives.find((a) => a.en === en);
  assert.equal(adjFor(adj('big'), noun('city'), true), adj('big').fp, 'cities is feminine although it ends like a masculine plural');
  assert.equal(adjFor(adj('big'), noun('table'), true), adj('big').mp, 'tables is masculine although it ends like a feminine plural');
  assert.equal(describe(d, noun('book'), adj('good'), false).he, 'סֵפֶר טוֹב');
  for (const a of d.agreement.adjectives) assert.equal(new Set([a.ms, a.fs, a.mp, a.fp].map(canon)).size, 4, a.en);
  for (const n of d.agreement.nouns) assert.ok(bare(n.the).endsWith(bare(n.s)) && bare(n.the).startsWith('ה'), n.en);
});

test('comparing: three patterns, the describing word agreeing with the first noun', () => {
  const noun = (en) => d.agreement.nouns.find((n) => n.en === en); const big = d.agreement.adjectives.find((a) => a.en === 'big');
  assert.deepEqual(compare(d, 'more', noun('house'), noun('room'), big), { he: 'הַבַּיִת יוֹתֵר גָּדוֹל מִן הַחֶדֶר', en: 'the house is bigger than the room' });
  assert.deepEqual(compare(d, 'most', noun('city'), null, big), { he: `הָעִיר הֲכִי ${big.fs}`, en: 'the city is the biggest' });
  assert.equal(compare(d, 'as', noun('flat, apartment'), noun('house'), big).en, 'the flat is as big as the house');
  for (const en of d.comparing.adjectives) { const a = d.agreement.adjectives.find((x) => x.en === en); assert.ok(a && a.er && a.est, en); }
  for (const en of d.comparing.nouns) assert.ok(noun(en), en);
});

test('"of" pairs: each pair shows the change its rule names', () => {
  for (const c of d.construct.pairs) {
    const first = c.pair.split(' ')[0];
    assert.ok(d.construct.rules[c.rule], c.pair);
    if (c.rule === 'same') assert.equal(canon(first), canon(c.free), c.pair);
    else assert.notEqual(canon(first), canon(c.free), c.pair);
    if (c.rule === 'at') { assert.ok(/ה$/.test(bare(c.free)) && /ת$/.test(bare(first)) && first.includes('\u05b7'), c.pair); assert.equal(bare(first).slice(0, -1), bare(c.free).slice(0, -1)); }
    if (c.rule === 'ei') { assert.ok(/ים$/.test(bare(c.free)) && /י$/.test(bare(first)) && first.includes('\u05b5'), c.pair); assert.equal(bare(first).slice(0, -1), bare(c.free).slice(0, -2)); }
    if (c.rule === 'short') assert.equal(bare(first), bare(c.free).replace(/^בית$/, 'בית'), c.pair);
  }
  assert.ok(d.construct.pairs.length >= 15);
  for (const id of Object.keys(d.construct.rules)) assert.ok(d.construct.pairs.some((c) => c.rule === id), id);
});

test('all eight tabs have tables to show and a practice set that can be answered', () => {
  assert.equal(TABS.length, 8);
  for (const [tab, label] of TABS) {
    const tables = tablesFor(d, tab);
    assert.ok(tables.length >= 1 && tables.every((t) => t.rows.length >= 3 && t.head.length >= 2), label);
    assert.ok(tables.every((t) => t.rows.every((r) => r.say && /[א-ת]/.test(r.say))), `${label}: every row can be heard`);
    const qs = drill(d, tab, 5, 8);
    assert.ok(qs.length >= 6, `${label}: ${qs.length} questions`);
    for (const q of qs) {
      assert.ok(q.options.length >= 2 && q.options.length <= 4);
      assert.ok(q.answer >= 0 && q.answer < q.options.length);
      const shown = q.options.map((o) => o.he || o.text);
      assert.equal(new Set(shown).size, shown.length, `${label}: two answers look the same in "${q.prompt}"`);
    }
    assert.deepEqual(drill(d, tab, 5, 8), qs, 'the same seed gives the same set');
    assert.notDeepEqual(drill(d, tab, 6, 8), qs);
  }
});

test('nothing here spells out or sounds the divine Name, and no line carries cantillation', () => {
  const all = allHebrew(d);
  assert.ok(all.length > 300);
  for (const he of all) { assert.equal(/יהוה/.test(bare(he)), false, he); assert.equal(/[֑-֯]/.test(he), false, he); }
});

test('wording and loading: says the tables are unchecked, loads on the press, installs nothing up front', () => {
  assert.ok(/typed by hand/.test(DRAFT_NOTE) && /No Hebrew teacher has checked/.test(DRAFT_NOTE));
  assert.equal(d.status, 'draft-unreviewed');
  const texts = [DRAFT_NOTE, d.numbers.rule, d.existence.rule, d.agreement.rule, d.comparing.rule, d.construct.rule, ...Object.values(d.construct.rules), ...TABS.map((t) => t[1])];
  for (const s of texts) assert.equal(/\b(AI|artificial|machine|model|algorithm|bot|generated)\b/i.test(s), false, s);
  const page = read('src/grammar/grammar.view.js');
  assert.ok(page.includes("import('./tables.view.js')") && page.includes("loadJson('data/grammar/tables.json')"));
  assert.equal(/^import .*tables/m.test(page), false);
  assert.ok(read('src/grammar/tables.view.js').includes('audioButton('));
  const self = {}; new Function('self', read('precache-manifest.js'))(self);
  assert.deepEqual(self.ALEF_PRECACHE.filter((f) => /grammar\/tables/.test(f)), []);
  for (const f of ['src/grammar/tables.js', 'src/grammar/tables.view.js', 'data/grammar/tables.json']) assert.ok(self.ALEF_ON_DEMAND.includes(f), f);
});
