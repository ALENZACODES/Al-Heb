#!/usr/bin/env node
// Recording-session kit generator: one kit per (tradition, voice) = slate order + pause markers + checklist + time estimate.
//   node tools/audio/session_kit.mjs                       print a one-line summary per kit
//   node tools/audio/session_kit.mjs --write               write docs/voices/kit/** (israeli + ashkenazi, voices m and f)
//   node tools/audio/session_kit.mjs --write --tradition sephardi   also/only sephardi (blocked on an equivalence decision, see README)
//   node tools/audio/session_kit.mjs --check               exit 1 if docs/voices/kit/** is stale
// Reads data/audio/manifest.json (required clips only: optional whole-prayer reads and aliases are excluded). No network.
import { loadManifestFull } from './manifest_io.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { section, direction, TAKES } from './recording_script.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KIT_TRADITIONS = ['israeli', 'ashkenazi'];
export const KIT_VOICES = ['m', 'f'];
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Pause markers used in slate.csv (column `marker`) and explained in the kit README. Seconds are the engineer's/talent's silence. */
export const MARKERS = {
  T: { seconds: 1.5, meaning: 'between takes of the SAME clip' },
  C: { seconds: 3, meaning: 'after the last take of a clip, before the next clip' },
  G: { seconds: 6, meaning: 'group boundary (next letter, next prayer): sip of water allowed, no talking over the room tone' },
  B: { seconds: 300, meaning: 'BREAK: stop recording, water, 5 min rest, re-check level and mic distance, then resume at the next row' },
  RT: { seconds: 10, meaning: 'room tone: 10 s of silence at session start and again at session end' },
  REF: { seconds: 0, meaning: 'reference re-take: at session end re-record the FIRST clip of the session to check that level and voice still match' },
};

/** Time-model assumptions. NOT MEASURED: no talent has been timed. Replace with a timed 30-clip pilot (see README). */
export const SCENARIOS = {
  fast: { label: 'fast (experienced, lightly directed)', overheadPerClip: 3, retakeFactor: 1.0, breakMin: 5, breakEveryMin: 50, setupMin: 10 },
  likely: { label: 'likely (assumption)', overheadPerClip: 6, retakeFactor: 1.25, breakMin: 10, breakEveryMin: 45, setupMin: 20 },
  slow: { label: 'slow (heavily directed, many retakes)', overheadPerClip: 10, retakeFactor: 1.6, breakMin: 10, breakEveryMin: 40, setupMin: 30 },
};
const GAP_PER_TAKE = 1.5; // seconds of silence head+tail per take attempt
const READ_CPS = 9;       // Hebrew letters per second for unhurried reading (rough assumption)
const CLIP_SECONDS = { letter: 1.2, 'letter-variant': 1.2, 'letter-sound': 0.8, vowel: 1.0, syllable: 0.6, anchor: 0.9, 'lesson-word': 0.9, 'prayer-word': 0.8, word: 0.9 };
const SESSION_CAP_MIN = 60;        // max likely-case minutes of CLIP recording per session (about 90 booth minutes with setup and breaks); a fatigue assumption, not a measured limit

export const hebLetters = (t) => [...String(t)].filter((c) => c >= 'א' && c <= 'ת').length;
export function clipSeconds(e) {
  const s = section(e);
  if (CLIP_SECONDS[s] != null) return CLIP_SECONDS[s];
  return 0.7 + hebLetters(e.text) / READ_CPS; // phrase, prayer-line, line
}
export function clipMinutes(e, sc) {
  const takes = TAKES[section(e)] || 1;
  const sec = takes * sc.retakeFactor * (clipSeconds(e) + GAP_PER_TAKE) + sc.overheadPerClip;
  return sec / 60;
}

const ALPHA_ORDER = ['alef', 'bet', 'vet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet', 'yod', 'kaf', 'khaf', 'lamed', 'mem', 'nun', 'samekh', 'ayin', 'pe', 'fe', 'tsadi', 'qof', 'resh', 'shin', 'sin', 'tav',
  'kaf-final', 'mem-final', 'nun-final', 'pe-final', 'tsadi-final'];
