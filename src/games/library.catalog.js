// @ts-check
// One games catalogue (D1): every game the games hub (#/games) lists, in every section, counted once. Pure data and functions,
// no DOM, so tools/counts/build-counts.mjs can count it and the counts module can show the one total.
// Sources: the hub's own lists (GAMES and Word Finder in games.view.js), the arcade (ARCADE_GAMES, which already holds the
// Torah and Hebrew games), the Hanukkah games, and the five topic hubs (g1 to g5). A game listed in two places counts once.
// Skills (D1 filters) and practice links (D9) are taken from the section and band a game sits in, never from a judgement of
// its Hebrew; "listening" is added only when the game's own one-line description says you hear the prompt.
import { GAMES as HUB_GAMES, LEVEL_BY_GAME } from './games.view.js';
import { ARCADE_GAMES, HANUKKAH_GAMES } from './arcade.catalog.js';
import { TG_GAMES } from './tg-catalog.js';
import { G1_GAMES } from './g1-catalog.js';
import { G2_GAMES } from './g2-catalog.js';
import { G3_GAMES } from './g3-catalog.js';
import { G4_GAMES } from './g4-catalog.js';
import { G5_GAMES } from './g5-catalog.js';
import { MORE_GAMES } from './more-catalog.js';

/** The skill filters, in the order the library shows them. */
export const SKILLS = Object.freeze([
  ['reading', 'Reading'], ['vocabulary', 'Vocabulary'], ['listening', 'Listening'], ['grammar', 'Grammar'], ['culture', 'Jewish Year and Torah'],
]);
export const SKILL_RULE = 'Each game\'s skills come from the section it sits in on the games page. Listening is added when the game\'s description says you hear the prompt.';

/** Hub sections, in the hub's order. ladder: the level scale the section uses on its cards. */
export const SECTIONS = Object.freeze([
  { id: 'hub', title: 'Games by Level (1 to 9)', ladder: 9 },
  { id: 'arcade', title: 'Arcade Games', ladder: 5 },
  { id: 'tg', title: 'Torah and Hebrew Games', ladder: 5 },
  { id: 'hanukkah', title: 'Hanukkah Games', ladder: 5 },
  { id: 'g1', title: 'Letters, Vowels and Sounds', ladder: 5 },
  { id: 'g2', title: 'Word Games by Topic', ladder: 5 },
  { id: 'g3', title: 'Grammar in Action', ladder: 5 },
  { id: 'g4', title: 'Everyday Israel', ladder: 5 },
  { id: 'g5', title: 'Holidays, Shabbat and Prayer', ladder: 5 },
  { id: 'more', title: 'More Games: Builders, Sprints, Listening and Two Players', ladder: 5 },
]);

/** Where each kind of game is practised in the course (D9). Every href is an existing route. */
export const PRACTICE = Object.freeze({
  letters: { href: '#/letters', label: 'Letters' },
  sounds: { href: '#/sounds', label: 'Sounds' },
  syllables: { href: '#/ladder', label: 'Syllable ladder' },
  reading: { href: '#/learn', label: 'Reading lessons' },
  words: { href: '#/vocab', label: 'Dictionary' },
  themes: { href: '#/vocab/themes', label: 'Theme packs' },
  grammar: { href: '#/grammar', label: 'Grammar notes' },
  roots: { href: '#/roots', label: 'Roots and verb families' },
  israel: { href: '#/israel', label: 'Sound like a local' },
  festivals: { href: '#/festivals', label: 'This week in the Jewish year' },
  torah: { href: '#/torahreader', label: 'Torah reader' },
  first: { href: '#/firstday', label: 'Your first 10 minutes' },
});

// The hub's own 25 games (games.view.js GAMES) and Word Finder: [skills, practice] from each game's hook on the hub card.
const HUB_META = Object.freeze({
  wordfinder: [['vocabulary', 'listening'], 'first'],
  tugowar: [['vocabulary'], 'words'], vowelcatcher: [['reading'], 'sounds'], pinball: [['reading'], 'letters'], prefixblast: [['grammar'], 'grammar'],
  memorypalace: [['vocabulary'], 'words'], archbuilder: [['reading'], 'letters'], lasermaze: [['vocabulary'], 'words'], letterbridge: [['reading'], 'letters'],
  roottree: [['grammar'], 'roots'], bumperverbs: [['grammar'], 'roots'], shabbatrush: [['culture', 'vocabulary'], 'festivals'], typewriter: [['reading'], 'words'],
  petclinic: [['vocabulary'], 'themes'], trainswitch: [['vocabulary'], 'words'], weatherstudio: [['vocabulary'], 'themes'], rentalagent: [['vocabulary'], 'themes'],
  museumcurator: [['vocabulary'], 'themes'], karaokebeat: [['vocabulary'], 'words'], shadowcraft: [['reading'], 'words'], ciphergrid: [['reading'], 'letters'],
  shuktaxi: [['vocabulary'], 'israel'], barter: [['vocabulary'], 'israel'], submarinesonar: [['reading'], 'sounds'], rhymelab: [['vocabulary'], 'words'],
});
// Arcade levels 1 to 5 (arcade.catalog.js BASE_GAMES): letters, vowels and syllables, words, grammar, the laws.
const ARCADE_LEVEL_META = Object.freeze({ 1: [['reading'], 'letters'], 2: [['reading'], 'syllables'], 3: [['vocabulary'], 'words'], 4: [['grammar'], 'grammar'], 5: [['culture'], 'torah'] });
const TG_BAND_META = Object.freeze({ beginner: [['reading'], 'letters'], intermediate: [['vocabulary', 'grammar'], 'roots'], advanced: [['culture'], 'torah'] });
const G1_BAND_META = Object.freeze({ shapes: [['reading'], 'letters'], sounds: [['reading'], 'sounds'], vowels: [['reading'], 'syllables'], reading: [['reading'], 'reading'] });
const tgBand = (id) => { const g = TG_GAMES.find((x) => x.id === id); if (!g) return null; return g.level <= 2 ? 'beginner' : g.level <= 4 ? 'intermediate' : 'advanced'; };

