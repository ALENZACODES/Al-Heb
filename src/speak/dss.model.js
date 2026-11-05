// Daily Speak Session builder. Pure: no DOM, no clock, no store, no fetch.
// The caller passes items it already has (speak sets, or the same shape). This module writes no Hebrew.
//
// Progressive reveal: the first session is one Speak turn from the table track. Street, then sanctuary,
// open only after the learner has finished earlier turns. Spark, quests, and the boss phrase are flags
// for later screens; they stay off until their own turn counts, and this module does not roll a reward,
// write a quest, or pick a boss line. Gates read a completed-turn count. A missed day leaves that count
// where it is.
//
// A seed makes the choice repeatable. The same seed, items, and turn count rebuild the same session.
// An audio id on an item is a catalog key. This module does not count clips or pictures and does not
// score pronunciation. With no id, the item carries the shared missing-audio line.

import { normalizeHe } from './model.js';
import { STATUS_LABELS } from '../shell/audio-labels.js';

export const NO_AUDIO = STATUS_LABELS.missing;
export const SESSION_NOTE = 'Say the line, then mark how it went.';
export const EMPTY_NOTE = 'Nothing to say yet.';

export const TRACKS = Object.freeze([
  Object.freeze({ id: 'table', label: 'Table', blurb: 'Family, food, and Shabbat' }),
  Object.freeze({ id: 'street', label: 'Street', blurb: 'Out and about' }),
  Object.freeze({ id: 'sanctuary', label: 'Sanctuary', blurb: 'Prayer' }),
]);
export const TRACK_IDS = Object.freeze(TRACKS.map((t) => t.id));

const TABLE_THEMES = new Set(['people-family', 'food-drink', 'home-things']);
const STREET_THEMES = new Set(['places-travel', 'talking-asking']);
const SOURCE_TRACKS = new Set(['israel', 'read', 'both']);
const LONE_NAME = '\u05D9\u05D4\u05D5\u05D4';

// Preview ladder. minTurns is how many Speak turns are already finished.
// One line, then the next track, and the session stops at one line per open track.
// Feature flags come after every track is open. Reward odds are not decided here.
const TABLE_ONLY = Object.freeze(['table']);
const TABLE_STREET = Object.freeze(['table', 'street']);
const ALL_TRACKS = Object.freeze([...TRACK_IDS]);

export const DEPTH_LADDER = Object.freeze([
  Object.freeze({ tier: 0, level: 'start', minTurns: 0, tracks: TABLE_ONLY, sessionSize: 1, spark: false, quests: false, bossPhrase: false }),
  Object.freeze({ tier: 1, level: 'table', minTurns: 1, tracks: TABLE_ONLY, sessionSize: 1, spark: false, quests: false, bossPhrase: false }),
  Object.freeze({ tier: 2, level: 'street', minTurns: 3, tracks: TABLE_STREET, sessionSize: 2, spark: false, quests: false, bossPhrase: false }),
  Object.freeze({ tier: 3, level: 'sanctuary', minTurns: 6, tracks: ALL_TRACKS, sessionSize: 3, spark: false, quests: false, bossPhrase: false }),
  Object.freeze({ tier: 4, level: 'spark', minTurns: 9, tracks: ALL_TRACKS, sessionSize: 3, spark: true, quests: false, bossPhrase: false }),
  Object.freeze({ tier: 5, level: 'quests', minTurns: 12, tracks: ALL_TRACKS, sessionSize: 3, spark: true, quests: true, bossPhrase: false }),
  Object.freeze({ tier: 6, level: 'boss', minTurns: 15, tracks: ALL_TRACKS, sessionSize: 3, spark: true, quests: true, bossPhrase: true }),
]);

