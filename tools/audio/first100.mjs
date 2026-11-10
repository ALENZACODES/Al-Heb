#!/usr/bin/env node
// FIRST 100: the first small batch of human clips to record, per tradition (sephardi, ashkenazi), chosen from the audio manifest.
//   node tools/audio/first100.mjs           print the summary and check every id exists (both voices, both traditions)
//   node tools/audio/first100.mjs --write   write docs/voices/first-100.csv and docs/voices/FIRST-100.md
//   node tools/audio/first100.mjs --check   exit 1 if those two files are stale or an id is missing from the manifest
// Order = recording order = value order: first-day letters, vowels, first syllables, first lesson words, then the Shema, Modeh Ani and the
// blessing formula (word by word), then the prayer lines. Nothing here records or sends anything. It only reads data/audio/manifest*.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from './manifest_io.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TRADITIONS = ['sephardi', 'ashkenazi'];
export const CSV_REL = 'docs/voices/first-100.csv';
export const MD_REL = 'docs/voices/FIRST-100.md';
export const TARGET = 100;

const LETTERS = ['shin', 'bet', 'lamed', 'vav', 'mem', 'he', 'alef', 'resh', 'tav', 'yod', 'kaf', 'nun', 'chet', 'ayin', 'tsadi', 'qof', 'samekh', 'zayin'];
const VOWELS = ['kamatz', 'patach', 'tzere', 'segol', 'chirik', 'cholam', 'kubutz', 'shuruk', 'shva'];
const SYLLABLE_LETTERS = ['shin', 'bet', 'lamed', 'mem', 'he'];
const SYLLABLE_VOWELS = ['a', 'i', 'o'];
const LESSON_WORDS = 18; // first distinct pointed texts among the lesson words
const PRAYER_WORD_LINES = ['shema-1', 'modeh-ani-1', 'bless-formula-1'];
const LINES = ['shema-1', 'shema-2', 'vahavta-1', 'modeh-ani-1', 'bless-formula-1', 'hamotzi', 'kiddush-wine-1', 'candle-shabbat', 'shehecheyanu',
  'torah-barchu-l1', 'torah-barchu-l2', 'oseh-shalom', 'mah-tovu-1', 'bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3'];

export const TIERS = {
  letter: { name: 'Letter names (first-day letters first)', note: 'Say the letter NAME once, falling intonation, no carrier phrase.' },
  vowel: { name: 'Vowel signs', note: 'Say the vowel sound on the alef/bet carrier shown, once, steady.' },
  syllable: { name: 'First syllables', note: 'Say the one syllable shown, short and clean, no extra vowel after it.' },
  word: { name: 'First lesson words', note: 'One calm reading of the pointed word as you would say it in your congregation.' },
  'prayer-word': { name: 'Shema, Modeh Ani, blessing formula: word by word', note: 'The single word shown, on its own, as it sounds in the prayer.' },
  line: { name: 'Prayer lines (Shema, Modeh Ani, blessings)', note: 'The whole line at an unhurried teaching pace, as you would say it in your congregation.' },
};

/** Pick the clips for one tradition. Returns [{tier, kind, id, text, group}]; throws if an id is absent from the manifest. */
export function pick(manifest, tradition) {
  const by = new Map();
  for (const e of manifest) if (e.voice === 'm' && e.tradition === tradition) by.set(`${e.kind}|${e.id}`, e);
  const get = (kind, id) => { const e = by.get(`${kind}|${id}`); if (!e) throw new Error(`manifest has no ${tradition} ${kind}/${id}`); return e; };
  const out = [];
  const add = (tier, kind, id) => { const e = get(kind, id); out.push({ tier, kind, id, text: e.text, group: e.group }); };
  for (const id of LETTERS) add('letter', 'letter', id);
  for (const id of VOWELS) add('vowel', 'vowel', id);
  for (const l of SYLLABLE_LETTERS) for (const v of SYLLABLE_VOWELS) add('syllable', 'syllable', `${l}-${v}`);
  const seenText = new Set(); const dupes = [];
  const lessonWords = [...by.values()].filter((e) => e.kind === 'word' && e.group === 'lesson-word');
  for (const e of lessonWords) {
    if (seenText.has(e.text)) { dupes.push(e); continue; }
    if (seenText.size >= LESSON_WORDS) break;
    seenText.add(e.text); add('word', 'word', e.id);
  }
  for (const line of PRAYER_WORD_LINES) {
    const ws = [...by.values()].filter((e) => e.kind === 'word' && new RegExp(`^${line}-w\\d+$`).test(e.id)).sort((a, b) => Number(a.id.split('-w').pop()) - Number(b.id.split('-w').pop()));
    if (!ws.length) throw new Error(`no prayer words for ${line}`);
    for (const e of ws) add('prayer-word', 'word', e.id);
  }
  for (const id of LINES) add('line', 'line', id);
  // Same pointed text under another lesson-word id: one reading covers all of them, but each id needs its own file (listed in the doc).
  const dupOf = dupes.filter((d) => seenText.has(d.text)).map((d) => ({ id: d.id, text: d.text, sameAs: out.find((o) => o.kind === 'word' && o.text === d.text && o.tier === 'word')?.id })).filter((d) => d.sameAs);
  return { clips: out, dupOf };
}

