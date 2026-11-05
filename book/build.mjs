#!/usr/bin/env node
// ALEF book builder: data -> print-ready HTML (book/out/alef-book.html) -> PDF via Playwright Chromium (two passes so the
// index/contents get real page numbers from the PDF's link destinations).
//   node book/build.mjs                       # HTML only
//   node book/build.mjs --pdf                 # HTML + book/out/alef-book-draft.pdf (with cover)
//   node book/build.mjs --pdf --print         # print interior: no cover, even page count -> alef-book-8.5x11-print.pdf
//   node book/build.mjs --pdf --print --bleed # + KDP-style bleed (0.125in top/bottom/OUTER only), per-page :left/:right margins
//   node book/build.mjs --pdf --print --binding rtl   # mirrored spreads (gutter on the other side) for right-bound printing; then reverse with book/reverse_pdf.py
// Options: --trim 8.5x11|8x10|8.5x8.5|6x9 (the letter-page grid is designed for 8.5x11; others are scaled with CSS zoom and only 8.5x11 is visually QA'd)
//          --host HOST   (default: book/config.json host, a PLACEHOLDER until a domain is chosen; env ALEF_HOST also overrides)
//          --out DIR     (default book/out)    --no-qr (skip QR generation; used by tests when python/segno are absent)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { createImgResolver } from './img.js';
import { buildGeneratedManifest, loadApprovals, loadProvenance, makePaths } from '../tools/images/ingest_lib.mjs';
import { overlaySvg, glyphFor, loadLettersJson } from '../tools/images/overlay.mjs';
import { LETTERS, letterToken, VOWELS } from '../tools/images/spec.mjs';
import { mnemonicCards, mnemonicStatus } from './cards.mjs';
import { ROOT, readJson, vocabFor, soundFor, vowelRecords, cleanNote, drills, consonantFeatures, registryEntries, phrasebook, SITUATION_TITLES, wordPool, vocab5000 } from './content.mjs';
import { firstDayChapter, FIRSTDAY_ID, FIRSTDAY_TITLE } from './firstday/section.mjs'; // hook: 'Your first 10 minutes' chapter (book/firstday/)
import { memChainChapter, MEMCHAIN_ID, MEMCHAIN_TITLE } from './memorychain/section.mjs'; // hook: 'Letters you will never forget' (book/memorychain/)
import { babyStepsChapter, BABY_ID, BABY_TITLE } from './babysteps/section.mjs'; // hook: v0 baby-step path, lessons r01-r10 (book/babysteps/)
import { extraChapters } from './intermediate/chapters.mjs'; // hook: sounds reference, intermediate lessons, vocabulary appendix, answer key (book/intermediate/)

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const esc_ = esc;
const he = (s, cls = '') => `<span class="he ${cls}" lang="he" dir="rtl">${s}</span>`;
const CONFIG = readJson('book/config.json') ?? { host: 'alef.example.org', hostIsPlaceholder: true, scheme: 'https', letterPath: '/#/letters/', readPath: '/#/read/' };