const HEAR = /\bhear\b/i;
const withListening = (skills, text) => (HEAR.test(String(text || '')) && !skills.includes('listening') ? [...skills, 'listening'] : skills);

/**
 * Every game on the hub, once: { id, title, titleHe, section, level, ladder, skills, practice:{href,label}, tag }.
 * Order: the hub's 9-level games first (by level), then each section in hub order.
 */
export function allGames() {
  const out = new Map();
  const add = (g) => { if (g && g.id && !out.has(g.id)) out.set(g.id, Object.freeze({ ...g, skills: Object.freeze([...g.skills]) })); };
  const hubItems = [['wordfinder', 'Hebrew Word Finder', 'Hear a word, find it and learn it'], ...HUB_GAMES];
  const arcadeById = new Map(ARCADE_GAMES.map((g) => [g.id, g]));
  // 9-level items: Word Finder, the hub's 25, and the arcade (which the hub also places on the 9-level ladder)
  const nine = [...hubItems.map(([id, title, hook]) => ({ id, title, titleHe: '', tag: hook })), ...ARCADE_GAMES.map((g) => ({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag }))]
    .filter((g) => LEVEL_BY_GAME[g.id] >= 1);
  nine.sort((a, b) => LEVEL_BY_GAME[a.id] - LEVEL_BY_GAME[b.id]);
  for (const g of nine) {
    const a = arcadeById.get(g.id), band = tgBand(g.id);
    const [skills, practice] = HUB_META[g.id] || (band ? TG_BAND_META[band] : ARCADE_LEVEL_META[a?.level || 3]);
    add({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag, section: band ? 'tg' : a ? 'arcade' : 'hub', level: LEVEL_BY_GAME[g.id], ladder: 9,
      skills: withListening(skills, g.tag), practice: PRACTICE[practice] });
  }
  for (const g of HANUKKAH_GAMES) add({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag, section: 'hanukkah', level: g.level, ladder: 5,
    skills: withListening(['culture', 'vocabulary'], g.tag), practice: PRACTICE.festivals });
  for (const g of G1_GAMES) { const [s, p] = G1_BAND_META[g.band] || G1_BAND_META.shapes; add({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag, section: 'g1', level: g.level, ladder: 5, skills: withListening(s, g.tag), practice: PRACTICE[p] }); }
  for (const g of G2_GAMES) add({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag, section: 'g2', level: g.level, ladder: 5, skills: withListening(['vocabulary'], g.tag), practice: PRACTICE.themes });
  for (const g of G3_GAMES) add({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag, section: 'g3', level: g.level, ladder: 5, skills: withListening(['grammar'], g.tag), practice: PRACTICE.grammar });
  for (const g of G4_GAMES) add({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag, section: 'g4', level: g.level, ladder: 5, skills: withListening(['vocabulary'], g.tag), practice: PRACTICE.israel });
  for (const g of G5_GAMES) add({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag, section: 'g5', level: g.level, ladder: 5, skills: withListening(['culture'], g.tag), practice: PRACTICE.festivals });
  for (const g of MORE_GAMES) add({ id: g.id, title: g.title, titleHe: g.titleHe, tag: g.tag, section: 'more', level: g.level, ladder: 5, skills: g.skills, practice: PRACTICE[g.practice], variantOf: g.variantOf || null });
  return [...out.values()];
}

/** Counts for the counts module: the total, and how many sit in each section. */
export function gameTotals(list = allGames()) {
  const bySection = Object.fromEntries(SECTIONS.map((s) => [s.id, 0]));
  for (const g of list) bySection[g.section] = (bySection[g.section] || 0) + 1;
  const bySkill = Object.fromEntries(SKILLS.map(([k]) => [k, list.filter((g) => g.skills.includes(k)).length]));
  return { total: list.length, nineLevel: list.filter((g) => g.ladder === 9).length, bySection, bySkill };
}

/** One game by id, or null. */
export const gameById = (id, list = allGames()) => list.find((g) => g.id === id) || null;
