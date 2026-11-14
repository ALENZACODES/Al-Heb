// @ts-check
// Retention UI pieces that live inside other screens: the top-bar chips (streak flame, gems, hearts), the daily-goal
// ring on Home, the end-of-lesson reward panel, and the out-of-hearts gate. Text always sits beside every drawing.
import { h, confetti, setKids } from './dom.js';
import { GOALS, setGoal } from './xp.js';
import { xpGoal, streakText, count } from '../lib/counts.js';
import { gemsText, PRICES } from './gems.js';
import { REFILL_ROUTE, nextHeartInMs, refillByGems } from './hearts.js';
import { streakLine, STREAK } from './streak.js';
import { shouldAsk, answerAsk, reminderICS } from './notify.js';
import { showRimon } from './rimon.js';
import { recapLine } from './recap.js';
import { sayBriefly } from '../shell/transient.js';

const RING_R = 26, RING_C = 2 * Math.PI * RING_R;
const svg = (tag, attrs) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n; };

// ---------- top bar ----------
// The streak, gems and hearts counters live in ONE header group, the stat bar (src/shell/statbar.js), drawn on every page from
// src/lib/counts.js as soon as the page shows. This bar only adds the practice-league cup and the spoken status line, so no
// counter appears twice in the header and none waits for this module to load.
export function mountTopBar(R, g = globalThis) {
  const doc = g.document, header = doc.querySelector('.site-header');
  if (!header || header.querySelector('.ret-bar')) return;
  const live = h('p', { class: 'visually-hidden ret-live', role: 'status', 'aria-live': 'polite' });
  const bar = h('div', { class: 'ret-bar alef-retention', role: 'group', 'aria-label': 'Practice league' });
  header.append(bar, live);
  let sig = '';
  const draw = () => {
    try {
      if (R.calm() || !R.revealed()) { bar.hidden = true; sig = ''; return; }
      bar.hidden = false;
      const kids = [];
      const next = [R.leagueShown()].join('|');
      if (next === sig) return; // nothing changed: leave the chips (and any focus on them) alone
      sig = next;
      bar.hidden = !R.leagueShown();
      if (R.leagueShown()) kids.push(h('a', { class: 'ret-chip ret-league', href: '#/league', 'aria-label': 'Practice league' }, h('span', { class: 'ret-ico ret-ico-cup', 'aria-hidden': 'true' })));
      setKids(bar, kids);
    } catch { /* the bar is optional */ }
  };
  doc.addEventListener('alef:retention', draw);
  doc.addEventListener('alef:retention-say', (e) => { live.textContent = ''; g.setTimeout(() => sayBriefly(live, e.detail?.text || '', { ms: 6000, win: g }), 50); }); // I1: never left in the page text
  draw();
}