const alphaRank = (id) => { const i = ALPHA_ORDER.indexOf(id.replace(/-sound$/, '')); return i < 0 ? 99 : i; };
const VOWEL_ORDER = ['kamatz', 'patach', 'tzere', 'segol', 'chirik', 'cholam', 'kubutz', 'shuruk', 'shva', 'chataf-patach', 'chataf-segol', 'chataf-kamatz', 'dagesh', 'shin-dot', 'sin-dot'];
const GRID_V = ['a', 'e', 'i', 'o', 'u'];
const recordOf = (id) => id.replace(/-(l|w)\d+$/, '');

/** Ordered required clips for one voice+tradition, split into named blocks. */
export function orderedBlocks(manifest, tradition, voice) {
  const rows = manifest.filter((e) => e.voice === voice && e.tradition === tradition && !e.optional && !e.aliasOf);
  const by = (names) => rows.filter((e) => names.includes(section(e)));
  const byAlpha = (list) => list.slice().sort((a, b) => alphaRank(a.id) - alphaRank(b.id));
  const bySyl = (list) => list.slice().sort((a, b) => {
    const [la, va] = [a.id.slice(0, a.id.lastIndexOf('-')), a.id.slice(a.id.lastIndexOf('-') + 1)];
    const [lb, vb] = [b.id.slice(0, b.id.lastIndexOf('-')), b.id.slice(b.id.lastIndexOf('-') + 1)];
    return alphaRank(la) - alphaRank(lb) || GRID_V.indexOf(va) - GRID_V.indexOf(vb);
  });
  const stable = (list) => list; // keep manifest order (corpus/lesson order)
  const prayers = (() => {
    const list = by(['prayer-line', 'prayer-word']);
    const order = []; const seen = new Set();
    for (const e of list) { const r = recordOf(e.id); if (!seen.has(r)) { seen.add(r); order.push(r); } }
    return order.flatMap((r) => [...list.filter((e) => recordOf(e.id) === r && section(e) === 'prayer-line'), ...list.filter((e) => recordOf(e.id) === r && section(e) === 'prayer-word')]);
  })();
  const names = [...byAlpha(by(['letter', 'letter-variant'])), ...by(['vowel']).sort((a, b) => VOWEL_ORDER.indexOf(a.id) - VOWEL_ORDER.indexOf(b.id))];
  const blocks = [
    { name: 'Letter names, variant forms, vowels and marks', cap: SESSION_CAP_MIN, clips: names },
    { name: 'Isolated letter sounds (directed)', cap: SESSION_CAP_MIN, clips: byAlpha(by(['letter-sound'])) },
    { name: 'Syllable grid', cap: SESSION_CAP_MIN, clips: bySyl(by(['syllable'])) },
    { name: 'Mnemonic anchors and lesson words', cap: SESSION_CAP_MIN, clips: stable([...by(['anchor']), ...by(['lesson-word'])]) },
    { name: 'Survival phrasebook', cap: SESSION_CAP_MIN, clips: stable(by(['phrase'])) },
    { name: 'Prayer lines and words', cap: SESSION_CAP_MIN, clips: prayers },
    { name: 'Other words and lines', cap: SESSION_CAP_MIN, clips: stable(by(['word', 'line'])) },
  ];
  return blocks.filter((b) => b.clips.length);
}

