#!/usr/bin/env node
// ALEF book builder: data -> print-ready HTML (book/out/alef-book.html) -> optional PDF via Playwright Chromium.
//   node book/build.mjs                 # HTML only
//   node book/build.mjs --pdf           # HTML + book/out/alef-book-draft.pdf
//   node book/build.mjs --pdf --trim 8x10 --bleed
// Options: --trim 8.5x11|8x10|8.5x8.5|6x9   --bleed (adds 0.125in on all four sides; KDP wants outer/top/bottom only - InDesign is the print master)
//          --host HOST (QR/URL host; default env ALEF_HOST or "alef.example.org" which is a PLACEHOLDER, not a real domain)
//          --out DIR (default book/out)
// Data used when present: data/letters/letters.json, data/corpus/registry.json, data/pronunciation/niqqud.json (not yet required).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createImgResolver } from './img.js';
import { overlaySvg, GLYPHS, glyphFor, loadLettersJson } from '../tools/images/overlay.mjs';
import { LETTERS, letterToken, VOWELS } from '../tools/images/spec.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const he = (s, cls = '') => `<span class="he ${cls}" lang="he" dir="rtl">${s}</span>`;
const readJson = (p) => { const f = join(ROOT, p); if (!existsSync(f)) return null; try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

export const TRIMS = { '8.5x11': [8.5, 11], '8x10': [8, 10], '8.5x8.5': [8.5, 8.5], '6x9': [6, 9] };

export function parseArgs(argv) {
  const o = { pdf: false, trim: '8.5x11', bleed: false, host: process.env.ALEF_HOST || 'alef.example.org', out: 'book/out' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pdf') o.pdf = true; else if (a === '--bleed') o.bleed = true;
    else if (a === '--trim') o.trim = argv[++i]; else if (a === '--host') o.host = argv[++i]; else if (a === '--out') o.out = argv[++i];
    else throw new Error(`unknown option ${a}`);
  }
  if (!TRIMS[o.trim]) throw new Error(`unknown trim ${o.trim}; choose ${Object.keys(TRIMS).join(', ')}`);
  return o;
}

/** QR support: neither python `qrcode` nor `segno` is importable here and no JS QR lib is allowed, so we emit the URL + a TODO box. */
export const letterUrl = (host, id) => `https://${host}/#/letters/${id}`;

// ---- vowel signs: code points (Unicode Hebrew points block) ----
const CARRIER = 'ב'; // bet
const MARK = { kamatz: 'ָ', patach: 'ַ', tzere: 'ֵ', segol: 'ֶ', chirik: 'ִ', cholam: 'ֹ', kubutz: 'ֻ', shva: 'ְ', 'chataf-patach': 'ֲ', 'chataf-segol': 'ֱ', 'chataf-kamatz': 'ֳ', dagesh: 'ּ', 'shin-dot': 'ׁ', 'sin-dot': 'ׂ' };
const VOWEL_SHOW = {
  kamatz: CARRIER + MARK.kamatz, patach: CARRIER + MARK.patach, tzere: CARRIER + MARK.tzere, segol: CARRIER + MARK.segol,
  chirik: CARRIER + MARK.chirik, cholam_male: 'ו' + MARK.cholam, cholam_chaser: CARRIER + MARK.cholam, kubutz: CARRIER + MARK.kubutz,
  shuruk: 'ו' + MARK.dagesh, shva: CARRIER + MARK.shva, chataf_patach: CARRIER + MARK['chataf-patach'], chataf_segol: CARRIER + MARK['chataf-segol'],
  chataf_kamatz: CARRIER + MARK['chataf-kamatz'], dagesh: CARRIER + MARK.dagesh, shin_sin_dots: 'ש' + MARK['shin-dot'] + ' ש' + MARK['sin-dot'],
};

function registryEntries() {
  const reg = readJson('data/corpus/registry.json');
  return Array.isArray(reg) ? reg : reg?.entries || reg?.texts || [];
}
function registryBlessing() {
  const hits = registryEntries().filter((e) => /^Numbers 6:2[4-6]$/.test(e.ref || '') && e.he).sort((a, b) => a.ref.localeCompare(b.ref));
  if (hits.length === 3) return { lines: hits.map((h) => h.he), source: `data/corpus/registry.json (${hits.map((h) => h.id).join(', ')})`, status: [...new Set(hits.map((h) => h.status))].join('/'), attributions: [...new Set(hits.map((h) => h.attribution))] };
  return null;
}
// Fallback: research note torah_opener_image_program.md, Sefaria sheet 631749 text, cantillation marks (U+0591-05AF) stripped for beginners.
const FALLBACK_BLESSING = [
  'יְבָרֶכְךָ יהוה וְיִשְׁמְרֶךָ׃',
  'יָאֵר יהוה ׀ פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ׃',
  'יִשָּׂא יהוה ׀ פָּנָיו אֵלֶיךָ וְיָשֵׁם לְךָ שָׁלוֹם׃',
];
const BLESSING_WORDS = [ // from the research note's word-by-word table (translit = Modern Israeli rendering, literal glosses are the note author's)
  ['יְבָרֶכְךָ', "yevarekh'kha", 'may-he-bless-you'], ['וְיִשְׁמְרֶךָ', 'veyishmerekha', 'and-may-he-keep-you'],
  ['יָאֵר', "ya'er", 'may-he-shine'], ['פָּנָיו', 'panav', 'his-face'], ['אֵלֶיךָ', 'elekha', 'toward-you'],
  ['וִיחֻנֶּךָּ', 'vichuneka', 'and-may-he-be-gracious-to-you'], ['יִשָּׂא', 'yisa', 'may-he-lift'],
  ['וְיָשֵׁם', 'veyasem', 'and-may-he-set'], ['לְךָ', 'lekha', 'for-you'], ['שָׁלוֹם', 'shalom', 'peace'],
];
const SURVIVAL = [ // DRAFT: short, common phrases, NOT yet from lane 5's phrasebook; needs native-speaker check
  ['שָׁלוֹם', 'shalom', 'hello / goodbye / peace'], ['תּוֹדָה', 'toda', 'thank you'],
  ['בְּבַקָּשָׁה', 'bevakasha', 'please / you are welcome'], ['בֹּקֶר טוֹב', 'boker tov', 'good morning'],
  ['סַבָּבָה', 'sababa', 'cool / fine (slang)'], ['לְהִתְרָאוֹת', 'lehitraot', 'see you'],
];

function strokeSvg(id, lettersJson) {
  const recs = Array.isArray(lettersJson) ? lettersJson : lettersJson?.letters;
  const rec = recs?.find?.((r) => r.id === id);
  const strokes = rec?.print?.strokes;
  if (strokes?.length && strokes.every((s) => Array.isArray(s.median) && s.median.length > 1)) {
    const paths = strokes.map((s, i) => {
      const pts = s.median; const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
      const mid = pts[Math.floor(pts.length / 2)];
      return `<path d="${s.path}" fill="#e8e2d2"/><path d="${d}" fill="none" stroke="#B0373B" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="22" fill="#B0373B"/><text x="${mid[0] + 30}" y="${mid[1]}" font-size="64" fill="#1F3A5F" font-family="DejaVu Sans, sans-serif">${i + 1}</text>`;
    }).join('');
    return { svg: `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`, real: true };
  }
  const fb = readJson('data/letters/_build/print_outlines.json')?.[id];
  if (fb) return { svg: `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="${fb.outline}" fill="#e8e2d2" stroke="#1F3A5F" stroke-width="6"/></svg>`, real: false };
  return { svg: '', real: false };
}

export function buildHtml(o) {
  const [tw, th] = TRIMS[o.trim];
  const bleed = o.bleed ? 0.125 : 0;
  const idx = readJson('assets/img/index.json');
  const R = createImgResolver({ base: '../../assets/img', files: idx?.files || [] });
  const lettersJson = loadLettersJson();
  const lettersSource = lettersJson ? 'data/letters/letters.json' : 'built-in glyph map (data/letters/letters.json not present)';
  const reg = registryBlessing();
  const blessing = reg || { lines: FALLBACK_BLESSING, source: 'research note torah_opener_image_program.md (Sefaria sheet 631749), cantillation stripped; NOT from lane 5 registry', status: 'transcribed-needs-check', attributions: [] };

  const css = readFileSync(join(ROOT, 'book/style.css'), 'utf8');
  const vars = `:root{--trim-w:${tw}in;--trim-h:${th}in;--bleed:${bleed}in}`;

  const cover = `<section class="cover"><div class="art"><img src="${R.src('BRAND_cover_a')}" alt=""/></div>
<div class="titles">${he('אָלֶף בֵּית', 'he-big')}<h1>ALEF</h1><p>Read Hebrew. Say it. Live it.</p>
<p class="small" style="margin-top:3in">DRAFT PROOF &middot; placeholder art &middot; not for sale</p></div></section>`;

  const prayerTodo = `<section class="chapter front-page"><h2>Prayer for the One Who Begins</h2>
<div class="todo"><b>TODO (author)</b><br/>Insert the author's original opening prayer here. The text was not available to the book builder; this block is intentionally empty.<br/>Slot: one page, centred, English and Hebrew side by side; Hebrew must be set RTL with niqqud.</div></section>`;

  const blessingPage = `<section class="chapter front-page"><h2>The Priestly Blessing</h2><p class="small">Numbers 6:24&ndash;26. Your first page of Hebrew: fifteen words, thirteen different letters.</p>
<div class="blessing">${blessing.lines.map((l) => `<span class="line">${he(l)}</span>`).join('')}</div>
<img src="${R.src('PRAY_blessing_01')}" alt="" style="width:5in;display:block;margin:0 auto .15in"/><p class="small">Source: ${esc(blessing.source)}. Status: ${esc(blessing.status)}. The divine name is shown as written in the source; it is read aloud as &ldquo;Adonai&rdquo;.</p></section>`;

  const howTo = `<section class="chapter front-page"><h2>How to use this book</h2>
<p>Each letter has one page. Look at the picture, find the letter hiding in it, trace the strokes in the order shown, say the sound, then scan the code or open the link to hear it spoken by a man or a woman and to trace on a screen.</p>
<div class="slot"><b>Author text slot.</b> Replace with final how-to copy. The companion web edition URL pattern is https://${esc(o.host)}/#/letters/&lt;id&gt; (host is a placeholder until a domain exists).</div>
<h3 style="margin-top:.3in">Contents</h3><ol class="toc"><li>The alphabet at a glance</li><li>The 27 letters (22 letters and 5 final forms)</li><li>The vowels</li><li>Reading practice</li><li>The Priestly Blessing, word by word</li><li>Survival Hebrew</li></ol></section>`;

  const alphabet = `<section class="chapter main-start"><h2>The alphabet at a glance</h2><table class="alphabet"><tr><th>#</th><th>Letter</th><th>Name</th><th>Sound</th><th>Link</th></tr>
${LETTERS.map((L) => `<tr><td>${L.nn}</td><td class="he">${glyphFor(L.id, lettersJson)}</td><td>${esc(L.title)}</td><td>${esc(L.sound)}</td><td class="small">/#/letters/${L.id}</td></tr>`).join('')}</table></section>`;

  const letterPages = LETTERS.map((L) => {
    const tok = letterToken(L), base = `L${L.nn}_${tok}_print`;
    const glyph = glyphFor(L.id, lettersJson);
    const mn = R.src(`${base}_mnemonic`);
    const overlay = overlaySvg({ id: L.id, state: 'outline', imageHref: mn, size: 800, lettersJson });
    const st = strokeSvg(L.id, lettersJson);
    const vocab = L.vocab.map((v, k) => `<figure><img src="${R.src(`${base}_v${k + 1}`)}" alt="${esc(v[0])}"/><figcaption>${esc(v[0])}<br/><i>${esc(v[1])}</i><br/><span class="hebrew-slot">[Hebrew word: from corpus]</span></figcaption></figure>`).join('');
    const url = letterUrl(o.host, L.id);
    return `<section class="letter" id="letter-${L.id}"><header><span class="num">${L.nn} / 27</span><h2>${esc(L.title)}</h2><span class="sound">${esc(L.sound)}</span></header>
<div class="glyph-card"><span class="label">Print</span>${he(glyph)}<span class="note">&nbsp;</span></div>
<div class="glyph-card cursive missing"><span class="label">Cursive (ktav yad)</span>${he(glyph)}<span class="note">TODO: cursive form needs Gveret Levin / Playpen Sans Hebrew (not installed); print shape shown grey as stand-in</span></div>
<div class="stroke">${st.svg}<div class="cap">${st.real ? 'Stroke order (numbered)' : 'Shape only. TODO: numbered stroke order from letters.json medians (lane 2)'}</div></div>
<div class="mnemonic">${overlay}</div>
<div class="side"><div class="mnemonic-cap"><b>Find it:</b> ${esc(L.keyword)}. The letter's shape: ${esc(L.shape)}. <span class="small">(image: ${R.isReal(`${base}_mnemonic`) ? 'final' : 'placeholder'})</span></div>
<div class="slot sound-slot"><b>How it sounds.</b> ${esc(L.sound)}. TODO: author's sound explanation and tradition note (lane 3 data).</div>
<div class="slot link-slot"><div class="qr">QR<br/>TODO</div><div class="url"><b>Hear it &amp; trace it:</b><br/>${esc(url)}</div></div></div>
<div class="vocab">${vocab}</div></section>`;
  }).join('\n');

  const vowelChapter = `<section class="chapter"><h2>The vowels</h2><p>Hebrew vowels are dots and dashes around the letter. Shown here on a bet (${he(CARRIER)}) or vav as carrier. Modern Israeli Hebrew has five vowel sounds, so several signs share one sound.</p>
<table class="grid"><tr><th>Sign</th><th>Name</th><th>Sound</th><th>Where it sits</th><th>Picture</th></tr>
${VOWELS.map((V) => `<tr><td class="he">${VOWEL_SHOW[V.token] || ''}</td><td>${esc(V.title)}</td><td>${esc(V.sound)}</td><td class="small">${esc(V.position)}</td><td><img class="vimg" src="${R.src(`V${V.nn}_${V.token}_keyword`)}" alt=""/></td></tr>`).join('')}</table>
<div class="todo" style="margin-top:.2in"><b>TODO</b> Vowel explanations and tradition notes come from data/pronunciation/niqqud.json (lane 3). The sounds above are the image-doc's short notes, not that dataset.</div></section>`;

  const cons = [['מ', 'm'], ['ל', 'l'], ['שׁ', 'sh'], ['ר', 'r'], ['בּ', 'b'], ['ד', 'd']];
  const vws = [[MARK.patach, 'a'], [MARK.kamatz, 'a'], [MARK.tzere, 'e'], [MARK.segol, 'e'], [MARK.chirik, 'i'], [MARK.cholam, 'o'], [MARK.kubutz, 'u']];
  const reading = `<section class="chapter"><h2>Reading practice: syllables</h2><p>Say each syllable aloud. Rows are consonants, columns are vowel signs.</p>
<table class="grid"><tr><th></th>${vws.map(([m]) => `<th class="he" style="text-align:center;font-size:16pt">\u05D0${m}</th>`).join('')}</tr>
${cons.map(([c, s]) => `<tr><th>${esc(s)}</th>${vws.map(([m, v]) => `<td class="he">${c}${m}<div class="small" style="direction:ltr;font-size:8pt">${esc(s + v)}</div></td>`).join('')}</tr>`).join('')}</table>
<div class="todo" style="margin-top:.2in"><b>TODO</b> Full reading chapters (word lists, lines from the corpus) come from data/corpus/registry.json (lane 5). This grid is generated from code points only.</div></section>`;

  const prayerChapter = `<section class="chapter"><h2>The Priestly Blessing, word by word</h2>
<table class="grid"><tr><th>Hebrew</th><th>Modern Israeli</th><th>Literal</th></tr>${BLESSING_WORDS.map(([h, t, g]) => `<tr><td class="he">${h}</td><td>${esc(t)}</td><td>${esc(g)}</td></tr>`).join('')}</table>
<p class="small">The divine name (three occurrences, spoken &ldquo;Adonai&rdquo;) is omitted from this table. Words and glosses: research note, not yet verified by a Hebrew teacher.</p>
<div class="todo"><b>TODO</b> Remaining prayer chapters (Shema, Shabbat candles, Kiddush, Mah Tovu, Amidah, Aleinu...) from lane 5's prayer roster.</div></section>`;

  const regPrayers = registryEntries().filter((e) => !/^Numbers 6:2[4-6]$/.test(e.ref || '') && e.he);
  const prayerCards = regPrayers.length ? `<section class="chapter"><h2>Prayers and verses from the corpus</h2><p class="small">${regPrayers.length} texts from data/corpus/registry.json. Statuses are as recorded there; this book builder did not verify them.</p>
${regPrayers.map((e) => `<div class="pcard"><h3>${esc(e.title)} <span class="small">${esc(e.ref || '')} &middot; ${esc(e.status)}</span></h3><div class="he pheb">${esc(e.he).replace(/\n/g, '<br/>')}</div><div class="small pen">${esc(e.english || '')}</div></div>`).join('')}</section>` : '';
  const survival = `<section class="chapter"><h2>Survival Hebrew</h2>
<table class="grid"><tr><th>Hebrew</th><th>Say</th><th>Meaning</th></tr>${SURVIVAL.map(([h, t, g]) => `<tr><td class="he">${h}</td><td>${esc(t)}</td><td>${esc(g)}</td></tr>`).join('')}</table>
<div class="todo" style="margin-top:.2in"><b>TODO</b> Six draft phrases only. The phrasebook of 150+ entries is lane 5's data/corpus; replace this table when it lands. These six are NOT native-speaker verified.</div></section>`;

  const attr = [...new Set([...(blessing.attributions || []), ...regPrayers.map((e) => e.attribution)].filter(Boolean))];
  const colophon = `<section class="chapter end-page"><h2>Colophon</h2><p class="small">Draft proof generated by book/build.mjs. Letters data: ${esc(lettersSource)}. Hebrew set in local fonts (FreeSerif / DejaVu); the production font is a decision for the InDesign master.</p>
${attr.length ? `<h3>Text attributions (from the registry)</h3>${attr.map((a) => `<p class="small">${esc(a)}</p>`).join('')}` : ''}
<p class="small"><b>Image credit line (use once real images replace placeholders):</b> Illustrations created with AI tools and edited by the author.</p></section>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>ALEF - draft proof</title><style>${vars}\n${css}</style></head><body>
${cover}${prayerTodo}${blessingPage}${howTo}${alphabet}
${letterPages}
${vowelChapter}${reading}${prayerChapter}${prayerCards}${survival}${colophon}
</body></html>`;
}

export async function renderPdf(htmlPath, pdfPath, o) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  await browser.close();
}

export async function main(argv) {
  const o = parseArgs(argv);
  const out = join(ROOT, o.out); mkdirSync(out, { recursive: true });
  const html = buildHtml(o);
  const htmlPath = join(out, 'alef-book.html');
  writeFileSync(htmlPath, html);
  console.log(`wrote ${relative(ROOT, htmlPath)} (${html.length} bytes)`);
  if (o.pdf) {
    const pdfPath = join(out, 'alef-book-draft.pdf');
    await renderPdf(htmlPath, pdfPath, o);
    console.log(`wrote ${relative(ROOT, pdfPath)}`);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1); });
