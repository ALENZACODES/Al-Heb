/**
 * Store-facing glue for the morning card and the streak (DRAFT; no DOM). `store` is the shell store (sync get/set).
 * Single source of truth: the streak record under STREAK_KEY ("streak"), see src/curriculum/streak.js.
 */
import { STREAK_KEY } from "../curriculum/dom.js";
import { CAL_PREFS_KEY, normalizePrefs as normCal } from "../curriculum/calendar.locations.js";
import { normalizeRecord, projectStreak, weekStrip, withSettings, toStored, rollover, clock, GOAL_SECONDS } from "../curriculum/streak.js";
import { PREFS_KEY, normalizePrefs, observantOn, freezeOn, festivalMode, morningPresent, rescueState } from "./plan.js";

const PROGRESS_STATE_KEY = "progress.state";

export function createMorningModel(store, now = () => new Date()) {
  const get = (k, d) => { try { const v = store.get(k, d); return v == null ? d : v; } catch { return d; } };
  const set = (k, v) => { try { store.set(k, v); } catch { /* best effort */ } };
  const api = {
    prefs: () => normalizePrefs(get(PREFS_KEY, null)),
    calendarPrefs: () => normCal(get(CAL_PREFS_KEY, null)),
    observant() { return observantOn(api.prefs(), api.calendarPrefs()); },
    freeze() { return freezeOn(api.prefs(), api.observant()); },
    mode() { return festivalMode(api.calendarPrefs()); },
    /** Progress rest days (user-declared), merged as extra frozen days. */
    extraRest() { const s = get(PROGRESS_STATE_KEY, null); return s && Array.isArray(s.rest) ? s.rest.filter((d) => typeof d === "string") : []; },
    record: () => get(STREAK_KEY, null),
    /** Save prefs and push freeze/mode onto the streak record (the one place Home and Progress read). Migrates a v1 record to v2. */
    setPrefs(patch) {
      const next = normalizePrefs({ ...api.prefs(), ...patch });
      set(PREFS_KEY, next);
      api.syncRecord();
      return next;
    },
    syncRecord() {
      const rec = withSettings(api.record(), { freeze: api.freeze(), mode: api.mode() });
      set(STREAK_KEY, rollover(rec, now(), api.extraRest()));
    },
    project: () => projectStreak(api.record(), now(), api.extraRest()),
    strip: () => weekStrip(api.record(), now(), api.extraRest()),
    /** Engagement store adapter. */
    io: { load: () => api.record(), save: (r) => set(STREAK_KEY, toStored(normalizeRecord(r))) },
    markSeen() { const today = fmtDay(now()); return api.setPrefsRaw({ lastSeen: today }); },
    markRescueShown() { return api.setPrefsRaw({ lastRescue: fmtDay(now()) }); },
    setPrefsRaw(patch) { const next = normalizePrefs({ ...api.prefs(), ...patch }); set(PREFS_KEY, next); return next; },
    shouldPresentCard: () => morningPresent(now(), api.prefs(), { observant: api.observant(), mode: api.mode() }),
    rescue: () => rescueState(now(), api.record(), api.prefs(), { observant: api.observant(), mode: api.mode(), extraRest: api.extraRest() }),
    clock, GOAL_SECONDS,
  };
  return api;
}
const fmtDay = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
