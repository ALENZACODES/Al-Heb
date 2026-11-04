// Build data/torahread/{verses,words30}.json from raw downloads (see fetch_torah.py).
//   node src/torahread/tools/build-data.mjs <RAW-DIR>
// RAW-DIR is untrusted downloaded data; it is only read as text. Nothing here is typed from memory except
// data/torahread/gloss-input.json (English glosses, original) and the verse list in fetch_torah.py.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripAccents, skeleton, cleanLine, cleanEnglish } from '../../corpus/normalize.js';

const raw = process.argv[2];
if (!raw) { console.error('usage: node build-data.mjs <RAW-DIR>'); process.exit(2); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const out = (f) => path.join(root, 'data/torahread', f);
const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];
const RETRIEVED = '2026-11-03';
const xml = Object.fromEntries(BOOKS.map((b) => [b, fs.readFileSync(path.join(raw, b + '.xml'), 'utf8')]));
const version = (b) => /<version>(.*?)<\/version>/.exec(xml[b])[1];
const fdate = (b) => /<edition>[\s\S]*?<date>(.*?)<\/date>/.exec(xml[b])[1];
const SRC_NAME = (b) => `Unicode/XML Leningrad Codex (UXLC) ${version(b)} (file dated ${fdate(b)})`;
const SRC_LICENSE = 'Public Domain / copy without restriction (tanach.us/License.html)';

/** reading tokens of an XML fragment: <w> words and the <q> (qere) reading; <k> (ketiv) is skipped. */
function readingWords(fragment) {
  const words = [];
  for (const m of fragment.matchAll(/<(w|q)>([\s\S]*?)<\/\1>/g)) words.push(m[2].replace(/<x>[\s\S]*?<\/x>/g, '').replace(/<[^>]+>/g, '').trim());
  return words;
}
function verseWords(book, ch, v) {
  const c = new RegExp(`<c n="${ch}">([\\s\\S]*?)</c>`).exec(xml[book]);
  const vv = new RegExp(`<v n="${v}">([\\s\\S]*?)</v>`).exec(c[1]);
  return readingWords(vv[1]);
}
const cleanForm = (s) => cleanLine(s).replace(/׃/g, '').replace(/[^֐-׿]/g, '').normalize('NFC');

// ---- pipeline self-check: must reproduce an existing registry record exactly ----
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data/corpus/registry.json'), 'utf8')).entries;
for (const [id, b, ch, v] of [['shema-1', 'Deuteronomy', 6, 4], ['bless-priestly-1', 'Numbers', 6, 24]]) {
  if (cleanLine(verseWords(b, ch, v).join(' ')) !== registry.find((e) => e.id === id).he) throw new Error(`pipeline mismatch for ${id}`);
}
console.log('pipeline reproduces registry records shema-1 and bless-priestly-1');

// ---- verses ----
const VERSES = {
  'gen-1-1': ['Genesis', 1, 1, 'Genesis 1:1', 'The first verse of the Torah.'],
  'gen-1-3': ['Genesis', 1, 3, 'Genesis 1:3', 'Short, with the common word "and he said".'],
  'exod-20-2': ['Exodus', 20, 2, 'Exodus 20:2', 'Opening of the Ten Commandments.'],
  'exod-20-12': ['Exodus', 20, 12, 'Exodus 20:12', 'Honour your father and your mother.'],
  'lev-19-18': ['Leviticus', 19, 18, 'Leviticus 19:18', 'Love your neighbour as yourself.'],
  'deut-16-20': ['Deuteronomy', 16, 20, 'Deuteronomy 16:20', 'Justice, justice you shall pursue.'],
  'deut-33-4': ['Deuteronomy', 33, 4, 'Deuteronomy 33:4', 'Sung or said as the Torah is lifted in many congregations; here only as a short verse to read.'],
};
const verses = [];
for (const [id, [book, ch, v, ref, note]] of Object.entries(VERSES)) {
  const j = JSON.parse(fs.readFileSync(path.join(raw, `jps-${id}.json`), 'utf8'));
  if (j.license !== 'Public Domain') throw new Error(`unexpected JPS licence label for ${id}: ${j.license}`);
  if (!/JPS 1917/.test(j.versionTitle)) throw new Error('unexpected English version ' + j.versionTitle);
  verses.push({
    id, ref, he: cleanLine(verseWords(book, ch, v).join(' ')), english: cleanEnglish(Array.isArray(j.text) ? j.text.join(' ') : j.text),
    englishSource: 'JPS 1917 (The Holy Scriptures: A New Translation)', englishLicense: j.license, englishVersionSource: j.versionSource,
    source: SRC_NAME(book), sourceUrl: `https://tanach.us/Books/${book}.xml`, license: SRC_LICENSE,
    attribution: `Hebrew text: ${SRC_NAME(book)}, Tanach.us Inc., West Redding, CT, USA (tanach.us; "may be viewed or copied without restriction"). Cantillation marks removed. Not the WLC. English: JPS 1917, labelled Public Domain on Sefaria (label not independently verified).`,
    retrieved: RETRIEVED, proofread: false, note,
  });
}
fs.writeFileSync(out('verses.json'), JSON.stringify({
  schema: 'alef-torahread-verses/1', generated: RETRIEVED,
  note: 'Simple Torah verses for the reading-without-vowels ladder. Hebrew from UXLC (tanach.us), cleaned with src/corpus/normalize.js cleanLine (same rules as data/corpus/registry.json). English from JPS 1917 as served by Sefaria. NOT proofread by a Hebrew educator.',
  entries: verses,
}, null, 1) + '\n');