/** Split blocks into sessions by likely-case booth time; insert break markers. */
export function buildKit(manifest, tradition, voice) {
  const sc = SCENARIOS.likely;
  const sessions = [];
  let cur = null;
  for (const b of orderedBlocks(manifest, tradition, voice)) {
    // blocks are packed into the current session until the cap; the prayer block always starts a fresh session (register stays steady)
    if (b.name.startsWith('Prayer')) cur = null;
    for (const e of b.clips) {
      const m = clipMinutes(e, sc);
      if (!cur || cur.minutes + m > b.cap) { cur = { blocks: [], clips: [], minutes: 0 }; sessions.push(cur); }
      if (!cur.blocks.includes(b.name)) cur.blocks.push(b.name);
      cur.clips.push(e); cur.minutes += m;
    }
  }
  sessions.forEach((s, i) => { s.n = i + 1; });
  // slate rows
  let seq = 0;
  const rows = [];
  for (const s of sessions) {
    let sinceBreak = 0;
    s.clips.forEach((e, i) => {
      seq += 1;
      const sec = section(e);
      const next = s.clips[i + 1];
      sinceBreak += clipMinutes(e, sc);
      const marks = [];
      if (i === 0) marks.push('RT');
      const groupEdge = next && (recordOf(next.id) !== recordOf(e.id) && ['prayer-line', 'prayer-word'].includes(sec) || (sec === 'syllable' && next.id.slice(0, next.id.lastIndexOf('-')) !== e.id.slice(0, e.id.lastIndexOf('-'))));
      if (next) marks.push(groupEdge ? 'G' : 'C');
      if (next && sinceBreak >= sc.breakEveryMin) { marks.push('B'); sinceBreak = 0; }
      if (!next) marks.push('REF', 'RT');
      rows.push({ seq, session: s.n, section: sec, id: e.id, takes: TAKES[sec] || 1, file: e.path.replace(/\.mp3$/, '.wav'), text: e.text, ipa: e.ipa || '', marker: marks.join('+'), direction: direction(e, tradition) });
    });
  }
  return { tradition, voice, sessions, rows, estimate: estimate(sessions, rows) };
}

export function estimate(sessions, rows) {
  const out = {};
  for (const [k, sc] of Object.entries(SCENARIOS)) {
    let clipMin = 0; let sessionsMin = 0; const per = [];
    for (const s of sessions) {
      const m = s.clips.reduce((a, e) => a + clipMinutes(e, sc), 0);
      const total = m + sc.setupMin + Math.floor(m / sc.breakEveryMin) * sc.breakMin;
      per.push(total); clipMin += m; sessionsMin += total;
    }
    out[k] = { label: sc.label, boothHours: +(sessionsMin / 60).toFixed(1), perSessionMin: per.map((x) => Math.round(x)), recordingOnlyHours: +(clipMin / 60).toFixed(1) };
  }
  out.takes = rows.reduce((a, r) => a + r.takes, 0);
  out.clips = rows.length;
  return out;
}

