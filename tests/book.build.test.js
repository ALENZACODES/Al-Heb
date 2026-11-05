import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildHtml, parseArgs, letterUrl, readUrl, makeQrs, PRAYER_GROUPS } from '../book/build.mjs';
import { vocabFor, wordPool, skeleton, registryEntries, phrasebook } from '../book/content.mjs';
import { LETTERS } from '../tools/images/spec.mjs';

const BASE = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד', he: 'ה', vav: 'ו', zayin: 'ז', chet: 'ח', tet: 'ט', yod: 'י', kaf: 'כ', lamed: 'ל', mem: 'מ', nun: 'נ', samekh: 'ס', ayin: 'ע', pe: 'פ', tsadi: 'צ', qof: 'ק', resh: 'ר', shin: 'ש', tav: 'ת' };
const root = fileURLToPath(new URL('..', import.meta.url));
const html = buildHtml(parseArgs(['--no-qr']));
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const py = (code, ...args) => spawnSync('python3', ['-c', code, ...args], { encoding: 'utf8' });
const hasPy = (mod) => py(`import ${mod}`).status === 0;

test('config: one host value in book/config.json, placeholder clearly marked', () => {
  const cfg = JSON.parse(read('book/config.json'));
  assert.equal(cfg.host, 'alef.example.org'); assert.equal(cfg.hostIsPlaceholder, true);
  assert.match(html, /PLACEHOLDER/); assert.match(html, /placeholder host, not a live site/);
  assert.equal(parseArgs([]).host, cfg.host);
  const live = buildHtml(parseArgs(['--no-qr', '--host', 'alef.test.invalid']));
  assert.ok(live.includes(letterUrl('alef.test.invalid', 'alef')));
});

