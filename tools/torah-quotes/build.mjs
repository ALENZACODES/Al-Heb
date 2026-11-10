// Builds data/torah-quotes.json: Torah verse of the day, with Hebrew, how to say it, English and a short explanation.
// Hebrew and English are copied from data/corpus/torah (UXLC 2.6 and JPS 1917, both public domain).
// The "how to say it" line comes from src/pronunciation/transliterate.js (Israeli reading).
// The explanations live in tools/torah-quotes/quotes.json.  Run: node tools/torah-quotes/build.mjs
import fs from 'node:fs';
import { transliterate } from '../../src/pronunciation/transliterate.js';
const root = new URL('../../', import.meta.url);
const src = JSON.parse(fs.readFileSync(new URL('tools/torah-quotes/quotes.json', root)));
const NAMES = { genesis: 'Genesis', exodus: 'Exodus', leviticus: 'Leviticus', numbers: 'Numbers', deuteronomy: 'Deuteronomy' };
const cap = (s) => s.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(adonai|elohim|eloheinu|elohecha|elohekha|eloheikhem|yisra'el|ya'akov|mosheh|avram|mitzrayim)\b/gi, (w) => w[0].toUpperCase() + w.slice(1));
const out = src.map(([ref, why]) => {
  const [book, ch, v] = ref.split(' ');
  const file = JSON.parse(fs.readFileSync(new URL(`data/corpus/torah/${book}/${String(ch).padStart(2, '0')}.json`, root)));
  const verse = file.verses.find((x) => x.n === Number(v));
  if (!verse) throw new Error('missing ' + ref);
  return { id: `${book}-${ch}-${v}`, ref: `${NAMES[book]} ${ch}:${v}`, he: verse.he, tr: cap(transliterate(verse.he).replace(/\s+/g, ' ').trim()), en: verse.en, why, route: `#/torahreader?book=${book}&chapter=${ch}&verse=${v}` };
});
const ids = new Set(out.map((x) => x.id)); if (ids.size !== out.length) throw new Error('duplicate verse');
fs.writeFileSync(new URL('data/torah-quotes.json', root), JSON.stringify({ schema: 'alef-torah-quotes/1', hebrewSource: 'Unicode/XML Leningrad Codex (UXLC) 2.6, public domain', englishSource: 'The Holy Scriptures (JPS 1917), public domain', quotes: out }, null, 1) + '\n');
console.log('wrote', out.length, 'quotes');
