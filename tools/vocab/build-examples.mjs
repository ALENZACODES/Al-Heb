// Example sentences for the dictionary, taken from the app's own 63 story books and Israel-track dialogues (25 Nov 2026 critique: entries had no example
// sentences; "the books already contain the sentences; link them"). Nothing is written here: every example is a real book line with
// its own English, and names the book and page it came from.
//
// A line is an example for a word when one of its words, without points, is the word's spelling or one of its listed forms, and,
// when both are pointed, the points agree too (so a homograph does not borrow another word's sentence). Shorter lines first; up to
// MAX per word, from different books when possible. Hidden entries are skipped.
//
// Run: node tools/vocab/build-examples.mjs          writes data/vocab/examples.json
//      node tools/vocab/build-examples.mjs --check  exits 1 when the file is stale
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const OUT = 'data/vocab/examples.json';
export const MAX = 2;
export const MAX_WORDS = 12;
const PREFIXES = 'והבלמשכ'; // one attached prefix letter: and, the, in, to, from, that, as
const MARKS = /[֑-ׇ]/g;
const CANT = /[֑-ֽ֯׀׃]/g; // cantillation, meteg, paseq, sof pasuq
const bare = (s) => String(s || '').replace(MARKS, '');
const pointedNorm = (s) => String(s || '').replace(CANT, '').normalize('NFC');
const STOP = new Set('a an the to of be in on at for and or by as is it its one ones some used with from that this not no do does make made get gets thing someone something (n) n v'.split(' '));
/** Gloss words worth finding in a line's English, cut to a stem: "coffee" -> "coff", "half" -> "half". Parenthesised notes are skipped. */
export const glossStems = (gloss) => [...new Set(String(gloss || '').replace(/\([^)]*\)/g, ' ').toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.slice(0, w.length >= 6 ? 5 : 4)))];
/** Everyday English a book uses for a word whose dictionary gloss is its literal sense (the books greet with shalom; the gloss is "peace"). */
export const ALSO_SAID = { 'שָׁלוֹם': 'hello goodbye shalom' };
const englishWords = (en) => String(en || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
/** Same points after the first letter cluster (the prefix), ignoring a dagesh the prefix adds to the first letter (הַמֶּלֶךְ). */
const sameAfterPrefix = (tok, word) => { const strip = (x) => x.replace(/^[\u05D0-\u05EA][\u0591-\u05C7]*/, ''); const nod = (x) => x.replace(/\u05BC/, ''); return nod(strip(tok)) === nod(word); };
const tokens = (he) => String(he).split(/[\s־,.!?;:"'״׳()\-–—…]+/).filter(Boolean);

export function buildExamples(root = ROOT) {
  const j = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
  // The learner's list: the four tier packs the dictionary loads (src/vocab/loader.js).
  const vocab = [500, 1000, 2000, 5000].flatMap((t) => j(`data/vocab/packs/vocab5k-tier-${t}.json`).entries).filter((e) => !(e.flags && (e.flags === 'hidden' || e.flags.hidden || (Array.isArray(e.flags) && e.flags.includes('hidden')))));
  const shelf = j('data/books/index.json').books;
  const lines = [];
  for (const b of shelf) {
    const book = j(`data/books/${b.id}.json`);
    for (const p of book.pages || []) if (p.he && p.en) lines.push({ he: p.he, en: p.en, book: b.id, title: b.titleEn, page: p.n, toks: tokens(p.he).map((t) => ({ bare: bare(t), pointed: pointedNorm(t) })) });
  }
  // The Israel-track dialogues (draft, unreviewed, like the books): each line with its own English.
  for (const d of j('data/curriculum/dialogues.json').dialogues || []) for (const l of d.lines || []) if (l.he && l.en) lines.push({ he: l.he, en: l.en, dialogue: d.id, title: d.title, toks: tokens(l.he).map((t) => ({ bare: bare(t), pointed: pointedNorm(t) })) });
  // Long paragraphs (the Advanced book) make poor examples: keep lines of at most MAX_WORDS words.
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].toks.length > MAX_WORDS) lines.splice(i, 1);
  const where = (l) => l.book || l.dialogue;
  lines.sort((a, b) => bare(a.he).length - bare(b.he).length || (where(a) < where(b) ? -1 : where(a) > where(b) ? 1 : (a.page || 0) - (b.page || 0)));
  const byBare = new Map();
  lines.forEach((l, i) => { for (const t of l.toks) { if (!byBare.has(t.bare)) byBare.set(t.bare, new Set()); byBare.get(t.bare).add(i); } });
  const out = {};
  for (const e of vocab) {
    const spellings = [{ bare: bare(e.lemma || e.pointed), pointed: e.pointed ? pointedNorm(e.pointed) : '' }, ...(e.forms || []).map((f) => ({ bare: bare(f.he || f.pointed), pointed: f.pointed ? pointedNorm(f.pointed) : '' }))].filter((s) => s.bare.length >= 2);
    const fn = (e.tags || []).includes('function') || e.pos === 'particle' || e.pos === 'preposition' || e.pos === 'pronoun' || e.pos === 'conjunction';
    // A line counts only when its word carries exactly the same points as the dictionary word (so שָׂבַע never takes שֶׁבַע), and,
    // for a content word, when the line's own English says the meaning (so עוֹנָה "season" never takes "the mirror doesn't answer").
    const said = (l) => fn || glossStems(`${e.gloss} ${ALSO_SAID[pointedNorm(e.pointed)] || ''}`).some((g) => englishWords(l.en).some((w) => w.startsWith(g)));
    const hits = new Set();
    for (const sp of spellings) {
      if (!sp.pointed) continue;
      for (const i of byBare.get(sp.bare) || []) if (lines[i].toks.some((t) => t.bare === sp.bare && t.pointed === sp.pointed) && said(lines[i])) hits.add(i);
      // one attached prefix letter on a word of three or more letters (וְשָׁלוֹם, הַמֶּלֶךְ): the rest of the word must keep the same points
      if (sp.bare.length >= 3 && !fn) for (const pre of PREFIXES) for (const i of byBare.get(pre + sp.bare) || []) {
        if (lines[i].toks.some((t) => t.bare === pre + sp.bare && sameAfterPrefix(t.pointed, sp.pointed)) && said(lines[i])) hits.add(i);
      }
    }
    if (!hits.size) continue;
    const picked = [], books = new Set();
    for (const i of [...hits].sort((a, b) => a - b)) { if (picked.length >= MAX) break; if (books.has(where(lines[i])) && [...hits].some((k) => !books.has(where(lines[k])) && !picked.includes(k))) continue; picked.push(i); books.add(where(lines[i])); }
    for (const i of [...hits].sort((a, b) => a - b)) { if (picked.length >= MAX) break; if (!picked.includes(i)) picked.push(i); }
    out[e.id] = picked.map((i) => { const l = lines[i]; return l.book ? { he: l.he, en: l.en, book: l.book, title: l.title, page: l.page } : { he: l.he, en: l.en, dialogue: l.dialogue, title: l.title }; });
  }
  return out;
}

export function render(ex) {
  const ids = Object.keys(ex).sort();
  return '{\n' + ids.map((id) => ` ${JSON.stringify(id)}: ${JSON.stringify(ex[id])}`).join(',\n') + '\n}\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = render(buildExamples());
  if (process.argv.includes('--check')) {
    let cur = ''; try { cur = readFileSync(ROOT + OUT, 'utf8'); } catch { /* missing */ }
    if (cur !== text) { console.error(`${OUT} is stale: run node tools/vocab/build-examples.mjs`); process.exit(1); }
    console.log(`${OUT} is current`);
  } else { writeFileSync(ROOT + OUT, text); console.log(`${OUT}: ${Object.keys(JSON.parse(text)).length} words have an example from the books`); }
}
