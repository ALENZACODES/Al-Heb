// Builds data/lab/words.json: the word lists the newer Brain Lab games play with.
// Run: node tools/lab/build-lab-words.mjs   (re-run when the dictionary, the clip list or the sound tables change)
//
// Every Hebrew word, transliteration and English gloss is read from the app's own data; nothing Hebrew is typed here.
// The only hand-made input is WHICH dictionary entries each game uses (listed by dictionary id) and the English names of
// the dotted and undotted letter forms (Vet, Khaf, Fe, Sin), which the letter table does not carry.
//   cafe       Café Order: food and drink from the dictionary (survival café pack and food words), short English label, clip,
//              and `pic`, the menu picture to show when the word has no picture of its own in the image index.
//   directions Taxi Turns: right, left and straight from the directions pack, with clips.
//   cards      Sound Twins: letter forms with their sound in each tradition, from data/pronunciation/consonants.json.
//   vowels     Vowel Rain: letter + vowel sign, the vowel's sound in each tradition from data/pronunciation/niqqud.json,
//              and the syllable recording when data/lab/syllables.json has exactly that syllable.
//   signs      Vowel Rain: each sign's name and its mark (the point, or vav + point for shuruk), for the button hints.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { HOLIDAY_DEFS } from '../../src/curriculum/calendar.js';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const readJSON = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
export const OUT = 'data/lab/words.json';
export const TRADITIONS = Object.freeze(['israeli', 'sephardi', 'ashkenazi']);

/** Café Order menu, by dictionary id. Tier 1 (levels 1 to 4): short everyday words. Tier 2 adds the longer orders. */
export const CAFE_IDS = Object.freeze({
  1: ['p7f7d7b8f', 'h06440deb', 'h1643d708', 'pa04b1f3c', 'pf8630913', 'p5e953ba9', 'ha664d093', 'hf22f36ee', 'h35be21c5', 'h9974efdc', 'h03763c94', 'h1f02450d'],
  2: ['p43836f09', 'p6296527a', 'p80064ddc', 'h09229545', 'hd2715ab4', 'h6cc8112a', 'h1efbc546', 'hbb1dc7a2', 'hec23eb47', 'pce477866', 'p7ec62c43', 'p2de095da', 'h7631737e', 'h4ef6ec03', 'h08c16650', 'h8417ff6d', 'h95d4df2c'],
});
/** Taxi Turns, by dictionary id: the way each word sends the taxi. Phrases (turn right, go straight) come in at higher levels. */
export const DIRECTION_IDS = Object.freeze([
  { id: 'p87accb3a', dir: 'right', tier: 1 }, { id: 'p0381993d', dir: 'left', tier: 1 },
  { id: 'p84a865c5', dir: 'straight', tier: 2 }, { id: 'p3842ce5f', dir: 'right', tier: 3 }, { id: 'p7a0ee1fc', dir: 'left', tier: 3 },
]);
/** English names of the second form of the letters whose sound changes with a dot. */
export const VARIANT_NAMES = Object.freeze({ 'bet:without dagesh': 'Vet', 'kaf:without dagesh': 'Khaf', 'pe:without dagesh': 'Fe', 'shin:with sin dot': 'Sin' });
/** Names a tradition uses instead: Tav without its dot is called Sav where it says s (Ashkenazi). */
export const TRADITION_NAMES = Object.freeze({ 'tav:without dagesh': { ashkenazi: 'Sav' } });
const DAGESH = 'ּ', SHIN_DOT = 'ׁ', SIN_DOT = 'ׂ';
/** Letters that take the reduced (chataf) vowels: alef, he, chet, ayin. */
const GUTTURALS = new Set(['alef', 'he', 'chet', 'ayin']);
/** Vowel signs Vowel Rain uses, by niqqud.json id, and the level a sign first falls at. */
export const VOWEL_SIGNS = Object.freeze([
  { id: 'patach', from: 1 }, { id: 'segol', from: 1 }, { id: 'chirik', from: 1 }, { id: 'cholam', from: 1 }, { id: 'kubutz', from: 1 },
  { id: 'kamatz', from: 4 }, { id: 'tzere', from: 4 }, { id: 'shuruk', from: 6 },
  { id: 'chataf-patach', from: 9 }, { id: 'chataf-segol', from: 9 },
]);

