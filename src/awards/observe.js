// Read-only look at records the app already saves.
// A play count is a finished game session on this device (the shared game
// engine writes it only from the end-of-game card, src/games/engine.js
// saveBest). It is not a lesson result, not a win by itself, and not evidence
// that a word was learned. This module only reads; it never writes.

import { normalizeRecord, projectStreak } from '../curriculum/streak.js';
import { DAYSTART_KEY, cleanDayStart } from './daystart.js';

/** Keep in step with each game's STORE_KEY. Tests compare these strings to the game files. */
export const GAME_STORE_KEYS = Object.freeze([
  { key: 'games.tugowar.v1', title: 'Antonym Tug-of-War', file: 'src/games/tugowar.view.js', href: '#/tugowar', code: 'tug' },
  { key: 'games.vowelcatcher.v1', title: 'Vowel Catcher', file: 'src/games/vowelcatcher.view.js', href: '#/vowelcatcher', code: 'vowel' },
  { key: 'games.pinball.v1', title: 'The Hebrew Pinball Bouncer', file: 'src/games/pinball.view.js', href: '#/pinball', code: 'pin' },
  { key: 'games.prefixblast.v1', title: 'Bubble Pop Prefix Blast', file: 'src/games/prefixblast.view.js', href: '#/prefixblast', code: 'prefix' },
  { key: 'games.memorypalace.v1', title: 'The Memory Palace Courtyard', file: 'src/games/memorypalace.view.js', href: '#/memorypalace', code: 'palace' },
]);

/**
 * Every other game that saves a finished-session record through the shared
 * engine (store shape { best, plays, lastStars }). Awards watches these for
 * the set badges (market, root tree) and for the first-attempt badge. Keep in
 * step with each game's STORE_KEY.
 */
export const EXTRA_GAME_STORE_KEYS = Object.freeze([
  { key: 'games.homebuilder.v1', code: 'homebuilder' },
  { key: 'games.archbuilder.v1', code: 'arch' },
  { key: 'games.barter.v1', code: 'barter' },
  { key: 'games.bumperverbs.v1', code: 'bumper' },
  { key: 'games.ciphergrid.v1', code: 'cipher' },
  { key: 'games.echochamber.v1', code: 'echo' },
  { key: 'games.karaokebeat.v1', code: 'karaoke' },
  { key: 'games.lasermaze.v1', code: 'maze' },
  { key: 'games.letterbridge.v1', code: 'bridge' },
  { key: 'games.museumcurator.v1', code: 'museum' },
  { key: 'games.petclinic.v1', code: 'pet' },
  { key: 'games.rentalagent.v1', code: 'rental' },
  { key: 'games.rhymelab.v1', code: 'rhyme' },
  { key: 'games.roottree.v1', code: 'root' },
  { key: 'games.shabbatrush.v1', code: 'shabbat' },
  { key: 'games.shadowcraft.v1', code: 'shadow' },
  { key: 'games.shuktaxi.v1', code: 'taxi' },
  { key: 'games.submarinesonar.v1', code: 'sonar' },
  { key: 'games.trainswitch.v1', code: 'train' },
  { key: 'games.typewriter.v1', code: 'type' },
  { key: 'games.weatherstudio.v1', code: 'weather' },
  { key: 'games.wordfinder.v1', code: 'finder' },
]);

function playsOf(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  const n = raw.plays;
  if (!Number.isInteger(n) || n < 1) return 0;
  return n;
}

function readKey(store, key, readErrors) {
  try { return store && typeof store.get === 'function' ? store.get(key, null) : null; }
  catch { if (readErrors) readErrors.push(key); return null; }
}

/**
 * @param {{get?: Function}|null|undefined} store
 * @returns {{sessions:{key:string,title:string,plays:number}[], anyPlay:boolean, returned:boolean, readErrors:string[]}}
 */
export function observeGames(store) {
  const sessions = [];
  const readErrors = [];
  for (const game of GAME_STORE_KEYS) {
    const raw = readKey(store, game.key, readErrors);
    const plays = playsOf(raw);
    if (plays > 0) sessions.push({ key: game.key, title: game.title, plays, code: game.code, href: game.href });
  }
  return {
    sessions,
    anyPlay: sessions.length > 0,
    returned: sessions.some((s) => s.plays >= 2),
    readErrors,
  };
}

/** Saved finished sessions for one extra game key (0 when absent or unreadable). */
export function observeGamePlays(store, key) {
  return playsOf(readKey(store, key, null));
}

/**
 * First-attempt evidence. The game engine keeps no attempt history: the only
 * trace of a first-ever finished session is a record with exactly one saved
 * play whose own star count (lastStars, written by that same save) is 3.
 * Once Awards grants the badge it is kept in the awards record, so later
 * plays never un-earn it; before any grant, a second play erases the trace
 * and the badge simply stays locked. Nothing else is inferred.
 */
export function observeFirstAttempt(store) {
  for (const game of [...GAME_STORE_KEYS, ...EXTRA_GAME_STORE_KEYS]) {
    const raw = readKey(store, game.key, null);
    if (playsOf(raw) === 1 && raw && raw.lastStars === 3) {
      return { found: true, key: game.key, stars: 3 };
    }
  }
  return { found: false, key: null, stars: 0 };
}

/**
 * Opening prayers actually heard. The prayer veil counts a tap only after
 * playback starts, in a raw localStorage key; through the shared store that
 * is this key, and the stored value parses as a plain count.
 */
export const PRAYER_LISTEN_STORE_KEY = 'opening-prayer:listens:v1';

