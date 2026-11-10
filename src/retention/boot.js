// @ts-check
// Retention controller: wires the pure modules to the running app. Loaded lazily after first paint by
// src/shell/boot-hooks.js (armRetention); nothing here is in the first-install precache. Every listener is wrapped so
// a fault in retention can never break a lesson.
import { projectStreak, normalizeRecord } from '../curriculum/streak.js';
import { calmOn, streakVisible } from '../shell/comfort.js';
import { load, save, RETENTION_KEY } from './state.js';
import { dayKey, deviceZone, localAt, addDaysISO } from './clock.js';
import { applyRollover, completeLessonDay, afterDayCompleted, streakStatus } from './streak.js';
import { award, lessonPayout, todayXp, XP } from './xp.js';
import { heartsOn, loseHeart, practiceCard, refillByTime, startLesson, canStartLesson, isLessonHash, heartCount } from './hearts.js';
import { settle, leagueOn } from './leagues.js';
import { logSession, createScheduler, readShown, recordSent, registerPeriodicSync, daysAway } from './notify.js';
import { restNow } from './quiet.js';
import { showRimon } from './rimon.js';

const STREAK_KEY = 'streak';
let api = null;

/** The shared controller for this page (created on first use). @param {{store:any, settings?:any}} ctx */
export function retention(ctx, g = globalThis) {
  if (api) return api;
  const store = ctx.store, doc = g.document;
  const combo = { run: 0, max: 0 };
  let lessonHash = null, lastTouch = 0, quietOpt = { loc: null, mode: 'reform' }, scheduler = null, muteStreakSub = false, lastCount = 0, seq = 0;
  const now = () => Date.now();
  const get = () => refillByTime(load(store, now()), now());
  const update = (fn) => { const r = save(store, fn, now()); emit(); return r; };
  const streakRaw = () => { try { return store.get(STREAK_KEY) ?? null; } catch { return null; } };
  const calm = () => calmOn(ctx);
  const emit = () => { try { doc.dispatchEvent(new CustomEvent('alef:retention')); } catch { /* no listeners */ } };
  const say = (text) => { try { doc.dispatchEvent(new CustomEvent('alef:retention-say', { detail: { text } })); } catch { /* optional */ } };
  const opts = () => ({ calm: calm(), hash: g.location?.hash || '' });
  const later = (fn, ms) => g.setTimeout(() => { try { fn(); } catch { /* Rimon is optional */ } }, ms);

  function rollover() {
    const t = now(), raw = streakRaw();
    const out = applyRollover(raw, load(store, t), t, { tz: deviceZone() });
    const s = settle(out.ret, t);
    if (out.streak !== raw && out.streak) { muteStreakSub = true; try { store.set(STREAK_KEY, out.streak); } finally { muteStreakSub = false; } }
    update(() => refillByTime(s.rec, t));
    lastCount = projectStreak(streakRaw(), t).count;
    quietOpt.mode = normalizeRecord(streakRaw()).mode;
    return { events: out.events, result: s.result };
  }
  function touch() { const t = now(); if (t - lastTouch < 60000) return; lastTouch = t; update((r) => logSession(r, t)); scheduler?.arm(); }

  /** A lesson's end card appeared. Returns what to show, or null when this finish was already paid. */
  function lessonFinished(detail = {}) {
    const t = now(), rec = load(store, t), before = streakRaw();
    const awardId = `lesson|${g.location?.hash || ''}|${detail.ms ?? ''}|${dayKey(t)}`;
    const todayBefore = todayXp(rec, t);
    const pay = lessonPayout(rec, { awardId, accuracy: Number(detail.accuracy) || 0, maxCombo: combo.max, now: t });
    if (pay.duplicate) return null;
    const after = completeLessonDay(before, t);
    muteStreakSub = true; try { store.set(STREAK_KEY, after); } finally { muteStreakSub = false; }
    const st = afterDayCompleted(before, after, pay.rec, t);
    const saved = update(() => logSession(startLesson(st.rec), t));
    lastTouch = t; lastCount = st.count; combo.run = 0; combo.max = 0; lessonHash = null;
    scheduler?.arm();
    return { xp: pay.xp, parts: pay.parts, gems: pay.gems + st.gems, goalCrossed: pay.goalCrossed, first: pay.first, todayBefore, todayAfter: todayXp(saved, t), goal: saved.goal,
      streak: { count: st.count, grew: st.grew, milestone: st.milestone }, heartsEmpty: heartsOn(saved, { calm: calm() }) && heartCount(saved, t) <= 0, calm: calm() };
  }
  function answered(detail = {}) {
    const hash = g.location?.hash || '';
    if (!/^#\/learn/.test(hash) || /[?&]review=1/.test(hash)) return;
    touch();
    if (detail.action === 'correct') { combo.run += 1; combo.max = Math.max(combo.max, combo.run); return; }
    combo.run = 0;
    const rec = get();
    if (detail.retry || !heartsOn(rec, opts())) return;
    const qid = detail.questionId ?? doc.querySelector('.alef-ex-card')?.getAttribute('data-ex') ?? `q${++seq}`;
    const out = loseHeart(rec, `${hash}|${qid}`, now());
    if (!out.lost) return;
    update(() => out.rec);
    if (out.left === 0) say('Out of hearts for now. You can still finish this lesson.');
    else if (out.left === 1) { say('One heart left. Take your time.'); later(() => showRimon('heart_last'), 900); }
    else { say("Oops, one heart. You've got this."); later(() => showRimon('heart_lost'), 900); }
  }
  function reviewRated(detail = {}) {
    const t = now(); touch();
    let res = award(get(), { awardId: `review|${t}|${++seq}`, kind: 'review', amount: XP.review, now: t });
    const p = practiceCard(res.rec, Number(detail.rating) >= 3, t); let rec = p.rec;
    if (p.roundDone && p.xpEarned) rec = award(rec, { awardId: `refill|${t}|${seq}`, kind: 'refill', amount: XP.refillRound, now: t }).rec;
    update(() => rec);
    if (p.heartBack && heartsOn(rec, { calm: calm() })) { say('+1 heart! Memory, meet muscle.'); showRimon('heart_back'); }
    if (res.goalCrossed) goalReached();
  }
  function gameFinished(detail = {}) {
    if (!(Number(detail.stars) >= 1)) return;
    const t = now(); const res = award(get(), { awardId: `game|${t}|${++seq}`, kind: 'game', amount: XP.game, now: t });
    update(() => logSession(res.rec, t));
    if (res.goalCrossed) goalReached();
  }
  function goalReached() { if (calm()) return; say('Daily goal reached!'); later(() => showRimon('daily_goal'), 500); }
  /** The engagement timer (5 minutes of study) can also complete the day: celebrate and pay milestones for that path too. */
  function streakChanged(value) {
    if (muteStreakSub) return;
    const t = now(), p = projectStreak(value, t);
    if (p.count > lastCount && p.activeToday) {
      const st = afterDayCompleted({ count: lastCount, last: null }, value, load(store, t), t);
      if (st.rec) update(() => st.rec);
      if (!calm()) showRimon(st.milestone ? 'streak_milestone' : 'streak_extended');
    }
    lastCount = p.count; emit();
  }
  /** A page was shown. Gate a NEW lesson at zero hearts; a lesson already under way is never interrupted. */
  function routeShown() {
    const hash = g.location?.hash || '';
    if (!isLessonHash(hash)) { lessonHash = null; return { gate: false }; }
    if (hash === lessonHash) return { gate: false };
    const rec = get();
    if (!canStartLesson(rec, opts(), now())) return { gate: true };
    lessonHash = hash; combo.run = 0; combo.max = 0; update((r) => startLesson(r));
    return { gate: false };
  }
  async function armNotifications() {
    try {
      const N = await import('../shell/notify.js');
      try { quietOpt.loc = await N.resolveQuietLocation(ctx); } catch { quietOpt.loc = null; }
      const shown = await readShown(g);
      if (shown.length) update((r) => shown.reduce((acc, s) => (acc.notify.sent.some((x) => x.id === s.id && x.at === s.at) ? acc : recordSent(acc, s.id, s.at)), r));
      scheduler?.stop();
      scheduler = createScheduler({
        load: () => load(store, now()), save: (fn) => save(store, fn, now()),
        streak: () => projectStreak(streakRaw(), now()),
        show: (title, body, o) => N.showNow(title, body, o),
        opt: () => ({ ...quietOpt, calm: calm(), leagueDone: (() => { const r = load(store, now()); return r.league.joined && r.league.settled === r.league.weekId; })() }),
        g,
      });
      scheduler.arm();
    } catch { /* reminders are optional */ }
  }
  /** Called from a click: asks the browser, saves the answer, arms the timer. Resolves to 'granted' | 'denied' | 'default' | 'unsupported'. */
  async function turnOnReminders(tone = 'kind') {
    const N = await import('../shell/notify.js');
    const p = await N.requestPermission(g);
    const { answerAsk } = await import('./notify.js');
    if (p === 'granted') { update((r) => answerAsk(r, 'yes', tone)); const ok = await registerPeriodicSync(g); if (ok) update((r) => { r.notify.periodicSync = true; return r; }); await armNotifications(); }
    else if (p === 'denied') update((r) => answerAsk(r, 'denied'));
    else update((r) => answerAsk(r, 'later'));
    return p;
  }

  api = { get, update, streakRaw, calm, rollover, lessonFinished, answered, reviewRated, gameFinished, streakChanged, routeShown, armNotifications, turnOnReminders,
    status: () => streakStatus(streakRaw(), get(), now()), streakShown: () => streakVisible(ctx), heartsShown: () => heartsOn(get(), { calm: calm() }), leagueShown: () => leagueOn(get(), { calm: calm() }),
    setStreak: (v) => { muteStreakSub = true; try { store.set(STREAK_KEY, v); } finally { muteStreakSub = false; } lastCount = projectStreak(v, now()).count; emit(); },
    rearm: () => scheduler?.arm(), quietOpt: () => quietOpt, say, ctx };
  return api;
}

/** Boot hook: roll the day over, mount the top bar, listen for lesson events, arm reminders. Safe to call once per page. */
export async function armRetention(ctx, g = globalThis) {
  if (g.__alefRetentionArmed) return retention(ctx, g);
  g.__alefRetentionArmed = true;
  const doc = g.document, R = retention(ctx, g);
  const safe = (fn) => (...a) => { try { return fn(...a); } catch (e) { try { console.warn('retention', e); } catch { /* ignore */ } } };
  try { const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./retention.css', import.meta.url).href; doc.head.append(link); } catch { /* unstyled is still usable */ }
  const first = R.rollover();
  const UI = await import('./ui.js');
  UI.mountTopBar(R, g);
  const onReady = safe(() => { const { gate } = R.routeShown(); UI.routeShown(R, g, gate); });
  doc.addEventListener('alef:ready', onReady);
  doc.addEventListener('alef:celebrate', safe((e) => { if (e.detail?.kind !== 'lesson') return; const out = R.lessonFinished(e.detail); if (out) UI.showReward(R, out, g); }));
  doc.addEventListener('alef:rimon', safe((e) => { const d = e.detail || {}; if (!d.retention && (d.action === 'correct' || d.action === 'wrong')) R.answered(d); }));
  doc.addEventListener('alef:review-rated', safe((e) => R.reviewRated(e.detail || {})));
  doc.addEventListener('alef:game-finished', safe((e) => R.gameFinished(e.detail || {})));
  doc.addEventListener('visibilitychange', safe(() => { if (!doc.hidden) { R.rollover(); R.rearm(); } }));
  try { ctx.store.subscribe?.(safe((key, value) => { if (key === 'streak') R.streakChanged(value); else if (key === RETENTION_KEY) doc.dispatchEvent(new CustomEvent('alef:retention')); })); } catch { /* no live updates */ }
  try { ctx.settings?.subscribe?.(safe(() => doc.dispatchEvent(new CustomEvent('alef:retention')))); } catch { /* ignore */ }
  const midnight = () => { const t = Date.now(); g.setTimeout(safe(() => { R.rollover(); midnight(); }), Math.max(1000, localAt(addDaysISO(dayKey(t), 1), 0) - t + 5000)); };
  midnight();
  if (doc.body?.dataset?.ready === '1') onReady();
  // One greeting a day, a moment after Rimon's own hello.
  safe(() => {
    const t = Date.now(), rec = R.get(), today = dayKey(t);
    if (rec.lastBootDay === today || R.calm()) return;
    const away = daysAway(rec, t, R.quietOpt().mode), rest = restNow(t, R.quietOpt());
    const pick = first.events.includes('freeze_used') ? 'freeze_used' : first.events.includes('streak_broken') ? 'streak_broken' : rest === 'shabbat' ? 'shabbat' : rest === 'yomtov' ? 'chag'
      : away >= 3 ? 'welcome_back' : new Date(t).getDay() === 0 ? 'shavua_tov' : null;
    R.update((r) => { r.lastBootDay = today; return r; });
    if (pick) g.setTimeout(safe(() => showRimon(pick)), 2600);
  })();
  R.armNotifications();
  return R;
}