// ---------- daily-goal ring (Home) ----------
export function goalRingNode(R) {
  const wrap = h('section', { class: 'card ret-goal alef-retention', 'aria-labelledby': 'ret-goal-h' });
  let sig = '';
  const draw = () => {
    const rec = R.get(), p = xpGoal(rec), st = R.status();
    const next = JSON.stringify([p, st, rec.freezes, rec.gems.balance, R.streakShown(), R.weekDots().map((d) => d.state)]);
    if (next === sig) return; // unchanged: keep the open goal picker and the focus where they are
    sig = next;
    const wasOpen = wrap.querySelector('.ret-goal-pick')?.open === true, focusGoal = wrap.contains(document.activeElement) ? document.activeElement.getAttribute('data-goal') : null;
    // The ring, its text and the XP quest all draw p (src/lib/counts.js xpGoal): one quantity, one source (C-03).
    const ring = svg('svg', { class: 'ret-ring', viewBox: '0 0 64 64', width: 72, height: 72, 'aria-hidden': 'true', focusable: 'false', 'data-pct': p.pct });
    const offset = (RING_C * (1 - p.fraction)).toFixed(1);
    const fill = svg('circle', { class: `ret-ring-fill${p.done ? ' is-done' : ''}`, cx: 32, cy: 32, r: RING_R, 'stroke-dasharray': RING_C.toFixed(1), 'stroke-dashoffset': offset, transform: 'rotate(-90 32 32)' });
    try { fill.style.strokeDashoffset = offset; } catch { /* the attribute already holds it */ }
    ring.append(svg('circle', { class: 'ret-ring-track', cx: 32, cy: 32, r: RING_R }), fill);
    const picker = h('details', { class: 'ret-goal-pick' }, h('summary', {}, 'Change XP goal'),
      h('div', { class: 'row', role: 'group', 'aria-label': 'Daily XP goal' }, ...GOALS.map((gl) => h('button', { type: 'button', class: 'btn secondary', 'data-goal': gl.xp, 'aria-pressed': String(rec.goal === gl.xp), onclick: () => { R.update((r) => setGoal(r, gl.xp)); R.say(`Daily goal set to ${gl.xp} XP.`); } }, `${gl.label} · ${gl.xp} XP`))));
    setKids(wrap, 
      h('div', { class: 'ret-goal-row' }, ring,
        h('div', {}, h('h2', { id: 'ret-goal-h' }, 'Daily XP Goal'),
          h('p', { class: 'ret-goal-text', 'data-xp': p.xp, 'data-goal': p.goal }, p.text),
          R.streakShown() ? h('p', { class: 'muted' }, streakLine(st)) : null)),
      R.streakShown() ? stripNode(R) : null,
      h('div', { class: 'row ret-goal-actions' }, quick,
        st.repair ? h('a', { class: 'btn secondary', href: '#/shop' }, `Bring back your ${streakText(st.repair.prev)} (free)`) : null,
        R.streakShown() && !st.repair && rec.freezes.held < STREAK.freezeMax && rec.gems.balance >= PRICES.freeze ? h('a', { class: 'btn secondary', href: '#/shop' }, 'Get a streak freeze') : null),
      picker);
    wrap.setAttribute('data-state', st.state);
    if (wasOpen) picker.open = true;
    if (focusGoal) wrap.querySelector(`[data-goal="${focusGoal}"]`)?.focus({ preventScroll: true });
    if (st.state === 'freeze-used') R.freezeNoteShown();
  };
  // The low-friction start: the learner's next lesson in short parts. The link is filled in once the lesson list has loaded.
  const quick = h('a', { class: 'btn ret-quick', href: '#/learn' }, '3-minute lesson');
  nextLessonId(R.ctx).then((id) => { if (id) quick.setAttribute('href', `#/learn?lesson=${encodeURIComponent(id)}&quick=1`); }).catch(() => {});
  const on = () => { if (wrap.isConnected) { try { draw(); } catch { /* keep the last drawing */ } } else document.removeEventListener('alef:retention', on); };
  document.addEventListener('alef:retention', on);
  draw();
  return wrap;
}

const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOT_MARK = { done: '\u2713', freeze: '\u2744', travel: '\u2708', rest: '\u2022', today: '', open: '' };
/** Seven-day strip: a tick for a done day, a snowflake for a day a freeze covered. Every day also has its words for screen readers. */
function stripNode(R) {
  return h('ol', { class: 'ret-strip', 'aria-label': 'Your last seven days' }, ...R.weekDots().map((d) => h('li', { class: `ret-dot is-${d.state}`, 'aria-label': d.label },
    h('span', { class: 'ret-dot-mark', 'aria-hidden': 'true' }, DOT_MARK[d.state]), h('span', { class: 'ret-dot-day', 'aria-hidden': 'true' }, DAY_INITIAL[d.weekday]))));
}
/** The learner's next lesson id, from the same lesson list and progress the Learn screen uses. */
async function nextLessonId(ctx) {
  const [cur, act, nx] = await Promise.all([import('../curriculum/lessons.js'), import('../curriculum/state.js'), import('../home/nextlesson.js')]);
  const st = await act.loadState(ctx);
  return nx.nextLesson({ lessons: cur.lessons, done: Object.keys(st.completed || {}), goal: ctx.settings?.get?.('goal'), available: cur.available })?.id || null;
}
/** Download a daily calendar reminder (the fallback where a closed app cannot be reminded). */
export async function downloadReminder(R) {
  try { const { downloadICS } = await import('../curriculum/reminders.ics.js'); return downloadICS(reminderICS(R.get()), 'alef-rimon-reminder.ics'); } catch { return false; }
}
const onIphoneTab = (g = globalThis) => { try { const n = g.navigator, ua = String(n?.userAgent || ''); const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (n?.maxTouchPoints || 0) > 1); return ios && !(n?.standalone === true || g.matchMedia?.('(display-mode: standalone)')?.matches); } catch { return false; } };

