// Build the ALEF Torah dataset (Lane J Phase 1 + Lane J-2 layout).
//   node tools/torah/fetch_torah.mjs [--books genesis] [--out <repoRoot>] [--snapshot <dir>] [--offline]
//
// Hebrew source of record: the Unicode/XML Leningrad Codex (UXLC) book XML from tanach.us
// ("All biblical Hebrew text, in any format, may be viewed or copied without restriction").
// English: JPS 1917 ONLY, fetched per chapter from the Sefaria v3 API with the version pinned by
// title and its licence asserted on every response. Sefaria's default English is a modern
// CC-BY-NC translation and must never reach this dataset; the pin + assertions here and the
// tripwire tests (tests/torah.data.test.js) exist to keep it out.
//
// VERSIFICATION (measured, 2026-11-07): the UXLC's own verse numbering is the Westminster
// Leningrad Codex numbering, which differs from the standard Hebrew versification used by
// printed Chumashim, Hebcal and this app's excerpt registry — e.g. UXLC counts 26 verses in
// Exodus 20 where the standard grid has 23 (the Decalogue divisions), and one UXLC verse at
// the Numbers 25/26 boundary belongs to the next standard chapter. The shipped grid is the STANDARD grid:
// the UXLC word stream is re-grouped into standard verses, guided by Sefaria's pinned Hebrew
// segments (the same UXLC text, re-segmented by Sefaria to the standard grid). The grouping is
// proven, not trusted: every shipped verse's consonant skeleton must equal its guide segment's
// skeleton exactly, and the whole book's word stream must be consumed with nothing left over.
// No character of the text is added, dropped or altered — only verse boundaries move, and the
// chapters where they move are listed in docs/torah/fetch-report.json and SOURCES.md.
//
// Parasha divisions (ranges + aliyot): Hebcal's published leyning data (@hebcal/leyning,
// BSD-2-Clause), the same source the app's calendar tables derive from; portion names come from
// the app's own data/calendar/parsha.json. Ranges are validated by tiling against the grids.
//
// Outputs (under --out, default the repo root):
//   data/corpus/torah/index.json, data/corpus/torah/<book>/<nn>.json for the built books
//   docs/torah/SOURCES.md (fetch log), docs/torah/fetch-report.json (machine-readable log)
// Raw downloads are cached under --snapshot (default tools/torah/snapshot); a complete cache
// makes a re-run do zero network work. Snapshot files are build inputs, never shipped app data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : dflt; };
const OUT = path.resolve(opt('out', path.join(HERE, '../..')));
const SNAPSHOT = path.resolve(opt('snapshot', path.join(HERE, 'snapshot')));
const OFFLINE = args.includes('--offline');
const BOOKS_ARG = opt('books', 'genesis');

const { cleanLine, cleanEnglish, wordsOf } = await import(path.join(OUT, 'src/corpus/normalize.js'));
const { speechText } = await import(path.join(OUT, 'src/shell/names.js'));

// The pinned English version. Changing this string is a licence decision, not an edit:
// tests/torah.data.test.js asserts it verbatim and asserts every response's licence.
export const JPS_1917_TITLE = 'The Holy Scriptures: A New Translation (JPS 1917)';
export const UXLC_HEBREW_TITLE = "Tanach with Ta'amei Hamikra";
const LEYNING_URL = 'https://unpkg.com/@hebcal/leyning@5.2.0/dist/index.mjs';
const LEYNING_VERSION = '@hebcal/leyning 5.2.0';

export const BOOKS = [
  { id: 'genesis', en: 'Genesis', he: 'בְּרֵאשִׁית', uxlc: 'Genesis', chapters: 50 },
  { id: 'exodus', en: 'Exodus', he: 'שְׁמוֹת', uxlc: 'Exodus', chapters: 40 },
  { id: 'leviticus', en: 'Leviticus', he: 'וַיִּקְרָא', uxlc: 'Leviticus', chapters: 27 },
  { id: 'numbers', en: 'Numbers', he: 'בְּמִדְבַּר', uxlc: 'Numbers', chapters: 36 },
  { id: 'deuteronomy', en: 'Deuteronomy', he: 'דְּבָרִים', uxlc: 'Deuteronomy', chapters: 34 },
];
const buildBooks = BOOKS_ARG === 'all' ? BOOKS : BOOKS.filter((b) => BOOKS_ARG.split(',').includes(b.id));
if (!buildBooks.length) throw new Error('no books selected: ' + BOOKS_ARG);

