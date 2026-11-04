#!/usr/bin/env node
// Generates docs/voices/recording-script-{israeli,ashkenazi}.md and docs/voices/recording-script.csv from data/audio/manifest.json.
// Run build_manifest.mjs first (and again after other lanes land corpus/curriculum data).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFUSABLE_LETTER_PAIRS, GRID_VOWELS } from './hebrew_data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCRIPT_TRADITIONS = ['israeli', 'ashkenazi'];
export const TAKES = { letter: 3, 'letter-variant': 3, 'letter-sound': 4, vowel: 3, syllable: 2, anchor: 2, 'lesson-word': 2, 'prayer-word': 2, word: 2, phrase: 2, 'prayer-line': 2, line: 2, prayer: 3 };
const ISRAELI_MERGED = new Set(['tet|tav', 'alef|ayin', 'kaf|qof']);
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const mdCell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function section(e) {
  if (e.kind === 'letter') return e.id.endsWith('-sound') ? 'letter-sound' : e.group === 'letter-variant' ? 'letter-variant' : 'letter';
  if (e.kind === 'word') return { 'anchor-word': 'anchor', 'lesson-word': 'lesson-word', 'prayer-word': 'prayer-word' }[e.group] || 'word';
  if (e.kind === 'line') return { phrasebook: 'phrase', 'prayer-line': 'prayer-line' }[e.group] || 'line';
  return e.kind;
}

export function direction(e, tradition) {
  const s = section(e);
  const ash = tradition === 'ashkenazi';
  switch (s) {
    case 'letter':
      return ash
        ? 'Say the letter NAME once, falling intonation, no carrier phrase. Use the Ashkenazi/Yiddish-liturgical name your community uses (e.g. "beys" for bet). DIRECTOR: confirm the 27-name list with the talent before the session.'
        : 'Say the letter NAME once, falling intonation, no carrier phrase (Modern Israeli names). Finals: say the name, then "sofit" as written.';
    case 'letter-sound':
      return 'ISOLATED SOUND: the consonant alone, no added vowel or schwa, 0.4-0.8 s, steady level. For stops (b d g k p t) release crisply and keep the release short. alef/ayin: record a soft glottal onset only. Leave 0.5 s silence head and tail.'
        + (ash ? ' Ashkenazi: tav here is the undotted-tav reading (s) only if the director confirms; otherwise record t. DECISION NEEDED.' : '');
    case 'letter-variant':
      return 'VARIANT FORM NAME: say the name with the variant sound, once, falling intonation (vet = with a v, khaf = with the ch of chet, fe = with an f, sin = with an s). Record right after the plain form (bet/vet, kaf/khaf, pe/fe, shin/sin) so the contrast is clear.'
        + (ash ? ' Ashkenazi: use your community\'s names; DIRECTOR to confirm.' : '');
    case 'anchor':
      return 'MNEMONIC ANCHOR WORD (everyday word that starts with the letter\'s sound, shown in the letter lesson): say the word naturally, once, slightly clear, correct stress. Israeli only.';
    case 'lesson-word':
      return ash ? 'Lesson vocabulary word, Ashkenazi pronunciation, as read in prayer; one breath, no carrier phrase.' : 'Lesson vocabulary word, natural Modern Israeli, correct stress, one breath, no carrier phrase.';
    case 'prayer-word':
      return ash ? 'Single word cut from a prayer, Ashkenazi pronunciation, penultimate stress; say it as if reading it slowly, not sung.' : 'Single word cut from a prayer, Israeli pronunciation; say it as if reading it slowly, not sung.';
    case 'phrase':
      return 'SURVIVAL PHRASE: say it the way an Israeli would in the street (register is in the corpus data; slang is slang). Natural rhythm, no teaching slowdown, one breath unless the text has a comma. The feminine/masculine form is already chosen by the id (-m / -f); read the pointed text as written.';
    case 'prayer-line':
      return ash
        ? 'Prayer line (a line of a longer text), Ashkenazi pronunciation, unhurried and steady, no sung cantillation, natural pause at commas.'
        : 'Prayer line (a line of a longer text), Israeli pronunciation, unhurried and steady, no sung cantillation, natural pause at commas.';
    case 'vowel':
      return 'ISOLATED VOWEL: the vowel sound alone on a soft onset (the carrier letter is silent), 0.6-1.0 s, level pitch. shva: record the pronounced shva as a very short e-like vowel; the director may ask for an extra "silent shva" demonstration. dagesh / shin-dot / sin-dot: say the sound the mark produces on its carrier (bet with dagesh "b", shin "sh", sin "s").'
        + (ash ? ' Ashkenazi: kamatz is "o"; cholam and tzere per the chosen dialect (see script header).' : '');
    case 'syllable':
      return `Consonant + vowel as ONE syllable, even stress, ~0.6 s. Vowel sound: ${(GRID_VOWELS.find((v) => e.id.endsWith('-' + v[0])) || [])[0] || ''}. bet/kaf/pe carry dagesh (hard b/k/p).`
        + (ash ? ' Ashkenazi: undotted tav is read s; DIRECTOR to confirm grid handling for tav.' : '');
    case 'word':
      return ash ? 'Natural word, Ashkenazi pronunciation, penultimate (milel) stress as read in prayer; slate nothing. One breath.' : 'Natural Modern Israeli word, correct (usually final) stress, neutral conversational tone, one breath.';
    case 'line':
      return ash ? 'Read as a phrase, Ashkenazi pronunciation, unhurried, no chant melody. Natural pauses at commas.' : 'Natural conversational delivery, Modern Israeli, as one would say it to a friend. No chant.';
    case 'prayer':
      return ash
        ? 'Prayer line, Ashkenazi pronunciation (tav "s", kamatz "o", penultimate stress). Reverent, steady, unhurried; no sung cantillation. Match the congregation-reading pace a beginner can follow.'
        : 'Prayer line, Israeli pronunciation. Reverent, steady, unhurried, no sung cantillation. Beginner-followable pace.';
    default: return '';
  }
}

