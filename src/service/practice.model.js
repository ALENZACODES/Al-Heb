// @ts-check
// Prayer Practice (#/prayer-practice): pure logic, no DOM. Lazy route code (src/service/ is on demand in tools/build-precache.mjs).
// CODER-100 F3 line tutor, F4 prayer word decks, F5 parts roadmap, F7 fluency ladder, F9 festival skeleton.
// Every Hebrew line and word comes from data/corpus/registry.json by id, in the order data/service/orders.json gives; the parts that
// are not in Aleph come from data/corpus/gaps.json; the festival outline is the guide's own list (torah-service-guide.json
// otherOccasions). Nothing here writes liturgy. The four-letter name is shown as ה׳ (showName) and voiced only by the existing clips.
// Every mark the learner makes here is their own self-check: nothing listens to them or grades their reading.
import { showName } from '../games/tg-core.js';
import { speechText } from '../shell/names.js';
import { splitWords } from '../progress/decode.js';
import { stripAccents } from '../corpus/normalize.js';
import { stripPoints } from '../nikkudfade/model.js';
import { SERVICE_KEYS } from '../lib/counts.js';
import { linesOf } from './companion.model.js';

export const PRACTICE_KEY = SERVICE_KEYS.practice;
export const SELF_CHECK = 'Your own check: Aleph does not listen to you or grade your reading.';
export const LADDER = Object.freeze([
  { id: 'hear', label: 'Hear It', how: 'Listen to the whole prayer, or to each line, at least once.' },
  { id: 'follow', label: 'Follow It', how: 'Follow it in the service: mark it practised in the Shabbat Companion, or step through it in the Line Tutor here.' },
  { id: 'vowels', label: 'Read It with Vowels', how: 'Read every line aloud from the pointed text.' },
  { id: 'plain', label: 'Read It without Vowels', how: 'Read every line aloud with the vowel points taken away.' },
]);
export const NOT_YET = 'Not in Aleph yet';
export const ARRIVING_NOTE = 'On the roadmap, with no date promised. Aleph adds a part only when a pointed text it may use has been found and checked.';

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const isDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

/** The practice record, cleaned: {v, lines:{order:{lineKey:day}}, words:{order:{wordKey:day}}, ladder:{entryId:{stage:day}}}. */
export function normalizePractice(raw) {
  const r = obj(raw), out = { v: 1, lines: {}, words: {}, ladder: {} };
  for (const part of ['lines', 'words']) for (const [o, m] of Object.entries(obj(r[part]))) {
    const keep = Object.fromEntries(Object.entries(obj(m)).filter(([k, d]) => k && isDay(d)).slice(0, 5000));
    if (Object.keys(keep).length) out[part][o] = keep;
  }
  for (const [id, m] of Object.entries(obj(r.ladder))) {
    const keep = Object.fromEntries(Object.entries(obj(m)).filter(([k, d]) => LADDER.some((s) => s.id === k) && isDay(d)));
    if (Object.keys(keep).length) out.ladder[id] = keep;
  }
  return out;
}

/** Key of a word, the same normalisation the Service coverage uses for its word count (src/progress/decode.js gradeWords). */
export const wordKey = (w) => stripAccents(String(w)).normalize('NFC').replace(/[׃׀]/g, '');
/** Key of a line, the same id src/progress/decode.js gradeLines gives it: the entry id, or "<id>#<n>" in a text of several lines. */
export const lineKey = (entryId, n, count) => (count > 1 ? `${entryId}#${n}` : entryId);

/**
 * Every line of a service, in order, for the Line Tutor. English: the registry's line when it has one English line per Hebrew line,
 * else the whole text's English once, on its first line (labelled so by the view).
 */
