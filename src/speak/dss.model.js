// Daily Speak Session builder. Pure: no DOM, no clock, no store, no fetch.
// The caller passes items it already has (speak sets, or the same shape). This module writes no Hebrew.
//
// Depth opens slowly. Tier 0 is Hear, Say, Done: one table line. Later flags appear only after the
// practice counts and the distinct days in `computeDepth(stats)`, and at most one tier per day.
// A stored tier is a floor. A missed day leaves the counts where they are.
// Spark, quests, the boss phrase, scenes, and the arena are flags only. This module does not roll a
// reward, write a quest, or pick a boss line.
//
// A seed makes the choice repeatable. The same seed, items, and tier rebuild the same session.
// An audio id on an item is a catalog key. This module does not count clips or pictures and does not
// score pronunciation. With no id, the item carries the shared missing-audio line.

import { normalizeHe } from './model.js';
import { STATUS_LABELS } from '../shell/audio-labels.js';

export const NO_AUDIO = STATUS_LABELS.missing;
export const SESSION_NOTE = 'Hear it, say it, then done.';
export const EMPTY_NOTE = 'Nothing to say yet.';
/** Marks that count as spoken practice. "Heard only" stays a turn, not spoken. */
export const SPOKEN_MARKS = Object.freeze(['Said it', 'With help']);

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

// Preview ladder. `turns` counts finished Speak turns. `spoken` counts "Said it" and "With help".
// `days` is distinct days the learner showed up. Each step also waits for every earlier step.
// Reward odds are not decided here. Locked flags are omitted, not stored as false.
const CORE_UI = Object.freeze(['hear', 'say', 'done']);
const EXTRA_UI = Object.freeze(['rhythm', 'compare', 'spark', 'quests', 'boss', 'scenes', 'arena']);

export const DEPTH_LADDER = Object.freeze([
  Object.freeze({ tier: 0, turns: 0, spoken: 0, days: 0, add: Object.freeze([]) }),
  Object.freeze({ tier: 1, turns: 3, spoken: 0, days: 2, add: Object.freeze(['rhythm']) }),
  Object.freeze({ tier: 2, turns: 9, spoken: 0, days: 3, add: Object.freeze(['secondTrack', 'compare']) }),
  Object.freeze({ tier: 3, turns: 0, spoken: 18, days: 5, add: Object.freeze(['spark']) }),
  Object.freeze({ tier: 4, turns: 0, spoken: 27, days: 7, add: Object.freeze(['quests', 'boss']) }),
  Object.freeze({ tier: 5, turns: 0, spoken: 40, days: 10, add: Object.freeze(['thirdTrack']) }),
  Object.freeze({ tier: 6, turns: 0, spoken: 80, days: 21, add: Object.freeze(['scenes', 'arena']) }),
]);

/** Sanctuary is the third track's content, and it waits past the tier-5 counts. */
export const SANCTUARY_GATE = Object.freeze({ spoken: 60, days: 14, needs: Object.freeze(['table', 'street']) });

function assertLadder(steps) {
  if (steps[0]?.tier !== 0 || steps.length !== 7) throw new Error('the first Speak session must be tier 0');
  let prevDays = 0;
  let prevNeed = 0;
  const seen = new Set(CORE_UI);
  for (const s of steps) {
    if (s.tier === 0) continue;
    if (!(s.days > prevDays)) throw new Error('day gates must move forward');
    const need = Math.max(s.turns, s.spoken);
    if (need < prevNeed) throw new Error('practice gates went backwards');
    if (!s.add.length) throw new Error('a later tier adds a flag');
    for (const key of s.add) {
      if (seen.has(key)) throw new Error('a flag opened twice');
      seen.add(key);
    }
    prevDays = s.days;
    prevNeed = Math.max(prevNeed, need);
  }
  if (!(SANCTUARY_GATE.spoken > 40 && SANCTUARY_GATE.days > 10)) throw new Error('sanctuary waits past the third-track tier');
}
assertLadder(DEPTH_LADDER);

/** A small finite count. A clock reading, a date, or anything else counts as zero. */
export function completedTurnCount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  if (value > 100000) return 0;
  return Math.floor(value);
}

function dayKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function countDays(value) {
  if (Array.isArray(value)) {
    const keys = new Set();
    for (const v of value) { const k = dayKey(v); if (k) keys.add(k); }
    return keys.size;
  }
  return completedTurnCount(value);
}

function practiceCounts(stats) {
  const spoken = completedTurnCount(stats.spoken);
  let turns = completedTurnCount(stats.turns);
  if (spoken > turns) turns = spoken;
  return { turns, spoken, days: countDays(stats.days) };
}

