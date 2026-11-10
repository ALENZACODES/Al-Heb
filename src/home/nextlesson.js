// One shared rule for "which lesson is next", used by the Home Today card (src/home/today.js) and the "Your week" plan
// (src/onboarding/model.js buildPlan), so the two cannot recommend different lessons. Pure; no stores, no DOM.
/** Tracks a study goal draws lessons from (same rule the Today card always used). */
export const tracksFor = (goal) => (goal === 'israel' ? ['israel'] : goal === 'both' ? ['read', 'israel'] : ['read']);

/** First open lesson per goal track: not done, every prerequisite done. `available(doneSet, track)` may override (the curriculum helper). */
export function nextPerTrack({ lessons, done, goal, available }) {
  const avail = available || ((d, tr) => (lessons || []).filter((l) => l.track === tr && !d.has(l.id) && (l.prerequisites || []).every((p) => d.has(p))));
  return tracksFor(goal).map((tr) => avail(done, tr)[0]).filter(Boolean);
}

/** The lesson the Today card recommends next (first of nextPerTrack), or null. */
export const nextLesson = (o) => nextPerTrack({ ...o, done: o.done instanceof Set ? o.done : new Set(o.done || []) })[0] || null;

/**
 * The next `limit` lessons in the order the Today card would recommend them if one lesson were finished per day.
 * `first` (optional lesson id) forces step 1, e.g. the placement check's open start; later steps use the same rule as Today.
 */
export function lessonQueue({ lessons, completed, goal, available, limit = 14, first = null }) {
  const done = new Set(completed || []);
  const out = [];
  let forced = first && (lessons || []).find((l) => l.id === first && !done.has(l.id)) || null;
  while (out.length < limit) {
    const n = forced || nextLesson({ lessons, done, goal, available });
    forced = null;
    if (!n || done.has(n.id)) break;
    out.push(n); done.add(n.id);
  }
  return out;
}
