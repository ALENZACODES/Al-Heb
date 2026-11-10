// Brain Lab audio manifest: every Hebrew item a Brain Lab game shows, whether a recording of exactly that pointed text exists
// in each voice, and what to record first.
// Run: node tools/lab/build-audio-manifest.mjs   (writes docs/audio/BRAIN-LAB-AUDIO-2026-11-10.csv and .md)
//
// "Recorded" means a row in the clip lists the app loads for games (data/audio/manifest.json, manifest-kind-word.json,
// manifest-words-israeli.json) with the same kind and id, or the same pointed text, status not missing. "Dictionary list
// only" means the only recording is in data/vocab/audio-dictionary.json (1.2 MB), which games do not load.
// Voices: Israeli man (Ari, m) and woman (Noa, f). The Sephardi and Ashkenazi settings play the Israeli clips (owner decisions,
// 2026-11-07), so they need no clip of their own, except where the tradition says the item differently (listed as such).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HOLIDAY_DEFS, HEBREW_MONTH_NAMES } from '../../src/curriculum/calendar.js';
const LP = 'Letter Pattern, Word Burst, Root Forge, Path Word';
import { lineWords, consonants, hasPattern, NOT_A_GAME, hasDivineName } from '../../src/lab/lab.core.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const J = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
export const OUT = 'docs/audio/BRAIN-LAB-AUDIO-2026-11-10';
const key = (s) => String(s ?? '').normalize('NFC').replace(/[֑-ֽ֯׀׃]/g, '').replace(/[׃]/g, '').replace(/\s+/g, ' ').trim();