const wav = (v, t, k, id) => `audio/${v}/${t}/${k}/${id}.wav`;
const mp3 = (v, t, k, id) => `audio/${v}/${t}/${k}/${id}.mp3`;
const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
export const COLS = ['rank', 'tradition', 'kind', 'id', 'pointed_hebrew', 'gloss', 'notes', 'tier', 'wav_m', 'mp3_m', 'wav_f', 'mp3_f'];

export function build(manifest = loadManifestFull(ROOT)) {
  const per = {}; const dupes = {};
  for (const t of TRADITIONS) { const r = pick(manifest, t); per[t] = r.clips; dupes[t] = r.dupOf; if (r.clips.length !== TARGET) throw new Error(`${t}: ${r.clips.length} clips, expected ${TARGET}`); }
  const rows = [];
  for (const t of TRADITIONS) per[t].forEach((c, i) => rows.push({
    rank: i + 1, tradition: t, kind: c.kind, id: c.id, pointed_hebrew: c.text, gloss: '', notes: TIERS[c.tier].note, tier: c.tier,
    wav_m: wav('m', t, c.kind, c.id), mp3_m: mp3('m', t, c.kind, c.id), wav_f: wav('f', t, c.kind, c.id), mp3_f: mp3('f', t, c.kind, c.id),
  }));
  const csv = [COLS.join(','), ...rows.map((r) => COLS.map((c) => q(r[c])).join(','))].join('\n') + '\n';
  const count = (t, tier) => per[t].filter((c) => c.tier === tier).length;
  const md = [];
  md.push('# First 100 clips to record, per tradition');
  md.push('');
  md.push('Generated by `node tools/audio/first100.mjs --write` from `data/audio/manifest*.json`. Do not edit by hand. The exact filenames and Hebrew text are in `docs/voices/first-100.csv` (200 rows: 100 sephardi, 100 ashkenazi).');
  md.push('');
  md.push('Status: **a plan, not a recording.** No audio exists in the repository yet. The picks are a draft by the tool author (value order below), not a product or teaching decision, and no teacher or cantor has reviewed the Hebrew text or the choice of clips. The pointed text is copied from the audio manifest unchanged.');
  md.push('');
  md.push('## What is in each 100');
  md.push('');
  md.push('| order | tier | clips per tradition | covers |');
  md.push('|---|---|---:|---|');
  const covers = {
    letter: `${LETTERS.length} letter names: the first-day letters (shin, bet, lamed, vav, mem, he), then alef, resh, tav, yod, kaf, nun, and the throat/tradition-sensitive chet, ayin, plus tsadi, qof, samekh, zayin`,
    vowel: 'kamatz, patach, tzere, segol, chirik, cholam, kubutz, shuruk, shva',
    syllable: `${SYLLABLE_LETTERS.join(', ')} each with a, i, o`,
    word: `first ${LESSON_WORDS} distinct pointed words of lessons r01 to r12 (shav, Shabbat, bat, shalom, lo, ...)`,
    'prayer-word': 'every word of Shema Yisrael (line 1), Modeh Ani, and the blessing formula "Baruch atah ... ha-olam"',
    line: 'Shema (2 lines) and Ve-ahavta (first line), Modeh Ani, the blessing formula, ha-Motzi, wine, Shabbat candles, Shehecheyanu, Torah-reading Barchu (2 lines), Oseh Shalom, Mah Tovu, the three Priestly Blessing lines',
  };
  let n = 0;
  for (const tier of Object.keys(TIERS)) { n++; md.push(`| ${n} | ${TIERS[tier].name} | ${count('sephardi', tier)} | ${covers[tier]} |`); }
  md.push(`| | **Total** | **${TARGET}** | the same ids and text for both traditions; only the folder (\`sephardi\` or \`ashkenazi\`) differs |`);
  md.push('');
  md.push('## Filenames');
  md.push('');
  md.push('Pattern, the same as the app\'s audio paths: `audio/<voice>/<tradition>/<kind>/<id>.<ext>`.');
  md.push('');
  md.push('- The record page (`tools/record-kit/recorder.html`) writes `.wav` and builds these names itself. John does not have to type or rename anything.');
  md.push('- The app plays `.mp3`. Ingest makes the `.mp3` (trim, loudness, mono) and puts it in `audio/`. CSV columns `wav_m`/`mp3_m` are the man voice, `wav_f`/`mp3_f` the woman voice. Use the voice that matches the speaker; one speaker is one voice.');
  md.push('- `kind` is one of `letter`, `vowel`, `syllable`, `word`, `line`. Prayer lines use kind `line` (the manifest\'s `prayer` entries are optional aliases of `line`).');
  md.push('- Example (sephardi, man): `audio/m/sephardi/letter/shin.wav`, `audio/m/sephardi/word/shema-1-w1.wav`, `audio/m/sephardi/line/shema-1.wav`.');
  md.push('');
  md.push('## How to record the batch');
  md.push('');
  md.push('1. Build one page that holds both lists: `node tools/record-kit/build.mjs --script docs/voices/first-100.csv --out ~/first100.html`. (Passing `--tradition sephardi` embeds only that tradition.)');
  md.push('2. Open it with the tradition and voice in the link, which preselects and locks them so the page matches the list: `first100.html?tradition=sephardi&voice=m` (also `ashkenazi`, and `voice=f` for the woman voice). Without the parameters, pick them on the first screen (they must match the list). Tick the consent boxes, record the 100 in order. Re-record when the page warns about loudness or silence.');
  md.push('3. Press Export a zip. Dry run: `node tools/record-kit/ingest.mjs <zip>`. Apply: add `--apply`. Then listen to every clip before anything ships (ingest checks the technical quality only, not whether the reading is right for the tradition).');
  md.push('4. Reading brief: read as you would in your own congregation\'s tradition; sound every vocal shva; keep the same distance from the microphone throughout. See `docs/traditions/SEPHARDI-DECISION.md` for what differs between the Israeli, Sephardi and Ashkenazi readings (draft, unreviewed).');
  md.push('');
  md.push('## Same text, other ids (record once, then copy)');
  md.push('');
  md.push('Some lesson-word ids have exactly the same pointed text as a clip in the list. They are not in the 100, but each id has its own manifest entry, so each needs its own file or the app will still say "No audio yet" for that lesson word. `node tools/record-kit/ingest.mjs` does this: when it accepts a clip it also copies the MP3 under every other lesson-word id with the same voice, tradition and pointed text (a `.meta.json` with `copyOf`, manifest status `recorded` plus a `copyOf` field). The dry run lists the copies; `--no-copies` turns it off. The ids it covers for these 100 (it covers any other duplicates too):');
  md.push('');
  md.push('| tradition | extra id | same text as (in the 100) |');
  md.push('|---|---|---|');
  for (const t of TRADITIONS) for (const d of dupes[t]) md.push(`| ${t} | \`word/${d.id}\` | \`word/${d.sameAs}\` |`);
  md.push('');
  md.push('## The 100, in recording order');
  md.push('');
  for (const t of TRADITIONS) {
    md.push(`### ${t}`);
    md.push('');
    md.push('| # | kind | id | text | file (man voice, wav) |');
    md.push('|---:|---|---|---|---|');
    per[t].forEach((c, i) => md.push(`| ${i + 1} | ${c.kind} | \`${c.id}\` | ${c.text} | \`${wav('m', t, c.kind, c.id)}\` |`));
    md.push('');
  }
  return { csv, md: md.join('\n'), per, dupes };
}

export function main(argv = process.argv.slice(2)) {
  const { csv, md, per } = build();
  const files = [[CSV_REL, csv], [MD_REL, md]];
  if (argv.includes('--write')) { for (const [rel, body] of files) fs.writeFileSync(path.join(ROOT, rel), body); console.log(`wrote ${CSV_REL} and ${MD_REL}`); }
  else if (argv.includes('--check')) {
    const stale = files.filter(([rel, body]) => !fs.existsSync(path.join(ROOT, rel)) || fs.readFileSync(path.join(ROOT, rel), 'utf8') !== body);
    if (stale.length) { console.error(`stale: ${stale.map((s) => s[0]).join(', ')} (run node tools/audio/first100.mjs --write)`); process.exit(1); }
    console.log('first-100 files are current');
  } else for (const t of TRADITIONS) console.log(`${t}: ${per[t].length} clips, all ids present in the manifest (man and woman voice share ids)`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { main(); } catch (e) { console.error(e.message); process.exit(1); } }