/** First sound in an IPA cell ("[k] with dagesh, [χ] without" -> "k"; "∅ (silent)" -> "∅"). Null when the cell has no IPA. */
export function firstSound(cell) {
  const s = String(cell ?? '').trim();
  if (s.startsWith('∅')) return '∅';
  const m = /\[([^\]]+)\]/.exec(s);
  if (!m) return null;
  return m[1].normalize('NFD').replace(/[̀-ͯː-˿]/g, '').replace(/\(.*?\)/g, '').replace(/~.*/, '').trim();
}
/** Silent alef and a glottal stop count as the same "no consonant" sound. */
const soundKey = (s) => (s === 'ʔ' ? '∅' : s);
/** The vowel letter (a e i o u) an IPA cell reads as, or null for a glide or a silent sign. */
export function vowelOf(cell) {
  const s = firstSound(cell);
  if (!s || s === '∅') return null;
  if (/^(a|aː)$/.test(s)) return 'a';
  if (/^(e|ɛ|eː)$/.test(s)) return 'e';
  if (/^(i|iː)$/.test(s)) return 'i';
  if (/^(o|ɔ|oː)$/.test(s)) return 'o';
  if (/^(u|uː)$/.test(s)) return 'u';
  return null; // a diphthong such as [ej]: this sign is left out for that tradition
}
const shortGloss = (en) => String(en).split('(')[0].split(/[,;]/)[0].trim();