// ---- word frequency ----
const counts = new Map(), forms = new Map(); let tokens = 0;
for (const b of BOOKS) {
  const body = xml[b].slice(xml[b].indexOf('<c n="1">'));
  for (const w of readingWords(body)) {
    for (const part of stripAccents(w).replace(/׃/g, '').split('־')) {
      const sk = skeleton(part); if (!sk) continue;
      tokens++; counts.set(sk, (counts.get(sk) || 0) + 1);
      const f = forms.get(sk) ?? new Map(); const cf = cleanForm(part); f.set(cf, (f.get(cf) || 0) + 1); forms.set(sk, f);
    }
  }
}
const gloss = JSON.parse(fs.readFileSync(out('gloss-input.json'), 'utf8')).entries;
const vocabRows = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/index.json'), 'utf8')).rows; // read-only
const top = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 30);
const words = top.map(([sk, n], i) => {
  const g = gloss[sk]; if (!g) throw new Error('no gloss for ' + sk);
  const fl = [...forms.get(sk)].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const best = fl[0][0];
  for (const a of Object.keys(g.alts)) if (!forms.get(sk).has(a.normalize('NFC'))) throw new Error(`alt ${a} not seen in the text for ${sk}`);
  const hit = vocabRows.filter((r) => r[2] === sk && r[1].normalize('NFC') === best).sort((a, b) => a[9] - b[9])[0];
  return {
    rank: i + 1, unpointed: sk, count: n, pointed: best, pointedCount: fl[0][1], gloss: g.gloss, ...(g.say ? { say: g.say } : {}),
    // other pointings of the same spelling: kept when they have a gloss or occur at least 5 times; at most 4
    others: fl.slice(1).filter(([he, c]) => g.alts[he] || c >= 5).map(([he, c]) => ({ he, count: c, ...(g.alts[he] ? { gloss: g.alts[he] } : {}) })).slice(0, 4),
    ...(hit ? { vocabId: hit[0] } : {}),
  };
});
fs.writeFileSync(out('words30.json'), JSON.stringify({
  schema: 'alef-torahread-words30/1', generated: RETRIEVED,
  method: 'Counted over the five books of the Torah in UXLC 2.6 (tanach.us): each <w> word, with the <q> reading where the text has a ketiv/qere pair; cantillation removed; words joined by a maqaf are counted as separate words; the written spelling is the unit, so a prefix such as vav, he, lamed or bet stays part of the word (for example וְאֶת and וְלֹא are separate entries) and several different words that share one unpointed spelling are counted together (for example אֶל "to" and אֵל "God"). Ties are broken alphabetically. This is an orthographic count, not a count of dictionary lemmas.',
  totals: { tokens, distinctSpellings: counts.size },
  source: BOOKS.map((b) => SRC_NAME(b)).filter((v, i, a) => a.indexOf(v) === i)[0] + ' (all five books carry the same version string)',
  license: SRC_LICENSE,
  glossNote: 'English glosses are original, short and literal (data/torahread/gloss-input.json); not taken from data/vocab, whose Wiktionary-derived glosses are CC BY-SA. vocabId is only a cross-reference to a data/vocab entry whose pointed headword equals the pointed form here.',
  proofread: false,
  words,
}, null, 1) + '\n');
console.log('wrote verses.json (%d) and words30.json (%d words, %d tokens)', verses.length, words.length, tokens);