function assertLadder(steps) {
  if (steps[0]?.tier !== 0 || steps[0]?.level !== 'start' || steps[0]?.minTurns !== 0) throw new Error('the first Speak session must be tier 0');
  let prevTurns = -1;
  let prevSize = 0;
  let spark = false;
  let quests = false;
  let boss = false;
  for (const s of steps) {
    if (!(s.minTurns > prevTurns)) throw new Error('turn gates must move forward');
    if (s.sessionSize !== s.tracks.length || s.sessionSize > 3 || s.sessionSize < prevSize) throw new Error('a session grows only by opening the next track, and stops at one line per track');
    for (let i = 0; i < s.tracks.length; i++) if (s.tracks[i] !== TRACK_IDS[i]) throw new Error('tracks must open table, then street, then sanctuary');
    if (spark && !s.spark) throw new Error('spark gate closed');
    if (quests && !s.quests) throw new Error('quest gate closed');
    if (boss && !s.bossPhrase) throw new Error('boss phrase gate closed');
    if (s.quests && !s.spark) throw new Error('quests open before spark');
    if (s.bossPhrase && !s.quests) throw new Error('boss phrase opens before quests');
    if ((s.spark || s.quests || s.bossPhrase) && s.tracks.length < TRACK_IDS.length) throw new Error('reward gates open before every track');
    spark = s.spark;
    quests = s.quests;
    boss = s.bossPhrase;
    prevTurns = s.minTurns;
    prevSize = s.sessionSize;
  }
}
assertLadder(DEPTH_LADDER);

/** Completed Speak turns. A small finite number counts. A clock reading, a date, or anything else stays on the first session. */
export function completedTurnCount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  if (value > 100000) return 0;
  return Math.floor(value);
}

/** Where the learner is on the ladder. Views can stay on tier 0 and read the richer fields later. */
export function depthFor(completedTurns) {
  const n = completedTurnCount(completedTurns);
  let step = DEPTH_LADDER[0];
  for (const s of DEPTH_LADDER) if (n >= s.minTurns) step = s;
  return {
    depthTier: step.tier,
    unlockLevel: step.level,
    minTurns: step.minTurns,
    tracks: step.tracks.slice(),
    sessionSize: step.sessionSize,
    features: { spark: step.spark, quests: step.quests, bossPhrase: step.bossPhrase },
  };
}

/**
 * Identity track for one catalog row. Explicit `identity` or `track` of table / street / sanctuary wins.
 * Otherwise the row is classified from the speak-set fields the repo already stores:
 *   sanctuary — prayer, the read track, or the religion-prayer theme
 *   street    — a survival pack, travel, or talking-and-asking
 *   table     — family, food, home
 * Other themes (school, science, and the rest of the list) stay out of this session.
 * @returns {'table'|'street'|'sanctuary'|null}
 */
export function identityTrack(item) {
  if (!item || typeof item !== 'object') return null;
  if (typeof item.identity === 'string' && TRACK_IDS.includes(item.identity)) return item.identity;
  if (typeof item.track === 'string' && TRACK_IDS.includes(item.track)) return item.track;
  const theme = typeof item.theme === 'string' ? item.theme : '';
  const source = typeof item.sourceTrack === 'string' ? item.sourceTrack
    : (typeof item.track === 'string' && SOURCE_TRACKS.has(item.track) ? item.track : '');
  const kind = typeof item.kind === 'string' ? item.kind : '';
  const pack = `${typeof item.pack === 'string' ? item.pack : ''} ${typeof item.set === 'string' ? item.set : ''}`.toLowerCase();
  if (source === 'read' || theme === 'religion-prayer' || kind === 'prayer') return 'sanctuary';
  if (pack.includes('survival-') && source !== 'read') return 'street';
  if (TABLE_THEMES.has(theme)) return 'table';
  if (STREET_THEMES.has(theme)) return 'street';
  return null;
}

/** Flatten speak sets into catalog rows. Hebrew is copied from the set. */
export function itemsFromSets(sets) {
  const out = [];
  for (const set of Array.isArray(sets) ? sets : []) {
    if (!set || typeof set !== 'object' || !Array.isArray(set.items)) continue;
    for (const it of set.items) {
      if (!it || typeof it !== 'object') continue;
      out.push({
        id: it.id,
        he: it.he,
        translit: it.translit,
        en: it.en,
        kind: it.kind,
        audioId: it.audioId ?? null,
        set: typeof set.id === 'string' ? set.id : null,
        theme: typeof it.theme === 'string' ? it.theme : set.theme,
        pack: typeof it.pack === 'string' ? it.pack : set.pack,
        sourceTrack: typeof it.sourceTrack === 'string' ? it.sourceTrack : set.track,
      });
    }
  }
  return out;
}