const hm = (h) => `${h.toFixed(1)} h`;
export function renderPlan(kit, talentLabel) {
  const { tradition, voice, sessions, estimate: est } = kit;
  const L = [];
  L.push(`# Recording kit: ${talentLabel} (${voice === 'm' ? 'man' : 'woman'}, ${tradition})`, '',
    'Generated by `node tools/audio/session_kit.mjs --write`. Do not edit by hand. Conventions, markers and the checklist template are in ../README.md.', '',
    '**No recordings exist. No talent has been contacted or timed. Everything below is a plan.**', '');
  L.push('## Scope', '', `- ${est.clips} required clips, ${est.takes} takes at the take counts in docs/voices/recording-script-${tradition}.md, over ${sessions.length} sessions.`,
    '- Optional whole-prayer continuous reads and alias clips are excluded (nothing in the app asks for them).',
    tradition === 'ashkenazi' ? '- Ashkenazi dialect (Litvish vs Polish/Hasidic, cholam/tzere realisations) is an OPEN DECISION to settle with the talent before session 1; see the script header.' : '- Phrasebook and anchor words are Modern conversational Hebrew and exist only in the Israeli kit.', '');
  L.push('## Time estimate (booth time, NOT measured)', '',
    'Built from assumptions: spoken clip length (letters/words about 0.6-1.2 s; phrases and prayer lines about 9 Hebrew letters per second plus 0.7 s), 1.5 s of silence per take, a per-clip overhead for cueing and marking the preferred take, a retake factor on top of the stated take counts, breaks, and per-session setup. Nobody has been timed. Run the 30-clip pilot (README) and replace these numbers.', '',
    '| scenario | booth hours (incl. setup and breaks) | of which clip recording | sessions (minutes each) |', '|---|---:|---:|---|');
  for (const k of Object.keys(SCENARIOS)) L.push(`| ${est[k].label} | ${hm(est[k].boothHours)} | ${hm(est[k].recordingOnlyHours)} | ${est[k].perSessionMin.join(', ')} |`);
  L.push('', 'Excluded: editing, normalisation (tools/audio/normalize.sh), QC listening, pickups/re-records after review, travel, and director time before or after the booth.', '');
  L.push('## Session order (slate order is in slate.csv)', '', '| session | blocks | clips | takes | likely minutes of clip recording |', '|---:|---|---:|---:|---:|');
  for (const s of sessions) {
    const takes = kit.rows.filter((r) => r.session === s.n).reduce((a, r) => a + r.takes, 0);
    L.push(`| ${s.n} | ${s.blocks.join('; ')} | ${s.clips.length} | ${takes} | ${Math.round(s.minutes)} |`);
  }
  L.push('', '## Checklist for this kit', '',
    '- [ ] Talent confirmed and agreement signed (docs/voices/buyout-contract-terms.md is a template list, not legal advice).',
    `- [ ] Talent has seen docs/voices/recording-script-${tradition}.md and the 27-name letter list; pronunciations queried before session 1.`,
    '- [ ] Pointed Hebrew for this kit reviewed by a native speaker (not done: all text is starter data).',
    tradition === 'ashkenazi' ? '- [ ] Dialect chosen and written on the script header (OPEN DECISION).' : '- [ ] Director confirmed the merged-letter handling (tet/tav, alef/ayin, kaf/qof sound the same in Israeli; see script minimal pairs).',
    '- [ ] Mic, room, interface and chain noted once and reused for every session of this voice (casting brief: noise floor below about -60 dBFS).',
    '- [ ] Session N: room tone 10 s at start; level check on the first clip; breaks at B markers; reference re-take of the first clip and 10 s room tone at the end.',
    '- [ ] After each session: files named `<id>.wav` into `audio/' + voice + '/' + tradition + '/<kind>/`; peaks below -3 dBFS; tick the row in slate.csv; run `node tools/audio/normalize.sh` then `node tools/audio/build_manifest.mjs`; check `node tools/audio/coverage.mjs --who`.', '');
  return L.join('\n');
}

export function renderSlateCsv(kit) {
  const head = ['seq', 'session', 'section', 'id', 'takes', 'file', 'pointed_hebrew', 'ipa', 'marker', 'direction', 'done', 'preferred_take', 'notes'];
  return [head.join(','), ...kit.rows.map((r) => [r.seq, r.session, r.section, r.id, r.takes, r.file, r.text, r.ipa, r.marker, r.direction, '', '', ''].map(csvCell).join(','))].join('\n') + '\n';
}