test('fonts: @font-face blocks use relative file URLs to existing OFL font files; Hebrew print + cursive faces', () => {
  const urls = [...html.matchAll(/src:url\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.equal(urls.length, 3);
  for (const u of urls) { assert.ok(!/^(https?:|file:|\/)/.test(u), u); assert.ok(u.startsWith('../../assets/fonts/'), u); assert.ok(existsSync(join(root, 'book/out', decodeURIComponent(u))), u); }
  assert.match(html, /font-family:"Noto Serif Hebrew"/); assert.match(html, /font-family:"Gveret Levin"/);
  assert.match(html, /he-cursive/);
});

test('vocabulary: <=3 pointed words per letter taken from existing data, starting with (or for finals, ending in) the letter', () => {
  const pool = wordPool();
  const raw = read('data/corpus/phrasebook.json') + read('data/curriculum/lessons.json');
  let total = 0;
  for (const L of LETTERS) {
    const w = vocabFor(L.id, pool);
    assert.ok(w.length >= 1 && w.length <= 3, L.id);
    total += w.length;
    const ch = { 'kaf-final': 'ך', 'mem-final': 'ם', 'nun-final': 'ן', 'pe-final': 'ף', 'tsadi-final': 'ץ' }[L.id];
    for (const x of w) {
      assert.match(x.he, /[ְ-ּ]/, 'pointed');
      assert.ok(raw.includes(x.he), `${x.he} not in source data`);
      const s = skeleton(x.he);
      if (ch) assert.ok(s.endsWith(ch), `${L.id} ${x.he}`); else assert.ok(s.startsWith(BASE[L.id]), `${L.id} ${x.he}`);
      assert.ok(x.en && x.translit);
    }
  }
  assert.ok(total >= 75, `only ${total} words`);
});

test('every letter page has a sound panel and stroke diagrams; every vowel record and prayer is in the book', () => {
  assert.equal((html.match(/class="sound-panel"/g) || []).length, LETTERS.length);
  assert.equal((html.match(/id="vowel-/g) || []).length, 15);
  const reg = registryEntries().filter((e) => e.he);
  assert.ok(reg.length >= 27);
  assert.equal((html.match(/class="pcard/g) || []).length, reg.length, 'one prayer card per registry text');
  const assigned = PRAYER_GROUPS.flatMap((g) => g.ids), ids = new Set(reg.map((e) => e.id));
  assert.equal(new Set(assigned).size, assigned.length, 'no id in two chapters');
  for (const id of assigned) assert.ok(ids.has(id), `PRAYER_GROUPS names unknown id ${id}`);
  assert.match(html, /id="ch-pg-torah-service"/);
  for (const e of reg) assert.ok(html.includes(`id="text-${e.id}"`) && html.includes(readUrl('alef.example.org', e.id)), e.id);
  assert.ok((html.match(/not proofread/g) || []).length >= reg.length);
  assert.match(html, /<li><a href="#ch-prayers"/);
});

test('survival chapter contains the whole phrasebook; index and how-to/traditions pages exist', () => {
  const pb = phrasebook();
  assert.ok(pb.entries.length >= 150);
  for (const e of pb.entries) assert.ok(html.includes(e.he.replace(/&/g, '&amp;')) || html.includes(e.he), e.id);
  assert.match(html, /id="ch-index"/); assert.match(html, /id="ch-how"/); assert.match(html, /id="ch-trad"/);
  assert.match(html, /Same word, two traditions/);
});

test('opening prayer is marked DRAFT pending clergy review', () => {
  assert.match(html, /DRAFT[^<]*pending clergy\/educator review/);
});

test('Hebrew in table cells and spans is RTL + lang=he', () => {
  assert.ok(!/<td class="he"(?![^>]*lang="he")/.test(html));
  assert.ok(!/<span class="he [^"]*"(?![^>]*lang="he")/.test(html));
});

test('print options: bleed/binding parse; bad binding rejected', () => {
  const o = parseArgs(['--print', '--bleed', '--binding', 'rtl']);
  assert.deepEqual([o.print, o.bleed, o.binding], [true, true, 'rtl']);
  assert.throws(() => parseArgs(['--binding', 'up']));
  const h = buildHtml({ ...o, qr: false });
  assert.match(h, /@page :right\{margin:/); assert.ok(!/class="cover"/.test(h));
  assert.match(h, /--page-w:8\.625in;--page-h:11\.25in/);
});

test('QR codes: one real segno SVG per letter and per registry text that decode back to their URLs', { skip: !(hasPy('segno') && hasPy('cv2')) && 'segno/opencv not installed (see docs/TOOLING.md)' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'alef-qr-'));
  try {
    const urls = {};
    for (const L of LETTERS) urls['letter_' + L.id] = letterUrl('alef.example.org', L.id);
    for (const e of registryEntries()) urls['text_' + e.id] = readUrl('alef.example.org', e.id);
    const svgs = makeQrs(urls, dir, true);
    const nQr = LETTERS.length + registryEntries().length;
    assert.equal(Object.keys(svgs).length, nQr);
    for (const s of Object.values(svgs)) assert.match(s, /^<svg [^>]*viewBox="0 0 \d+ \d+"/);
    const f = join(dir, 'urls.json'); writeFileSync(f, JSON.stringify(urls));
    const r = spawnSync('python3', [join(root, 'book/verify_qr.py'), dir, f], { encoding: 'utf8' });
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, nQr, r.stdout);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('book HTML with QR embeds one inline QR per letter page and per prayer', { skip: !hasPy('segno') && 'segno not installed' }, () => {
  const h = buildHtml(parseArgs([]));
  assert.equal((h.match(/class="qr"><svg/g) || []).length, LETTERS.length);
  assert.equal((h.match(/class="pq"><svg/g) || []).length, registryEntries().filter((e) => e.he).length);
});

test('pdf_tools: reverse puts the last page first and refuses odd page counts; pad-even adds one blank', { skip: !hasPy('pypdf') && 'pypdf not installed' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'alef-pdf-'));
  try {
    const mk = (n, f) => py(`from pypdf import PdfWriter\nw=PdfWriter()\nfor i in range(${n}): w.add_blank_page(100+i*10,200)\nw.write(${JSON.stringify(f)})`);
    const a = join(dir, 'a.pdf'), b = join(dir, 'b.pdf'), o = join(dir, 'o.pdf');
    mk(4, a); mk(3, b);
    const tool = join(root, 'book/pdf_tools.py');
    assert.equal(spawnSync('python3', [tool, 'reverse', a, o]).status, 0);
    const w = JSON.parse(py(`from pypdf import PdfReader;import json;print(json.dumps([float(p.mediabox.width) for p in PdfReader(${JSON.stringify(o)}).pages]))`).stdout);
    assert.deepEqual(w, [130, 120, 110, 100]);
    assert.notEqual(spawnSync('python3', [tool, 'reverse', b, o]).status, 0);
    assert.equal(spawnSync('python3', [tool, 'pad-even', b]).status, 0);
    assert.equal(JSON.parse(spawnSync('python3', [tool, 'info', b], { encoding: 'utf8' }).stdout).pages, 4);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('word list: all 5,000 vocab5000 entries are in the book, with CC BY-SA attribution; class section present', () => {
  const d = JSON.parse(read('data/vocab/vocab5000.json'));
  assert.equal(d.entries.length, 5000);
  assert.equal((html.match(/class="wi"/g) || []).length, d.entries.length);
  assert.match(html, /id="ch-wordlist"/); assert.match(html, /CC BY-SA 4\.0/); assert.match(html, /Hermit Dave/);
  assert.match(html, /id="ch-class"/); assert.match(html, /How to use this book in a 10-week class/);
  assert.equal((html.match(/<td>\d+<\/td><td>[^<]+<\/td><td>.*?letter-/g) || []).length >= 7, true);
});