// ---------- welcome back and weekly recap (Home) ----------
/** After a week or more away: a warm card with a refresher sized to the gap and a welcome-back reward. Gone once any XP is earned today. Never mentions a streak. */
export function comebackNode(R) {
  const wrap = h('section', { class: 'card ret-comeback alef-retention', 'aria-labelledby': 'ret-back-h' });
  const draw = () => {
    const c = R.comeback(); wrap.hidden = !c; if (!c || wrap.childNodes.length) return;
    const n = c.review || 5, gems = c.gems || 0;
    setKids(wrap, h('h2', { id: 'ret-back-h' }, 'Welcome Back'),
      h('p', {}, `Good to see you. Your hearts are full, and nothing you learned is lost. Here is a short warm-up of ${n} old cards, sized to the time away.`),
      gems ? h('p', {}, `+${gemsText(gems)}.`) : null,
      h('div', { class: 'row' }, h('a', { class: 'btn', href: c.href || '#/learn?review=1' }, `Warm up with ${n} old words`), h('a', { class: 'btn secondary', href: '#/learn' }, 'Go to lessons')));
  };
  const on = () => { if (wrap.isConnected) { try { draw(); } catch { /* keep */ } } else document.removeEventListener('alef:retention', on); };
  document.addEventListener('alef:retention', on); draw();
  return wrap;
}
/** From Sunday: last week in one card, with a bar for each day and the same numbers in words. */
export function recapNode(R) {
  const w = R.recap(); if (!w) return null;
  const max = Math.max(1, ...w.bars.map((b) => b.xp));
  const card = h('section', { class: 'card ret-recap alef-retention', 'aria-labelledby': 'ret-recap-h' },
    h('h2', { id: 'ret-recap-h' }, 'Your Last Week'),
    h('p', {}, recapLine(w)),
    h('ol', { class: 'ret-bars', 'aria-label': 'XP for each day of last week' }, ...w.bars.map((b) => h('li', { 'aria-label': `${b.name}: ${b.xp} XP` },
      h('span', { class: 'ret-bar-fill', 'aria-hidden': 'true', style: `--h:${Math.round((b.xp / max) * 100)}` }), h('span', { class: 'ret-bar-num', 'aria-hidden': 'true' }, String(b.xp)), h('span', { class: 'ret-bar-day', 'aria-hidden': 'true' }, b.name.slice(0, 2))))),
    h('button', { type: 'button', class: 'btn secondary', onclick: () => { R.recapSeen(); card.remove(); document.querySelector('.ret-goal h2')?.focus?.(); } }, 'Got it'));
  return card;
}