function openingPrayerHtml() {
  const txt = readFileSync(join(ROOT, 'book/opening-prayer.txt'), 'utf8').trim();
  return txt.split(/\n\s*\n/).map((st) => '<p>' + esc(st).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') + '</p>').join('');
}

export const TRIMS = { '8.5x11': [8.5, 11], '8x10': [8, 10], '8.5x8.5': [8.5, 8.5], '6x9': [6, 9] };

/** Chapter plan for the registry texts (a first-year learner's order: the Shema and blessings first, then the services). Ids not listed fall into a final catch-all chapter. */
export const PRAYER_GROUPS = [
  { key: 'core', title: 'Shema, Blessing and daily words', intro: 'The texts that come first in a Hebrew-reading life: the Shema, the Priestly Blessing line by line, the V\u2019ahavta, and the short blessings said at home.',
    ids: ['shema-1', 'shema-2', 'shema-vahavta', 'vahavta-1', 'vahavta-2', 'vahavta-full', 'bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3', 'num-12-13', 'bless-formula-1', 'hamotzi', 'modeh-ani-1', 'shehecheyanu', 'mah-tovu-1', 'mi-chamocha-1'] },
  { key: 'torah-service', title: 'The Torah service', intro: 'Everything said when the ark is opened, the Torah is carried, read and returned, plus the haftarah blessings, the blessing after surviving danger and the opening of the Mi sheberach. Practice-first: the short verses come before the long Aramaic and haftarah texts. Customs and wording vary by community; each footer says whose text it is.',
    ids: ['ein-kamocha', 'malchutcha', 'adonai-oz', 'vayehi-binsoa', 'brich-shmei', 'gadlu', 'lecha-hashem', 'vezot-hatorah', 'torah-bless-1', 'torah-barchu', 'torah-bless-2', 'haftarah-before', 'haftarah-after', 'mi-sheberach-opening', 'hagomel', 'yehalelu', 'hashivenu', 'etz-chaim'] },
  { key: 'amidah', title: 'The Amidah, Kedushah and closing prayers', intro: 'Pieces of the standing prayer, the Kedushah verses, and the prayers that close a service.',
    ids: ['avot-1', 'avot-closing', 'amidah-lips', 'kedushah-kadosh', 'kedushah-baruch', 'kedushah-yimloch', 'sim-shalom', 'amidah-yihyu', 'amidah-elohai-netzor', 'oseh-shalom', 'aleinu-1', 'kaddish-1', 'adon-olam-1', 'yigdal'] },
  { key: 'shabbat', title: 'Shabbat, Psalms and the table', intro: 'Friday night and Shabbat day, Havdalah, Ashrei, and the blessings around a meal.',
    ids: ['lecha-dodi-1', 'kiddush-wine-1', 'kiddush-shabbat-eve', 'candle-shabbat', 'kiddush-gen-2-1-3', 'kiddush-veshamru', 'kiddush-zachor', 'havdalah-opening', 'havdalah-spices', 'havdalah-flame', 'havdalah-hamavdil', 'ashrei-84-5', 'ashrei-144-15', 'ashrei-145-1-3', 'ashrei-145-16', 'shir-hamaalot', 'zimun-opening', 'birkat-hamazon-1'] },
  { key: 'hanukkah', title: 'Hanukkah', intro: 'The candle blessings and songs.', ids: ['hanukkah-candle', 'hanukkah-nissim', 'hanerot-halalu', 'maoz-tzur-1'] },
];

export function parseArgs(argv) {
  const o = { pdf: false, print: false, trim: '8.5x11', bleed: false, binding: 'ltr', host: process.env.ALEF_HOST || CONFIG.host, out: 'book/out', qr: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pdf') o.pdf = true; else if (a === '--bleed') o.bleed = true; else if (a === '--print') o.print = true; else if (a === '--no-qr') o.qr = false;
    else if (a === '--trim') o.trim = argv[++i]; else if (a === '--host') o.host = argv[++i]; else if (a === '--out') o.out = argv[++i];
    else if (a === '--binding') o.binding = argv[++i]; else if (a === '--seed') o.seed = true;
    else throw new Error(`unknown option ${a}`);
  }
  if (!TRIMS[o.trim]) throw new Error(`unknown trim ${o.trim}; choose ${Object.keys(TRIMS).join(', ')}`);
  if (!['ltr', 'rtl'].includes(o.binding)) throw new Error('--binding must be ltr or rtl');
  return o;
}

export const letterUrl = (host, id) => `${CONFIG.scheme}://${host}${CONFIG.letterPath}${id}`;
export const readUrl = (host, id) => `${CONFIG.scheme}://${host}${CONFIG.readPath}${id}`;
const isPlaceholderHost = (host) => host === CONFIG.host ? !!CONFIG.hostIsPlaceholder : /(^|\.)example\.(org|com|net)$/.test(host);

/** QR codes (segno via python). Returns {key: inline svg}. Empty object if disabled/unavailable. */
export function makeQrs(urls, outDir, enabled = true) {
  if (!enabled) return {};
  const r = spawnSync('python3', [join(ROOT, 'book/make_qr.py'), outDir], { input: JSON.stringify(urls), encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('QR generation failed (pip install segno): ' + r.stderr);
  return JSON.parse(r.stdout);
}

// ---- vowel signs for the reading grid ----
const MARK = { kamatz: 'ָ', patach: 'ַ', tzere: 'ֵ', segol: 'ֶ', chirik: 'ִ', cholam: 'ֹ', kubutz: 'ֻ' };
const BLESSING_WORDS = [ // from the research note's word-by-word table (translit = Modern Israeli rendering; glosses are the note author's). NOT verified by a Hebrew teacher.
  ['יְבָרֶכְךָ', "yevarekh'kha", 'may-he-bless-you'], ['וְיִשְׁמְרֶךָ', 'veyishmerekha', 'and-may-he-keep-you'],
  ['יָאֵר', "ya'er", 'may-he-shine'], ['פָּנָיו', 'panav', 'his-face'], ['אֵלֶיךָ', 'elekha', 'toward-you'],
  ['וִיחֻנֶּךָּ', 'vichuneka', 'and-may-he-be-gracious-to-you'], ['יִשָּׂא', 'yisa', 'may-he-lift'],
  ['וְיָשֵׁם', 'veyasem', 'and-may-he-set'], ['לְךָ', 'lekha', 'for-you'], ['שָׁלוֹם', 'shalom', 'peace'],
];
const FALLBACK_BLESSING = ['יְבָרֶכְךָ יהוה וְיִשְׁמְרֶךָ׃', 'יָאֵר יהוה ׀ פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ׃', 'יִשָּׂא יהוה ׀ פָּנָיו אֵלֶיךָ וְיָשֵׁם לְךָ שָׁלוֹם׃'];

function registryBlessing() {
  const hits = registryEntries().filter((e) => /^Numbers 6:2[4-6]$/.test(e.ref || '') && e.he).sort((a, b) => a.ref.localeCompare(b.ref));
  if (hits.length === 3) return { lines: hits.map((h) => h.he), source: `data/corpus/registry.json (${hits.map((h) => h.id).join(', ')})`, status: [...new Set(hits.map((h) => h.status))].join('/'), proofread: hits.every((h) => h.proofread), attributions: [...new Set(hits.map((h) => h.attribution))] };
  return null;
}

function strokeSvg(id, lettersJson, script) {
  const recs = Array.isArray(lettersJson) ? lettersJson : lettersJson?.letters;
  const rec = recs?.find?.((r) => r.id === id);
  const strokes = rec?.[script]?.strokes;
  const col = script === 'print' ? '#B0373B' : '#6B7F3A';
  if (strokes?.length && strokes.every((s) => Array.isArray(s.median) && s.median.length > 1)) {
    const paths = strokes.map((s, i) => {
      const pts = s.median; const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
      const mid = pts[Math.floor(pts.length / 2)];
      return `<path d="${s.path}" fill="#e8e2d2"/><path d="${d}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="24" fill="${col}"/><text x="${mid[0] + 34}" y="${mid[1]}" font-size="74" fill="#1F3A5F" font-family="DejaVu Sans, sans-serif">${i + 1}</text>`;
    }).join('');
    return { svg: `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`, n: strokes.length, quality: rec[script].quality, real: true };
  }
  return { svg: '', real: false };
}

function pageCss(o, tw, th, bleed) {
  const b = bleed;
  const w = tw + (o.bleed ? b : 0), h = th + (o.bleed ? 2 * b : 0);
  const top = `${b + 0.7}in`, bottom = `${b + 0.8}in`, inner = '0.75in', outer = `${0.75 + b}in`;
  const odd = o.binding === 'rtl' ? { l: outer, r: inner } : { l: inner, r: outer };
  const even = o.binding === 'rtl' ? { l: inner, r: outer } : { l: outer, r: inner };
  const foot = '@bottom-center { content: counter(page); font: 9pt "Liberation Sans", sans-serif; color: #555; }';
  return `:root{--trim-w:${tw}in;--trim-h:${th}in;--bleed:${b}in;--page-w:${w}in;--page-h:${h}in;--letter-zoom:${Math.min(1, +((th - 1.5) / 9.5).toFixed(3), +((tw - 1.5) / 7).toFixed(3))}}
@page{size:${w}in ${h}in;margin:${top} ${o.bleed ? '0' : outer} ${bottom} ${o.bleed ? '0' : outer};${foot}}
${o.bleed || o.binding === 'rtl' ? `@page :right{margin:${top} ${odd.r} ${bottom} ${odd.l}} @page :left{margin:${top} ${even.r} ${bottom} ${even.l}}` : ''}
${o.print ? '' : '@page :first{margin:0;@bottom-center{content:none}}'}
@page main{${foot}} @page nofoot{@bottom-center{content:none}}`;
}

export function fontFaces(outDir) {
  const rel = (f) => relative(outDir, join(ROOT, 'assets/fonts', f)).split('/').map(encodeURIComponent).join('/').replace(/%2C/g, ',');
  const heRange = 'U+0590-05FF, U+FB1D-FB4F, U+200C-200F, U+25CC';
  return `@font-face{font-family:"Noto Serif Hebrew";src:url("${rel('notoserifhebrew-NotoSerifHebrew[wdth,wght].ttf')}") format("truetype");font-weight:100 900;unicode-range:${heRange}}
@font-face{font-family:"Frank Ruhl Libre";src:url("${rel('frankruhllibre-FrankRuhlLibre[wght].ttf')}") format("truetype");font-weight:300 900;unicode-range:${heRange}}
@font-face{font-family:"Gveret Levin";src:url("${rel('gveretlevin-GveretLevin-Regular.ttf')}") format("truetype");unicode-range:${heRange}}`;
}

/**
 * Approved-image manifest, derived LIVE from data/images/approvals.json + provenance.json (source of truth), so approving an image
 * (node tools/images/ingest.mjs approve ...) is picked up by the next build with no code change and without needing generated-manifest.json
 * to be rebuilt. Only images whose variant files exist in assets/img/<dir>/ are listed. altText still comes from generated-manifest.json.
 */
export function approvedManifest(root = ROOT) {
  const paths = makePaths(root);
  const m = buildGeneratedManifest(loadProvenance(paths), loadApprovals(paths));
  const disk = readJsonAt(join(root, 'data/images/generated-manifest.json'));
  for (const [stem, e] of Object.entries(m.images)) {
    e.files = e.files.filter((f) => existsSync(join(root, 'assets/img', m.dir, f.file)));
    if (!e.files.length) delete m.images[stem];
  }
  m.count = Object.keys(m.images).length;
  m.altText = disk?.altText ?? {};
  return m;
}
function readJsonAt(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }

const sorted = (a, f) => [...a].sort((x, y) => f(x).localeCompare(f(y)));

/** @param {ReturnType<typeof parseArgs>} o  @param {Record<string,number>} [pages] anchor id -> printed page number (from pass 1) */
export function buildHtml(o, pages = {}) {
  const [tw, th] = TRIMS[o.trim];
  const bleed = (o.bleed ? 0.125 : 0);
  const outDir = join(ROOT, o.out);
  const pg = (id) => `<span class="pg">${pages[id] ?? '&middot;&middot;&middot;'}</span>`;
  const toc = (id, label) => `<li><a href="#${id}" style="display:contents"><span class="t">${label}</span>${pg(id)}</a></li>`;
  const idx = readJson('assets/img/index.json');
  const GEN = approvedManifest(ROOT);
  const R = createImgResolver({ base: relative(outDir, join(ROOT, 'assets/img')) || '.', files: idx?.files || [], generated: GEN });
  const EX = extraChapters({ pages, toc, binding: o.binding, img: (stem) => (R.isReal(stem) ? R.src(stem) : null), alt: GEN.altText });
  const lettersJson = loadLettersJson();
  const lettersSource = lettersJson ? 'data/letters/letters.json' : 'built-in glyph map (data/letters/letters.json not present)';
  const reg = registryBlessing();
  const blessing = reg || { lines: FALLBACK_BLESSING, source: 'research note torah_opener_image_program.md (Sefaria sheet 631749); NOT from the registry', status: 'transcribed-needs-check', proofread: false, attributions: [] };
  const ph = isPlaceholderHost(o.host);
  const pool = wordPool();
  const ct = readJson('data/curriculum/class-track.json');
  const wl = vocab5000();
  const entries = registryEntries();
  const regPrayers = entries.filter((e) => e.he);

  // QR codes: one per letter page and per prayer page
  const urls = {};
  for (const L of LETTERS) urls['letter_' + L.id] = letterUrl(o.host, L.id);
  for (const e of regPrayers) urls['text_' + e.id] = readUrl(o.host, e.id);
  const qr = makeQrs(urls, join(outDir, 'qr'), o.qr);
  const qrBox = (k, cls) => qr[k] ? `<div class="${cls}">${qr[k]}</div>` : '';

  const cover = o.print ? '' : `<section class="cover"><div class="art"><img src="${R.src('BRAND_cover_a')}" alt=""/></div>
<div class="titles">${he('אָלֶף בֵּית', 'he-big')}<h1>ALEF</h1><p>Read Hebrew. Say it. Live it.</p>
<p class="small" style="margin-top:3in">DRAFT PROOF &middot; placeholder art &middot; not for sale</p></div></section>`;

  const prayerOpen = `<section class="chapter front-page"><h2>Prayer for the One Who Begins</h2>
<p class="draft-flag">DRAFT &mdash; pending clergy/educator review</p>
<p class="small">Original text, not traditional liturgy. Wording lives in book/opening-prayer.txt.</p>
<div class="opening-prayer">${openingPrayerHtml()}</div></section>`;

  const blessingPage = `<section class="chapter front-page" id="ch-blessing"><h2>The Priestly Blessing</h2><p class="small">Numbers 6:24&ndash;26. Your first page of Hebrew: fifteen words, thirteen different letters.</p>
<div class="blessing">${blessing.lines.map((l) => `<span class="line">${he(l)}</span>`).join('')}</div>
<img src="${R.src('PRAY_blessing_01')}" alt="" style="width:4.6in;display:block;margin:0 auto .15in"/><p class="small">Source: ${esc(blessing.source)}. Status: ${esc(blessing.status)}${blessing.proofread ? '' : '; <b>not proofread by a Hebrew educator</b>'}. The divine name is shown as written in the source; it is read aloud as &ldquo;Adonai&rdquo;.</p></section>`;

  const howTo = `<section class="chapter front-page" id="ch-how"><h2>How to use this book and the app</h2>
<p>Each letter has one page. Look at the picture and find the letter hiding in it. Trace the strokes in the order shown, say the sound, and read the three words. Then scan the code, or type the link, to open the same letter in the companion web app, where you can trace on a screen and hear it. There are no recordings yet: the app says so at the top of the screen and uses your device&rsquo;s own Hebrew voice, if it has one. The app&rsquo;s Install page (in the More menu) shows how to put it on your home screen.</p>
<p><b>The path:</b> the opening prayer and blessing &rarr; your first 10 minutes &rarr; the baby steps (lessons 1 to 10, the order the app teaches) &rarr; the alphabet and its 27 letter pages &rarr; the vowels &rarr; syllable practice &rarr; the prayers (every page has its own code) &rarr; survival Hebrew for travel and daily life. Read for the congregation first or for Israel first; both paths use the same letters.</p>
<p><b>Print and cursive.</b> Every letter page shows the printed letter and the Israeli handwritten (ktav yad) form, each with numbered strokes where the data exists. Handwriting stroke data is marked as draft quality: it still needs a native writer&rsquo;s review.</p>
<p><b>Which pronunciation?</b> Hebrew is read differently in Israel, in Sephardi tradition and in Ashkenazi tradition. The next page explains the differences. The app lets you choose (in setup, or any time in Settings under &ldquo;Pronunciation style&rdquo;); American synagogues often use the Sephardi values.</p>
<div class="slot"><b>Companion app.</b> The page for any letter is ${esc(letterUrl(o.host, '<letter>'))} and any prayer is ${esc(readUrl(o.host, '<text>'))} (prayer pages carry a &ldquo;Preview: unreviewed&rdquo; banner in the app).${ph ? ` <b style="color:#B0373B">The host &ldquo;${esc(o.host)}&rdquo; is a PLACEHOLDER: those links do not work until a real domain is chosen (one value, book/config.json).</b>` : ''}</div>
<h3 style="margin-top:.25in">Contents</h3><ul class="toc">
${toc('ch-blessing', 'The Priestly Blessing')}${ct?.weeks?.length ? toc('ch-class', 'How to use this book in a 10-week class') : ''}${toc(FIRSTDAY_ID, FIRSTDAY_TITLE)}${toc(BABY_ID, BABY_TITLE)}${toc(MEMCHAIN_ID, MEMCHAIN_TITLE)}${toc('ch-trad', 'Pronunciation traditions')}${EX.tocSounds}${toc('ch-alphabet', 'The alphabet at a glance')}${toc('letter-alef', 'The 27 letters (22 letters and 5 final forms)')}${toc('ch-remember', 'Remember every letter')}${toc('ch-vowels', 'The vowels')}${toc('ch-reading', 'Reading practice: syllables')}${toc('ch-practice', 'Reading practice: words')}${toc('ch-blessing-words', 'The Priestly Blessing, word by word')}@@PRAYER_TOC@@${toc('ch-survival', 'Survival Hebrew')}${EX.tocInter}${wl.length ? toc('ch-wordlist', 'Word list (' + wl.length.toLocaleString('en-US') + ' words)') : ''}${EX.tocBack}${toc('ch-index', 'Index')}${toc('ch-colophon', 'Colophon, sources and statuses')}</ul></section>`;


  // ---- How to use this book in a 10-week class (original text; schedule from data/curriculum/class-track.json) ----
  const WEEK_LETTERS = [['shin', 'bet', 'tav'], ['lamed', 'mem-final', 'vav', 'yod'], ['alef', 'he', 'resh', 'mem'], ['kaf', 'kaf-final', 'nun', 'nun-final'], ['pe', 'pe-final', 'chet'], ['dalet', 'gimel', 'ayin', 'samekh'], ['zayin', 'tet', 'tsadi', 'tsadi-final', 'qof'], [], [], []];
  const WEEK_BOOK = [
    'Pronunciation traditions (agree on one); Priestly Blessing page: listen only.',
    'Vowels: cholam, chirik.',
    'Vowels: tzere.',
    'Vowels: segol, shuruk, kubutz; syllable practice.',
    'Vowels: shva; the Priestly Blessing, line 1 (word by word).',
    'Vowels: the three chataf signs; Sin dot; practice words.',
    'Alphabet complete: use the alphabet table as a quiz; Shema, line 1.',
    'The Priestly Blessing, word by word; blessing formula and Hamotzi (prayer chapter 1).',
    'Shva, dagesh and stress (traditions page); the Shema in full.',
    'Torah service blessings; Shabbat and the table (Kiddush); then choose any unseen text.'];
  const classSection = ct?.weeks?.length ? `<section class="chapter" id="ch-class"><h2>How to use this book in a 10-week class</h2>
<p>This page is for a teacher, a study group, or a learner who wants a calendar. The book is organised like a reference (all letters, then all vowels, then prayers), so the table below tells you where to look each week. It follows ALEF&rsquo;s draft ${ct.weeks.length}-week adult reading track (${ct.sessionMinutes ?? 60}-minute weekly session, data/curriculum/class-track.json), which has <b>not been reviewed by an educator</b>; adapt it to your group.</p>
<table class="grid classweeks"><thead><tr><th>Wk</th><th>Focus</th><th>New letters (book page)</th><th>Also in this book</th></tr></thead><tbody>
${ct.weeks.map((w, i) => `<tr><td>${w.week}</td><td>${esc(w.title)}</td><td>${(WEEK_LETTERS[i] || []).map((id) => { const L = LETTERS.find((x) => x.id === id); return `<a href="#letter-${id}" style="display:contents">${esc(L ? L.title : id)}&nbsp;<span class="pg">${pages['letter-' + id] ?? '&middot;&middot;&middot;'}</span></a>`; }).join(', ') || '&ndash;'}</td><td class="small">${esc(WEEK_BOOK[i] || '')}</td></tr>`).join('')}</tbody></table>
<h3>A session in about an hour</h3>
<p><b>10 minutes</b> warm-up: flash last week&rsquo;s letters and vowels, finger moving right to left. <b>15</b> new letters: say the name, then the sound, then trace the strokes in the air. <b>15</b> decode: read the syllables and the three words on each letter page, first together, then one by one. <b>10</b> read aloud a short text from the prayer chapters. <b>5</b> one question about why the text matters. The companion codes on each page give learners the same letter to practise at home.</p>
<h3>Using the book between sessions</h3>
<p>Ask learners to read the letter pages for the coming week before class and to use the &ldquo;Remember every letter&rdquo; cards for the look-alike pairs. Every prayer page says whether its text has been proofread; if a text matters to your congregation, check it against your own prayer book, and follow your community&rsquo;s custom where the pronunciation differs.</p>
<p class="small">The word list at the back (5,000 words) is for later: from week 8 on, pick a topic and let learners look up words they meet.</p></section>` : '';

  // ---- pronunciation traditions ----
  const dr = drills();
  const feats = consonantFeatures();
  const tradPage = `<section class="chapter" id="ch-trad"><h2>Pronunciation traditions</h2>
<p>The same letters, three living ways of reading them aloud. <b>Israeli</b> is the everyday Modern Hebrew of Israel and the default of the Israel track. <b>Sephardi</b> is the liturgical tradition of Spanish-Portuguese and Mizrahi communities. <b>Ashkenazi</b> is the older Central and Eastern European liturgical tradition. The app&rsquo;s <i>congregation</i> setting picks one for the prayers. Data: data/pronunciation/*.json.</p>
<h3>Where they part</h3><div class="two">${feats.map((f) => `<div class="card2">${esc(f.summary)}</div>`).join('')}</div>
<h3 style="margin-top:10pt">Switching from Israeli/Sephardi to Ashkenazi</h3>
${(dr.switchCards ?? []).map((c) => `<div class="card2"><b>${esc(c.title)}</b>: ${esc(c.rule)} ${(c.examples ?? []).slice(0, 2).map((x) => `${he(x.he)} <i>${esc(x.translit)}</i> (${esc(x.gloss)})`).join('; ')}</div>`).join('')}</section>
<section class="chapter"><h2>Same word, two traditions</h2>
<table class="grid pairs"><thead><tr><th>Hebrew</th><th>Meaning</th><th>Israeli</th><th>Ashkenazi</th><th>What switches</th></tr></thead><tbody>
${(dr.pairs ?? []).map((p) => `<tr><td class="he" lang="he" dir="rtl">${p.he}</td><td>${esc(p.gloss)}</td><td>${esc(p.israeli)}</td><td>${esc(p.ashkenazi)}</td><td class="small">${esc((p.switches ?? []).join(', '))}</td></tr>`).join('')}</tbody></table>
<h3 style="margin-top:14pt">Sounding less like an outsider (Israeli Hebrew)</h3>
${(dr.drills ?? []).map((d) => `<div class="card2"><b>${esc(d.title)}.</b> <span style="color:#B0373B">Common slip:</span> ${esc(d.marker)} <br/><span style="color:#6B7F3A">Try:</span> ${esc(d.tryThis)}</div>`).join('')}
<p class="small">Statuses and source links for each claim are in the data files; the drills are marked there as unreviewed by a native speaker.</p></section>`;

  const alphabet = `<section class="chapter" id="ch-alphabet"><h2>The alphabet at a glance</h2><table class="alphabet"><thead><tr><th>#</th><th>Print</th><th>Cursive</th><th>Name</th><th>Sound</th><th>Page</th></tr></thead><tbody>
${LETTERS.map((L) => `<tr><td>${L.nn}</td><td class="he" lang="he" dir="rtl">${glyphFor(L.id, lettersJson)}</td><td class="he he-cursive" lang="he" dir="rtl">${glyphFor(L.id, lettersJson)}</td><td>${esc(L.title)}</td><td>${esc(L.sound)}</td><td><a href="#letter-${L.id}">${pg('letter-' + L.id)}</a></td></tr>`).join('')}</tbody></table></section>`;

  const letterPages = LETTERS.map((L) => {
    const tok = letterToken(L), base = `L${L.nn}_${tok}_print`;
    const glyph = glyphFor(L.id, lettersJson);
    const mn = R.src(`${base}_mnemonic`);
    const overlay = overlaySvg({ id: L.id, state: 'outline', imageHref: mn, size: 800, lettersJson });
    const sp = strokeSvg(L.id, lettersJson, 'print'), sc = strokeSvg(L.id, lettersJson, 'cursive');
    const words = vocabFor(L.id, pool);
    const ending = L.id.endsWith('final');
    const vocab = words.map((w) => `<figure>${w.matchesPicture ? `<img src="${R.src(`${base}_v${w.pictureIndex + 1}`)}" alt=""/>` : ''}<figcaption>${he(esc(w.he))}<i>${esc(w.translit)}</i>${esc(w.en)}<span class="src">${esc(w.source)}</span></figcaption></figure>`).join('') || '<div class="small">No pointed words for this letter in the data yet.</div>';
    const snd = soundFor(L.id);
    const sound = snd ? `<div class="sound-panel"><b class="t">How it sounds</b> &nbsp;${esc(snd.main)}${snd.variants.length ? ` (${esc(snd.variants.join('; '))})` : ''}. <span class="ipa">IPA Israeli ${esc(snd.ipa.israeli)}.</span>${snd.other.length ? ` ${esc(snd.other.join(' / '))}.` : ''}${snd.notes ? ` ${esc(snd.notes)}` : ''}${snd.verified ? '' : ' <i>(standard value; not in the fetched side-by-side table)</i>'}${ending ? ' Words below end with this final form.' : ''}</div>` : '';
    const url = letterUrl(o.host, L.id);
    return `<section class="letter" id="letter-${L.id}"><header><span class="num">${L.nn} / 27</span><h2>${esc(L.title)}</h2><span class="sound">${esc(L.sound)}</span></header>
<div class="glyph-card"><span class="label">Print</span>${he(glyph)}<span class="note">&nbsp;</span></div>
<div class="glyph-card cursive"><span class="label">Cursive (ktav yad)</span>${he(glyph, 'he-cursive')}<span class="note">Gveret Levin (OFL font); stroke data below is draft</span></div>
<div class="stroke"><div class="pair"><div>${sp.svg}<div class="cap">${sp.real ? `Print: ${sp.n} stroke${sp.n > 1 ? 's' : ''}` : 'Print strokes: none'}</div></div><div>${sc.svg}<div class="cap">${sc.real ? `Cursive: ${sc.n} (${esc(sc.quality ?? '')})` : 'Cursive strokes: none'}</div></div></div></div>
<div class="mnemonic">${overlay}</div>
<div class="side"><div class="mnemonic-cap"><b>Find it:</b> ${esc(L.keyword)}. The letter's shape: ${esc(L.shape)}. <span class="small">(image: ${R.isReal(`${base}_mnemonic`) ? 'final' : 'AI-image placeholder'})</span></div>
<div class="slot link-slot">${qrBox('letter_' + L.id, 'qr')}<div class="url"><b>Hear it &amp; trace it:</b><br/>${esc(url)}${ph ? '<span class="ph">placeholder host, not a live site</span>' : ''}</div></div></div>
<div class="vocab">${vocab}</div>${sound}</section>`;
  }).join('\n');

  // ---- Remember every letter: one mnemonic card per letter (data/letters/mnemonics.json, read fresh) ----
  const mst = mnemonicStatus();
  const cards = mnemonicCards();
  const rememberCard = (c) => {
    const img = R.src(c.stem);
    return `<div class="mcard" id="mn-${c.id}"><div class="mpic">${overlaySvg({ id: c.id, state: 'outline', imageHref: img, size: 600, lettersJson, title: `${c.name}: ${c.stem}` })}</div>
<div class="mhead"><span class="mn">${c.nn}</span><b>${esc(c.name)}</b>${he(glyphFor(c.id, lettersJson), 'mg')}</div>
<p><span class="k">Shape</span>${esc(c.shape)}</p><p><span class="k">Sound</span>${esc(c.sound)}</p><p><span class="k">Story</span>${esc(c.story)}</p>
<p class="warn"><span class="k">Look-alike</span>${esc(c.lookalike)}</p>
<p class="anchor"><span class="k">Anchor word</span>${he(c.word, 'aw')} <i>${esc(c.wordSound)}</i> &middot; ${esc(c.wordMeaning)}</p></div>`;
  };
  const rememberPages = [];
  rememberPages.push(cards.slice(0, 4)); // page 1 shares the page with the intro text: 4 cards, then 6 per page
  for (let i = 4; i < cards.length; i += 6) rememberPages.push(cards.slice(i, i + 6));
  const remember = `<section class="chapter" id="ch-remember"><h2>Remember every letter</h2>
<p class="small">One card per letter: a shape to see, a sound to say, a silly story that holds both, the look-alike to watch out for, and a word to anchor it. The hook is the memory aid, not the history: the letter-name meanings are real Hebrew words, but the claim that each letter was originally drawn as that object is a popular teaching story. ${mst.draft ? '<b>Draft:</b> these hooks and the pointed anchor words have not been checked by a Hebrew teacher. ' : ''}The picture on each card is ${R.isReal(cards[0].stem) ? 'an illustration' : 'a labelled placeholder until the image run is done'}; the faint outlined letter is typeset over it as vector. The same 27 cards are on the cut-out flashcard sheets (alef-mnemonic-flashcards-*.pdf).</p>
${rememberPages.map((pg, i) => `<div class="mgrid${i ? '' : ' p1'}"${i ? ' style="break-before:page"' : ''}>${pg.map(rememberCard).join('')}</div>`).join('')}</section>`;

  // ---- vowels ----
  const vrec = vowelRecords();
  const T = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };
  const vowelChapter = `<section class="chapter" id="ch-vowels"><h2>The vowels and marks</h2><p>Hebrew vowels are dots and dashes around the letter, shown here on a bet (or a vav for the two vav-vowels). Modern Israeli Hebrew has five vowel sounds, so several signs share one sound; the traditions differ more. From data/pronunciation/niqqud.json.</p>
<div class="vgrid">${vrec.map((v) => `<div class="vcard" id="vowel-${v.id}"><div class="big he">${v.shape}</div><div><h3>${esc(v.name)} ${he(v.nameHe ?? '')}</h3><div class="pos">${esc(v.position)}</div></div>
<div class="pos">${v.example ? `Example: ${he(v.example.he)} ${esc(v.example.gloss)}` : ''}</div>
<div class="trad">${['israeli', 'sephardi', 'ashkenazi'].map((t) => `<b>${T[t]}</b> ${esc(v.ipa?.[t] ?? '')} ${esc(v.english?.[t] ?? '')}`).join('<br/>')}</div>
${(v.variants ?? []).length ? `<div class="vars"><b>Variants:</b> ${v.variants.map((x) => `${he(x.shape ?? '')} ${esc(cleanNote(x.note ?? x.id, 70) || x.id)}`).join(' &middot; ')}</div>` : ''}
<div class="vn">${esc(cleanNote(v.notes, 140))}${v.verified && v.verified.english === false ? ' <i>(English approximation not source-verified)</i>' : ''}</div></div>`).join('')}</div></section>`;

  const cons = [['מ', 'm'], ['ל', 'l'], ['שׁ', 'sh'], ['ר', 'r'], ['בּ', 'b'], ['ד', 'd']];
  const vws = [[MARK.patach, 'a'], [MARK.kamatz, 'a'], [MARK.tzere, 'e'], [MARK.segol, 'e'], [MARK.chirik, 'i'], [MARK.cholam, 'o'], [MARK.kubutz, 'u']];
  const reading = `<section class="chapter" id="ch-reading"><h2>Reading practice: syllables</h2><p>Say each syllable aloud. Rows are consonants, columns are vowel signs (Israeli values).</p>
<table class="grid"><thead><tr><th></th>${vws.map(([m]) => `<th class="he" lang="he" dir="rtl" style="text-align:center;font-size:16pt">א${m}</th>`).join('')}</tr></thead><tbody>
${cons.map(([c, s]) => `<tr><th>${esc(s)}</th>${vws.map(([m, v]) => `<td class="he" lang="he" dir="rtl">${c}${m}<div class="small" style="direction:ltr;font-size:8pt">${esc(s + v)}</div></td>`).join('')}</tr>`).join('')}</tbody></table>
<p class="small" style="margin-top:8pt">Generated from code points only.</p></section>`;

  const poolTr = new Map(pool.filter((w) => w.curated).map((w) => [w.he, w.translit]));
  const lessonWords = [];
  for (const l of readJson('data/curriculum/lessons.json')?.lessons ?? []) {
    if (l.track !== 'read') continue;
    for (const w of l.words ?? []) if (w.he && w.en && !(!w.translit && !poolTr.get(w.he) && /^ה[\u05B0-\u05C7]*ו/.test(w.he)) /* transliterate.js drops the initial h of he+vav words (huu -> u): skip those until lane 3 fixes it */ && /[\u05B0-\u05BC]/.test(w.he) && !/\s/.test(w.he) && !lessonWords.some((x) => x.he === w.he) && w.he.length <= 9) lessonWords.push({ he: w.he, en: w.en, tr: w.translit || poolTr.get(w.he) || transliterate(w.he, { scheme: 'siddur', tradition: 'israeli' }), generated: !(w.translit || poolTr.get(w.he)), lesson: l.id });
  }
  const practiceWords = `<section class="chapter" id="ch-practice"><h2>Reading practice: words</h2><p>${Math.min(lessonWords.length, 72)} short words from the reading-track lessons (data/curriculum/lessons.json), in lesson order, so the first ones use only the letters and vowels taught first. Transliteration comes from the phrasebook where it has the word; entries marked * are machine-generated by the app&rsquo;s transliterator (Israeli, siddur style) and have not been checked by a native speaker.</p>
<div class="wgrid">${lessonWords.slice(0, 72).map((w) => `<div class="wcell"><span class="he" lang="he" dir="rtl">${w.he}</span><b>${esc(w.tr)}${w.generated ? '*' : ''}</b><span>${esc(w.en)}</span></div>`).join('')}</div></section>`;

  const blessingWords = `<section class="chapter" id="ch-blessing-words"><h2>The Priestly Blessing, word by word</h2>
<table class="grid"><thead><tr><th>Hebrew</th><th>Modern Israeli</th><th>Literal</th></tr></thead><tbody>${BLESSING_WORDS.map(([h, t, g]) => `<tr><td class="he" lang="he" dir="rtl">${h}</td><td>${esc(t)}</td><td>${esc(g)}</td></tr>`).join('')}</tbody></table>
<p class="small">The divine name (three occurrences, spoken &ldquo;Adonai&rdquo;) is omitted from this table. Words and glosses come from a research note and are <b>not yet verified by a Hebrew teacher</b>.</p></section>`;

  // ---- prayers: every registry text, grouped into chapters (PRAYER_GROUPS); anything unassigned lands in "More prayers and verses" so new records never drop out ----
  const byId = new Map(regPrayers.map((e) => [e.id, e]));
  const groups = PRAYER_GROUPS.map((g) => ({ ...g, items: g.ids.map((id) => byId.get(id)).filter(Boolean) })).filter((g) => g.items.length);
  const assigned = new Set(PRAYER_GROUPS.flatMap((g) => g.ids));
  const rest = regPrayers.filter((e) => !assigned.has(e.id));
  if (rest.length) groups.push({ key: 'more', title: 'More prayers and verses', intro: 'Texts added to the corpus that are not yet placed in a chapter.', items: rest });
  const flag = (v) => (v === true ? 'yes' : v === false ? 'no' : 'not recorded');
  const pcard = (e) => {
    const len = (e.he || '').length;
    const size = len > 700 ? 'pheb-xl' : len > 300 ? 'pheb-l' : '';
    return `<div class="pcard${len > 300 ? ' long' : ''}" id="text-${e.id}"><h3>${esc(e.title)} <span class="small">${esc(e.ref || '')}</span></h3><div class="he pheb ${size}" lang="he" dir="rtl">${esc(e.he).replace(/\n/g, '<br/>')}</div><div class="pbot">${qrBox('text_' + e.id, 'pq')}<div><div class="pen">${esc(e.english || '')}</div>
<div class="pfoot"><b>Hebrew:</b> ${esc(e.source)} &middot; licence: ${esc(e.license)}. <b>English:</b> ${esc(e.englishSource ?? '')} (${esc(e.englishLicense ?? '')}). Status: ${esc(e.status)}${e.proofread ? '' : ' &middot; <span class="nf">not proofread</span>'} &middot; proofread: ${flag(e.proofread)}, typed from memory: ${flag(e.typedFromMemory)}${e.nusach ? ` &middot; text tradition: ${esc(e.nusach)}` : ''} &middot; ${esc(readUrl(o.host, e.id))}</div></div></div></div>`;
  };
  const groupId = (g, i) => (i === 0 ? 'ch-prayers' : 'ch-pg-' + g.key);
  const prayerCards = groups.map((g, i) => `<section class="chapter" id="${groupId(g, i)}"><h2>${i === 0 ? 'Prayers and verses: ' : ''}${esc(g.title)}</h2>
${i === 0 ? `<p class="small">${regPrayers.length} texts from data/corpus/registry.json in ${groups.length} chapters (${groups.map((x) => esc(x.title)).join('; ')}), each text with its own code. Every text matches its cited source by machine comparison; <b>none has been proofread by a Hebrew educator</b>, and none was typed from memory. The divine name appears as written in the sources and is read &ldquo;Adonai&rdquo;. Some texts overlap (the Shema appears alone, within the V&rsquo;ahavta and in the combined reading). Texts differ by community: each footer names the text tradition (nusach) of its source.</p>` : ''}
<p class="small">${esc(g.intro)}</p>${g.items.map(pcard).join('')}</section>`).join('');
  const prayerToc = groups.map((g, i) => toc(groupId(g, i), i === 0 ? 'Prayers and verses: ' + esc(g.title) : esc(g.title))).join('');

  // ---- survival: whole phrasebook ----
  const pb = phrasebook();
  const survival = `<section class="chapter" id="ch-survival"><h2>Survival Hebrew</h2><p class="small">${pb.entries.length} phrases from data/corpus/phrasebook.json in ${pb.situations.length} situations. Transliteration is the project&rsquo;s own rendering. <b>Every phrase is flagged &ldquo;native-speaker-needed&rdquo; in the data</b> (pointing and register); slang is tagged.</p>
${pb.situations.map((s) => { const rows = pb.entries.filter((e) => e.situation === (s.id ?? s)); const sid = s.id ?? s; return `<div class="sit" id="sit-${sid}"><h3>${esc(SITUATION_TITLES[sid] ?? sid)} <span class="small">(${rows.length})</span></h3><table><tbody>${rows.map((e) => `<tr><td class="he" lang="he" dir="rtl">${esc(e.he)}</td><td class="say">${esc(e.translit)}</td><td>${esc(e.en)}${e.register && e.register !== 'neutral' ? `<span class="tag">${esc(e.register)}</span>` : ''}${e.notes ? `<span class="nt">${esc(e.notes)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`; }).join('')}</section>`;


  // ---- word list: the whole 5,000-word frequency list (data/vocab/vocab5000.json), pointed headword + short gloss ----
  const tierName = (t) => ({ 500: 'Words 1 to 500', 1000: 'Words 501 to 1,000', 2000: 'Words 1,001 to 2,000', 5000: 'Words 2,001 to 5,000' }[t] ?? 'Words');
  const wordList = wl.length ? `<section class="chapter" id="ch-wordlist"><h2>Word list: ${wl.length.toLocaleString('en-US')} common words</h2>
<p class="small">Hebrew headwords with a short English meaning, most frequent first. Pointing, glosses and ranking come from Wiktionary and OpenSubtitles frequency data (CC BY-SA 4.0; see the colophon); <b>no entry has been proofread by a Hebrew teacher</b>, and a gloss shows only the first senses. Pronunciation follows the vowel signs: use the vowels chapter.</p>
<div class="wl">${wl.map((w, i) => (i === 0 || w.tier !== wl[i - 1].tier ? `<h3>${tierName(w.tier)}</h3>` : '') + `<div class="wi"><span class="he" lang="he" dir="rtl">${esc(w.he)}</span><span class="g"><b>${w.rank}</b> ${esc(w.gloss)}</span></div>`).join('')}</div></section>` : '';

  // ---- index ----
  const link = (id, label, extra = '') => `<div><a href="#${id}" style="display:contents"><span class="t">${label}${extra}</span>${pg(id)}</a></div>`;
  const index = `<section class="chapter" id="ch-index"><h2>Index</h2><div class="index">
<h3>Letters</h3>${sorted(LETTERS, (L) => L.title).map((L) => link('letter-' + L.id, esc(L.title), ' ' + he(glyphFor(L.id, lettersJson)))).join('')}
<h3>Vowels and marks</h3>${sorted(vrec, (v) => v.name).map((v) => link('vowel-' + v.id, esc(v.name), ' ' + he(v.shape))).join('')}
<h3>Prayers and verses</h3>${sorted(regPrayers, (e) => e.title).map((e) => link('text-' + e.id, esc(e.title))).join('')}
<h3>Survival phrases by situation</h3>${pb.situations.map((s) => link('sit-' + (s.id ?? s), esc(SITUATION_TITLES[s.id ?? s] ?? (s.id ?? s)))).join('')}
<h3>Topics</h3>${[['ch-trad', 'Pronunciation traditions'], ['ch-reading', 'Syllable practice'], ['ch-practice', 'Practice words'], ['ch-blessing-words', 'Priestly Blessing, word by word'], ['ch-remember', 'Remember every letter (mnemonic cards)'], ['ch-how', 'How to use this book'], [FIRSTDAY_ID, FIRSTDAY_TITLE], [BABY_ID, BABY_TITLE], [MEMCHAIN_ID, MEMCHAIN_TITLE], ...EX.indexTopics].map(([i, l]) => link(i, l)).join('')}
</div></section>`;

  const attr = [...new Set([...(blessing.attributions || []), ...regPrayers.map((e) => e.attribution)].filter(Boolean))];
  const colophon = `<section class="chapter end-page" id="ch-colophon"><h2>Colophon, sources and statuses</h2>
<p class="small"><b>Draft proof</b> generated by book/build.mjs; letters data: ${esc(lettersSource)}. Hebrew print face: Noto Serif Hebrew; handwriting: Gveret Levin; fallback Frank Ruhl Libre (all SIL Open Font License 1.1; licence texts for all three are in assets/fonts/*-OFL.txt and docs/licenses/; the Noto Serif Hebrew text is byte-identical to google/fonts ofl/notoserifhebrew/OFL.txt, fetched 2026-11-03). QR codes made with segno (BSD-3).</p>
<p class="small"><b>What is placeholder:</b> every illustration is a labelled placeholder (no AI images have been generated); audio recordings do not exist yet (the app says so and uses the device&rsquo;s Hebrew voice, if it has one); the opening prayer is a draft pending clergy review; prayer texts and the phrasebook are not proofread by native speakers; stroke data for handwriting is draft quality; the companion-app host ${esc(o.host)}${ph ? ' is a placeholder domain' : ''}.</p>
${wl.length ? `<p class="small"><b>Word list attribution.</b> Word ranking derived from the OpenSubtitles-based FrequencyWords lists by Hermit Dave (CC BY-SA 4.0); lemmas, glosses and vocalisation derived from Wiktionary contributors (CC BY-SA 4.0), via Wiktextract/kaikki.org. Changes made: filtering, re-ranking, shortened glosses. The word list is shared under CC BY-SA 4.0; see docs/vocab/LICENSES.md.</p>` : ''}
${attr.length ? `<h3>Text attributions (from the registry)</h3>${attr.map((a) => `<p class="small">${esc(a)}</p>`).join('')}` : ''}
<p class="small"><b>Image credit line (use once real images replace placeholders):</b> Illustrations produced with an image tool and edited by the author.</p></section>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>ALEF - draft proof</title><style>${pageCss(o, tw, th, bleed)}\n${fontFaces(outDir)}\n${readFileSync(join(ROOT, 'book/style.css'), 'utf8')}\n${EX.css}</style></head><body>
${cover}${prayerOpen}${blessingPage}${howTo}${classSection}${firstDayChapter(pages)}${babyStepsChapter(pages)}${memChainChapter(pages)}${tradPage}${EX.sounds}${alphabet}
${letterPages}
${remember}
${vowelChapter}${reading}${practiceWords}${blessingWords}${prayerCards}${survival}${EX.synagogue}${EX.israel}${wordList}${EX.vocab}${EX.key}${index}${colophon}
</body></html>`;
  return html.replace('@@PRAYER_TOC@@', () => prayerToc);
}

export async function renderPdf(htmlPath, pdfPath) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  await browser.close();
}

/** Strip Chromium/Skia Creator/Producer, title, dates and XMP; leaves only Author "John Khan". Run on every finished PDF. */
export function scrubPdf(pdfPath) {
  const r = spawnSync('python3', [join(ROOT, 'book/pdf_tools.py'), 'scrub', pdfPath], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('pdf metadata scrub failed for ' + pdfPath);
}

export function pdfName(o) {
  if (!o.print) return 'alef-book-draft.pdf';
  return `alef-book-${o.trim}-print${o.bleed ? '-bleed' : ''}${o.binding === 'rtl' ? '-rtlspreads' : ''}.pdf`;
}

/** Page numbers (1-based) of every linked anchor, via python/pypdf named destinations. */
export function pagesFromPdf(pdfPath) {
  const r = spawnSync('python3', [join(ROOT, 'book/pdf_tools.py'), 'dests', pdfPath], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error('pdf_tools dests failed: ' + r.stderr);
  return JSON.parse(r.stdout);
}

export async function main(argv) {
  const o = parseArgs(argv);
  const out = join(ROOT, o.out); mkdirSync(out, { recursive: true });
  const htmlPath = join(out, 'alef-book.html');
  let html = buildHtml(o);
  writeFileSync(htmlPath, html);
  console.log(`wrote ${relative(ROOT, htmlPath)} (${html.length} bytes)`);
  if (o.pdf) {
    const pdfPath = join(out, pdfName(o));
    // Page numbers (and the blank pages that align lesson spreads) depend on each other, so re-render until no anchor moves (at most 5 renders).
    // --seed starts from the page numbers of the PDF already on disk (same variant) instead of a blind first pass.
    let cur = o.seed && existsSync(pdfPath) ? pagesFromPdf(pdfPath) : null;
    if (!cur) { await renderPdf(htmlPath, pdfPath); cur = pagesFromPdf(pdfPath); }
    for (let pass = 2; pass <= 5; pass++) {
      html = buildHtml(o, cur); writeFileSync(htmlPath, html);
      await renderPdf(htmlPath, pdfPath);
      const next = pagesFromPdf(pdfPath);
      const moved = Object.keys(cur).filter((k) => cur[k] !== next[k]);
      cur = next;
      if (!moved.length) break;
      console.warn(`pass ${pass}: page numbers moved for ${moved.length} anchors; another pass`);
    }
    const pages2 = cur;
    if (o.print) {
      const chk = (r, what) => { if (r.status !== 0) throw new Error(`pdf_tools ${what} failed for ${pdfPath}`); };
      chk(spawnSync('python3', [join(ROOT, 'book/pdf_tools.py'), 'pad-even', pdfPath], { stdio: 'inherit' }), 'pad-even');
      const [tw, th] = TRIMS[o.trim];
      chk(spawnSync('python3', [join(ROOT, 'book/pdf_tools.py'), 'finalize', pdfPath, String(tw), String(th), o.bleed ? '0.125' : '0', o.binding], { stdio: 'inherit' }), 'finalize');
    }
    scrubPdf(pdfPath);
    console.log(`wrote ${relative(ROOT, pdfPath)} (${Object.keys(pages2).length} anchors)`);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1); });
