// Remaining fixes after the 11 November full site check: D-12 (shin and sin dots agree everywhere), D-20 (audio credits
// say what the clips are), D-34 (one spelling of niqqud on screen), M-06 (every book's story question can be answered)
// and the Books tile count (M-01).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { storyCheck, placeable, firstSentence } from '../src/books/check.js';
import * as C from '../src/lib/counts.js';

const root = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const J = (p) => JSON.parse(read(p));
const SHIN_DOT = 'ׁ', SIN_DOT = 'ׂ';

// ---------- D-12 ----------
test('D-12: every shin/sin description puts the shin dot on the right (sh) and the sin dot on the left (s)', () => {
  const niq = J('data/pronunciation/niqqud.json').records;
  const shinDot = niq.find((r) => r.id === 'shin-dot'), sinDot = niq.find((r) => r.id === 'sin-dot');
  assert.equal(shinDot.shape, 'ש' + SHIN_DOT); assert.match(shinDot.position, /right/); assert.equal(shinDot.ipa.israeli, '[ʃ]');
  assert.equal(sinDot.shape, 'ש' + SIN_DOT); assert.match(sinDot.position, /left/); assert.equal(sinDot.ipa.israeli, '[s]');
  const cons = J('data/pronunciation/consonants.json').letters.shin;
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) assert.match(cons.say[t], /sh with the right dot; Sin says s with the left dot/);
  const letter = J('data/letters/letters.json').find((l) => l.id === 'shin');
  assert.match(letter.sound.en, /^sh .*dot on the left, is s/);
  const mn = J('data/letters/mnemonics.json');
  const list = [...(mn.letters || []), ...(mn.variants || [])];
  assert.match(list.find((m) => m.id === 'shin').sound, /dot on the right \(shin\); s .* dot on the left \(sin\)/);
  assert.match(list.find((m) => m.id === 'sin').shape, /upper left/);
  assert.match(J('data/letters/confusables.json').sets.find((c) => c.id === 'shin-sin').hint, /shin has its dot on the upper right \(sh\); sin has its dot on the upper left \(s\)/i);
  const sym = J('data/builder_symbols.json');
  const all = JSON.stringify(sym);
  assert.match(all, /"id":"shin-dot","nikud":"[^"]+","translit":"nekudat shin","meaning_en":"Right dot: sh"/);
  assert.match(all, /"id":"sin-dot","nikud":"[^"]+","translit":"nekudat sin","meaning_en":"Left dot: s"/);
  // lesson 1 teaches shin with the shin dot, and its word carries the shin dot
  const r01 = J('data/curriculum/lessons.json').lessons.find((l) => l.id === 'r01');
  assert.ok(r01.vowels.includes('shin-dot') && !r01.vowels.includes('sin-dot'));
  for (const w of r01.words) assert.ok(w.he.normalize('NFD').includes(SHIN_DOT), w.he);
  const r20 = J('data/curriculum/lessons.json').lessons.find((l) => l.id === 'r20');
  assert.ok(r20.goals.some((g) => /dot on the left of Sin and on the right of Shin/.test(g)));
});

test('D-12: no "sin" description is paired with the right dot, and no "shin" with the left, in the letter and lesson data', () => {
  const files = ['data/curriculum/lessons.json', 'data/letters/letters.json', 'data/letters/mnemonics.json', 'data/letters/memory-chain.json',
    'data/letters/confusables.json', 'data/pronunciation/consonants.json', 'data/pronunciation/niqqud.json', 'data/pronunciation/soundgap.json',
    'data/pronunciation/dot-pairs.json', 'data/firstday/onramp.json', 'data/firstday/first10.json', 'data/speak/pairs.json', 'data/speak/minimal-pairs.json'];
  // a wrong pairing: "shin ... left dot" or "sin ... right dot" in one clause, unless the clause also names the other letter's own dot
  const wrong = /\bshin\b[^,;().]{0,24}\bleft\b|\bleft[- ]?(hand )?dot\b[^,;.]{0,6}\(shin\)|\bsin\b[^,;().]{0,24}\bright\b|\bright[- ]?(hand )?dot\b[^,;.]{0,6}\(sin\)/i;
  for (const f of files) {
    // clauses: split at sentence ends, semicolons, commas and " and ", so "the left of Sin and on the right of Shin" is two clauses
    const hits = read(f).split(/(?<=[.;,])\s|\n|\sand\s/).filter((s) => wrong.test(s) && !/shin with the (dot on the )?left/i.test(s));
    assert.deepEqual(hits, [], f);
  }
});