export function observePrayerListens(store) {
  const raw = readKey(store, PRAYER_LISTEN_STORE_KEY, null);
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * Review-deck cards the learner actually holds: lesson cards in "srs.cards"
 * (ids letter:<letter>, word:<word>) and vocabulary cards in "srs.vocab"
 * (ids vocab:<entry>). A card existing means the word or letter entered the
 * learner's own review deck. It is activity, not mastery.
 */
export const LESSON_CARDS_KEY = 'srs.cards';
export const VOCAB_CARDS_KEY = 'srs.vocab';

function countPrefixed(raw, prefix) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  return Object.keys(raw).filter((k) => k.startsWith(prefix)).length;
}

export function observeCards(store) {
  const lessonCards = readKey(store, LESSON_CARDS_KEY, null);
  const vocabCards = readKey(store, VOCAB_CARDS_KEY, null);
  return {
    lettersMet: countPrefixed(lessonCards, 'letter:'),
    wordCards: countPrefixed(lessonCards, 'word:') + countPrefixed(vocabCards, 'vocab:'),
  };
}

/**
 * Records that do not exist yet. Each key below names the one writer that
 * must land before its badge can ever grant; until then observe returns no
 * evidence and the badge stays honestly locked. The readers are here now so
 * a writer can land without another awards change.
 * - DIALOGUES_DONE_KEY: a dialogue view "finished" mark, { [dialogueId]: ms }.
 * - SHELF_PLAYS_KEY: the Sacred Listen shelf counting a recording that
 *   actually started playing, { [itemId]: plays }.
 * - BOOKS_FINISHED_KEY: the book reader marking a book read to its last
 *   page, { [bookId]: ms }.
 */
export const DIALOGUES_DONE_KEY = 'dialogues.done.v1';
export const SHELF_PLAYS_KEY = 'listen.shelf.v1';
export const BOOKS_FINISHED_KEY = 'books.finished.v1';
export const CAFE_DIALOGUE_ID = 'd-cafe';
export const STORY_BOOK_IDS = Object.freeze(['book1', 'book2', 'book3', 'book4', 'book5']);

export function observeFutureSets(store) {
  const dialogues = readKey(store, DIALOGUES_DONE_KEY, null);
  const cafeDone = !!(dialogues && typeof dialogues === 'object' && !Array.isArray(dialogues)
    && Number.isFinite(dialogues[CAFE_DIALOGUE_ID]));
  const shelf = readKey(store, SHELF_PLAYS_KEY, null);
  const shelfPlays = shelf && typeof shelf === 'object' && !Array.isArray(shelf) ? shelf : {};
  const shelfDistinct = Object.entries(shelfPlays)
    .filter(([, n]) => Number.isInteger(n) && n > 0).length;
  const books = readKey(store, BOOKS_FINISHED_KEY, null);
  const finished = books && typeof books === 'object' && !Array.isArray(books) ? books : {};
  const booksFinished = STORY_BOOK_IDS.filter((id) => Number.isFinite(finished[id])).length;
  return {
    cafeDone,
    shelfDistinct,
    booksFinished,
    booksAllFive: booksFinished >= STORY_BOOK_IDS.length,
  };
}

/** The day-start stamp (see daystart.js). Null until the boot writer lands. */
export function observeDayStart(store) {
  return cleanDayStart(readKey(store, DAYSTART_KEY, null));
}

/** All themed-badge evidence in one read-only pass. */
export function observeBadgeEvidence(store) {
  const cards = observeCards(store);
  const sets = observeFutureSets(store);
  const attempt = observeFirstAttempt(store);
  return {
    prayerListens: observePrayerListens(store),
    lettersMet: cards.lettersMet,
    wordCards: cards.wordCards,
    barterPlays: observeGamePlays(store, 'games.barter.v1'),
    rootPlays: observeGamePlays(store, 'games.roottree.v1'),
    firstAttempt: attempt.found ? attempt : null,
    cafeDone: sets.cafeDone,
    shelfDistinct: sets.shelfDistinct,
    booksFinished: sets.booksFinished,
    booksAllFive: sets.booksAllFive,
    dayStart: observeDayStart(store),
  };
}

/** Keep in step with DAILY_GOALS in src/home/today.js. */
export const DAILY_GOAL_STEPS = Object.freeze([5, 10, 15, 20, 30]);

/**
 * Read-only look at the streak record (store key "streak", owned by
 * src/curriculum/streak.js) and the learner's daily goal. Everything here is
 * what the streak engine itself counted: engaged seconds, completed days,
 * frozen rest days. Nothing is self-reported on the Awards page.
 * @param {{get?: Function}|null|undefined} store
 * @param {number|Date} now
 */
export function observeStreak(store, now) {
  let raw = null, goalRaw = null, readError = false;
  try { raw = store && typeof store.get === 'function' ? store.get('streak', null) : null; } catch { readError = true; }
  try { goalRaw = store && typeof store.get === 'function' ? store.get('onboarding.v1.dailyGoal', null) : null; } catch { readError = true; }
  const proj = projectStreak(raw, now);
  const rec = normalizeRecord(raw);
  const goalMinutes = DAILY_GOAL_STEPS.includes(goalRaw) ? goalRaw : 5;
  return {
    best: proj.best,
    count: proj.count,
    anyDay: proj.best > 0 || !!proj.last,
    last: proj.last,
    doneDates: rec.doneDates,
    goalMinutes,
    goalMet: proj.todaySeconds >= goalMinutes * 60,
    readError,
  };
}