const RETRIEVED = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchCached(rel, url) {
  const file = path.join(SNAPSHOT, rel);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  if (OFFLINE) throw new Error('offline and snapshot misses ' + rel);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  await sleep(120); // polite: sequential, spaced requests
  return buf.toString('utf8');
}

const lettersOf = (s) => [...s].filter((c) => c >= 'א' && c <= 'ת').join('');
/** Consonant skeleton of a raw Hebrew string, via the house normaliser. */
export const skeletonOf = (raw) => lettersOf(cleanLine(String(raw).replace(/\(?\{(פ|ס)\}\)?/g, '').replace(/\((פ|ס)\)/g, '')));

/** Parse one UXLC book XML into a flat token stream: words (w + qere q) with WLC provenance, plus section-break markers. */
export function parseUxlc(xml) {
  const version = (xml.match(/<version>(.*?)<\/version>/) || [])[1] || '';
  const date = (xml.match(/<edition>[\s\S]*?<date>(.*?)<\/date>/) || [])[1] || '';
  const tokens = [];
  let wlcVerses = 0;
  const wlcChapterVerses = [];
  for (const cm of xml.matchAll(/<c n="(\d+)">([\s\S]*?)<\/c>/g)) {
    const chN = Number(cm[1]);
    let count = 0;
    const tokenRe = /<v n="(\d+)">|<\/v>|<(w|q)>([\s\S]*?)<\/\2>|<(pe|samekh)\s*\/>/g;
    let m; let cur = null;
    while ((m = tokenRe.exec(cm[2]))) {
      if (m[1]) { cur = { ch: chN, v: Number(m[1]) }; count++; wlcVerses++; }
      else if (m[3] !== undefined) { if (cur) tokens.push({ word: m[3].trim(), wlc: cur }); }
      else if (m[4]) { tokens.push({ break: m[4] === 'pe' ? 'open' : 'closed' }); }
      else if (m[0] === '</v>') { cur = null; }
    }
    wlcChapterVerses.push(count);
  }
  return { version, date, tokens, wlcVerses, wlcChapterVerses };
}

/** heTrope: the UXLC text with cantillation, XML artefacts removed, NFC. No accent stripping.
 *  A maqaf pair arrives as two word elements (the first ends in maqaf); in the text it is
 *  written joined, so "maqaf + space" is joined exactly as the display normaliser does. */
export function tropeText(words) {
  return words.join(' ')
    .replace(/<x>[\s\S]*?<\/x>/g, '')
    .replace(/<\/?s[^>]*>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/־\s+/g, '־')
    .replace(/\s+/g, ' ').trim().normalize('NFC');
}

/**
 * Re-group a book's UXLC word stream into the standard verse grid.
 * guide: [{ n, heSegs, enSegs }] per standard chapter (Sefaria pinned responses).
 * Returns standard chapters [{ n, verses: [{ n, words, breakBefore, wlc: [..] }] }] and notes.
 */
export function realignBook(bookEn, tokens, guide) {
  const stream = tokens.map((t) => (t.word !== undefined ? { ...t, skel: skeletonOf(t.word) } : t));
  let ti = 0;
  let pendingBreak = null;
  const chapters = [];
  const notes = [];
  for (const g of guide) {
    const verses = [];
    for (let si = 0; si < g.heSegs.length; si++) {
      const target = skeletonOf(g.heSegs[si]);
      if (!target) throw new Error(`${bookEn} ${g.n}:${si + 1}: empty guide segment`);
      const words = []; const wlc = new Set();
      let acc = ''; let verseBreak = pendingBreak; pendingBreak = null;
      for (;;) {
        const tok = stream[ti];
        if (!tok) throw new Error(`${bookEn} ${g.n}:${si + 1}: UXLC stream exhausted early`);
        if (tok.break) { ti++; if (words.length === 0) verseBreak = tok.break; else pendingBreak = tok.break; continue; }
        ti++; words.push(tok.word); wlc.add(`${tok.wlc.ch}:${tok.wlc.v}`);
        if (tok.skel === '') continue; // punctuation-only token (e.g. a lone paseq) rides along
        acc += tok.skel;
        if (acc === target) {
          // absorb any punctuation-only tokens that belong to this verse
          while (stream[ti] && stream[ti].word !== undefined && stream[ti].skel === '') { words.push(stream[ti].word); wlc.add(`${stream[ti].wlc.ch}:${stream[ti].wlc.v}`); ti++; }
          break;
        }
        if (!target.startsWith(acc)) throw new Error(`${bookEn} ${g.n}:${si + 1}: skeleton divergence — text and guide disagree`);
      }
      verses.push({ n: si + 1, words, breakBefore: verseBreak, wlc: [...wlc] });
    }
    const involved = new Set(verses.flatMap((v) => v.wlc));
    const foreign = verses.some((v) => v.wlc.some((k) => Number(k.split(':')[0]) !== g.n));
    if (involved.size !== verses.length || foreign) notes.push({ chapter: g.n, standardVerses: verses.length, wlcVersesInvolved: involved.size, crossesWlcChapter: foreign });
    chapters.push({ n: g.n, verses });
  }
  if (ti !== stream.length) throw new Error(`${bookEn}: ${stream.length - ti} UXLC tokens left over after realignment`);
  return { chapters, notes };
}

