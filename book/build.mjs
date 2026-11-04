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
import { overlaySvg, glyphFor, loadLettersJson } from '../tools/images/overlay.mjs';
import { LETTERS, letterToken, VOWELS } from '../tools/images/spec.mjs';
import { ROOT, readJson, vocabFor, soundFor, vowelRecords, cleanNote, drills, consonantFeatures, registryEntries, phrasebook, SITUATION_TITLES, wordPool } from './content.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const he = (s, cls = '') => `<span class="he ${cls}" lang="he" dir="rtl">${s}</span>`;
const CONFIG = readJson('book/config.json') ?? { host: 'alef.example.org', hostIsPlaceholder: true, scheme: 'https', letterPath: '/#/letters/', readPath: '/#/read/' };

function openingPrayerHtml() {
  const txt = readFileSync(join(ROOT, 'book/opening-prayer.txt'), 'utf8').trim();
  return txt.split(/\n\s*\n/).map((st) => '<p>' + esc(st).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') + '</p>').join('');
}

export const TRIMS = { '8.5x11': [8.5, 11], '8x10': [8, 10], '8.5x8.5': [8.5, 8.5], '6x9': [6, 9] };

export function parseArgs(argv) {
  const o = { pdf: false, print: false, trim: '8.5x11', bleed: false, binding: 'ltr', host: process.env.ALEF_HOST || CONFIG.host, out: 'book/out', qr: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pdf') o.pdf = true; else if (a === '--bleed') o.bleed = true; else if (a === '--print') o.print = true; else if (a === '--no-qr') o.qr = false;
    else if (a === '--trim') o.trim = argv[++i]; else if (a === '--host') o.host = argv[++i]; else if (a === '--out') o.out = argv[++i];
    else if (a === '--binding') o.binding = argv[++i];
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

function fontFaces(outDir) {
  const rel = (f) => relative(outDir, join(ROOT, 'assets/fonts', f)).split('/').map(encodeURIComponent).join('/').replace(/%2C/g, ',');
  const heRange = 'U+0590-05FF, U+FB1D-FB4F, U+200C-200F, U+25CC';
  return `@font-face{font-family:"Noto Serif Hebrew";src:url("${rel('notoserifhebrew-NotoSerifHebrew[wdth,wght].ttf')}") format("truetype");font-weight:100 900;unicode-range:${heRange}}
@font-face{font-family:"Frank Ruhl Libre";src:url("${rel('frankruhllibre-FrankRuhlLibre[wght].ttf')}") format("truetype");font-weight:300 900;unicode-range:${heRange}}
@font-face{font-family:"Gveret Levin";src:url("${rel('gveretlevin-GveretLevin-Regular.ttf')}") format("truetype");unicode-range:${heRange}}`;
}

const sorted = (a, f) => [...a].sort((x, y) => f(x).localeCompare(f(y)));

/** @param {ReturnType<typeof parseArgs>} o  @param {Record<string,number>} [pages] anchor id -> printed page number (from pass 1) */
export function buildHtml(o, pages = {}) {
  const [tw, th] = TRIMS[o.trim];
  const bleed = (o.bleed ? 0.125 : 0);
  const outDir = join(ROOT, o.out);
  const pg = (id) => `<span class="pg">${pages[id] ?? '&middot;&middot;&middot;'}</span>`;
  const toc = (id, label) => `<li><a href="#${id}" style="display:contents"><span class="t">${label}</span>${pg(id)}</a></li>`;
  const idx = readJson('assets/img/index.json');
  const R = createImgResolver({ base: relative(outDir, join(ROOT, 'assets/img')) || '.', files: idx?.files || [] });
  const lettersJson = loadLettersJson();
  const lettersSource = lettersJson ? 'data/letters/letters.json' : 'built-in glyph map (data/letters/letters.json not present)';
  const reg = registryBlessing();
  const blessing = reg || { lines: FALLBACK_BLESSING, source: 'research note torah_opener_image_program.md (Sefaria sheet 631749); NOT from the registry', status: 'transcribed-needs-check', proofread: false, attributions: [] };
  const ph = isPlaceholderHost(o.host);
  const pool = wordPool();
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
<p>Each letter has one page. Look at the picture and find the letter hiding in it. Trace the strokes in the order shown, say the sound, and read the three words. Then scan the code, or type the link, to open the same letter in the companion web app, where you can trace on a screen and hear it. Where a recorded voice is not available yet, the app falls back to your device&rsquo;s own Hebrew voice.</p>
<p><b>The path:</b> the opening prayer and blessing &rarr; the alphabet and its 27 letter pages &rarr; the vowels &rarr; syllable practice &rarr; the prayers (every page has its own code) &rarr; survival Hebrew for travel and daily life. Read for the congregation first or for Israel first; both paths use the same letters.</p>
<p><b>Print and cursive.</b> Every letter page shows the printed letter and the Israeli handwritten (ktav yad) form, each with numbered strokes where the data exists. Handwriting stroke data is marked as draft quality: it still needs a native writer&rsquo;s review.</p>
<p><b>Which pronunciation?</b> Hebrew is read differently in Israel, in Sephardi tradition and in Ashkenazi tradition. The next page explains the differences. The app lets you choose; American synagogues often use the Sephardi values.</p>
<div class="slot"><b>Companion app.</b> The page for any letter is ${esc(letterUrl(o.host, '<letter>'))} and any prayer is ${esc(readUrl(o.host, '<text>'))}.${ph ? ` <b style="color:#B0373B">The host &ldquo;${esc(o.host)}&rdquo; is a PLACEHOLDER: those links do not work until a real domain is chosen (one value, book/config.json).</b>` : ''}</div>
<h3 style="margin-top:.25in">Contents</h3><ul class="toc">
${toc('ch-blessing', 'The Priestly Blessing')}${toc('ch-trad', 'Pronunciation traditions')}${toc('ch-alphabet', 'The alphabet at a glance')}${toc('letter-alef', 'The 27 letters (22 letters and 5 final forms)')}${toc('ch-vowels', 'The vowels')}${toc('ch-reading', 'Reading practice: syllables')}${toc('ch-practice', 'Reading practice: words')}${toc('ch-blessing-words', 'The Priestly Blessing, word by word')}${toc('ch-prayers', 'Prayers and verses')}${toc('ch-survival', 'Survival Hebrew')}${toc('ch-index', 'Index')}${toc('ch-colophon', 'Colophon, sources and statuses')}</ul></section>`;

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

  // ---- prayers: every registry text ----
  const prayerCards = `<section class="chapter" id="ch-prayers"><h2>Prayers and verses</h2><p class="small">${regPrayers.length} texts from data/corpus/registry.json, each with its own code. Every text matches its cited source by machine comparison; <b>none has been proofread by a Hebrew educator</b>. The divine name appears as written in the sources and is read &ldquo;Adonai&rdquo;. Some texts overlap (the Shema appears alone, within the V&rsquo;ahavta and in the combined reading).</p>
${regPrayers.map((e) => `<div class="pcard" id="text-${e.id}"><h3>${esc(e.title)} <span class="small">${esc(e.ref || '')}</span></h3><div class="he pheb" lang="he" dir="rtl">${esc(e.he).replace(/\n/g, '<br/>')}</div><div class="pbot">${qrBox('text_' + e.id, 'pq')}<div><div class="pen">${esc(e.english || '')}</div>
<div class="pfoot"><b>Hebrew:</b> ${esc(e.source)} &middot; licence: ${esc(e.license)}. <b>English:</b> ${esc(e.englishSource ?? '')} (${esc(e.englishLicense ?? '')}). Status: ${esc(e.status)}${e.proofread ? '' : ' &middot; <span class="nf">not proofread</span>'}${ph ? '' : ''} &middot; ${esc(readUrl(o.host, e.id))}</div></div></div></div>`).join('')}</section>`;

  // ---- survival: whole phrasebook ----
  const pb = phrasebook();
  const survival = `<section class="chapter" id="ch-survival"><h2>Survival Hebrew</h2><p class="small">${pb.entries.length} phrases from data/corpus/phrasebook.json in ${pb.situations.length} situations. Transliteration is the project&rsquo;s own rendering. <b>Every phrase is flagged &ldquo;native-speaker-needed&rdquo; in the data</b> (pointing and register); slang is tagged.</p>
${pb.situations.map((s) => { const rows = pb.entries.filter((e) => e.situation === (s.id ?? s)); const sid = s.id ?? s; return `<div class="sit" id="sit-${sid}"><h3>${esc(SITUATION_TITLES[sid] ?? sid)} <span class="small">(${rows.length})</span></h3><table><tbody>${rows.map((e) => `<tr><td class="he" lang="he" dir="rtl">${esc(e.he)}</td><td class="say">${esc(e.translit)}</td><td>${esc(e.en)}${e.register && e.register !== 'neutral' ? `<span class="tag">${esc(e.register)}</span>` : ''}${e.notes ? `<span class="nt">${esc(e.notes)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`; }).join('')}</section>`;

  // ---- index ----
  const link = (id, label, extra = '') => `<div><a href="#${id}" style="display:contents"><span class="t">${label}${extra}</span>${pg(id)}</a></div>`;
  const index = `<section class="chapter" id="ch-index"><h2>Index</h2><div class="index">
<h3>Letters</h3>${sorted(LETTERS, (L) => L.title).map((L) => link('letter-' + L.id, esc(L.title), ' ' + he(glyphFor(L.id, lettersJson)))).join('')}
<h3>Vowels and marks</h3>${sorted(vrec, (v) => v.name).map((v) => link('vowel-' + v.id, esc(v.name), ' ' + he(v.shape))).join('')}
<h3>Prayers and verses</h3>${sorted(regPrayers, (e) => e.title).map((e) => link('text-' + e.id, esc(e.title))).join('')}
<h3>Survival phrases by situation</h3>${pb.situations.map((s) => link('sit-' + (s.id ?? s), esc(SITUATION_TITLES[s.id ?? s] ?? (s.id ?? s)))).join('')}
<h3>Topics</h3>${[['ch-trad', 'Pronunciation traditions'], ['ch-reading', 'Syllable practice'], ['ch-practice', 'Practice words'], ['ch-blessing-words', 'Priestly Blessing, word by word'], ['ch-how', 'How to use this book']].map(([i, l]) => link(i, l)).join('')}
</div></section>`;

  const attr = [...new Set([...(blessing.attributions || []), ...regPrayers.map((e) => e.attribution)].filter(Boolean))];
  const colophon = `<section class="chapter end-page" id="ch-colophon"><h2>Colophon, sources and statuses</h2>
<p class="small"><b>Draft proof</b> generated by book/build.mjs; letters data: ${esc(lettersSource)}. Hebrew print face: Noto Serif Hebrew; handwriting: Gveret Levin; fallback Frank Ruhl Libre (all SIL Open Font License 1.1; licence texts for Frank Ruhl Libre and Gveret Levin are in assets/fonts, the Noto licence file still has to be added before shipping). QR codes made with segno (BSD-3).</p>
<p class="small"><b>What is placeholder:</b> every illustration is a labelled placeholder (no AI images have been generated); audio recordings do not exist yet (the app falls back to a device voice); the opening prayer is a draft pending clergy review; prayer texts and the phrasebook are not proofread by native speakers; stroke data for handwriting is draft quality; the companion-app host ${esc(o.host)}${ph ? ' is a placeholder domain' : ''}.</p>
${attr.length ? `<h3>Text attributions (from the registry)</h3>${attr.map((a) => `<p class="small">${esc(a)}</p>`).join('')}` : ''}
<p class="small"><b>Image credit line (use once real images replace placeholders):</b> Illustrations created with AI tools and edited by the author.</p></section>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>ALEF - draft proof</title><style>${pageCss(o, tw, th, bleed)}\n${fontFaces(outDir)}\n${readFileSync(join(ROOT, 'book/style.css'), 'utf8')}</style></head><body>
${cover}${prayerOpen}${blessingPage}${howTo}${tradPage}${alphabet}
${letterPages}
${vowelChapter}${reading}${practiceWords}${blessingWords}${prayerCards}${survival}${index}${colophon}
</body></html>`;
  return html;
}

export async function renderPdf(htmlPath, pdfPath) {
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
    await renderPdf(htmlPath, pdfPath);
    let pages = pagesFromPdf(pdfPath);
    html = buildHtml(o, pages); writeFileSync(htmlPath, html);
    await renderPdf(htmlPath, pdfPath);
    const pages2 = pagesFromPdf(pdfPath);
    const moved = Object.keys(pages).filter((k) => pages[k] !== pages2[k]);
    if (moved.length) { console.warn(`page numbers moved for ${moved.length} anchors after pass 2; running pass 3`); html = buildHtml(o, pages2); writeFileSync(htmlPath, html); await renderPdf(htmlPath, pdfPath); }
    if (o.print) {
      spawnSync('python3', [join(ROOT, 'book/pdf_tools.py'), 'pad-even', pdfPath], { stdio: 'inherit' });
      const [tw, th] = TRIMS[o.trim];
      spawnSync('python3', [join(ROOT, 'book/pdf_tools.py'), 'finalize', pdfPath, String(tw), String(th), o.bleed ? '0.125' : '0', o.binding], { stdio: 'inherit' });
    }
    console.log(`wrote ${relative(ROOT, pdfPath)} (${Object.keys(pages2).length} anchors)`);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1); });