// ---------- daily quests (Home) ----------
export function questsNode(R) {
  const wrap = h('section', { class: 'card ret-quests alef-retention', 'aria-labelledby': 'ret-quests-h' });
  let sig = '';
  const draw = () => {
    const v = R.questView(), next = JSON.stringify(v);
    if (next === sig) return; sig = next;
    wrap.hidden = !v.on;
    setKids(wrap, h('h2', { id: 'ret-quests-h' }, "Today's Quests"),
      v.rest ? h('p', {}, 'A rest day. No quests today.')
        : h('ul', { class: 'ret-quest-list' }, ...v.items.map((q) => h('li', { class: q.done ? 'is-done' : '' },
          h('span', { class: 'ret-quest-mark', 'aria-hidden': 'true' }, q.done ? '\u2713' : ''), h('span', { class: 'ret-quest-text' }, q.text),
          h('span', { class: 'ret-quest-count', 'data-p': q.p, 'data-n': q.n }, q.done ? 'Done, +5 gems' : `${q.p} of ${q.n}`)))),
      v.rest ? null : h('p', { class: 'muted' }, v.chest ? 'All three done. +10 gems. New quests tomorrow.' : `Finish all three for ${gemsText(10)} more.`));
  };
  const on = () => { if (wrap.isConnected) { try { draw(); } catch { /* keep the last drawing */ } } else document.removeEventListener('alef:retention', on); };
  document.addEventListener('alef:retention', on);
  draw();
  return wrap;
}

// ---------- the month's challenge (Home) ----------
export function monthNode(R) {
  const wrap = h('section', { class: 'card ret-month alef-retention', 'aria-labelledby': 'ret-month-h' });
  let sig = '';
  const draw = () => {
    const v = R.monthView(), next = JSON.stringify(v);
    if (next === sig) return; sig = next;
    wrap.hidden = !v.on;
    const pct = Math.round(v.fraction * 100);
    setKids(wrap, h('h2', { id: 'ret-month-h' }, v.title, v.he ? ' ' : null, v.he ? h('span', { lang: 'he', dir: 'rtl', class: 'he' }, v.he) : null),
      h('div', { class: 'ret-month-bar', role: 'progressbar', 'aria-label': v.title, 'aria-valuemin': '0', 'aria-valuemax': String(v.target), 'aria-valuenow': String(v.xp), 'aria-valuetext': `${v.xp} of ${v.target} XP` }, h('span', { style: `--w:${pct}` })),
      h('p', {}, v.done ? `Done: ${v.target} XP this month. +${gemsText(50)}.` : `${v.xp} of ${v.target} XP. ${v.daysLeft === 0 ? 'Last day of the month.' : `${count(v.daysLeft, 'day')} left.`}`),
      v.season ? h('p', { class: 'ret-season-text' }, v.season.text) : null,
      v.season?.items?.length ? h('ul', { class: 'ret-season-list', 'aria-label': 'Here this season' }, ...v.season.items.map((it) => h('li', {}, h('a', { href: it.href }, it.title)))) : null);
  };
  const on = () => { if (wrap.isConnected) { try { draw(); } catch { /* keep the last drawing */ } } else document.removeEventListener('alef:retention', on); };
  document.addEventListener('alef:retention', on);
  draw();
  return wrap;
}

// ---------- expeditions (Home) ----------
export function expeditionNode(R) {
  const wrap = h('section', { class: 'card ret-expedition alef-retention', 'aria-labelledby': 'ret-exp-h' });
  let sig = '';
  const draw = () => {
    const v = R.expeditionView(), next = JSON.stringify(v);
    if (next === sig) return; sig = next;
    wrap.hidden = !v.on;
    setKids(wrap, h('h2', { id: 'ret-exp-h' }, v.title || 'Expedition'),
      h('p', {}, v.text),
      h('ol', { class: 'ret-exp-map', 'aria-label': 'Expedition map, one stop for each day' }, ...v.stops.map((s) => {
        const label = s.state === 'done' ? `${s.name}: done` : s.state === 'rest' ? `${s.name}: rest` : s.state === 'today' ? `${s.name}: today` : s.state === 'miss' ? `${s.name}: not this day` : `${s.name}: coming up`;
        return h('li', { class: 'is-' + s.state, 'aria-label': label }, h('span', { class: 'ret-exp-dot', 'aria-hidden': 'true' }), h('span', { class: 'ret-exp-day', 'aria-hidden': 'true' }, s.name));
      })),
      h('p', {}, v.need),
      v.paid ? null : h('p', { class: 'muted' }, `${v.doneCount} of ${v.needCount} study days done. Finish the journey for ${gemsText(40)} more.`));
  };
  const on = () => { if (wrap.isConnected) { try { draw(); } catch { /* keep the last drawing */ } } else document.removeEventListener('alef:retention', on); };
  document.addEventListener('alef:retention', on);
  draw();
  return wrap;
}

