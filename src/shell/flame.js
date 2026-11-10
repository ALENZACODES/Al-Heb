// The streak flame shown when a lesson ends: lit once today counts (5 minutes of study, the rule in src/curriculum/streak.js),
// otherwise filling toward it. It listens to the shared streak record while it is on screen, so it lights the moment the
// engaged-time engine (src/morning/engage.js) completes the day, with the streak sound and Rimon stretching.
// Used by the first lesson (src/firstday/firstday.view.js) and every lesson summary (src/curriculum/exercises.ui.js).
import { projectStreak, GOAL_SECONDS } from '../curriculum/streak.js';

export const STREAK_KEY = 'streak';

/** Words and fill for a streak record at a moment. Pure. @param {any} raw @param {number} now */
export function flameState(raw, now) {
  let p; try { p = projectStreak(raw, now); } catch { p = { count: 0, activeToday: false, todaySeconds: 0 }; }
  const goalMin = Math.round(GOAL_SECONDS / 60), secs = Math.min(GOAL_SECONDS, p.todaySeconds || 0), min = Math.floor(secs / 60);
  if (p.activeToday && p.count > 0) {
    return { lit: true, fill: 100, big: String(p.count), title: p.count === 1 ? 'Day 1 of your streak!' : `${p.count} days in a row!`,
      sub: p.count === 1 ? 'Today counts. Come back tomorrow to make it 2.' : `Today counts. Come back tomorrow to make it ${p.count + 1}.` };
  }
  const left = Math.max(1, goalMin - min);
  return { lit: false, fill: Math.round((secs / GOAL_SECONDS) * 100), big: `${min}/${goalMin}`,
    title: `${min} of ${goalMin} minutes today`,
    sub: p.count > 0 ? `${left} more minute${left === 1 ? '' : 's'} of study today keeps your ${p.count}-day streak.` : `${left} more minute${left === 1 ? '' : 's'} of study today lights day 1 of your streak. The next lesson counts.` };
}

/**
 * The card. make(tag, attrs, ...kids) is the caller's element helper. Returns { el, paint(raw), destroy() }.
 * @param {{make:Function, store?:any, now?:()=>number, onLit?:()=>void, hidden?:boolean}} o
 */
export function flameCard({ make, store = null, now = () => Date.now(), onLit = null, hidden = false }) {
  const n = make('span', { class: 'fd-flame-n' }, ''), t = make('strong', {}, ''), s = make('span', { class: 'fd-flame-sub' }, '');
  const el = make('div', { class: 'fd-flame', 'data-flame': '1', hidden: hidden ? '' : null, role: 'status' },
    make('span', { class: 'fd-flame-ico', 'aria-hidden': 'true' }), make('p', {}, n, t, make('br'), s));
  let wasLit = null, off = null;
  const paint = (raw) => {
    const f = flameState(raw, now());
    n.textContent = f.lit ? f.big : ''; t.textContent = f.title; s.textContent = f.sub;
    el.setAttribute('class', f.lit ? 'fd-flame is-lit' : 'fd-flame'); el.setAttribute('style', `--fill:${f.fill}`);
    if (wasLit === false && f.lit) { try { onLit?.(); } catch { /* decoration */ } }
    wasLit = f.lit;
    return f;
  };
  try { paint(store?.get?.(STREAK_KEY) ?? null); } catch { paint(null); }
  try { off = store?.subscribe?.((key, value) => { if (key === STREAK_KEY && el.isConnected !== false) paint(value); }); } catch { off = null; }
  return { el, paint, destroy() { try { off?.(); } catch { /* ignore */ } } };
}