test('D-12: a transliteration with "sh" never sits on a sin dot, and "s" never on a shin dot (one-shin words in the data)', () => {
  const bad = [];
  const walk = (o, f) => {
    if (Array.isArray(o)) { for (const v of o) walk(v, f); return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.he === 'string' && typeof o.translit === 'string') {
      const he = o.he.normalize('NFD'), tr = o.translit.toLowerCase();
      if ((he.match(/ש/g) || []).length === 1) {
        if (he.includes(SIN_DOT) && tr.includes('sh') && !tr.replace(/sh/g, '').includes('s')) bad.push(`${f}: ${o.he} ${o.translit}`);
        if (he.includes(SHIN_DOT) && !tr.includes('sh') && tr.includes('s')) bad.push(`${f}: ${o.he} ${o.translit}`);
      }
    }
    for (const v of Object.values(o)) walk(v, f);
  };
  for (const f of ['data/curriculum/lessons.json', 'data/games/mitzvot.json', 'data/curriculum/dialogues.json', 'data/curriculum/gender-pairs.json', 'data/firstday/buildable-words.json']) {
    walk(f.endsWith('buildable-words.json') ? J(f) : J(f), f);
  }
  assert.deepEqual(bad, []);
  const shmitah = J('data/games/mitzvot.json').mitzvot.find((m) => m.translit === 'shmitah');
  assert.equal(shmitah.he, 'שְׁמִטָּה', 'shmitah is spelled with shin (Deuteronomy 15:1)');
});

// ---------- D-20 ----------
test('D-20: the audio credit says what the clips are (synthetic, cloud text-to-speech, nothing recorded) and stays unverified', () => {
  const e = J('data/legal/attributions.json').entries.find((x) => x.id === 'audio-voices');
  assert.doesNotMatch(e.usedFor, /A few short single-word synthetic clips|everything else uses the browser voice/);
  assert.match(e.usedFor, /synthetic/); assert.match(e.usedFor, /None is recorded by a person/);
  assert.match(e.licence, /not cleared/); assert.match(e.licence, /docs\/audio\/CONTRACT\.md/);
  assert.equal(e.status, 'unverified'); assert.equal(e.commercialUse, 'unknown');
  const summary = J('data/audio/summary.json');
  assert.equal(summary.recorded, 0, 'the credit says nothing is recorded by a person; summary.json agrees');
});

// ---------- D-34 ----------
test('D-34: learner-visible text spells it "niqqud" (or "vowel marks"); "nikkud" and "nikud" appear only in ids and file names', () => {
  const walk = (d) => readdirSync(join(root, d)).flatMap((n) => { const p = `${d}/${n}`; return statSync(join(root, p)).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
  const bad = [];
  for (const f of [...walk('src'), ...walk('preview')]) {
    const text = read(f);
    // string literals that read like prose (contain a space)
    // a prose string: quoted, contains a space, no code punctuation
    for (const m of text.matchAll(/(['"`])([^'"`\n]*\bnik+ud\b[^'"`\n]*)\1/gi)) {
      const lit = m[2];
      if (/\s/.test(lit) && !/[(){}=;:]/.test(lit)) bad.push(`${f}: ${lit.slice(0, 80)}`);
    }
  }
  assert.deepEqual(bad, []);
});

// ---------- M-06 ----------
test('M-06: all 63 books have a story question, and every option is a sentence a reader can place in the story', () => {
  const index = J('data/books/index.json').books;
  assert.equal(index.length, C.BOOKS);
  assert.equal(placeable('Yes.'), false); assert.equal(placeable('"Yes.'), false); assert.equal(placeable('Rain.'), false);
  assert.equal(placeable('"I\'m fine," he says.'), true); assert.equal(placeable('Tamar is flying to London.'), true);
  let n = 0;
  for (const b of index) {
    const book = J(`data/books/${b.id}.json`);
    const c = storyCheck(book);
    assert.ok(c, `${b.id} has a question`); n += 1;
    assert.equal(c.options.filter((o) => o.correct).length, 1, b.id);
    assert.equal(new Set(c.options.map((o) => o.text.toLowerCase())).size, 3, b.id);
    for (const o of c.options) assert.ok(placeable(o.text), `${b.id}: "${o.text}" can be placed in the story`);
    // no wrong option also appears on a page before the right answer's page (that would make two answers right)
    const pages = book.pages.map((p, i) => ({ n: Number.isInteger(p?.n) ? p.n : i + 1, en: String(p?.en || '').toLowerCase() }));
    for (const o of c.options.filter((x) => !x.correct)) {
      assert.ok(!pages.some((p) => p.n < c.answerPage && p.en.includes(o.text.toLowerCase())), `${b.id}: "${o.text}" also happens before page ${c.answerPage}`);
    }
    for (const o of c.options) assert.ok(book.pages.some((p) => firstSentence(p.en) === o.text), `${b.id}: option comes from the book`);
  }
  assert.equal(n, 63);
});

// ---------- M-01: the Books tile ----------
test('M-01: the Books tile counts the shelf through counts.js, not a typed number', () => {
  const s = read('src/shell/showcase.js');
  assert.doesNotMatch(s, /'63 little books|756 pictured pages'/);
  assert.match(s, /\$\{BOOKS\} little books, \$\{fmt\(BOOK_PICTURED_PAGES\)\} pictured pages/);
  const idx = J('data/books/index.json').books;
  assert.equal(C.BOOK_PICTURED_PAGES, idx.reduce((a, b) => a + (b.picturedPages || 0), 0));
});
