// @ts-check
// This week's parashah (E4): the portion the calendar code computes for the coming Shabbat (src/curriculum/calendar.parsha.js,
// a table derived from Hebcal output, not an independent halachic table), its aliyot from the Torah index, and a weekly reading
// goal with progress the learner marks themself ("I read this"). Pure: no DOM, no clock.
export const WEEK_KEY = 'torah.week.v1';
export const GOALS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
export const DEFAULT_GOAL = 7;
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const iso = (g) => `${g.y}-${String(g.m).padStart(2, '0')}-${String(g.d).padStart(2, '0')}`;
export { iso as isoOf };

/** One reading section of the week: a portion's aliyah (or the whole portion when it lists no aliyot). */
export function sections(portions) {
  const out = [];
  for (const p of portions || []) {
    const al = Array.isArray(p.aliyot) && p.aliyot.length ? p.aliyot : [{ n: 0, from: p.from, to: p.to }];
    for (const a of al) out.push({ key: `${p.id}:${a.n}`, portion: p.id, portionEn: p.en, n: a.n, from: a.from, to: a.to });
  }
  return out;
}

/** The week's record for this Shabbat: a different Shabbat starts empty (the goal carries over). */
export function weekRecord(rec, shabbatIso) {
  const r = obj(rec);
  const goal = GOALS.includes(r.goal) ? r.goal : DEFAULT_GOAL;
  return r.shabbat === shabbatIso ? { shabbat: shabbatIso, goal, read: obj(r.read) } : { shabbat: shabbatIso, goal, read: {} };
}
export const toggleRead = (rec, key, now = Date.now()) => { const read = { ...rec.read }; if (read[key]) delete read[key]; else read[key] = Number(now) || 1; return { ...rec, read }; };
export const setWeekGoal = (rec, n) => ({ ...rec, goal: GOALS.includes(n) ? n : rec.goal });

/** Progress against the goal, counted from the sections marked read this week. */
export function weekProgress(rec, secs) {
  const keys = new Set((secs || []).map((s) => s.key));
  const done = Object.keys(obj(rec.read)).filter((k) => keys.has(k)).length;
  const goal = Math.min(rec.goal, keys.size || rec.goal);
  return { done, goal, total: keys.size, met: done >= goal, text: `${done} of ${goal} ${goal === 1 ? 'section' : 'sections'} read this week (your goal)` };
}

/** 'Genesis 6:9 – 6:22' for a range; bookName maps an id to its English name. */
export function rangeText(r, bookName) {
  const f = r.from, t = r.to;
  return f.book === t.book ? `${bookName(f.book)} ${f.chapter}:${f.verse} – ${t.chapter}:${t.verse}` : `${bookName(f.book)} ${f.chapter}:${f.verse} – ${bookName(t.book)} ${t.chapter}:${t.verse}`;
}
export const readerLink = (r) => `#/torahreader?book=${r.from.book}&chapter=${r.from.chapter}&verse=${r.from.verse}`;
