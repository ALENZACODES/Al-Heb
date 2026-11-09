/**
 * Engaged-time accrual for the streak (DRAFT). Pure state machine with an injected clock: every method takes the time `t`
 * (ms) so tests can walk a fake clock. Time accrues only while ALL hold: the page is visible, the user is inside a counted
 * activity route, and the last interaction was less than IDLE_MS ago. Interaction (pointer/keyboard/touch) resets idle.
 * Seconds are persisted every PERSIST_MS of engine time, on flush() (page hide) and when the 5-minute goal is reached.
 *
 * `io` = { load(): rawRecord, save(rawRecord): void } — the store adapter; the record is the shared streak record.
 */
import { GOAL_SECONDS, dayKey, rollover, setTodaySeconds, completeDay, projectStreak } from "../curriculum/streak.js";

export const IDLE_MS = 60000;
export const PERSIST_MS = 10000;

/** Routes that count as a learning activity: lessons, review, ladder/fade drills, prayer/Torah read-aloud, sprints. */
const COUNTED = [/^\/learn(\b|$)/, /^\/ladder/, /^\/fade/, /^\/spotit\//, /^\/checkpoint/, /^\/loanwords/, /^\/dialogues/, /^\/gender/, /^\/scaffold/, /^\/read(\/|$)/, /^\/torahread/, /^\/sounds/, /^\/vocab/, /^\/words\/trace/, /^\/letters/, /^\/classtrack/, /^\/israel/, /^\/sprint/, /^\/timedread/, /^\/service/, /^\/lab(\/|$)/];
/** @param {string} hash e.g. "#/learn?review=1" */
export function isCountedRoute(hash) {
  const p = String(hash || "").replace(/^#/, "").split("?")[0];
  return COUNTED.some((re) => re.test(p));
}

export function createEngagement(io, opt = {}) {
  const idleMs = opt.idleMs ?? IDLE_MS, persistMs = opt.persistMs ?? PERSIST_MS, goal = opt.goal ?? GOAL_SECONDS;
  const extraRest = opt.extraRest || (() => null);
  const st = { visible: opt.visible !== false, counted: false, lastT: null, lastInteraction: null, ms: 0, day: null, lastPersist: null, lastSavedSec: -1, onComplete: opt.onComplete || null };

  const midnight = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const active = () => st.visible && st.counted;

  function sync(t) { // bring the accumulator up to time t using the state that held since lastT
    if (st.lastT == null) { st.lastT = t; st.day = dayKey(t); return; }
    if (t < st.lastT) { st.lastT = t; return; } // clock moved back: ignore
    if (dayKey(t) !== st.day) { // crossed local midnight: bank nothing across it, start the new day from midnight
      st.day = dayKey(t); st.ms = 0; st.lastSavedSec = -1; st.lastT = Math.max(st.lastT, midnight(t));
    }
    if (active() && st.lastInteraction != null) {
      const end = Math.min(t, st.lastInteraction + idleMs);
      if (end > st.lastT) st.ms += end - st.lastT;
    }
    st.lastT = t;
  }
  const seconds = () => Math.floor(st.ms / 1000);

  function save(t, force) {
    const sec = seconds();
    let rec = io.load();
    const base = projectStreak(rec, t, extraRest());
    const have = base.todaySeconds;
    const next = Math.max(sec, have);
    // Reaching the goal is persisted at once (the 10 s gate must not hold it back: a goal reached just before local
    // midnight would otherwise be discarded by the day rollover in sync()).
    const reached = next >= goal && st.lastSavedSec < goal;
    if (!force && !reached && (st.lastPersist != null && t - st.lastPersist < persistMs)) return;
    st.lastPersist = t;
    if (sec === st.lastSavedSec && !force) return;
    st.lastSavedSec = sec;
    rec = setTodaySeconds(rec, t, next);
    let completed = false;
    if (next >= goal && rec.last !== dayKey(t)) { const before = rec; rec = completeDay(rec, t, extraRest()); completed = rec.last === dayKey(t) && before.last !== rec.last; }
    io.save(rec);
    if (completed && st.onComplete) st.onComplete(projectStreak(rec, t, extraRest()));
  }

  return {
    /** Seconds accrued today by this engine (in memory). */
    seconds, state: st,
    /** Route changed. counted = isCountedRoute(hash). Entering a counted route counts as an interaction. */
    setRoute(counted, t) { sync(t); st.counted = !!counted; if (st.counted) st.lastInteraction = t; else save(t, true); },
    setVisible(visible, t) { sync(t); st.visible = !!visible; if (st.visible && st.counted) st.lastInteraction = t; if (!st.visible) save(t, true); },
    interact(t) { sync(t); st.lastInteraction = t; },
    /** Call from a timer (about once a second). */
    tick(t) { sync(t); if (active()) save(t, false); },
    /** Page hide / unload: persist now. */
    flush(t) { sync(t); save(t, true); },
    /** Load today's persisted seconds into the accumulator (call once at start, and after a day change). */
    resume(t) {
      st.lastT = t; st.day = dayKey(t);
      const rec = rollover(io.load(), t, extraRest());
      const p = projectStreak(rec, t, extraRest());
      st.ms = (rec.todayDate === dayKey(t) ? Math.max(rec.todaySeconds, p.activeToday ? goal : 0) : 0) * 1000;
      st.lastSavedSec = seconds(); st.lastPersist = t;
      io.save(rec);
    },
  };
}