function earnedTier(counts) {
  let tier = 0;
  for (const step of DEPTH_LADDER) {
    if (step.tier === 0) continue;
    if (counts.turns < step.turns || counts.spoken < step.spoken || counts.days < step.days) break;
    tier = step.tier;
  }
  return tier;
}

function storedTierOf(stats) {
  const raw = stats.tier ?? stats.storedTier;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(DEPTH_LADDER.length - 1, Math.floor(raw));
}

function trackCount(stats, id) {
  const bag = stats.byTrack;
  if (!bag || typeof bag !== 'object') return 0;
  return completedTurnCount(bag[id]);
}

function featuresFor(tier, sanctuary) {
  const features = { hear: true, say: true, done: true };
  for (const step of DEPTH_LADDER) {
    if (step.tier > tier) break;
    for (const key of step.add) features[key] = true;
  }
  if (sanctuary) features.sanctuary = true;
  return features;
}

function tracksFor(features) {
  const tracks = ['table'];
  if (features.secondTrack) tracks.push('street');
  if (features.sanctuary) tracks.push('sanctuary');
  return tracks;
}

/** Controls the view may render. Locked controls are omitted. */
export function uiFlags(features) {
  const ui = { hear: true, say: true, done: true };
  for (const key of EXTRA_UI) if (features && features[key] === true) ui[key] = true;
  return ui;
}

/**
 * @param {{turns?: number, spoken?: number, days?: number|string[], byTrack?: {table?: number, street?: number}, tier?: number, storedTier?: number, sanctuary?: boolean, lastRevealDay?: string|null, today?: string}} [stats]
 * `today` is a YYYY-MM-DD key from the caller. This function does not read a clock.
 * @returns {{tier: number, features: Record<string, true>, tracks: string[], lastRevealDay: string|null}}
 */
export function computeDepth(stats) {
  const s = stats && typeof stats === 'object' ? stats : {};
  const counts = practiceCounts(s);
  const earned = earnedTier(counts);
  const floor = storedTierOf(s);
  const today = dayKey(s.today);
  const last = dayKey(s.lastRevealDay);
  let tier = floor;
  let revealed = false;
  if (earned > floor && today && last !== today) {
    tier = floor + 1;
    revealed = true;
  }
  const sanctuary = tier >= 5 && (s.sanctuary === true || (
    counts.spoken >= SANCTUARY_GATE.spoken && counts.days >= SANCTUARY_GATE.days
    && trackCount(s, 'table') >= 1 && trackCount(s, 'street') >= 1
  ));
  const features = featuresFor(tier, sanctuary);
  return { tier, features, tracks: tracksFor(features), lastRevealDay: revealed ? today : last };
}

/** True for "Said it" and "With help" (and their short stored forms). */
export function isSpokenMark(outcome) {
  const s = String(outcome ?? '').trim().toLowerCase();
  return s === 'said it' || s === 'with help' || s === 'said' || s === 'with-help';
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
 * @param {{seed?: string|number, items?: any[], recentIds?: string[], stats?: object}} [input]
 * `stats` is the `computeDepth` input. `recentIds` are lines already said; a new line is chosen first when one exists.
 * Tier 0 is one table line. Later tiers mix the tracks that are open.
 */
export function buildSession(input) {
  const o = input && typeof input === 'object' ? input : {};
  const depth = computeDepth(o.stats);
  const key = o.seed == null ? '' : String(o.seed);
  const open = new Set(depth.tracks);
  const recentIds = Array.isArray(o.recentIds) ? o.recentIds : [];
  const rows = dedupe(tagged(o.items).filter((it) => open.has(it.track)));
  const rng = mulberry32(hashSeed(`${key}|${depth.tier}`));
  const buckets = new Map(depth.tracks.map((t) => [t, []]));
  for (const it of rows) buckets.get(it.track).push(it);
  for (const t of depth.tracks) buckets.set(t, speakOrder(shuffle(buckets.get(t), rng), recentIds));
  const order = rotate(depth.tracks, depth.tracks.length > 1 ? Math.floor(rng() * depth.tracks.length) : 0);
  const want = depth.tracks.length;
  const picked = [];
  const mix = {};
  for (const t of depth.tracks) mix[t] = 0;
  while (picked.length < want) {
    let progressed = false;
    for (const t of order) {
      if (picked.length >= want) break;
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
    tier: depth.tier,
    tracks: depth.tracks,
    sessionSize: want,
    turnCount: picked.length,
    items: picked,
    mix,
    features: depth.features,
    ui: uiFlags(depth.features),
    lastRevealDay: depth.lastRevealDay,
    note: picked.length ? SESSION_NOTE : EMPTY_NOTE,
  };
}