export function buildScript(manifest, tradition) {
  const rows = manifest.filter((e) => e.tradition === tradition && !e.aliasOf); // aliases reuse another clip's file: nothing to record
  const bySection = new Map();
  for (const e of rows) {
    const k = section(e);
    if (!bySection.has(k)) bySection.set(k, new Map());
    bySection.get(k).set(`${e.kind}/${e.id}`, e); // text/ipa are voice-independent
  }
  return bySection;
}

export function minimalPairs(tradition) {
  const out = [];
  for (const [a, b] of CONFUSABLE_LETTER_PAIRS) {
    const merged = tradition === 'israeli' && ISRAELI_MERGED.has(`${a}|${b}`);
    out.push({
      a, b,
      note: merged ? 'MERGED in Modern Israeli: both read identically. Record both and keep them the same; the lesson is that the difference is visual only.'
        : 'Distinct sounds: record pairs back to back (A, B) in the existing syllable files; do not exaggerate.',
      syllables: GRID_VOWELS.map(([v]) => [`${a}-${v}`, `${b}-${v}`]),
    });
  }
  return out;
}

const SECTION_ORDER = ['letter', 'letter-variant', 'letter-sound', 'vowel', 'syllable', 'anchor', 'lesson-word', 'phrase', 'prayer-line', 'prayer-word', 'word', 'line', 'prayer'];
const SECTION_TITLES = {
  letter: 'Letter names', 'letter-sound': 'Isolated letter sounds', vowel: 'Vowels and marks', syllable: 'Syllable grid (22 letters x 5 vowel sounds)',
  'letter-variant': 'Letter variant forms (vet, khaf, fe, sin)', anchor: 'Mnemonic anchor words (Israeli only)', 'lesson-word': 'Lesson vocabulary words',
  phrase: 'Survival phrasebook (Israeli only)', 'prayer-line': 'Prayer lines (one clip per line)', 'prayer-word': 'Prayer words (one clip per word, for tap-to-hear)',
  word: 'Other words', line: 'Other lines', prayer: 'OPTIONAL: whole-prayer continuous reads',
};