// ---------- login calendar (Home): days the app was opened this civil month, including the gaps ----------
export function loginNode(R) {
  const wrap = h('section', { class: 'card ret-login alef-retention', 'aria-labelledby': 'ret-login-h' });
  let sig = '';
  const draw = () => {
    const v = R.loginView(), next = JSON.stringify(v);
    if (next === sig) return; sig = next;
    const pads = Array.from({ length: v.weekday0 }, () => h('li', { class: 'is-pad', 'aria-hidden': 'true' }));
    const nextNeed = v.count >= v.days ? (v.paid.includes('month') ? 'Every day this month is marked.' : '') : v.count >= 14 ? `Open Aleph on every day this month for ${gemsText(v.gemsMonth)}.` : v.count >= 7 ? `${v.count} of 14 days opened. 14 days this month: ${gemsText(v.gems14)}.` : `${v.count} of 7 days opened this month. 7 days: ${gemsText(v.gems7)}.`;
    setKids(wrap, h('h2', { id: 'ret-login-h' }, 'Days you opened Aleph'),
      h('p', {}, 'This calendar marks days you opened the app, including the gaps. It is not your streak.'),
      h('ol', { class: 'ret-login-grid', 'aria-label': 'Days you opened Aleph this month' }, ...pads, ...v.cells.map((c) => {
        const label = c.state === 'on' || c.state === 'today-on' ? `${c.day}: opened` : c.state === 'today' ? `${c.day}: today, not opened yet` : c.state === 'gap' ? `${c.day}: not opened` : `${c.day}: coming up`;
        return h('li', { class: 'is-' + c.state, 'aria-label': label }, h('span', { 'aria-hidden': 'true' }, String(c.n)));
      })),
      h('p', { class: 'muted' }, nextNeed));
  };
  const on = () => { if (wrap.isConnected) { try { draw(); } catch { /* keep the last drawing */ } } else document.removeEventListener('alef:retention', on); };
  document.addEventListener('alef:retention', on);
  draw();
  return wrap;
}

// ---------- out of hearts ----------
const hm = (ms) => { const m = Math.ceil(ms / 60000); return `${Math.floor(m / 60)} h ${m % 60} min`; };
/** The block shown instead of "Next lesson" when hearts are gone, and as the gate on a new lesson. */
export function heartsBlock(R, { gate = false } = {}) {
  const rec = R.get(), wait = nextHeartInMs(rec);
  const refill = rec.gems.balance >= PRICES.hearts ? h('button', { type: 'button', class: 'btn secondary', onclick: () => {
    const out = refillByGems(R.get()); if (!out.ok) return;
    R.update(() => out.rec); R.say('Hearts full. Off you go!'); showRimon('hearts_refilled');
    if (gate) globalThis.location.reload(); else box.replaceChildren(h('p', { role: 'status' }, 'Hearts full. Off you go!'));
  } }, `Refill all hearts for ${gemsText(PRICES.hearts)}`) : null;
  const box = h('section', { class: 'card ret-hearts-out alef-retention', 'aria-labelledby': 'ret-out-h' },
    h(gate ? 'h1' : 'h3', { id: gate ? 'view-title' : 'ret-out-h', tabindex: '-1' }, 'Out of hearts for now'),
    h('p', {}, 'Practice a few old words to earn one back.'),
    h('div', { class: 'row' }, h('a', { class: 'btn', href: REFILL_ROUTE }, 'Practice to earn a heart'), refill),
    wait ? h('p', { class: 'muted' }, `Next heart in ${hm(wait)}.`) : null,
    h('p', { class: 'muted' }, 'Review is always open. Practicing old words is how memory sticks.'));
  if (gate) box.setAttribute('aria-labelledby', 'view-title');
  return box;
}