export function build() {
  const rows = [...J('data/audio/manifest.json'), ...J('data/audio/manifest-kind-word.json'), ...J('data/audio/manifest-words-israeli.json')]
    .filter((r) => r.tradition === 'israeli' && r.status !== 'missing');
  // Held recordings (data/lab/clip-holds.json): failed 2 of 3 transcription checks, so Brain Lab does not play them.
  const held = new Set(J('data/lab/clip-holds.json').paths || []);
  const byId = new Map(rows.map((r) => [`${r.kind}|${r.id}|${r.voice}`, r.path]));
  const byText = new Map(); for (const r of rows) { const k = `${key(r.text)}|${r.voice}`; if (!byText.has(k)) byText.set(k, [`${r.kind}:${r.id}`, r.path]); }
  const ok = (path, clip) => (held.has(path) ? { s: 'held: needs a listen', clip } : { s: 'recorded', clip });
  const dict = J('data/vocab/clip-lookup.json').clips;
  const W0 = J('data/lab/words.json');
  const listed = new Set([...(W0.extraClips || []).map((r) => `${r.kind}|${r.id}|${r.voice}`), // dictionary files Brain Lab now hands the player
    ...(W0.familyClips || []).filter((x) => x[1] === 'd').flatMap((x) => ['m', 'f'].map((v) => `word|dict-${x[2]}|${v}`))]);
  const status = (he, kind, id) => Object.fromEntries(['m', 'f'].map((v) => {
    if (kind && id && byId.has(`${kind}|${id}|${v}`)) return [v, ok(byId.get(`${kind}|${id}|${v}`), `${kind}:${id}`)];
    const t = byText.get(`${key(he)}|${v}`); if (t) return [v, ok(t[1], t[0])];
    const d = dict[key(he)]?.[`${v}|israeli`];
    if (d && listed.has(`${d.kind}|${d.id}|${v}`)) return [v, { s: 'recorded', clip: `${d.kind}:${d.id}` }];
    if (d) return [v, { s: 'dictionary list only', clip: `word:${d.id}` }];
    return [v, { s: 'missing', clip: '' }];
  }));
  const out = [];
  const add = (r) => { const st = status(r.he, r.kind, r.clipId); out.push({ ...r, m: st.m.s, f: st.f.s, clip: st.m.clip || st.f.clip }); };

  const W = J('data/lab/words.json');
  for (const c of W.cafe) add({ game: 'Café Order', what: 'word', id: c.id, he: c.he, tr: c.tr, en: c.en, tier: c.tier, spoken: 'each ordered item as it is shown; listen button on results', trad: 'Israeli clip for all three settings' });
  for (const d of W.directions) add({ game: 'Taxi Turns', what: 'word', id: d.id, he: d.he, tr: d.tr, en: d.en, tier: d.tier, spoken: 'after a right answer; listen button on results', trad: 'Israeli clip for all three settings' });
  for (const n of J('data/lab/numbers.json').numbers) add({ game: 'Count Up, Number Ear, Migration Birds', what: 'number', id: n.id, he: n.he, tr: n.tr, en: `${n.value} (${n.en})`, tier: n.value <= 10 ? 1 : 2, kind: 'word', clipId: n.clip, spoken: 'Number Ear asks by sound; Count Up says each number tapped; Migration Birds says the highest when it is caught', trad: 'Israeli clip for all three settings' });
  // Letter names (Letter Hunt, Letter Matrix, Middle Letter, Gematria) and the letter sounds (Sound Twins).
  const raw = J('data/letters/letters.json'); const letters = Array.isArray(raw) ? raw : raw.letters;
  for (const l of letters) add({ game: 'Letter Hunt, Letter Matrix, Middle Letter, Gematria, Letter Sequence, Tile Turn', what: 'letter name', id: l.id, he: l.nameHe || l.he, tr: l.name, en: `the letter ${l.name}`, tier: 1, kind: 'letter', clipId: l.id, spoken: 'the letter to find or name; listen button on results', trad: 'Israeli clip; Ashkenazi letter names differ (for example Sov for Tav): own clips only if John wants them' });
  const soundClip = (c) => ({ 'bet-plain': 'vet', 'bet-dagesh': 'bet', 'kaf-plain': 'khaf', 'kaf-dagesh': 'kaf', 'pe-plain': 'fe', 'pe-dagesh': 'pe', 'shin-shin': 'shin', 'shin-sin': 'sin', 'tav-plain': 'tav', 'tav-dagesh': 'tav', 'kaf-final': 'khaf', 'mem-final': 'mem', 'nun-final': 'nun', 'pe-final': 'fe', 'tsadi-final': 'tsadi' }[c.id] || c.letter) + '-sound';
  for (const c of W.cards) {
    const differs = c.sound.ashkenazi !== c.sound.israeli || c.sound.sephardi !== c.sound.israeli;
    add({ game: 'Sound Twins', what: 'letter sound', id: c.id, he: c.he, tr: c.name, en: `the sound of ${c.name}`, tier: 1, kind: 'letter', clipId: soundClip(c), spoken: 'both cards after an answer at levels 1 and 2',
      trad: differs ? `Israeli clip where the tradition says it the same way; ${c.sound.sephardi !== c.sound.israeli ? 'Sephardi' : ''}${c.sound.sephardi !== c.sound.israeli && c.sound.ashkenazi !== c.sound.israeli ? ' and ' : ''}${c.sound.ashkenazi !== c.sound.israeli ? 'Ashkenazi' : ''} say it differently: own clip needed there` : 'Israeli clip for all three settings' });
  }
  // Syllables: Sound Match and Vowel Rain.
  const syl = J('data/lab/syllables.json').syllables;
  for (const s of syl) add({ game: 'Sound Match, Vowel Rain, Speed Match, Vowel Storm', what: 'syllable', id: s.id, he: s.he, tr: s.tr, en: `syllable "${s.tr}"`, tier: 1, kind: 'syllable', clipId: s.id, spoken: 'Sound Match plays it as the question; Vowel Rain, and Speed Match and Vowel Storm to level 3, after a right answer', trad: 'Israeli clip for all three settings; Speed Match and Vowel Storm play it only where the tradition says the consonant the Israeli way' });
  for (const v of W.vowels.filter((x) => !x.syllable)) {
    const ash = v.sound.ashkenazi !== v.sound.israeli;
    if (v.sayAs) { out.push({ game: 'Vowel Rain', what: 'syllable', id: `${v.letter}+${v.sign}`, he: v.he, tr: '', en: `${v.letter} with ${v.sign}, says "${v.sound.israeli}"`, tier: v.from <= 4 ? 1 : 2, spoken: 'after a right answer',
      trad: ash ? (v.sound.ashkenazi ? `Israeli and Sephardi: plays ${v.sayAs}, the same sound. Ashkenazi says "${v.sound.ashkenazi}": own Ashkenazi clip needed` : `Israeli and Sephardi: plays ${v.sayAs}, the same sound; not played in Ashkenazi`) : `plays ${v.sayAs}, the same sound, in all three settings`,
      ...Object.fromEntries(['m', 'f'].map((vv) => [vv, held.has(`audio/${vv}/israeli/syllable/${v.sayAs}.mp3`) ? 'held: needs a listen' : 'recorded'])), clip: `syllable:${v.sayAs}` }); continue; }
    add({ game: 'Vowel Rain', what: 'syllable', id: `${v.letter}+${v.sign}`, he: v.he, tr: '', en: `${v.letter} with ${v.sign}, says "${v.sound.israeli}"`, tier: v.from <= 4 ? 1 : 2, spoken: 'after a right answer',
      trad: ash ? (v.sound.ashkenazi ? `Israeli says "${v.sound.israeli}", Ashkenazi "${v.sound.ashkenazi}": own Ashkenazi clip needed` : 'not played in Ashkenazi (the sign reads as a glide there)') : 'Israeli clip for all three settings' });
  }
  for (const d of HOLIDAY_DEFS) add({ game: 'Calendar Puzzle', what: 'holy day', id: d.id, he: d.he, tr: '', en: d.en, tier: 1, spoken: 'after each answer (when recorded); listen button on results', trad: 'Israeli clip for all three settings' });
  for (const [id, m] of Object.entries(HEBREW_MONTH_NAMES)) add({ game: 'Calendar Puzzle', what: 'month', id, he: m.he, tr: '', en: m.en, tier: 2, spoken: 'not played yet', trad: 'Israeli clip for all three settings' });
  for (const e of J('data/corpus/registry.json').entries.filter((x) => x.category === 'siddur' && x.he && !NOT_A_GAME.has(x.id)))
    add({ game: 'Prayer Chain, Siddur Flash', what: 'prayer line', id: e.id, he: e.he.split('\n')[0], tr: '', en: e.title, tier: lineWords(e.he).length <= 16 ? 1 : 2, kind: 'line', clipId: e.id, spoken: 'Prayer Chain plays the whole line when it is finished (levels 1 to 3)',
      trad: hasDivineName(e.he) ? 'Holds the divine name: recording held for John\'s decision; when recorded, the name is spoken as Adonai' : 'Israeli clip (prayer voice)' });
  // Letter Pattern and the studio word games: the root-family words they can show.
  const fam = J('data/roots/families.json').families || [];
  const seen = new Set();
  for (const f of fam) {
    const root = consonants(f.root); if (root.length !== 3) continue;
    for (const w of f.words || []) {
      if (!w.he || seen.has(w.he) || hasDivineName(w.he)) continue; seen.add(w.he);
      add({ game: LP, what: 'word', id: w.id || '', he: w.he, tr: w.translit || '', en: String(w.en).split(/[;,]/)[0], tier: w.level === 'A1' || w.level === 'A2' ? 1 : 2, spoken: 'when a right word is tapped or built; listen button on results', trad: 'Israeli clip for all three settings', inRoot: hasPattern(w.he, root) });
    }
  }
  // Priority: 1 = a game plays it (or asks for it by sound) and it cannot be heard yet; 2 = beginner words the game shows silently;
  // 3 = everything else missing; 0 = done.
  for (const r of out) {
    const heard = r.m === 'recorded' && r.f === 'recorded';
    if (/held/.test(r.m + r.f)) { r.priority = 2; continue; } // a person listens first (handoff: never replace a held clip unheard)
    const plays = !/not played yet/.test(r.spoken);
    r.priority = heard ? 0 : plays && r.tier === 1 ? 1 : plays || r.tier === 1 ? 2 : 3;
    if (heard && /own (Ashkenazi )?clip needed/.test(r.trad)) r.priority = 3;
  }
  return out;
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
export function csvText(out) {
  const cols = ['priority', 'game', 'what', 'id', 'he', 'tr', 'en', 'm', 'f', 'clip', 'trad', 'spoken'];
  const head = ['priority', 'game', 'kind', 'id', 'hebrew', 'transliteration', 'english', 'israeli_man_ari', 'israeli_woman_noa', 'existing_clip', 'traditions', 'when_the_game_speaks_it'];
  const sorted = [...out].sort((a, b) => (a.priority || 9) - (b.priority || 9) || a.game.localeCompare(b.game));
  return [head.join(','), ...sorted.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
}
export function write(out) {
  mkdirSync(join(ROOT, 'docs/audio'), { recursive: true });
  writeFileSync(join(ROOT, OUT + '.csv'), csvText(out));
  return [...out].sort((a, b) => (a.priority || 9) - (b.priority || 9) || a.game.localeCompare(b.game));
}
export function writeMd(rows) {
  const by = (p) => rows.filter((r) => r.priority === p);
  const games = [...new Set(rows.map((r) => r.game))];
  const L = [];
  L.push('# Brain Lab Audio Manifest (2026-11-10)', '');
  L.push('Every Hebrew item a Brain Lab game shows, checked against the recordings the games can play. Built by `node tools/lab/build-audio-manifest.mjs` from the game data; the full list (one row per item, with word id, Hebrew with nikud, English, both voices and the existing clip) is [`BRAIN-LAB-AUDIO-2026-11-10.csv`](BRAIN-LAB-AUDIO-2026-11-10.csv).', '');
  L.push('**Voices:** Israeli man (Ari, `m`) and Israeli woman (Noa, `f`), the same voices as the rest of the app. The Sephardi and Ashkenazi settings play the Israeli clips (owner decisions, 2026-11-07), so they need nothing of their own except where the tradition says the item differently; those rows say so in the `traditions` column. **Recorded** means a clip of exactly that pointed text exists in both voices and the game can play it.', '');
  L.push('| Game | Items | Recorded | Record first (1) | Next (2) | Later (3) |', '|---|---|---|---|---|---|');
  for (const g of games) { const r = rows.filter((x) => x.game === g); L.push(`| ${g} | ${r.length} | ${r.filter((x) => x.priority === 0).length} | ${r.filter((x) => x.priority === 1).length} | ${r.filter((x) => x.priority === 2).length} | ${r.filter((x) => x.priority === 3).length} |`); }
  L.push('', 'Priority 1: a game plays it, or asks for it by sound, and beginners meet it first. Priority 2: a game plays it but higher up, or shows it silently to beginners. Priority 3: everything else.', '');
  const table = (list) => { L.push('| Game | Id | Hebrew | English | Ari (m) | Noa (f) | Traditions |', '|---|---|---|---|---|---|---|'); for (const r of list) L.push(`| ${r.game} | \`${r.id}\` | ${r.he} | ${r.en} | ${r.m} | ${r.f} | ${r.trad} |`); L.push(''); };
  const heldRows = rows.filter((r) => /held/.test(r.m + r.f));
  L.push(`**Held:** ${heldRows.length} recordings failed 2 of 3 transcription checks and are not played in Brain Lab (\`data/lab/clip-holds.json\`); the game shows the written sound instead. Each needs a person to listen before it is replaced or released. They are the rows marked "held: needs a listen" in the CSV.`, '');
  L.push('## Record First', ''); const first = by(1).filter((r) => r.game !== LP); if (first.length) table(first); else L.push('Nothing: every item a game plays to beginners can be heard.', '');
  const next = by(2).filter((r) => r.game !== LP);
  const lpFirst = by(1).filter((r) => r.game === LP);
  if (lpFirst.length) { L.push(`### Letter Pattern beginner words (${lpFirst.length})`, ''); table(lpFirst); }
  L.push('## Next', ''); table(next);
  L.push(`Letter Pattern words without a recording are listed only in the CSV: ${rows.filter((r) => r.game === LP && r.priority === 1).length} beginner words (level A1 or A2, priority 1), ${by(2).filter((r) => r.game === LP).length} at priority 2.`, '');
  const ash = rows.filter((r) => /Ashkenazi[^.]*own (Ashkenazi )?clip needed|own clip needed/.test(r.trad));
  L.push('## For the Ashkenazi and Sephardi Settings', '', `${ash.length} items are said differently in a tradition (for example kamatz is "o" in Ashkenazi, and Chet and Ayin are their own sounds in Sephardi). Those settings do not play the Israeli clip for them; recording them in the Ashkenazi or Sephardi way would let them be heard there. They are the rows whose \`traditions\` column says "own clip needed".`, '');
  writeFileSync(join(ROOT, OUT + '.md'), L.join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const rows = write(build());
  writeMd(rows);
  const by = (p) => rows.filter((r) => r.priority === p);
  console.log(`${rows.length} items; done ${by(0).length}; priority 1: ${by(1).length}, 2: ${by(2).length}, 3: ${by(3).length}`);
  const t = {}; for (const r of rows) { const k = `${r.game}|${r.priority}`; t[k] = (t[k] || 0) + 1; } console.log(t);
}