export function renderMarkdown(manifest, tradition) {
  const sections = buildScript(manifest, tradition);
  const L = [];
  const label = tradition === 'israeli' ? 'Israeli (Modern Hebrew)' : 'Ashkenazi (liturgical)';
  L.push(`# Recording script: ${label}`, '', `Generated by tools/audio/recording_script.mjs from data/audio/manifest.json. Do not edit by hand; re-run the tool.`, '');
  L.push('No recordings exist yet. Every file below is a request.', '');
  L.push('## How to use', '',
    '- Record each voice talent (m = man, f = woman) separately. File name = path below under `audio/<voice>/`; i.e. the full path is `audio/m/' + tradition + '/<kind>/<id>.mp3` and `audio/f/...`.',
    '- Deliver 48 kHz / 24-bit WAV masters named like the path (`<id>.wav`), one file per clip, plus the CSV filled in. Lane tooling will normalize and encode (tools/audio/normalize.sh).',
    '- Record the take count shown for every clip and mark the preferred take; keep head/tail silence of about 0.3-0.5 s.',
    '- Pointed Hebrew is the authority for what to say. IPA is shown only where the project data supplies it (lane-4 starter values for Israeli syllables and consonants; NOT native-checked).', '');
  if (tradition === 'ashkenazi') {
    L.push('## Ashkenazi header (read before recording)', '',
      '- Switches from the project brief: tav without dagesh = s; kamatz = o; penultimate (milel) stress in prayer reading.',
      '- OPEN DECISION: dialect for cholam / tzere (e.g. oy vs ey) and for the vowel set generally (Litvish vs Polish/Hasidic). Choose one dialect with the talent and keep it for every clip. This is not settled by any source in the project notes.',
      '- No TTS can produce this tradition, so every Ashkenazi clip is a human-recording task.', '');
  }
  let total = 0;
  for (const s of SECTION_ORDER) {
    const items = sections.get(s);
    L.push(`## ${SECTION_TITLES[s]}`, '');
    if (!items || !items.size) { L.push('_No entries yet (source data from another lane not present when generated). Re-run after data lands._', ''); continue; }
    L.push(`Takes per clip: ${TAKES[s]}. Clips: ${items.size}.${s === 'prayer' ? ' OPTIONAL: not needed by any screen (the reader plays line and word clips); record only if budget allows.' : ''}`, '', '| id | file (under audio/<voice>/) | pointed Hebrew | IPA | direction |', '|---|---|---|---|---|');
    const dirSeen = new Map();
    for (const e of items.values()) {
      const d = direction(e, tradition);
      const short = dirSeen.has(d) ? '(as above)' : d; dirSeen.set(d, true);
      L.push(`| ${mdCell(e.id)} | ${mdCell(`${tradition}/${e.kind}/${e.id}.mp3`)} | ${mdCell(e.text)} | ${mdCell(e.ipa || '')} | ${mdCell(short)} |`);
      if (!e.optional) total += TAKES[s] || 1;
    }
    L.push('');
  }
  L.push('## Minimal pairs and confusable letters', '', 'These reuse the syllable-grid files above; no extra clips. Record the two members back to back so the contrast is natural.', '');
  for (const p of minimalPairs(tradition)) L.push(`- ${p.a} / ${p.b}: ${p.note} Syllables: ${p.syllables.map(([x, y]) => `${x}/${y}`).join(', ')}.`);
  L.push('', '_Word-level minimal pairs from the pronunciation lane (data/pronunciation/drills.json) are not imported yet._', '');
  L.push(`## Totals`, '', `Takes to record per voice for this tradition: ${total} (sum of clips x take count above; optional sections excluded).`, '');
  return L.join('\n');
}

export function renderCsv(manifest) {
  const head = ['tradition', 'voice', 'section', 'kind', 'id', 'takes', 'file', 'pointed_hebrew', 'ipa', 'direction', 'preferred_take', 'notes', 'optional'];
  const lines = [head.join(',')];
  for (const t of SCRIPT_TRADITIONS) {
    for (const e of manifest.filter((x) => x.tradition === t && !x.aliasOf)) {
      const s = section(e);
      lines.push([t, e.voice, s, e.kind, e.id, TAKES[s], e.path, e.text, e.ipa || '', direction(e, t), '', '', e.optional ? 'optional' : ''].map(csvCell).join(','));
    }
    for (const p of minimalPairs(t)) for (const v of ['m', 'f']) {
      lines.push([t, v, 'minimal-pair', 'pair', `${p.a}/${p.b}`, 0, '', '', '', `Reuses syllable files. ${p.note}`, '', '', ''].map(csvCell).join(','));
    }
  }
  return lines.join('\n') + '\n';
}

export function main(root = ROOT) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'));
  const dir = path.join(root, 'docs/voices');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of SCRIPT_TRADITIONS) fs.writeFileSync(path.join(dir, `recording-script-${t}.md`), renderMarkdown(manifest, t));
  fs.writeFileSync(path.join(dir, 'recording-script.csv'), renderCsv(manifest));
  console.log('wrote recording-script-israeli.md, recording-script-ashkenazi.md, recording-script.csv');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