export function build() {
  const dict = new Map(readJSON('data/vocab/words.json').words.map((w) => [w.id, w]));
  const clips = readJSON('data/vocab/clip-lookup.json').clips;
  // Only recordings the shared player knows without the separate dictionary list (the lesson manifest and its word shards),
  // so a Brain Lab round never waits on a large download before it can speak.
  const loaded = [...readJSON('data/audio/manifest.json'), ...readJSON('data/audio/manifest-kind-word.json'), ...readJSON('data/audio/manifest-words-israeli.json')]
    .filter((r) => r.tradition === 'israeli' && r.status !== 'missing');
  const known = new Set(loaded.map((r) => `${r.kind}|${r.id}|${r.voice}|${r.text}`));
  const both = (kind, id) => ['m', 'f'].every((v) => loaded.some((r) => r.kind === kind && r.id === id && r.voice === v));
  /** A clip of exactly this pointed text that the player loads (core manifest or word shard), in both voices; word clips first. */
  const shardClipFor = (he) => {
    const idsByKind = new Map();
    for (const r of loaded) {
      if (r.text !== he || (r.voice !== 'm' && r.voice !== 'f')) continue;
      const key = `${r.kind}|${r.id}`;
      const rec = idsByKind.get(key) || { kind: r.kind, id: r.id, voices: new Set() };
      rec.voices.add(r.voice);
      idsByKind.set(key, rec);
    }
    const two = [...idsByKind.values()].filter((x) => x.voices.has('m') && x.voices.has('f'));
    two.sort((x, y) => (x.kind === 'word' ? 0 : 1) - (y.kind === 'word' ? 0 : 1) || String(x.id).localeCompare(String(y.id)));
    return two[0] ? { kind: two[0].kind, id: two[0].id } : null;
  };
  const clipByText = (he) => shardClipFor(String(he).normalize('NFC'));
  // Recordings that exist only in the dictionary list (data/vocab/audio-dictionary.json, 1.2 MB, not loaded by games): the two
  // rows a game needs are copied into `extraClips`, which Brain Lab hands to the player (ctx.audio.extend) when the game loads.
  // Used only when no clip of that text is in the lists the player loads.
  const dictRows = readJSON('data/vocab/audio-dictionary.json');
  const extraClips = [];
  const clipFor = (he) => {
    const c = clips[he]; const m = c?.['m|israeli'], f = c?.['f|israeli'];
    if (m && f && m.id === f.id && m.kind === f.kind && known.has(`${m.kind}|${m.id}|m|${he}`) && known.has(`${m.kind}|${m.id}|f|${he}`)) return { kind: m.kind, id: m.id };
    const shard = shardClipFor(he);
    if (shard) return shard;
    if (!(m && f && m.id === f.id && m.kind === f.kind)) return null;
    const rows = dictRows.filter((r) => r.id === m.id && r.kind === m.kind && r.tradition === 'israeli' && r.text === he && r.status !== 'missing');
    if (rows.length !== 2 || !rows.every((r) => existsSync(join(ROOT, r.path)))) return null;
    for (const r of rows) if (!extraClips.some((x) => x.id === r.id && x.voice === r.voice)) extraClips.push(r);
    return { kind: m.kind, id: m.id };
  };

  const word = (id) => { const w = dict.get(id); if (!w) throw new Error(`dictionary id ${id} not found`); return w; };

  // A menu picture: the word's own picture when the image index already has one ordered (kind 'word') whose alt matches this
  // English gloss; otherwise the Brain Lab menu picture (kind 'id', LAB_v2_menu_<name>). A mismatched alt (wrong word) is ignored.
  const wordPics = readJSON('data/img/index.json').w || {};
  const cafe = [];
  for (const [tier, ids] of Object.entries(CAFE_IDS)) for (const id of ids) {
    const w = word(id), en = shortGloss(w.en);
    const own = wordPics[id];
    const ownMatches = Array.isArray(own) && String(own[3] || '').toLowerCase() === en.toLowerCase();
    cafe.push({ id, he: w.he, tr: w.translit, en, tier: +tier, ...(clipFor(w.he) ? { clip: clipFor(w.he) } : {}), ...(ownMatches ? {} : { pic: `LAB_v2_menu_${en.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}` }) });
  }
  const directions = DIRECTION_IDS.map(({ id, dir, tier }) => { const w = word(id); return { id, he: w.he, tr: w.translit, en: shortGloss(w.en), dir, tier, ...(clipFor(w.he) ? { clip: clipFor(w.he) } : {}) }; });

  // Sound Twins cards: every letter form with its first sound per tradition.
  const cons = readJSON('data/pronunciation/consonants.json').letters;
  const raw = readJSON('data/letters/letters.json');
  const names = new Map((Array.isArray(raw) ? raw : raw.letters).map((l) => [l.id, l.name]));
  const cards = [];
  // The recorded letter sound each card makes in Israeli Hebrew (kind letter, id <name>-sound), played after an answer.
  const SOUND_CLIP = { 'bet-plain': 'vet', 'bet-dagesh': 'bet', 'kaf-plain': 'khaf', 'kaf-dagesh': 'kaf', 'pe-plain': 'fe', 'pe-dagesh': 'pe', 'shin-shin': 'shin', 'shin-sin': 'sin',
    'tav-plain': 'tav', 'tav-dagesh': 'tav', 'kaf-final': 'khaf', 'mem-final': 'mem', 'nun-final': 'nun', 'pe-final': 'fe', 'tsadi-final': 'tsadi' };
  const soundClip = (cardId, letter) => { const id = `${SOUND_CLIP[cardId] || letter}-sound`; return both('letter', id) ? id : null; };
  for (const [id, rec] of Object.entries(cons)) {
    const vs = rec.variants || [];
    if (!vs.length) {
      cards.push({ id, letter: id, he: rec.he, name: names.get(id) || rec.name, sound: Object.fromEntries(TRADITIONS.map((t) => [t, soundKey(firstSound(rec.ipa?.[t])) || id])), ...(soundClip(id, id) ? { clip: soundClip(id, id) } : {}) });
      continue;
    }
    for (const v of vs) {
      const mark = /with dagesh/.test(v.condition) ? DAGESH : /shin dot/.test(v.condition) ? SHIN_DOT : /sin dot/.test(v.condition) ? SIN_DOT : '';
      const key = `${id}:${v.condition}`;
      cards.push({ id: `${id}${mark === DAGESH ? '-dagesh' : mark === SHIN_DOT ? '-shin' : mark === SIN_DOT ? '-sin' : '-plain'}`, letter: id, he: rec.he + mark,
        name: VARIANT_NAMES[key] || names.get(id) || rec.name, ...(TRADITION_NAMES[key] ? { names: TRADITION_NAMES[key] } : {}),
        sound: Object.fromEntries(TRADITIONS.map((t) => [t, soundKey(firstSound(v.ipa?.[t])) || key])) });
      const made = cards.at(-1), sc = soundClip(made.id, id); if (sc) made.clip = sc;
    }
  }

  // Vowel Rain: the letters (with their dot) that data/lab/syllables.json records, times each vowel sign.
  const syl = readJSON('data/lab/syllables.json').syllables;
  const signs = new Map(readJSON('data/pronunciation/niqqud.json').records.map((r) => [r.id, r]));
  const bases = new Map();
  for (const s of syl) if (!bases.has(s.letter)) bases.set(s.letter, [...s.he.normalize('NFD')].filter((c) => /[א-תּׁׂ]/.test(c)).join(''));
  const bySyl = new Map(syl.map((s) => [s.he.normalize('NFD'), s]));
  const vowels = [];
  for (const { id: sid, from } of VOWEL_SIGNS) {
    const r = signs.get(sid); if (!r) throw new Error(`niqqud sign ${sid} not found`);
    const mark = r.shape.slice(1); // the sign drawn on bet in the table: one point, or vav + point for shuruk
    const sound = Object.fromEntries(TRADITIONS.map((t) => [t, vowelOf(r.ipa?.[t])]));
    for (const [letter, base] of bases) {
      if (sid === 'shuruk' && letter === 'vav') continue;
      if (sid.startsWith('chataf') && !GUTTURALS.has(letter)) continue; // the reduced vowels sit under the throat letters
      const he = (base + mark).normalize('NFC');
      const rec = bySyl.get(he.normalize('NFD'));
      // No recording of this exact syllable: the recorded syllable of the same letter with the same Israeli vowel sound says it
      // the same way (בָּ and בַּ are both "ba"); played only where the learner's tradition reads the sign that way too.
      const standIn = !rec && sound.israeli ? syl.find((x) => x.letter === letter && x.vowel === sound.israeli && bases.get(letter) === [...x.he.normalize('NFD')].filter((c) => /[\u05D0-\u05EA\u05BC\u05C1\u05C2]/.test(c)).join('')) : null;
      vowels.push({ he, letter, sign: sid, from, sound, ...(rec ? { syllable: rec.id } : standIn ? { sayAs: standIn.id } : {}) });
    }
  }
  function familyClips() {
    const out = [], seen = new Set();
    for (const f of readJSON('data/roots/families.json').families || []) for (const w of f.words || []) {
      if (!w.he || !w.id || seen.has(w.id)) continue; seen.add(w.id);
      const m = loaded.find((r) => r.voice === 'm' && r.text === w.he && (r.kind === 'word' || r.kind === 'line'));
      if (m && loaded.some((r) => r.voice === 'f' && r.kind === m.kind && r.id === m.id)) { out.push([w.id, m.kind === 'line' ? 'l' : 'w', m.id]); continue; }
      const c = clips[w.he]; const dm = c?.['m|israeli'], df = c?.['f|israeli'];
      if (dm && df && dm.id === df.id && /^dict-/.test(dm.id) && dm.path === `audio/m/israeli/dictionary/${dm.id}.mp3` && df.path === `audio/f/israeli/dictionary/${df.id}.mp3`
        && existsSync(join(ROOT, dm.path)) && existsSync(join(ROOT, df.path))) out.push([w.id, 'd', dm.id.slice(5)]); // 'dict-' prefix dropped
    }
    return out;
  }
  return {
    schema: 'alef-lab-words/1',
    source: 'data/vocab/words.json, data/vocab/clip-lookup.json, data/pronunciation/consonants.json, data/pronunciation/niqqud.json, data/letters/letters.json, data/lab/syllables.json (tools/lab/build-lab-words.mjs)',
    note: 'Built, not typed: re-run the tool after the dictionary or the sound tables change. `clip` is a recording with exactly the same pointed text in both voices.',
    cafe, directions, cards, vowels,
    // Calendar Puzzle: the recorded name of each holy day (exact pointed text, both Israeli voices), said with the answer.
    holyDays: HOLIDAY_DEFS.map((d) => ({ id: d.id, clip: clipByText(d.he) })).filter((d) => d.clip),
    extraClips,
    // Letter Pattern: the recording of each root-family word, by its word id in data/roots/families.json: [word id, kind, clip id];
    // kind 'w' word, 'l' line, 'd' = a dictionary
    // file (audio/<voice>/israeli/dictionary/<id>.mp3) that Brain Lab adds to the player itself (src/lab/lab.games.js).
    familyClips: familyClips(),
    signs: VOWEL_SIGNS.map(({ id }) => { const r = signs.get(id); return { id, name: String(r.name).split('(')[0].trim(), mark: r.shape.slice(1) }; }),
  };
}

/** One list item per line: small on the wire (Brain Lab fetches it) and still easy to read in a diff. */
export function format(out) {
  const rows = Object.entries(out).map(([k, v]) => (Array.isArray(v) ? `${JSON.stringify(k)}: [\n${v.map((x) => JSON.stringify(x)).join(',\n')}\n]` : `${JSON.stringify(k)}: ${JSON.stringify(v)}`));
  return `{\n${rows.join(',\n')}\n}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const out = build();
  writeFileSync(join(ROOT, OUT), format(out));
  console.log(`${OUT}: ${out.cafe.length} café items, ${out.directions.length} directions, ${out.cards.length} letter cards, ${out.vowels.length} vowel drops`);
}
