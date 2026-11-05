// Glue: read the stores other screens write, merge into the loops record, and build everything the page and the hook need.
import { readSnapshot } from '../../src/progress/model.js';
import { dayKey, addDaysISO } from '../../src/curriculum/streak.js';
import { LOOPS_KEY, load, save, clean, mergeDay, wouldChange, withRepairs } from './store.js';
import { deriveDays, declaredRest, engineDoneDays } from './derive.js';
import { dayPoints, ring, goalSentence, weekSummary, PRACTICE_POINTS } from './points.js';
import { rhythm, rhythmSentence, repairDays } from './rhythm.js';
import { questsFor, questSummary } from './quests.js';
import { stats, statSentences, heatmap, heatmapSummary, heatmapRows } from './stats.js';

export { LOOPS_KEY };

/** Merge everything derivable from the other stores into the record. Returns {rec, changed}. Never lowers a count. */
export function syncRecord(rec, snap) {
  let cur = clean(rec), changed = false;
  for (const [iso, counts] of Object.entries(deriveDays(snap))) {
    if (wouldChange(cur, iso, counts)) { cur = mergeDay(cur, iso, counts); changed = true; }
  }
  return { rec: cur, changed };
}

/** Read the store, sync, write only if something changed, and return the record and the snapshot. */
export function refresh(store) {
  let snap; try { snap = readSnapshot(store); } catch { snap = {}; }
  const { rec, changed } = syncRecord(load(store), snap);
  if (changed) save(store, rec);
  return { rec, snap };
}

/** Note one finished lesson for today (the hook calls this), then sync. Returns points before and after. */
export function noteLesson(store, lessonId, now) {
  const today = dayKey(now);
  let snap; try { snap = readSnapshot(store); } catch { snap = {}; }
  const synced = syncRecord(load(store), snap).rec;
  const before = dayPoints(synced.days[today]);
  const next = mergeDay(synced, today, { lessons: [String(lessonId)] });
  save(store, next);
  return { rec: next, snap, before, after: dayPoints(next.days[today]) };
}

/** Everything the page shows, from a record, a snapshot and `now`. */
export function buildModel(rec, snap, now) {
  const today = dayKey(now), r = clean(rec);
  const practice = new Set(Object.keys(r.days).filter((d) => dayPoints(r.days[d]) >= PRACTICE_POINTS));
  for (const d of engineDoneDays(snap)) practice.add(d);
  const rh = rhythm({ practice, cover: declaredRest(snap), repairs: r.repairs, today });
  const points = dayPoints(r.days[today]);
  return {
    today, goal: r.goal, quests: r.quests, points, ring: ring(points, r.goal), goalLine: goalSentence(points, r.goal),
    rhythm: rh, rhythmLine: rhythmSentence(rh), repair: repairDays(rh),
    questList: questsFor(today, r.days[today]), questLine: questSummary(questsFor(today, r.days[today])),
    week: weekSummary(r.days, today, r.goal),
    stats: stats(snap, r.days), heat: heatmap(r.days, today, r.goal),
  };
}
export function describe(model) {
  return { ...statSentences(model.stats), heat: heatmapSummary(model.heat), heatRows: heatmapRows(model.heat) };
}

/** Apply a free repair: cover the current gap. Returns the new record. */
export function applyRepair(rec, snap, now) {
  const m = buildModel(rec, snap, now);
  return m.repair.length ? withRepairs(rec, m.repair) : clean(rec);
}
export { addDaysISO, dayKey };
