// Header stat bar: the streak flame and today's minutes against the learner's daily goal, on every main screen,
// the way a language app keeps both in sight. Reads the shared streak record (src/curriculum/streak.js, written by the
// engaged-time engine in src/morning/engage.js) and the daily goal chosen at setup (onboarding.v1.dailyGoal).
// Nothing here writes to the store. Hidden until setup is done, in calm mode, when the learner hides streaks in Settings,
// and inside full-screen players (lesson, setup), where body classes hide the whole header.
import { h } from './ui.js';
import { projectStreak } from '../curriculum/streak.js';
import { STREAK_KEY } from '../curriculum/dom.js';
import { DAILY_GOAL_KEY, normalizeDailyGoal } from '../home/today.js';

/**
 * @param {{streak?:any, dailyGoal?:any, now?:number|Date}} o
 * @returns {{count:number, lit:boolean, rest:boolean, todayMin:number, goalMin:number, pct:number, met:boolean, streakLabel:string, goalLabel:string}}
 */
export function statModel({ streak = null, dailyGoal = null, now = Date.now() } = {}) {
  let p;
  try { p = projectStreak(streak, now); } catch { p = { count: 0, activeToday: false, restToday: false, todaySeconds: 0 }; }
  const goalMin = normalizeDailyGoal(dailyGoal);
  const todayMin = Math.max(0, Math.floor((p.todaySeconds || 0) / 60));
  const pct = Math.max(0, Math.min(100, Math.round((todayMin / goalMin) * 100)));
  const count = p.count || 0, lit = !!p.activeToday && count > 0, met = todayMin >= goalMin;
  const streakLabel = count === 0 ? 'No streak yet. Study 5 minutes today to start one.'
    : `${count}-day streak${lit ? ', today counts' : p.restToday ? ', today is a rest day' : '. Study 5 minutes today to keep it'}.`;
  const goalLabel = met ? `Daily goal met: ${todayMin} of ${goalMin} minutes today.` : `${todayMin} of ${goalMin} minutes today.`;
  return { count, lit, rest: !!p.restToday, todayMin, goalMin, pct, met, streakLabel, goalLabel };
}

/** Whether the bar shows at all. @param {any} settings */
export function statbarWanted(settings) {
  try { return settings?.get?.('onboarded') === true && settings.get('calmMode') !== true && settings.get('showStreak') !== false; } catch { return false; }
}

/** Mount into the site header. Returns { refresh(), destroy() }. @param {{store:any, settings:any, doc?:Document, now?:()=>number}} o */
export function mountStatbar({ store, settings, doc = globalThis.document, now = () => Date.now() }) {
  const header = doc?.querySelector?.('.site-header');
  if (!header) return { refresh() {}, destroy() {} };
  const flameN = h('span', { class: 'stat-n' }, '0');
  const ringN = h('span', { class: 'stat-n' }, '0');
  const streakChip = h('a', { class: 'stat-chip stat-streak', href: '#/progress', id: 'stat-streak' }, h('span', { class: 'stat-flame', 'aria-hidden': 'true' }), flameN);
  const goalChip = h('a', { class: 'stat-chip stat-goal', href: '#/learn', id: 'stat-goal' }, h('span', { class: 'stat-ring', 'aria-hidden': 'true' }), ringN);
  const bar = h('div', { class: 'statbar', role: 'group', 'aria-label': 'Today' }, streakChip, goalChip);
  header.append(bar);
  let last = '';
  function refresh() {
    const show = statbarWanted(settings);
    bar.hidden = !show;
    if (!show) return;
    let streak = null, goal = null;
    try { streak = store.get(STREAK_KEY); } catch { /* none */ }
    try { goal = store.get(DAILY_GOAL_KEY); } catch { /* none */ }
    const m = statModel({ streak, dailyGoal: goal, now: now() });
    const key = JSON.stringify(m);
    if (key === last) return;
    const grew = last && m.lit && !JSON.parse(last).lit; // the moment the day lights up
    last = key;
    flameN.textContent = String(m.count);
    ringN.textContent = `${m.todayMin}/${m.goalMin}`;
    streakChip.setAttribute('aria-label', m.streakLabel); streakChip.setAttribute('title', m.streakLabel);
    goalChip.setAttribute('aria-label', m.goalLabel); goalChip.setAttribute('title', m.goalLabel);
    streakChip.classList.toggle('is-lit', m.lit); streakChip.classList.toggle('is-rest', m.rest && !m.lit);
    goalChip.classList.toggle('is-met', m.met);
    goalChip.style.setProperty('--p', String(m.pct));
    if (grew) { streakChip.classList.remove('is-pop'); void streakChip.offsetWidth; streakChip.classList.add('is-pop'); dayLit(m.count); }
  }
  // The moment today starts to count, wherever the learner is: a short toast with the flame (a lesson summary shows its own flame
  // card instead, so the toast stays quiet there). Calm mode never gets here (statbarWanted).
  function dayLit(count) {
    if (doc.querySelector?.('.fd-flame')) return;
    const toast = h('div', { class: 'stat-toast', role: 'status' }, h('span', { class: 'stat-flame', 'aria-hidden': 'true' }),
      h('span', {}, h('strong', {}, count === 1 ? 'Day 1 of your streak!' : `${count} days in a row!`), ' Today counts.'));
    doc.body.append(toast);
    import('../audio/sfx.js').then((m) => { if (settings.get('soundEffects') !== false && settings.get('audioFree') !== true) m.sfx.play('streak'); }).catch(() => {});
    setTimeout(() => toast.remove(), 4200);
  }
  const off = store?.subscribe?.((key) => { if (key === STREAK_KEY || key === DAILY_GOAL_KEY || key === 'settings') refresh(); });
  const timer = setInterval(refresh, 30000); // the engine saves seconds every 10 s; the minute count follows within half a minute
  refresh();
  return { refresh, destroy() { clearInterval(timer); try { off?.(); } catch { /* ignore */ } bar.remove(); } };
}