// ---------- route hook ----------
export function routeShown(R, g = globalThis, gate = false) {
  const doc = g.document, main = doc.getElementById('main');
  if (!main || R.calm()) return;
  if (gate) {
    // Old material is always open: a lesson the learner already finished is never gated, only a new one.
    const hash = g.location.hash, id = (/[?&]lesson=([^&]+)/.exec(hash) || [])[1];
    const shut = () => { if (g.location.hash !== hash) return; main.replaceChildren(heartsBlock(R, { gate: true })); showRimon('hearts_empty'); };
    import('../curriculum/state.js').then((m) => m.loadState(R.ctx)).then((st) => { if (st?.completed?.[decodeURIComponent(id || '')]) R.admit(hash); else shut(); }).catch(shut);
    return;
  }
  if (doc.body.dataset.route === 'home' && !main.querySelector('.ret-goal') && R.revealed()) {
    const head = main.querySelector('.stack > header') || main.querySelector('header');
    const ring = goalRingNode(R);
    if (head?.parentNode) head.parentNode.insertBefore(ring, head.nextSibling); else main.prepend(ring);
    const quests = questsNode(R); ring.after(quests); const month = monthNode(R); quests.after(month); const exp = expeditionNode(R); month.after(exp); exp.after(loginNode(R));
    const back = comebackNode(R); ring.before(back);
    const recap = recapNode(R); if (recap) ring.before(recap); // welcome first, then last week, then today's goal
    // Once a day, in the evening, Rimon looks a little worried about an unfinished streak day. Never on a rest day.
    const st = R.status(), today = new Date().toDateString();
    if (st.state === 'at-risk' && R.streakShown() && R.get().lastRiskDay !== today) { R.update((r) => { r.lastRiskDay = today; return r; }); g.setTimeout(() => showRimon('streak_at_risk'), 3000); }
  }
}

