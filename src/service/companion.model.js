// @ts-check
// Shabbat Companion (#/shabbat): pure logic, no DOM. Lazy route code (src/service/ is on demand in tools/build-precache.mjs).
// The service order is data/service/orders.json (shared with Follow the service, not copied); every Hebrew line and word is read
// from data/corpus/registry.json by id. data/service/companion.json only names which registry lines are drills and home steps.
// The four-letter name is shown as ה׳ (tg-core showName) and never voiced: clips are the existing ones, whose name word is the
// spoken substitute, and any text handed to the player goes through speechText.
import { showName } from '../games/tg-core.js';
import { speechText, displayTranslit } from '../shell/names.js';
import { transliterate } from '../pronunciation/transliterate.js';
import { effectiveLevel, startLevel, LEVEL_NAMES, SCAFFOLD_KEY } from '../curriculum/scaffold.js';
import { candleLighting, formatTime, floorToMinute, isoDate, saturdayOnOrAfter, shabbatFridayOf } from '../curriculum/calendar.js';

export const COMPANION_KEY = 'service.companion';
export const REVIEW_LABEL = 'Order not yet reviewed by a rabbi';
export const NOT_SCORED = 'Scored on timing and your own check only. Your pronunciation is not scored.';
/** Timing bands for a join-in tap, in ms after the leader's clip ends. Hand-chosen for practice, not measured in a congregation. */
export const IN_TIME_MS = 2500;
export { SCAFFOLD_KEY, LEVEL_NAMES, showName };

/** Lines of a registry entry (trimmed, no blanks). */
export const linesOf = (entry) => String(entry?.he ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

/** Words of an entry, numbered across all lines the way the word clips are ("<id>-w<n>"): [[{he, n}...] per line]. */
export function wordsOf(entry) {
  let n = 0;
  return linesOf(entry).map((l) => l.split(/\s+/).filter(Boolean).map((he) => ({ he, n: ++n })));
}

/** One part of a drill or step: {entry, line} or {entry, word}. Returns the text and the clip it would play, or null if the data lacks it. */
export function partOf(byId, part) {
  const e = byId.get(part?.entry);
  if (!e) return null;
  const lines = linesOf(e);
  if (part.word) {
    const w = wordsOf(e).flat().find((x) => x.n === part.word);
    return w ? { he: w.he, shown: showName(w.he), spoken: speechText(w.he), clip: { kind: 'word', id: `${e.id}-w${w.n}` }, entry: e.id } : null;
  }
  const k = part.line || 1;
  if (k < 1 || k > lines.length) return null;
  const he = lines[k - 1];
  return { he, shown: showName(he), spoken: speechText(he), clip: { kind: 'line', id: lines.length === 1 ? e.id : `${e.id}-l${k}` }, entry: e.id };
}

/** Problems with companion.json against the orders and the registry; [] when sound. */
export function validateCompanion(comp, orders, byId) {
  const bad = [];
  for (const m of comp.maps ?? []) if (!orders.orders?.[m]?.follow) bad.push(`map ${m}: not a follow-mode order`);
  const inMaps = new Set((comp.maps ?? []).flatMap((m) => orders.orders?.[m]?.items.map((i) => i.id) ?? []));
  for (const id of comp.jump ?? []) if (!inMaps.has(id)) bad.push(`jump ${id}: not in a map`);
  for (const d of comp.drills ?? []) {
    if (!partOf(byId, d.cue)) bad.push(`drill ${d.id}: cue not in the registry`);
    if (!d.response?.length) bad.push(`drill ${d.id}: no response`);
    for (const r of d.response ?? []) if (!partOf(byId, r)) bad.push(`drill ${d.id}: response not in the registry`);
  }
  for (const s of comp.home ?? []) for (const id of s.entries) if (!byId.has(id)) bad.push(`home ${s.id}: unknown entry ${id}`);
  return bad;
}

/** The service map for one order: each prayer with its link to the app's own text. */
export function mapItems(orders, orderId, byId) {
  const o = orders.orders[orderId];
  return o.items.map((it, i) => {
    const e = byId.get(it.id);
    return { n: i + 1, of: o.items.length, id: it.id, moment: it.moment, title: e?.title ?? it.id, ref: e?.ref ?? '', href: `#/read/${it.id}`, he: showName(linesOf(e)[0] ?? '') };
  });
}

/** Transliteration of one line in the learner's tradition, with the name as "Adonai". '' when it cannot be made. */
export function translit(line, tradition) {
  try { return displayTranslit(transliterate(line, { scheme: 'siddur', tradition })); } catch { return ''; }
}

/**
 * The learner's transliteration fade level, from the per-word fading they already have (curriculum.scaffold, src/curriculum/scaffold.js):
 * the median displayed level of their word entries. No entries yet: the start level from Settings (scaffoldStart).
 * 0 shown, 1 faint, 2 on tap, 3 hidden.
 */
export function fadeLevel(scaffoldMap, start = 'full') {
  const lv = Object.entries(scaffoldMap && typeof scaffoldMap === 'object' ? scaffoldMap : {})
    .filter(([k]) => k.startsWith('word:')).map(([, v]) => effectiveLevel(v, start)).sort((a, b) => a - b);
  if (!lv.length) return startLevel(start);
  return lv[Math.floor((lv.length - 1) / 2)];
}

/** Ids the learner has practised: a fade-out recall card for the line ("line:<id>") or a mark in the companion's own record. */
export function practisedIds(cards, comp) {
  const s = new Set();
  for (const k of Object.keys(cards ?? {})) if (k.startsWith('line:')) s.add(k.slice(5));
  for (const k of Object.keys(comp?.practised ?? {})) s.add(k);
  return s;
}

/** "Practise before Friday": the Friday-evening prayers (in service order) not practised yet. */
export function practiseList(orders, byId, practised, orderId = 'friday-night') {
  return mapItems(orders, orderId, byId).filter((it) => !practised.has(it.id));
}

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
/** Calendar date {y,m,d} of an instant in a time zone (device date when no zone). */
export function dateIn(now, tz) {
  if (!tz) return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const g = (t) => Number(p.find((x) => x.type === t)?.value);
    return { y: g('year'), m: g('month'), d: g('day') };
  } catch { return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }; }
}