export function renderReadme() {
  const L = ['# Recording-session kits', '',
    'Generated by `node tools/audio/session_kit.mjs --write`. One folder per tradition and voice: `<tradition>-<voice>/slate.csv` (every clip, in recording order) and `session-plan.md` (sessions, time estimate, checklist).', '',
    '**Status: plans only. No talent has been contacted, no session has been run, nothing has been recorded, and the time estimates are unmeasured assumptions.**', '',
    '## Kits', '', '| kit | talent role |', '|---|---|',
    '| israeli-m | Ari (man), native Israeli Hebrew |', '| israeli-f | Noa (woman), native Israeli Hebrew |',
    '| ashkenazi-m | Ashkenazi liturgical reader (man) |', '| ashkenazi-f | Ashkenazi liturgical reader (woman) |', '',
    'Sephardi: no kit by default. Sephardi-values clips are all missing and data/audio/equivalence.json is empty because nobody with authority has decided which Israeli clips may stand in for Sephardi ones. Once that is decided, either add rules to equivalence.json (fewer recordings) or run `node tools/audio/session_kit.mjs --write --tradition sephardi` to generate full kits.', '',
    '## Pause markers (column `marker` in slate.csv; combined with +)', '', '| marker | silence | meaning |', '|---|---:|---|'];
  for (const [k, v] of Object.entries(MARKERS)) L.push(`| ${k} | ${v.seconds ? v.seconds + ' s' : '-'} | ${v.meaning} |`);
  L.push('', 'A row with `RT` first means: record 10 s of room tone before this clip. `C` is the default after a clip, `G` replaces it at group edges, `B` is added when about 45 likely-minutes have passed since the last break.', '',
    '## Slate and naming', '',
    '- Preferred (file per clip): the engineer arms one file per slate row. Each file holds the stated number of takes, separated by the `T` pause, with the preferred take noted in the `preferred_take` column. File name = the `file` column (`.wav`, 48 kHz / 24-bit).',
    '- Fallback (continuous file per session): the talent or engineer says the row number and take number ("one forty-two, take two") into the mic, pauses 1 s, then performs the take. Splitting later relies on those spoken slates; this mode costs extra edit time and is not recommended for isolated sounds.',
    '- Never improvise: the pointed Hebrew in the row is what is said. Query anything doubtful by writing it in `notes`, do not silently change it.', '',
    '## Order rationale', '',
    '1. Names and vowels first (low strain, warms the voice, sets the level). 2. Isolated sounds (hardest to do naturally) early, while the voice is fresh, with the director present. 3. Syllable grid, grouped by letter. 4. Anchors, lesson words, phrasebook. 5. Prayers last and never mixed with other blocks, grouped by prayer so the register stays steady (each prayer: its lines, then its words).', '',
    '## Timing pilot (do this before booking days)', '',
    'Record the first 30 rows of session 1 with the actual talent, time the booth, and compare with the model in session-plan.md. The model parameters live in tools/audio/session_kit.mjs (SCENARIOS, READ_CPS, GAP_PER_TAKE). Update them and regenerate.', '');
  return L.join('\n');
}

export const TALENT_LABEL = { 'israeli|m': 'Ari', 'israeli|f': 'Noa', 'ashkenazi|m': 'Ashkenazi reader (man)', 'ashkenazi|f': 'Ashkenazi reader (woman)', 'sephardi|m': 'Sephardi-values reader (man)', 'sephardi|f': 'Sephardi-values reader (woman)' };

export function allFiles(manifest, traditions = KIT_TRADITIONS) {
  const files = new Map([['docs/voices/kit/README.md', renderReadme()]]);
  for (const t of traditions) for (const v of KIT_VOICES) {
    const kit = buildKit(manifest, t, v);
    files.set(`docs/voices/kit/${t}-${v}/slate.csv`, renderSlateCsv(kit));
    files.set(`docs/voices/kit/${t}-${v}/session-plan.md`, renderPlan(kit, TALENT_LABEL[`${t}|${v}`]));
  }
  return files;
}

export function main(argv = process.argv.slice(2)) {
  const manifest = loadManifestFull(ROOT);
  const ti = argv.indexOf('--tradition');
  const traditions = ti >= 0 ? [argv[ti + 1]] : KIT_TRADITIONS;
  if (traditions.some((t) => !['israeli', 'sephardi', 'ashkenazi'].includes(t))) { console.error('--tradition israeli|sephardi|ashkenazi'); process.exit(2); }
  const files = allFiles(manifest, traditions);
  if (argv.includes('--check')) {
    const stale = [...files].filter(([rel, text]) => !fs.existsSync(path.join(ROOT, rel)) || fs.readFileSync(path.join(ROOT, rel), 'utf8') !== text);
    if (stale.length) { console.error('stale kit files:\n' + stale.map(([r]) => '  ' + r).join('\n') + '\nrun: node tools/audio/session_kit.mjs --write'); process.exit(1); }
    console.log('kit files are current'); return;
  }
  if (argv.includes('--write')) {
    for (const [rel, text] of files) { fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); fs.writeFileSync(path.join(ROOT, rel), text); }
    console.log(`wrote ${files.size} files under docs/voices/kit/`);
  }
  for (const t of traditions) for (const v of KIT_VOICES) {
    const k = buildKit(manifest, t, v);
    console.log(`${t}-${v}: ${k.estimate.clips} clips, ${k.estimate.takes} takes, ${k.sessions.length} sessions, booth hours fast/likely/slow = ${k.estimate.fast.boothHours}/${k.estimate.likely.boothHours}/${k.estimate.slow.boothHours} (unmeasured)`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
