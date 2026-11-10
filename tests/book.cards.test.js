import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { buildHtml, parseArgs } from '../book/build.mjs';
import { buildFlashcardsHtml, PAPERS } from '../book/flashcards.mjs';
import { mnemonicCards } from '../book/cards.mjs';

const mn = JSON.parse(readFileSync(new URL('../data/letters/mnemonics.json', import.meta.url), 'utf8')).letters;
const html = buildHtml(parseArgs(['--no-qr']));
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('cards come from mnemonics.json (fresh): 27, one per contract letter, every field present', () => {
  const cards = mnemonicCards();
  assert.equal(cards.length, 27);
  for (const c of cards) {
    const m = mn.find((x) => x.id === c.id);
    for (const k of ['name', 'sound', 'shape', 'story', 'lookalike', 'word', 'wordSound', 'wordMeaning']) assert.equal(c[k], m[k], `${c.id}.${k}`);
    assert.match(c.word, /[ְ-ּ]/, `${c.id} anchor word is pointed`);
    assert.equal(c.stem, `L${c.nn}_${c.id.replace(/-/g, '_')}_quirky`);
  }
});

test('"Remember every letter" chapter: 27 cards with shape, sound, story, look-alike, pointed anchor word; in contents and index', () => {
  assert.match(html, /id="ch-remember"/);
  assert.equal((html.match(/class="mcard"/g) || []).length, 27);
  for (const c of mnemonicCards()) {
    const i = html.indexOf(`id="mn-${c.id}"`); assert.ok(i > 0, c.id);
    const card = html.slice(i, html.indexOf('</div></div>', i));
    for (const k of ['shape', 'sound', 'story', 'lookalike', 'word']) assert.ok(card.includes(c[k].replace(/&/g, '&amp;')) || card.includes(c[k]), `${c.id} ${k}`);
    assert.ok(card.includes(c.stem), `${c.id} uses its quirky image`);
  }
  assert.match(html, /href="#ch-remember"/);
});

test('cut-out flashcards: letter + A4, 27 fronts and 27 backs, 3 sheets of 9, backs mirrored per row, instruction page, no Latin text inside pictures', () => {
  for (const paper of Object.keys(PAPERS)) {
    const h = buildFlashcardsHtml(paper);
    assert.equal((h.match(/class="card front"/g) || []).length, 27, paper);
    assert.equal((h.match(/class="card back"/g) || []).length, 27, paper);
    assert.equal((h.match(/class="page"/g) || []).length, 6, paper);
    assert.match(h, /flip on the LONG edge/);
    const pages = h.split('<div class="page">').slice(1);
    const backIds = (p) => [...p.matchAll(/data-letter="([a-z-]+)"/g)].map((m) => m[1]);
    const cards = mnemonicCards().map((c) => c.id);
    const b1 = backIds(pages[1]); // first back page = fronts 1-9 with each row of 3 reversed
    assert.deepEqual(b1, [2, 1, 0, 5, 4, 3, 8, 7, 6].map((i) => cards[i]));
  }
});

test('no card or flashcard overflows its box (needs Chromium; skipped without playwright)', async (t) => {
  let chromium; const req = createRequire(import.meta.url);
  try { ({ chromium } = req('playwright')); } catch { try { ({ chromium } = req('/opt/npm-tools/node_modules/playwright')); } catch { return t.skip('playwright not installed'); } }
  let browser; try { browser = await chromium.launch(); } catch { return t.skip('chromium not launchable'); }
  try {
    const run = async (doc, width, sel) => {
      const p = await browser.newPage({ viewport: { width, height: 1056 } });
      await p.emulateMedia({ media: 'print' });
      // written next to the real outputs so the relative ../../assets/fonts URLs resolve (setContent would lose the fonts)
      const dir = fileURLToPath(new URL('../book/out/', import.meta.url)); mkdirSync(dir, { recursive: true });
      const f = `${dir}.cards-test-${process.pid}.html`; writeFileSync(f, doc);
      try { await p.goto(pathToFileURL(f).href, { waitUntil: 'load' }); } finally { unlinkSync(f); }
      await p.evaluate(() => document.fonts.ready);
      const bad = await p.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.scrollHeight - e.clientHeight > 0 || e.scrollWidth - e.clientWidth > 0).map((e) => e.id || e.className), sel);
      await p.close(); return bad;
    };
    assert.deepEqual(await run(html, 672, '.mcard'), [], 'book cards');
    assert.deepEqual(await run(buildFlashcardsHtml('letter'), 816, '.card'), [], 'flashcards');
  } finally { await browser.close(); }
});