/** Extract the 54 portion divisions from the Hebcal leyning bundle text. */
export function parseLeyning(bundle) {
  const objStart = bundle.indexOf('parshiyotObj = {');
  if (objStart < 0) throw new Error('leyning bundle: parshiyotObj not found');
  let objText = null;
  {
    let depth = 0;
    const open = bundle.indexOf('{', objStart);
    for (let i = open; i < bundle.length; i++) {
      if (bundle[i] === '{') depth++;
      else if (bundle[i] === '}' && --depth === 0) { objText = bundle.slice(open + 1, i); break; }
    }
  }
  if (objText == null) throw new Error('leyning bundle: parshiyotObj unbalanced');
  const out = new Map();
  const addEntry = (num, bookNum, fkText, label) => {
    const fk = JSON.parse(fkText.replace(/([{,])M:/g, '$1"M":')); // the bundle leaves the maftir key M unquoted
    const aliyot = [];
    for (let n = 1; n <= 7; n++) {
      const [b, e] = fk[String(n)];
      const parse = (s) => { const [c, v] = s.split(':').map(Number); return { chapter: c, verse: v }; };
      aliyot.push({ n, from: parse(b), to: parse(e) });
    }
    if (out.has(num)) throw new Error('leyning bundle: duplicate portion num ' + num + ' (' + label + ')');
    out.set(num, { num, bookNum, aliyot });
  };
  // Entries are "Name":Var$N, Name:Var$N, or "Name":{num:..., ...} (inline definition).
  // Split the object at top level (depth-aware) so inner keys are never mistaken for entries.
  const chunks = [];
  {
    let depth = 0, start = 0;
    for (let i = 0; i < objText.length; i++) {
      const c = objText[i];
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') depth--;
      else if (c === ',' && depth === 0) { chunks.push(objText.slice(start, i)); start = i + 1; }
    }
    chunks.push(objText.slice(start));
  }
  for (const chunk of chunks) {
    const em = chunk.match(/^\s*(?:"([^"]+)"|([A-Za-z][\w' -]*)):\s*([\s\S]*)$/);
    if (!em) throw new Error('leyning bundle: unparsable entry: ' + chunk.slice(0, 60));
    const label = em[1] || em[2];
    const value = em[3].trim();
    if (!value.startsWith('{')) {
      const varName = value.replace(/,$/, '');
      const def = bundle.match(new RegExp('const ' + varName.replace('$', '\\$') + '=\\{num:(\\d+),hebrew:"[^"]*",book:(\\d+),[\\s\\S]{0,700}?fullkriyah:(\\{[^{}]*\\})'));
      if (!def) throw new Error('leyning bundle: no definition for ' + varName);
      addEntry(Number(def[1]), Number(def[2]), def[3], label);
    } else {
      if (/^\{num:\d+,combined/.test(value)) continue; // a combined portion (num 101+): not a separate index entry
      const def = value.match(/^\{num:(\d+),hebrew:"[^"]*",book:(\d+),[\s\S]{0,700}?fullkriyah:(\{[^{}]*\})/);
      if (!def) throw new Error('leyning bundle: bad inline entry for ' + label);
      addEntry(Number(def[1]), Number(def[2]), def[3], label);
    }
  }
  if (out.size !== 54) throw new Error(`leyning bundle: expected 54 portions, got ${out.size}`);
  return out;
}

const slugify = (en) => en.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function fetchSefariaChapter(bookEn, chapter) {
  const nn = String(chapter).padStart(2, '0');
  const url = 'https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(`${bookEn}.${chapter}`)
    + '?version=' + encodeURIComponent('hebrew|' + UXLC_HEBREW_TITLE)
    + '&version=' + encodeURIComponent('english|' + JPS_1917_TITLE)
    + '&return_format=text_only';
  const raw = await fetchCached(`sefaria/${bookEn.toLowerCase()}-${nn}.json`, url);
  const resp = JSON.parse(raw);
  const heVer = resp.versions?.find((v) => v.language === 'he');
  const enVer = resp.versions?.find((v) => v.language === 'en');
  if (!heVer || heVer.versionTitle !== UXLC_HEBREW_TITLE || heVer.license !== 'Public Domain')
    throw new Error(`${bookEn} ${chapter}: Hebrew version pin failed (${heVer?.versionTitle} / ${heVer?.license})`);
  if (!enVer || enVer.versionTitle !== JPS_1917_TITLE || enVer.license !== 'Public Domain')
    throw new Error(`${bookEn} ${chapter}: English version pin failed (${enVer?.versionTitle} / ${enVer?.license}) — refusing to build on a non-JPS-1917 text`);
  if (!Array.isArray(heVer.text) || !Array.isArray(enVer.text) || heVer.text.length !== enVer.text.length)
    throw new Error(`${bookEn} ${chapter}: Sefaria he/en segment counts differ (${heVer.text?.length} vs ${enVer.text?.length})`);
  // Ketiv/qere: Sefaria prints "ketiv [qere]"; the house reads the pointed qere (the UXLC stream
  // carries exactly that word), so the guide drops the ketiv and keeps the qere. A ketiv can ride
  // on a maqaf prefix ("et-ye'ish [ye'ush]"): the prefix stays, only the ketiv component goes.
  const heSegs = heVer.text.map((s) => s.replace(/(\S+)\s*\[([^\]]+)\]/g, (m, tok, qere) => {
    const i = tok.lastIndexOf('־');
    // "prefix-ketiv [qere]": keep the prefix. "ketiv [qere]" and "ketiv- [qere]" (the whole
    // token is the ketiv, the bracket follows its maqaf directly): keep nothing.
    return (i >= 0 && tok.slice(i + 1) ? tok.slice(0, i + 1) : '') + qere;
  }));
  return { heSegs, enSegs: enVer.text };
}

async function main() {
  fs.mkdirSync(SNAPSHOT, { recursive: true });
  const parshaNames = JSON.parse(fs.readFileSync(path.join(OUT, 'data/calendar/parsha.json'), 'utf8')).names;

  // --- Fetch everything: UXLC XML (Hebrew source of record) + pinned Sefaria chapters (guide + English).
  const uxlcMeta = {};
  const standard = {}; // bookId -> { chapters: [{n, verses}], notes }
  const report = { retrieved: RETRIEVED, books: {}, realignments: [], chapters: [], charCounts: {} };
  for (const b of BOOKS) {
    const xml = await fetchCached(`uxlc/${b.uxlc}.xml`, `https://tanach.us/Books/${b.uxlc}.xml`);
    const parsed = parseUxlc(xml);
    uxlcMeta[b.id] = { version: parsed.version, date: parsed.date };
    const guide = [];
    for (let ch = 1; ch <= b.chapters; ch++) guide.push({ n: ch, ...(await fetchSefariaChapter(b.en, ch)) });
    const { chapters, notes } = realignBook(b.en, parsed.tokens, guide);
    standard[b.id] = { chapters, guide };
    report.books[b.id] = {
      uxlcVersion: parsed.version, uxlcFileDate: parsed.date,
      wlcVerses: parsed.wlcVerses,
      standardVerses: chapters.reduce((s, c) => s + c.verses.length, 0),
    };
    for (const n of notes) report.realignments.push({ book: b.id, ...n });
    console.log(`${b.en}: WLC ${parsed.wlcVerses} verses -> standard ${report.books[b.id].standardVerses}; realigned chapters: ${notes.map((n) => n.chapter).join(', ') || 'none'}`);
  }

  // --- Parasha divisions on the standard grid.
  const bundle = await fetchCached('hebcal-leyning-index.mjs', LEYNING_URL);
  const leyning = parseLeyning(bundle);
  const parshiyot = [];
  for (let num = 1; num <= 54; num++) {
    // The app's names table has 53 entries: it serves the Shabbat cycle, and V'Zot HaBerakhah
    // (54) is read on Simchat Torah, never on a Shabbat, so the calendar never names it.
    // Its name here comes from the same Hebcal leyning data as its range.
    const nm = parshaNames[String(num)] || (num === 54 ? { en: 'Vezot Haberakhah', he: 'וזאת הברכה' } : null);
    const ly = leyning.get(num);
    if (!nm || !ly) throw new Error(`parasha ${num}: missing name or leyning entry`);
    const book = BOOKS[ly.bookNum - 1];
    const first = ly.aliyot[0], last = ly.aliyot[6];
    parshiyot.push({
      id: slugify(nm.en), en: nm.en, he: nm.he, num, book: book.id,
      from: { book: book.id, chapter: first.from.chapter, verse: first.from.verse },
      to: { book: book.id, chapter: last.to.chapter, verse: last.to.verse },
      aliyot: ly.aliyot.map((a) => ({
        n: a.n,
        from: { book: book.id, chapter: a.from.chapter, verse: a.from.verse },
        to: { book: book.id, chapter: a.to.chapter, verse: a.to.verse },
      })),
    });
  }

  // Tiling validation against the standard grids.
  const gridPos = (bookId, c, v) => {
    let pos = 0;
    for (const b of BOOKS) {
      for (const ch of standard[b.id].chapters) {
        if (b.id === bookId && ch.n === c) {
          if (v < 1 || v > ch.verses.length) throw new Error(`range outside grid: ${bookId} ${c}:${v}`);
          return pos + v;
        }
        pos += ch.verses.length;
      }
    }
    throw new Error(`range outside grid: ${bookId} ${c}:${v}`);
  };
  let expect = 1;
  for (const p of parshiyot) {
    const f = gridPos(p.from.book, p.from.chapter, p.from.verse);
    const t = gridPos(p.to.book, p.to.chapter, p.to.verse);
    if (f !== expect) throw new Error(`parasha tiling: ${p.en} starts at grid ${f}, expected ${expect}`);
    let aExpect = f;
    for (const a of p.aliyot) {
      const af = gridPos(a.from.book, a.from.chapter, a.from.verse);
      const at = gridPos(a.to.book, a.to.chapter, a.to.verse);
      if (af !== aExpect) throw new Error(`aliyah tiling: ${p.en} #${a.n} starts at ${af}, expected ${aExpect}`);
      aExpect = at + 1;
    }
    if (aExpect !== t + 1) throw new Error(`aliyah tiling: ${p.en} aliyot end at ${aExpect - 1}, portion ends ${t}`);
    expect = t + 1;
  }
  const totalVerses = BOOKS.reduce((s, b) => s + standard[b.id].chapters.reduce((x, ch) => x + ch.verses.length, 0), 0);
  if (expect !== totalVerses + 1) throw new Error(`parasha tiling: portions end at ${expect - 1}, grid has ${totalVerses} verses`);

  // --- Counts (from the realigned grids).
  let torahHeSpoken = 0, torahWords = 0, torahLetters = 0;
  const heOf = (v) => cleanLine(tropeText(v.words));
  for (const b of BOOKS) {
    let heSpoken = 0, enChars = 0;
    for (const ch of standard[b.id].chapters) {
      for (const v of ch.verses) {
        const he = heOf(v);
        heSpoken += [...speechText(he)].length;
        torahWords += wordsOf(he).length;
        torahLetters += [...he].filter((c) => c >= 'א' && c <= 'ת').length;
      }
      for (const en of standard[b.id].guide[ch.n - 1].enSegs) enChars += [...cleanEnglish(en)].length;
    }
    torahHeSpoken += heSpoken;
    report.charCounts[b.id] = { heSpoken, en: enChars };
  }
  report.charCounts.torahHeSpokenTotal = torahHeSpoken;
  report.charCounts.torahEnTotal = BOOKS.reduce((s, b) => s + report.charCounts[b.id].en, 0);

  // --- Chapter files for the books being built.
  for (const b of buildBooks) {
    const dir = path.join(OUT, 'data/corpus/torah', b.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const ch of standard[b.id].chapters) {
      const nn = String(ch.n).padStart(2, '0');
      const guide = standard[b.id].guide[ch.n - 1];
      const parshaIds = parshiyot.filter((p) => {
        const f = gridPos(p.from.book, p.from.chapter, p.from.verse), t = gridPos(p.to.book, p.to.chapter, p.to.verse);
        const c0 = gridPos(b.id, ch.n, 1), c1 = gridPos(b.id, ch.n, ch.verses.length);
        return f <= c1 && t >= c0;
      }).map((p) => p.id);
      const chapter = {
        schema: 'alef-torah-chapter/1',
        book: b.id, bookHe: b.he, chapter: ch.n,
        ref: `${b.en} ${ch.n}`,
        parshaIds,
        source: `Unicode/XML Leningrad Codex (UXLC) ${uxlcMeta[b.id].version} (file dated ${uxlcMeta[b.id].date})`,
        license: 'Public Domain / copy without restriction (tanach.us/License.html)',
        attribution: 'Hebrew text: Unicode/XML Leningrad Codex (UXLC), Tanach.us Inc. (tanach.us; "may be viewed or copied without restriction"). Not the WLC. English: JPS 1917, public domain.',
        englishSource: JPS_1917_TITLE,
        englishLicense: 'Public Domain',
        retrieved: RETRIEVED,
        verses: ch.verses.map((v, i) => {
          const out = {
            n: v.n, he: heOf(v), heTrope: tropeText(v.words), en: cleanEnglish(guide.enSegs[i]),
            durMs: { m: null, f: null }, durMsEn: { m: null, f: null },
          };
          if (v.breakBefore) out.breakBefore = v.breakBefore;
          return out;
        }),
      };
      fs.writeFileSync(path.join(dir, nn + '.json'), JSON.stringify(chapter, null, 1) + '\n');
      const note = report.realignments.find((r) => r.book === b.id && r.chapter === ch.n);
      report.chapters.push({
        book: b.id, chapter: ch.n, standardVerses: ch.verses.length,
        sefariaHeSegs: guide.heSegs.length, sefariaEnSegs: guide.enSegs.length,
        skeletonMatch: true, mapping: note ? `re-segmented (${note.wlcVersesInvolved} WLC verses involved${note.crossesWlcChapter ? ', crosses a WLC chapter boundary' : ''})` : null,
      });
    }
    report.books[b.id].chaptersBuilt = standard[b.id].chapters.length;
    console.log(`${b.en}: ${standard[b.id].chapters.length} chapter files written`);
  }

  // --- index.json: the whole standard grid, availability per book.
  const index = {
    schema: 'alef-torah-index/1',
    generated: RETRIEVED,
    counts: { books: 5, chapters: 187, verses: totalVerses, words: torahWords, letters: torahLetters },
    books: BOOKS.map((b) => ({
      id: b.id, en: b.en, he: b.he,
      chapters: b.chapters,
      verses: standard[b.id].chapters.reduce((s, ch) => s + ch.verses.length, 0),
      chapterVerses: standard[b.id].chapters.map((ch) => ch.verses.length),
      chaptersAvailable: buildBooks.some((x) => x.id === b.id) ? b.chapters : 0,
    })),
    parshiyot,
  };
  fs.mkdirSync(path.join(OUT, 'data/corpus/torah'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'data/corpus/torah/index.json'), JSON.stringify(index, null, 1) + '\n');
  fs.mkdirSync(path.join(OUT, 'docs/torah'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'docs/torah/fetch-report.json'), JSON.stringify(report, null, 1) + '\n');

  const builtNames = buildBooks.map((b) => b.en).join(', ');
  const realignedList = report.realignments.map((r) => `${BOOKS.find((b) => b.id === r.book).en} ${r.chapter}`).join('; ');
  const log = [
    '# Torah dataset — sources and fetch log', '',
    'Generated by `tools/torah/fetch_torah.mjs`. Do not hand-edit; re-run the tool.',
    `Retrieved: ${RETRIEVED}. Books built in this run: ${builtNames}.`, '',
    '## Sources', '',
    `- Hebrew text: Unicode/XML Leningrad Codex (UXLC), Tanach.us Inc. — "All biblical Hebrew text, in any format, may be viewed or copied without restriction" (tanach.us/License.html). The text is not represented as the WLC. Per-book edition: ${BOOKS.map((b) => `${b.en} ${uxlcMeta[b.id].version}, file dated ${uxlcMeta[b.id].date}`).join('; ')}.`,
    `- English text: ${JPS_1917_TITLE} — public domain (1917 US publication; digitisation via the Open Siddur Project / Sefaria). Fetched from the Sefaria v3 API with the version pinned by title; the response's version title and licence were asserted on every chapter. Newer JPS translations (1985, 2006, 2023) are CC-BY-NC on Sefaria and are never fetched.`,
    '- Verse division: the shipped grid is the standard Hebrew versification (the one printed Chumashim, Hebcal and this app\'s excerpt registry use). The UXLC\'s own WLC verse numbering differs in a few chapters (notably the Decalogue chapters, Exodus 20 and Deuteronomy 5, and the Numbers 25/26 chapter boundary). The UXLC word stream was re-grouped into standard verses using Sefaria\'s pinned Hebrew segments (the same UXLC text, re-segmented to the standard grid) as the guide, and the re-grouping is proven verse by verse: every shipped verse\'s consonant skeleton equals its guide segment\'s skeleton, and each book\'s word stream is consumed exactly. No character of the text was added, dropped or altered; only verse boundaries moved.',
    `- Chapters where verse boundaries moved: ${realignedList || 'none'}.`,
    `- Portion divisions (ranges and aliyot): Hebcal leyning data (${LEYNING_VERSION}, ${LEYNING_URL}), the same source family the app calendar tables derive from (data/calendar/parsha.json, Hebcal-derived). Portion names (English + Hebrew) come from data/calendar/parsha.json, which holds 53 names (the Shabbat cycle); the 54th portion, Vezot Haberakhah, is read on Simchat Torah rather than a Shabbat, so its name is taken from the leyning data itself. All 54 ranges and all aliyot were validated by tiling against the standard verse grids: no gaps, no overlaps, Genesis 1:1 to Deuteronomy 34:12.`,
    '- Section breaks: petucha (open) and setuma (closed) markers come from the UXLC XML (<pe/> and <samekh/> elements) and are stored as a breakBefore flag on the following verse; a break that falls inside a verse is likewise recorded on the following verse.',
    '- Display Hebrew is the house normalisation (src/corpus/normalize.js): pointed, cantillation stripped. heTrope keeps the cantillation as fetched (NFC).', '',
    '## Counts (counted from the fetched grids, not hard-coded)', '',
    `- Whole Torah (standard grid): ${totalVerses} verses, ${torahWords} words (reading tokens; a maqaf-joined pair counts once), ${torahLetters} letters.`,
    ...BOOKS.map((b) => `- ${b.en}: ${standard[b.id].chapters.reduce((s, ch) => s + ch.verses.length, 0)} verses in ${b.chapters} chapters (WLC numbering counts ${report.books[b.id].wlcVerses})${buildBooks.some((x) => x.id === b.id) ? ' — chapter files built' : ' — grid counted; chapter files not yet built'}.`),
    '', '## TTS character counts (spoken-form Hebrew; English as printed)', '',
    `- Whole Torah: Hebrew ${torahHeSpoken} characters per voice; English ${report.charCounts.torahEnTotal} characters per voice.`,
    ...BOOKS.map((b) => `- ${b.en}: Hebrew ${report.charCounts[b.id].heSpoken} characters per voice; English ${report.charCounts[b.id].en} characters per voice.`),
    '', '## Chapter log (books built in this run)', '',
    '| Book | Chapter | Verses (standard) | Sefaria he segs | Sefaria en segs | Skeleton match | Mapping |',
    '|---|---|---|---|---|---|---|',
    ...report.chapters.map((c) => `| ${c.book} | ${c.chapter} | ${c.standardVerses} | ${c.sefariaHeSegs} | ${c.sefariaEnSegs} | ${c.skeletonMatch ? 'yes' : 'NO'} | ${c.mapping || 'none'} |`),
    '',
  ];
  fs.writeFileSync(path.join(OUT, 'docs/torah/SOURCES.md'), log.join('\n'));
  console.log(`\nindex: ${totalVerses} verses, ${torahWords} words, ${torahLetters} letters`);
  console.log(`Torah totals per voice: he ${torahHeSpoken} chars, en ${report.charCounts.torahEnTotal} chars`);
  for (const b of buildBooks) console.log(`${b.en}: he ${report.charCounts[b.id].heSpoken} chars, en ${report.charCounts[b.id].en} chars per voice`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('FETCH FAILED:', e.message); process.exit(1); });
}