// ---------- end-of-lesson reward ----------
const NEW = {
  quests: ['Daily quests are open.', 'Three small goals wait on Home each day, with a few gems for each.', '#/', 'See today\u2019s quests'],
  expeditions: ['Expeditions are open.', 'A seven-day journey with a map waits on Home, with a finish line at the end.', '#/', 'See today\u2019s expedition'],
  hearts: ['Hearts are on.', 'You have 5. A wrong first answer in a lesson costs one, and practicing old words wins it back. You can switch hearts off in the shop.', '#/shop', 'Open the shop'],
  league: ['The practice league is open.', 'See how your week compares. The other players are pretend, and the page says so.', '#/league', 'See the league'],
};
/** One short introduction the first time a part of the system opens, so nothing new appears unexplained. */
function whatsNew(list) {
  if (!list || !list.length) return null;
  return h('section', { class: 'card ret-new', 'aria-labelledby': 'ret-new-h' }, h('h3', { id: 'ret-new-h' }, 'New for You'),
    ...list.filter((k) => NEW[k]).map((k) => h('p', {}, h('strong', {}, NEW[k][0]), ' ', NEW[k][1], ' ', h('a', { href: NEW[k][2] }, NEW[k][3]))));
}
/** A milestone is worth telling someone: the phone's own share sheet, or the clipboard where there is none. Only ever from a tap. */
function shareButton(count, g = globalThis) {
  const status = h('span', { role: 'status', class: 'ret-share-status' });
  const text = `I am on a ${count}-day Hebrew streak with Aleph.`, url = (() => { try { return g.location.origin + g.location.pathname; } catch { return ''; } })();
  return h('p', { class: 'ret-share' }, h('button', { type: 'button', class: 'btn secondary', onclick: async () => {
    try { if (g.navigator?.share) { await g.navigator.share({ text, url }); status.textContent = ''; return; } await g.navigator.clipboard.writeText(`${text} ${url}`.trim()); status.textContent = ' Copied. Paste it anywhere.'; }
    catch (e) { status.textContent = e && e.name === 'AbortError' ? '' : ' Sharing is not available in this browser.'; }
  } }, 'Share your streak'), status);
}
function optInCard(R) {
  if (onIphoneTab()) {
    const card = h('section', { class: 'card ret-optin', 'aria-labelledby': 'ret-optin-h' }, h('h3', { id: 'ret-optin-h' }, 'Want a nudge from Rimon?'),
      h('p', {}, 'On iPhone, add Aleph to your Home Screen to get reminders, or add a daily reminder to your calendar.'),
      h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/install' }, 'How to add'),
        h('button', { type: 'button', class: 'btn secondary', onclick: async () => { await downloadReminder(R); R.update((r) => answerAsk(r, 'later')); } }, 'Add to calendar'),
        h('button', { type: 'button', class: 'btn secondary', onclick: () => { R.update((r) => answerAsk(r, 'later')); card.remove(); } }, 'Not now')));
    return card;
  }
  const tone = (v, label, checked) => h('label', { class: 'ret-radio' }, h('input', { type: 'radio', name: 'ret-tone', value: v, checked }), ' ', label);
  const status = h('p', { role: 'status', class: 'muted' });
  const card = h('section', { class: 'card ret-optin', 'aria-labelledby': 'ret-optin-h' },
    h('h3', { id: 'ret-optin-h' }, 'Want a nudge from Rimon?'),
    h('p', {}, "Rimon can send one short reminder on days you haven't practiced. Never on Shabbat or holidays."),
    h('fieldset', { class: 'ret-tone' }, h('legend', {}, 'Tone'), tone('kind', 'Kind Rimon: gentle reminders', true), tone('playful', 'Playful Rimon: gentle, then teasing jokes (for adults)', false)),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', onclick: async () => {
        const picked = card.querySelector('input[name="ret-tone"]:checked')?.value || 'kind';
        const p = await R.turnOnReminders(picked);
        status.textContent = p === 'granted' ? 'Reminders are on. They only arrive while Aleph is open on this device, or on Android with Aleph installed.'
          : p === 'unsupported' ? 'This browser cannot show reminders. On iPhone, add Aleph to your Home Screen first.' : 'No problem. You can turn reminders on later in the shop.';
        card.querySelector('.row')?.remove();
      } }, 'Yes, remind me'),
      h('button', { type: 'button', class: 'btn secondary', onclick: () => { R.update((r) => answerAsk(r, 'later')); card.remove(); } }, 'Not now')),
    status);
  return card;
}
/** Insert the reward panel into the lesson's end card: XP (final value, no count-up), confetti, goal, streak, gems, and Rimon. */
export function showReward(R, out, g = globalThis) {
  if (out.calm) return;
  const doc = g.document;
  const place = (tries = 0) => {
    const card = doc.querySelector('.alef-summary');
    if (!card) { if (tries < 20) g.setTimeout(() => place(tries + 1), 50); return; }
    if (card.querySelector('.ret-reward')) return;
    // Today's total is drawn once, at its final value (src/lib/counts.js xpToday after this lesson): a count-up showed two values of
    // the same number on one screen (C-03), so only the XP chip moves.
    const total = h('strong', { class: 'ret-total' }, String(out.todayAfter));
    const lines = [];
    if (out.parts.accuracy) lines.push(`Sharp lesson bonus: +${out.parts.accuracy} XP`);
    if (out.parts.combo) lines.push(`Combo bonus: +${out.parts.combo} XP`);
    if (out.goalCrossed) lines.push('Daily goal reached!');
    if (out.streak.grew) lines.push(out.streak.milestone ? `${out.streak.count}-day streak! A milestone.` : `${out.streak.count}-day streak!`);
    for (const q of out.quests || []) lines.push(`Quest done: ${q}`);
    if (out.chest) lines.push('All three quests done!');
    if (out.month) lines.push(`${out.month} complete!`);
    if (out.gems) lines.push(`+${gemsText(out.gems)}`);
    if (out.league) lines.push(`Practice league: number ${out.league.rank} of 30 in ${out.league.tier}.${out.league.toPromote ? ` ${out.league.toPromote} XP to the move-up line.` : ' You are above the move-up line.'}`);
    const sentence = `Lesson finished. ${out.xp} XP.${out.goalCrossed ? ' Daily goal reached.' : ''}${out.streak.grew ? ` ${out.streak.count}-day streak.` : ''}${out.gems ? ` ${gemsText(out.gems)} earned.` : ''}`;
    const panel = h('section', { class: 'ret-reward alef-retention', 'aria-label': 'Your reward' },
      out.goalCrossed || out.streak.milestone ? confetti() : null,
      h('p', { class: 'ret-xp-chip' }, `+${out.xp} XP`),
      h('p', { class: 'ret-today' }, total, ` of ${out.goal} XP today`),
      lines.length ? h('ul', { class: 'ret-reward-lines' }, ...lines.map((t) => h('li', {}, t))) : null,
      h('p', { class: 'visually-hidden', role: 'status' }, sentence));
    const anchor = card.querySelector('.alef-celebrate-cheer');
    if (anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling); else card.prepend(panel);

    if (out.heartsEmpty) {
      const next = card.querySelector('.alef-next-primary'); if (next) { next.hidden = true; next.setAttribute('hidden', ''); }
      (card.querySelector('.alef-summary-actions') || card).before(heartsBlock(R));
      g.setTimeout(() => showRimon('hearts_empty'), 2400);
    }
    if (out.streak.milestone) panel.append(shareButton(out.streak.count, g));
    const fresh = whatsNew(out.unlocked); if (fresh) card.append(fresh);
    if (shouldAsk(R.get(), { calm: R.calm() })) { card.append(optInCard(R)); }
    // Rimon: the lesson cheer already fired; follow with the goal or the streak, spaced so they queue.
    if (out.goalCrossed) g.setTimeout(() => showRimon('daily_goal'), 1200);
    if (out.streak.grew) g.setTimeout(() => showRimon(out.streak.milestone ? 'streak_milestone' : 'streak_extended'), out.goalCrossed ? 3200 : 1200);
  };
  place();
}
/** The 3-minute lesson's stopping point: a small reward card at the top of the lesson. The lesson's place is already saved. */
export function showQuickDone(R, out, g = globalThis) {
  // The card sits in <main> above the lesson, not inside it: the lesson player redraws its own article on every part.
  const doc = g.document, page = doc.getElementById('main');
  if (!page || out.calm || page.querySelector('.ret-quick-done')) return;
  const total = h('strong', { class: 'ret-total' }, String(out.todayAfter)); // final value only, as on the lesson's end card
  const card = h('section', { class: 'ret-reward ret-quick-done alef-retention', 'aria-labelledby': 'ret-quick-h' },
    out.goalCrossed || out.streak.milestone ? confetti() : null,
    h('h2', { id: 'ret-quick-h', tabindex: '-1' }, 'Three Minutes Done'),
    h('p', { class: 'ret-xp-chip' }, `+${out.xp} XP`),
    h('p', { class: 'ret-today' }, total, ` of ${out.goal} XP today`),
    h('p', { role: 'status' }, `${out.streak.grew ? `${out.streak.count}-day streak! ` : ''}${out.goalCrossed ? 'Daily goal reached! ' : ''}${out.gems ? `+${gemsText(out.gems)}. ` : ''}Your place is saved.`),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => card.remove() }, 'Keep going'), h('a', { class: 'btn secondary', href: '#/' }, 'Done for today')));
  page.prepend(card);
  try { g.scrollTo?.(0, 0); card.querySelector('h2')?.focus({ preventScroll: true }); } catch { /* optional */ }
  g.setTimeout(() => showRimon(out.goalCrossed ? 'daily_goal' : out.streak.grew ? (out.streak.milestone ? 'streak_milestone' : 'streak_extended') : 'xp_payout'), 600);
}