function project(it, track, he, id) {
  const audioId = typeof it.audioId === 'string' && it.audioId.trim() ? it.audioId : null;
  const kind = it.kind === 'phrase' || it.kind === 'prayer' ? it.kind : 'word';
  return {
    id,
    he,
    translit: typeof it.translit === 'string' ? it.translit : '',
    en: typeof it.en === 'string' ? it.en : '',
    kind,
    set: typeof it.set === 'string' ? it.set : null,
    track,
    audioId,
    audioState: audioId ? 'unchecked' : 'none',
    hearLabel: audioId ? null : NO_AUDIO,
  };
}

function tagged(items) {
  const rows = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || typeof it !== 'object') continue;
    const track = identityTrack(it);
    if (!track) continue;
    const he = typeof it.he === 'string' ? it.he : '';
    const key = normalizeHe(he);
    if (!key || key === LONE_NAME) continue;
    const id = it.id == null ? '' : String(it.id).trim();
    if (!id) continue;
    rows.push(project(it, track, he, id));
  }
  return rows;
}

function byIdThenTrack(a, b) {
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return TRACK_IDS.indexOf(a.track) - TRACK_IDS.indexOf(b.track);
}

function dedupe(rows) {
  rows.sort(byIdThenTrack);
  const seenId = new Set();
  const seenHe = new Set();
  const out = [];
  for (const row of rows) {
    const hk = normalizeHe(row.he);
    if (seenId.has(row.id) || seenHe.has(hk)) continue;
    seenId.add(row.id);
    seenHe.add(hk);
    out.push(row);
  }
  return out;
}

/** FNV-1a, then the same mulberry32 used elsewhere in the app. */
function hashSeed(seed) {
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const swap = a[i]; a[i] = a[j]; a[j] = swap; }
  return a;
}
function rotate(list, n) {
  const len = list.length;
  if (!len) return [];
  const k = ((n % len) + len) % len;
  return list.slice(k).concat(list.slice(0, k));
}

/** Prefer a new line over one just said, and a phrase over a single word when both are new. */
function speakOrder(list, recentIds) {
  const recent = new Set();
  for (const id of recentIds) if (id != null) recent.add(String(id));
  return list
    .map((it, i) => ({ it, i, rank: (recent.has(it.id) ? 2 : 0) + (it.kind === 'word' ? 1 : 0) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((row) => row.it);
}

/**
 * Build one session.
 * @param {{seed?: string|number, items?: any[], completedTurns?: number, recentIds?: string[]}} [input]
 * `completedTurns` is a count of finished Speak turns, not a date.
 * `recentIds` are lines already said; a new line is chosen first when one exists.
 * At tier 0 the result is a single table line. Later tiers mix the tracks that are open.
 */
export function buildSession(input) {
  const o = input && typeof input === 'object' ? input : {};
  const turns = completedTurnCount(o.completedTurns);
  const depth = depthFor(turns);
  const key = o.seed == null ? '' : String(o.seed);
  const open = new Set(depth.tracks);
  const recentIds = Array.isArray(o.recentIds) ? o.recentIds : [];
  const rows = dedupe(tagged(o.items).filter((it) => open.has(it.track)));
  const rng = mulberry32(hashSeed(`${key}|${turns}`));
  const buckets = new Map(depth.tracks.map((t) => [t, []]));
  for (const it of rows) buckets.get(it.track).push(it);
  for (const t of depth.tracks) buckets.set(t, speakOrder(shuffle(buckets.get(t), rng), recentIds));
  const order = rotate(depth.tracks, depth.tracks.length > 1 ? Math.floor(rng() * depth.tracks.length) : 0);
  const picked = [];
  const mix = {};
  for (const t of depth.tracks) mix[t] = 0;
  while (picked.length < depth.sessionSize) {
    let progressed = false;
    for (const t of order) {
      if (picked.length >= depth.sessionSize) break;
      const next = buckets.get(t).shift();
      if (!next) continue;
      picked.push(next);
      mix[t] += 1;
      progressed = true;
    }
    if (!progressed) break;
  }
  return {
    kind: 'speak-dss',
    preview: true,
    seed: key,
    depthTier: depth.depthTier,
    unlockLevel: depth.unlockLevel,
    tracks: depth.tracks,
    sessionSize: depth.sessionSize,
    turnCount: picked.length,
    items: picked,
    mix,
    features: depth.features,
    note: picked.length ? SESSION_NOTE : EMPTY_NOTE,
  };
}