/**
 * This Shabbat, from the calendar's own functions: the Friday and Saturday of the Shabbat containing or following today, the Torah
 * portion (null on a festival Shabbat with no regular portion) and candle lighting for the learner's calendar location (null without one).
 * @param {{now:Date, loc:any, parsha:Function}} o  parsha = calendar.parsha.js parshaOnShabbat (loaded by the view)
 */
export function thisShabbat({ now, loc, parsha }) {
  const g = dateIn(now, loc?.tz);
  const fri = shabbatFridayOf(g), sat = saturdayOnOrAfter(fri);
  let portion = null;
  try { portion = parsha ? parsha(sat, { israel: !!loc?.israel }) : null; } catch { portion = null; }
  let candles = null;
  if (loc && finite(loc.lat) && finite(loc.lon)) {
    const cl = candleLighting(fri, { lat: loc.lat, lon: loc.lon, offsetMinutes: loc.candleMinutes });
    if (cl) candles = { time: formatTime(floorToMinute(cl.candles), loc.tz), tz: loc.tz || 'UTC', place: loc.name || '', minutes: loc.candleMinutes, at: floorToMinute(cl.candles).getTime() };
  }
  return { friday: isoDate(fri), saturday: isoDate(sat), portion, candles };
}

/**
 * Timing of a join-in tap. ms = tap time minus the moment the leader's clip ended (negative: tapped while the leader was still going).
 * Without a clip there is nothing to time against, so it is not scored.
 */
export function timingOf(ms, hadClip) {
  if (!hadClip || !finite(ms)) return { band: 'unscored', label: 'Timing not scored: there is no clip of the leader\'s line yet.' };
  if (ms < 0) return { band: 'early', label: 'A little early: wait for the leader to finish.' };
  if (ms <= IN_TIME_MS) return { band: 'in-time', label: 'In time.' };
  return { band: 'late', label: 'A little late: come in as soon as the leader finishes.' };
}

/** Record a practice mark (and optionally a drill result) in the companion's record. Pure: returns the new record. */
export function withPractice(rec, id, day, drill) {
  const r = { v: 1, practised: { ...(rec?.practised ?? {}) }, drills: { ...(rec?.drills ?? {}) }, home: { ...(rec?.home ?? {}) } };
  if (id) r.practised[id] = day;
  if (drill) r.drills[drill.id] = { day, band: drill.band, self: drill.self };
  return r;
}

/** Home-ritual checklist for one Friday: which steps are done. Pure: returns the new record. */
export function withHomeStep(rec, friday, step, done) {
  const r = withPractice(rec, null, null);
  const wk = { ...(r.home[friday] ?? {}) };
  if (done) wk[step] = true; else delete wk[step];
  r.home = { [friday]: wk }; // only this week is kept
  return r;
}