export function serviceLines(orders, orderId, byId) {
  const o = orders?.orders?.[orderId];
  if (!o) return [];
  const out = [];
  o.items.forEach((it, i) => {
    const e = byId.get(it.id);
    if (!e) return;
    const ls = linesOf(e), en = String(e.english ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
    const perLine = en.length === ls.length;
    let n = 0;
    ls.forEach((he, k) => {
      const words = he.split(/\s+/).filter(Boolean).map((w) => ({ he: w, shown: showName(w), spoken: speechText(w), n: ++n }));
      out.push({
        key: lineKey(e.id, k + 1, ls.length), entryId: e.id, prayer: i + 1, moment: it.moment, title: e.title ?? e.id, ref: e.ref ?? '',
        n: k + 1, of: ls.length, he, shown: showName(he), plain: stripPoints(showName(he)), spoken: speechText(he),
        clip: { kind: 'line', id: ls.length === 1 ? e.id : `${e.id}-l${k + 1}` }, words,
        en: perLine ? en[k] : (k === 0 ? en.join(' ') : ''), enWhole: !perLine && k === 0 && en.length > 0,
      });
    });
    // word numbers run across the whole text (the word clips are "<id>-w<n>"), so renumber from the text's first line
    let m = 0; for (const l of out.filter((x) => x.entryId === e.id)) for (const w of l.words) w.n = ++m;
  });
  return out;
}

/**
 * The word deck of a service: each distinct word once (keyed as the coverage counts it), most frequent first, with the first place
 * it appears. A word clip is offered only for a word that stands alone between spaces (the clips are numbered that way).
 */
export function serviceDeck(orders, orderId, byId) {
  const map = new Map();
  for (const l of serviceLines(orders, orderId, byId)) for (const w of l.words) {
    const parts = splitWords(w.he);
    for (const p of parts) {
      const key = wordKey(p);
      if (!key) continue;
      const have = map.get(key);
      if (have) { have.count++; continue; }
      map.set(key, { key, he: p, shown: showName(p), spoken: speechText(p), entryId: l.entryId, moment: l.moment, count: 1,
        clip: parts.length === 1 ? { kind: 'word', id: `${l.entryId}-w${w.n}` } : null });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'he'));
}

/** Words to drill next: not yet marked known, most frequent first. */
export function deckQueue(deck, rec, orderId, size = 10) {
  const known = obj(obj(rec?.words)[orderId]);
  return deck.filter((w) => !known[w.key]).slice(0, size);
}

/** Pure record updates. Each returns a new record. */
export function withLine(rec, orderId, key, day) {
  const r = normalizePractice(rec);
  r.lines[orderId] = { ...(r.lines[orderId] ?? {}), [key]: day };
  return r;
}
export function withWord(rec, orderId, key, known, day) {
  const r = normalizePractice(rec);
  const m = { ...(r.words[orderId] ?? {}) };
  if (known) m[key] = day; else delete m[key];
  if (Object.keys(m).length) r.words[orderId] = m; else delete r.words[orderId];
  return r;
}
export function withStage(rec, entryId, stage, done, day) {
  const r = normalizePractice(rec);
  if (!LADDER.some((s) => s.id === stage)) return r;
  const m = { ...(r.ladder[entryId] ?? {}) };
  if (done) m[stage] = day; else delete m[stage];
  if (Object.keys(m).length) r.ladder[entryId] = m; else delete r.ladder[entryId];
  return r;
}

/**
 * The fluency ladder of one prayer: each stage done or not. "Follow It" also counts a Companion practice mark or a line card
 * (the same evidence the Companion and the service ring use) or every line of the prayer stepped through in the Line Tutor.
 * @param {any} rec @param {string} entryId @param {Set<string>} followed ids practised elsewhere @param {string[]} [lineKeys] the prayer's line keys @param {string} [orderId]
 */
export function ladderOf(rec, entryId, followed, lineKeys = [], orderId = '') {
  const m = obj(obj(rec?.ladder)[entryId]);
  const seenLines = obj(obj(rec?.lines)[orderId]);
  const viaTutor = lineKeys.length > 0 && lineKeys.every((k) => seenLines[k]);
  const stages = LADDER.map((s) => {
    const own = m[s.id] || null;
    const auto = s.id === 'follow' && !own && (followed.has(entryId) || viaTutor);
    return { ...s, done: !!own || auto, day: own, auto };
  });
  const next = stages.find((s) => !s.done) || null;
  return { stages, done: stages.filter((s) => s.done).length, of: stages.length, next: next ? next.id : null };
}

/**
 * The parts roadmap for one service: the guide's sections in the order the service reaches them, each with the prayers Aleph holds
 * and the typical parts it does not hold yet (from the order's own gap list). Gaps the guide does not place go in a last group.
 */
export function roadmap(orders, orderId, byId, guide, gapsFile) {
  const o = orders?.orders?.[orderId];
  if (!o) return [];
  const gapBy = new Map((gapsFile?.gaps ?? []).map((g) => [g.id, g]));
  const secs = [...(guide?.sections ?? []), ...(guide?.otherOccasions ?? [])];
  const secBy = new Map(secs.map((s) => [s.id, s]));
  const groups = [], at = new Map();
  const group = (id) => {
    if (!at.has(id)) { const s = secBy.get(id); const g = { id, title: s?.title ?? 'Before the service', held: [], notYet: [] }; at.set(id, g); groups.push(g); }
    return at.get(id);
  };
  o.items.forEach((it, i) => { const e = byId.get(it.id); group(it.anchor || '_start').held.push({ n: i + 1, id: it.id, moment: it.moment, title: e?.title ?? it.id }); });
  const placed = new Set();
  for (const g of groups) {
    const sec = secBy.get(g.id);
    for (const gid of sec?.gaps ?? []) if (o.gaps.includes(gid) && gapBy.has(gid) && !placed.has(gid)) { placed.add(gid); g.notYet.push(gapView(gapBy.get(gid))); }
  }
  const rest = o.gaps.filter((gid) => !placed.has(gid) && gapBy.has(gid));
  if (rest.length) groups.push({ id: '_elsewhere', title: 'Elsewhere in the Service', held: [], notYet: rest.map((gid) => gapView(gapBy.get(gid))) });
  return groups;
}
const gapView = (g) => ({ id: g.id, name: g.name, where: g.whereInService ?? '', why: g.why ?? '' });

/** Roadmap totals: prayers held, parts not in Aleph yet. */
export const roadmapCounts = (groups) => ({ held: groups.reduce((a, g) => a + g.held.length, 0), notYet: groups.reduce((a, g) => a + g.notYet.length, 0) });

// ---------- festivals (F9 skeleton, F2 this week) ----------
/** Which part of the guide covers a holiday from the calendar (src/curriculum/calendar.js HOLIDAY_DEFS ids). */
export const HOLIDAY_OCCASION = Object.freeze({
  pesach: 'festivals', shavuot: 'festivals', sukkot: 'festivals', 'shemini-atzeret': 'festivals', 'simchat-torah': 'festivals', hanukkah: 'hanukkah',
});
/** Holidays whose prayers are a known gap (data/corpus/gaps.json). */
export const HOLIDAY_GAP = Object.freeze({ 'rosh-hashanah': 'g-high-holidays', 'yom-kippur': 'g-high-holidays' });
/** Festival-specific Kiddush inserts, by the festival named in the registry id (each entry's own title says which festival). */
const FESTIVAL_ONLY = Object.freeze({ 'kiddush-festival-pesach': ['pesach'], 'kiddush-festival-shavuot': ['shavuot'], 'kiddush-festival-sukkot': ['sukkot'],
  'kiddush-festival-shemini': ['shemini-atzeret', 'simchat-torah'], 'leshev-basukkah': ['sukkot'] });

/**
 * The festival skeleton: the guide's list for an occasion, each prayer Aleph holds (linked to its text) and each part it does not
 * hold yet. With a holiday id, inserts for other festivals are left out. Returns null when the guide has no such occasion.
 */
export function festivalSkeleton(guide, gapsFile, byId, occasionId = 'festivals', holidayId = null) {
  const occ = (guide?.otherOccasions ?? []).find((x) => x.id === occasionId);
  if (!occ) return null;
  const gapBy = new Map((gapsFile?.gaps ?? []).map((g) => [g.id, g]));
  const held = occ.prayers.filter((id) => byId.has(id) && (!holidayId || !FESTIVAL_ONLY[id] || FESTIVAL_ONLY[id].includes(holidayId)))
    .map((id) => { const e = byId.get(id); return { id, title: e.title ?? id, he: showName(linesOf(e)[0] ?? ''), lines: linesOf(e).length, href: `#/read/${id}` }; });
  const notYet = (occ.gaps ?? []).filter((g) => gapBy.has(g)).map((g) => gapView(gapBy.get(g)));
  return { id: occ.id, title: occ.title, held, notYet };
}

/** What Aleph holds for one calendar holiday: {kind:'skeleton', skeleton} | {kind:'gap', gap} | {kind:'none'}. */
export function holidayPlan(holiday, guide, gapsFile, byId) {
  const occ = HOLIDAY_OCCASION[holiday?.id];
  if (occ) { const sk = festivalSkeleton(guide, gapsFile, byId, occ, holiday.id); if (sk) return { kind: 'skeleton', skeleton: sk }; }
  const gid = HOLIDAY_GAP[holiday?.id];
  const g = gid && (gapsFile?.gaps ?? []).find((x) => x.id === gid);
  if (g) return { kind: 'gap', gap: gapView(g) };
  return { kind: 'none' };
}

/** Holidays from the calendar that start within `days` days of `fromISO` (inclusive), from a list holidaysBetween gave. */
export function holidaysWithin(list, fromISO, days = 8) {
  const end = new Date(Date.parse(fromISO + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
  return (list ?? []).filter((h) => h.end >= fromISO && h.start <= end && h.kind !== 'roshchodesh');
}

// ---------- F10 countdown ----------
/** Time left until `target` (ms since epoch) from `now`: {past, days, hours, minutes, text}. Whole minutes, rounded down. */
export function countdown(target, now) {
  const ms = Number(target) - Number(now);
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return { past: true, days: 0, hours: 0, minutes: 0, text: 'Candle-lighting time has passed for this Friday.' };
  const mins = Math.floor(ms / 60000), days = Math.floor(mins / 1440), hours = Math.floor((mins % 1440) / 60), minutes = mins % 60;
  const part = (n, one, many) => (n ? `${n} ${n === 1 ? one : many}` : '');
  const text = [part(days, 'day', 'days'), part(hours, 'hour', 'hours'), part(minutes, 'minute', 'minutes')].filter(Boolean).join(', ') || 'less than a minute';
  return { past: false, days, hours, minutes, text: `Candle lighting in ${text}.` };
}
