// Builds data/offline/packs.json: the files behind each downloadable offline pack on "Use Aleph offline" (lane 4, 12 Nov;
// points plan #18). Sizes are measured from disk, so the page states real byte counts.
//   node tools/offline-packs.mjs            write the file
//   node tools/offline-packs.mjs --check    exit 1 if the file on disk is out of date (tests/offline.packs.test.js runs this logic)
// tools/build-precache.mjs runs it too, before it hashes the files, so a precache rebuild keeps the pack sizes current.
// A pack = the page code a screen needs (its static imports and the literal dynamic imports it makes, followed recursively)
// plus the data files that code names literally ("data/....json"), plus extra data listed below. Files a pack lists that are
// already in the first-install precache are marked, so the page can say how much is new.
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readdirSync } from 'node:fs';
export { writePacks };
import { join, dirname, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = 'data/offline/packs.json';
/** Code a pack never follows into (other features a screen can open, but that are not part of the pack's purpose). */
const STOP = /^src\/(shell\/rimon-(stage|triggers)\.js$|audio\/synth-music\.js$|(games|retention|synagogues|camera|photo|lab|library|light|talk|ask|books|vocab|sprint|typing|wordtrace|traditions|coursemap|israel|phrases|classtrack|teacher|awards|sync|speak|listen|recordcompare)\/)/;

export const PACKS = [
  { id: 'core-lessons', label: 'Core lessons', blurb: 'The lesson list, every reading lesson with its quick check, and the letter and vowel data they use.',
    entries: ['src/curriculum/learn.view.js', 'src/curriculum/lesson.view.js'],
    data: ['data/curriculum/lessons.json', 'data/curriculum/lessons-index.json', 'data/curriculum/lesson-lexicon.json', 'data/curriculum/hints.json', 'data/curriculum/prompts.json', 'data/curriculum/word-vocab-map.json',
      'data/letters/letters.json', 'data/letters/confusables.json', 'data/letters/mnemonics.json', 'data/letters/memory-chain.json', 'data/pronunciation/niqqud.json', 'data/pronunciation/consonants.json'] },
  { id: 'core-prayers', label: 'Core prayers', blurb: 'The Read page for every prayer in the app, Follow the Service, and the prayer reading notes.',
    // tg-core.js: Follow the Service shows the divine name through its showName; src/games/ is otherwise outside the walk, so name it here
    entries: ['src/corpus/read.view.js', 'src/service/service.view.js', 'src/games/tg-core.js'],
    data: ['data/corpus/registry.json', 'data/corpus/prayer-meta.json', 'data/corpus/gaps.json', 'data/service/orders.json', 'data/homepage/prayers.json', 'data/calendar/prayer-cards.json', 'data/corpus/torah-service-guide.json'],
    dataDirs: ['data/corpus/reader/', 'data/corpus/trope/'] },
  { id: 'due-review', label: 'Your due reviews', blurb: 'The review screen and the data its cards use, plus the letter pictures for the memory cards that are due on this device.',
    entries: ['src/curriculum/review.view.js'],
    data: ['data/curriculum/word-vocab-map.json', 'data/letters/letters.json', 'data/letters/confusables.json', 'data/letters/mnemonics.json', 'data/letters/memory-chain.json', 'data/pronunciation/niqqud.json', 'data/pronunciation/consonants.json', 'data/corpus/registry.json'] },
];

const IMPORT_RE = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const DATA_RE = /['"`](data\/[A-Za-z0-9_./-]+\.json)['"`]/g;

function walkCode(entries) {
  const seen = new Set(), data = new Set(), queue = [...entries];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f) || !existsSync(join(root, f))) continue;
    seen.add(f);
    const text = readFileSync(join(root, f), 'utf8');
    for (const m of text.matchAll(IMPORT_RE)) {
      const spec = m[1] || m[2] || m[3];
      if (!spec || !spec.startsWith('.')) continue;
      const next = posix.normalize(posix.join(posix.dirname(f), spec));
      if (!next.startsWith('src/') || !next.endsWith('.js') || (STOP.test(next) && !entries.includes(next))) continue;
      queue.push(next);
    }
    for (const m of text.matchAll(DATA_RE)) if (!m[1].startsWith('data/images/')) data.add(m[1]); // picture approvals are decoration, not the pack's purpose
  }
  return { code: [...seen].sort(), data: [...data] };
}
const listDir = (dir, ext = '.json') => { try { return readdirSync(join(root, dir)).sort().filter((n) => n.endsWith(ext)).map((n) => dir + n); } catch { return []; } };

export async function computePacks() {
  const { computeManifest } = await import('./build-precache.mjs');
  const inst = new Set(computeManifest(root).files); // what the first install holds, from the same rules as precache-manifest.js
  const size = (f) => statSync(join(root, f)).size;
  const packs = PACKS.map((p) => {
    const { code, data } = walkCode(p.entries);
    const files = [...new Set([...code, ...data, ...(p.data || []), ...(p.dataDirs || []).flatMap((d) => listDir(d))])].filter((f) => existsSync(join(root, f))).sort();
    return { id: p.id, label: p.label, blurb: p.blurb, files: files.map((f) => [f, size(f), inst.has(f) ? 1 : 0]) };
  });
  const morph = {}; // memory-card pictures, one per letter: the page adds the ones whose cards are due on this device
  for (const f of listDir('assets/letters/morph/', '.svg')) morph[posix.basename(f, '.svg')] = [f, size(f), inst.has(f) ? 1 : 0];
  return { schema: 'alef-offline-packs/1', note: `Built by tools/offline-packs.mjs. Each file row is [path, bytes, 1 when it is in the first install].`, packs, letterPictures: morph };
}
export const packsText = (o) => JSON.stringify(o, null, 1) + '\n';

async function writePacks() { const text = packsText(await computePacks()); mkdirSync(join(root, dirname(OUT)), { recursive: true }); writeFileSync(join(root, OUT), text); return JSON.parse(text); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = packsText(await computePacks());
  if (process.argv.includes('--check')) {
    const cur = existsSync(join(root, OUT)) ? readFileSync(join(root, OUT), 'utf8') : '';
    if (cur !== text) { console.error(`${OUT} is out of date: run node tools/offline-packs.mjs`); process.exit(1); }
    console.log(`${OUT} is current`);
  } else {
    mkdirSync(join(root, dirname(OUT)), { recursive: true });
    writeFileSync(join(root, OUT), text);
    const o = JSON.parse(text);
    for (const p of o.packs) console.log(p.id, p.files.length, 'files', p.files.reduce((s, f) => s + f[1], 0), 'bytes', p.files.filter((f) => !f[2]).reduce((s, f) => s + f[1], 0), 'not installed');
  }
}
