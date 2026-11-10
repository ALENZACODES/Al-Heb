// Build data/morning-verses.json from raw downloads.
//   node tools/morning/build-verses.mjs <RAW-DIR>
// RAW-DIR (untrusted, read as text only) holds refs.txt ("Book chapter verse" per line), <Book>.xml from
// https://tanach.us/Books/ (UXLC) and jps/<Book>-<c>-<v>.json from the Sefaria v3 API (JPS 1917 version).
// The verse REFERENCES are an editorial choice; every Hebrew and English string comes from the downloads.
// Output has only {id, hebrew, english_jps1917, source_ref}; provenance lives in docs/morning/SOURCES.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanLine, cleanEnglish } from '../../src/corpus/normalize.js';

const raw = process.argv[2];
if (!raw) { console.error('usage: node build-verses.mjs <RAW-DIR>'); process.exit(2); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const xmlCache = {};
const xml = (b) => (xmlCache[b] ??= fs.readFileSync(path.join(raw, b + '.xml'), 'utf8'));
const words = (frag) => [...frag.matchAll(/<(w|q)>([\s\S]*?)<\/\1>/g)].map((m) => m[2].replace(/<x>[\s\S]*?<\/x>/g, '').replace(/<[^>]+>/g, '').trim());
function hebrewOf(book, ch, v) {
  const c = new RegExp(`<c n="${ch}">([\\s\\S]*?)</c>`).exec(xml(book));
  const vv = c && new RegExp(`<v n="${v}">([\\s\\S]*?)</v>`).exec(c[1]);
  return vv ? cleanLine(words(vv[1]).join(' ')) : null;
}
const NAMES = { Kings_1: '1 Kings', Samuel_1: '1 Samuel' };
const SLUG = { Psalms: 'psa', Proverbs: 'pro', Isaiah: 'isa', Micah: 'mic', Jeremiah: 'jer', Deuteronomy: 'deu', Leviticus: 'lev', Numbers: 'num', Exodus: 'exo', Joshua: 'jos', Genesis: 'gen', Zechariah: 'zec', Habakkuk: 'hab', Ecclesiastes: 'ecc', Lamentations: 'lam', Amos: 'amo', Ruth: 'rut', Job: 'job', Hosea: 'hos', Malachi: 'mal', Joel: 'joe', Kings_1: '1ki', Samuel_1: '1sa' };
const HEADING = /^(\[?A (Psalm|Song)|\[?A Psalm|[A-Z]{3,}\.)/;
const out = [], skipped = [], seen = new Set();
for (const line of fs.readFileSync(path.join(raw, 'refs.txt'), 'utf8').split('\n').filter(Boolean)) {
  const [book, ch, v] = line.split(' ');
  const id = `${SLUG[book]}-${ch}-${v}`, ref = `${NAMES[book] || book} ${ch}:${v}`;
  const j = JSON.parse(fs.readFileSync(path.join(raw, 'jps', `${book}-${ch}-${v}.json`), 'utf8')).versions?.[0];
  if (!j || j.license !== 'Public Domain' || !/JPS 1917/.test(j.versionTitle)) { skipped.push([ref, 'licence/version label']); continue; }
  const he = hebrewOf(book, ch, v);
  const en = cleanEnglish(Array.isArray(j.text) ? j.text.join(' ') : j.text);
  if (!he || !en) { skipped.push([ref, 'missing text']); continue; }
  if (seen.has(id) || [...out].some((o) => o.hebrew === he)) { skipped.push([ref, 'duplicate']); continue; }
  if (HEADING.test(en)) { skipped.push([ref, 'English carries a psalm title/section heading']); continue; }
  if (/ \.$/.test(en) || /\s{2,}/.test(en)) { skipped.push([ref, 'source typography artefact']); continue; }
  if (he.split(/\s+/).length > 26) { skipped.push([ref, 'too long for a card']); continue; }
  seen.add(id); out.push({ id, hebrew: he, english_jps1917: en, source_ref: ref });
}
fs.writeFileSync(path.join(root, 'data/morning-verses.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote %d entries; skipped %d', out.length, skipped.length);
for (const s of skipped) console.log('  skip', s.join(': '));
