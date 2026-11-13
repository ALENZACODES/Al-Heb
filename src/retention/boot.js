// @ts-check
// Retention controller: wires the pure modules to the running app. Loaded lazily after first paint by
// src/shell/boot-hooks.js (armRetention); nothing here is in the first-install precache. Every listener is wrapped so
// a fault in retention can never break a lesson.
import { projectStreak, normalizeRecord } from '../curriculum/streak.js';
import { calmOn, streakVisible } from '../shell/comfort.js';
import { load, save, RETENTION_KEY } from './state.js';
import { dayKey, deviceZone, localAt, addDaysISO } from './clock.js';
import { applyRollover, completeLessonDay, afterDayCompleted, streakStatus, weekDots, freezeNoteSeen, freezeNoteShown as markFreezeNote } from './streak.js';
import { award, lessonPayout, todayXp, XP, lessonAward, unlockedBy, grantMysteries, MYSTERIES } from './xp.js';
import { applyShopLook, grantEarnedOutfits } from './gems.js';
import { heartsOn, loseHeart, practiceCard, refillByTime, startLesson, canStartLesson, isLessonHash, heartCount, HEARTS } from './hearts.js';
import { settle, leagueOn, leagueView } from './leagues.js';
import { logSession, createScheduler, readShown, recordSent, registerPeriodicSync, daysAway } from './notify.js';
import { restNow } from './quiet.js';
import { showRimon } from './rimon.js';
import { questProgress, questView, questsOn, expeditionProgress, expeditionView, expeditionOn } from './quests.js';
import { monthProgress, monthView } from './month.js';
import { welcomeBack, isComebackDay, recapDue, recapSeen, lastWeek, markLogin, loginView, comebackView } from './recap.js';
import { read as readCounts, xpToday, lessonsFinished, lessonsFinishedToday, weekDays } from '../lib/counts.js';

const STREAK_KEY = 'streak';
let api = null;

/** The shared controller for this page (created on first use). @param {{store:any, settings?:any}} ctx */
export function retention(ctx, g = globalThis) {
  if (api) return api;
  const store = ctx.store, doc = g.document;
  const combo = { run: 0, max: 0 };
  const QUICK_PARTS = 4; // parts of a lesson (about three minutes) that make one quick session
  const quick = { hash: null, parts: 0 }; let freezeNoteShown = false;
  let lessonHash = null, lastTouch = 0, quietOpt = { loc: null, mode: 'reform' }, scheduler = null, muteStreakSub = false, lastCount = 0, seq = 0;
  const now = () => Date.now();
  // lessonsFinished never reads lower than the lessons Learn and Progress count (src/lib/counts.js), so the unlock gates and
  // every "lessons finished" line agree.
  const synced = (r) => { const n = lessonsFinished(readCounts(store).completed); return n > r.lessonsFinished ? { ...r, lessonsFinished: n } : r; };
  const streakCount = () => { try { return projectStreak(normalizeRecord(streakRaw() ?? {}), now()).count || 0; } catch { return 0; } };
  const withEarned = (r) => {
    const g = grantEarnedOutfits(r, { lessons: r.lessonsFinished, streak: streakCount() });
    if (g === r) return r;
    try { return save(store, () => g, now()); } catch { return g; }
  };
  const get = () => withEarned(refillByTime(synced(load(store, now())), now()));
  const update = (fn) => { const r = save(store, fn, now()); emit(); return r; };
  const streakRaw = () => { try { return store.get(STREAK_KEY) ?? null; } catch { return null; } };
  const calm = () => calmOn(ctx);
  const emit = () => { try { applyShopLook(get()); } catch { /* look is optional */ } try { doc.dispatchEvent(new CustomEvent('alef:retention')); } catch { /* no listeners */ } };
  const say = (text) => { try { doc.dispatchEvent(new CustomEvent('alef:retention-say', { detail: { text } })); } catch { /* optional */ } };
  const opts = () => ({ calm: calm(), hash: g.location?.hash || '' });
  const later = (fn, ms) => g.setTimeout(() => { try { fn(); } catch { /* Rimon is optional */ } }, ms);

  /** The counts the XP and lesson quests read (src/lib/counts.js): the same numbers Home's goal ring and Progress show. */
  const live = (t = now()) => { const s = readCounts(store); return { xpToday: xpToday(load(store, t), t), lessonsToday: lessonsFinishedToday(s.completed, t) }; };
  /** Count progress on today's quests, save it, and say each finished quest once. */
  function questStep(amounts) {
    const t = now(), cur = synced(load(store, t)), out = questProgress(cur, amounts, t, { calm: calm(), mode: quietOpt.mode, live: live(t) });
    if (out.rec !== cur) update(() => out.rec);
    for (const text of out.done) say(`Quest done: ${text}. +5 gems.`);
    if (out.chest) { say('All three quests done! +10 gems.'); later(() => showRimon('daily_goal'), 1500); }
    const cur2 = load(store, t), mo = monthProgress(cur2, t, { calm: calm() }); // the month's challenge is checked wherever XP can change
    if (mo.rec !== cur2) update(() => mo.rec);
    if (mo.completed) { say(`${monthView(mo.rec, t).title} complete! +50 gems.`); later(() => showRimon('streak_milestone'), 2200); }
    const cur3 = load(store, t), ex = expeditionProgress(cur3, amounts, t, { calm: calm(), mode: quietOpt.mode });
    if (ex.rec !== cur3) update(() => ex.rec);
    if (ex.done) { say(`${ex.title} complete! +${ex.gems} gems.`); later(() => showRimon('streak_milestone'), 2800); }
    return { ...out, month: mo.completed ? monthView(mo.rec, t).title : null, expedition: ex.done ? ex.title : null, gems: out.gems + (mo.completed ? 50 : 0) + (ex.gems || 0) };
  }
  /** Has the learner earned anything yet? Until then the top bar and the Home cards stay out of the way of a first visit. */
  const revealed = () => { const r = load(store, now()); return r.xp.total > 0 || r.lessonsFinished > 0 || r.gems.balance > 0 || projectStreak(streakRaw(), now()).count > 0; };
  function rollover() {
    const t = now(), raw = streakRaw();
    const out = applyRollover(raw, load(store, t), t, { tz: deviceZone() });
    const s = settle(out.ret, t);
    if (out.streak !== raw && out.streak) { muteStreakSub = true; try { store.set(STREAK_KEY, out.streak); } finally { muteStreakSub = false; } }
    const wb = welcomeBack(refillByTime(s.rec, t), t); // a week or more away: full hearts, and Home offers a small first step
    update(() => markLogin(wb.rec, t));
    lastCount = projectStreak(streakRaw(), t).count;
    quietOpt.mode = normalizeRecord(streakRaw()).mode;
    return { events: wb.back ? [...out.events, 'welcome_back'] : out.events, result: s.result };
  }
  function touch() { const t = now(); if (t - lastTouch < 60000) return; lastTouch = t; update((r) => logSession(r, t)); scheduler?.arm(); }

  /** A lesson's end card appeared. Returns what to show, or null when this finish was already paid. */
  function lessonFinished(detail = {}) {
    const t = now(), before = streakRaw(), here = g.location?.hash || '';
    let rec = load(store, t), awardId = `quick|${detail.lessonId}|${dayKey(t)}`;
    const isRound = /^Round\b/.test(String(detail.title || ''));
    if (isRound) awardId = `round|${here}|${detail.ms ?? ''}|${dayKey(t)}`; // each round of a longer lesson pays once
    else if (!detail.quick) { // the same end card again (here or in another tab), or a third run of one lesson today: nothing to pay
      const a = lessonAward(rec, here.replace(/[?&]quick=1/, ''), t);
      if (a.rec !== rec) save(store, () => a.rec, t);
      if (!a.id) return null;
      rec = a.rec; awardId = a.id;
    }
    const lessonsBefore = rec.lessonsFinished;
    const todayBefore = todayXp(rec, t);
    const partial = !!detail.quick || isRound, bestRun = combo.max; // one round of a longer lesson pays XP but is not a finished lesson
    const pay = lessonPayout(rec, { awardId, accuracy: Number(detail.accuracy) || 0, maxCombo: combo.max, now: t, partial });
    if (pay.duplicate) return null;
    const after = completeLessonDay(before, t);
    muteStreakSub = true; try { store.set(STREAK_KEY, after); } finally { muteStreakSub = false; }
    const st = afterDayCompleted(before, after, pay.rec, t);
    const saved = update(() => logSession(startLesson(st.rec), t));
    lastTouch = t; lastCount = st.count; combo.run = 0; combo.max = 0; if (!detail.quick) lessonHash = null;
    scheduler?.arm();
    const q = questStep({ xp: pay.xp, lesson: partial ? 0 : 1, sharp: !partial && Number(detail.accuracy) >= 0.9 ? 1 : 0, combo: bestRun });
    const afterPay = load(store, t);
    const found = grantMysteries(afterPay, { perfect: afterPay.perfectLessons || 0, books: readCounts(store).booksFinished }, t);
    if (found.rec !== afterPay) { update(() => found.rec); for (const id of found.opened) { const item = MYSTERIES.find((x) => x.id === id); if (item) say(`You found ${item.title}. +${found.gems / found.opened.length} gems.`); } }
    const saved2 = load(store, t);
    const lg = leagueOn(saved2, { calm: calm() }) && saved2.league.joined ? leagueView(saved2, t) : null;
    return { month: q.month, unlocked: unlockedBy(saved2, lessonsBefore, saved2.lessonsFinished), league: lg && !lg.closed ? { rank: lg.you.rank, tier: lg.tier.en, toPromote: lg.toPromote } : null,
      quests: q.done, chest: q.chest, xp: pay.xp, parts: pay.parts, gems: pay.gems + st.gems + q.gems, goalCrossed: pay.goalCrossed, first: pay.first, todayBefore, todayAfter: todayXp(saved, t), goal: saved.goal,
      streak: { count: st.count, grew: st.grew, milestone: st.milestone }, heartsEmpty: heartsOn(saved, { calm: calm() }) && heartCount(saved, t) <= 0, calm: calm() };
  }
  /** The 3-minute lesson (?quick=1): after four parts in one sitting the day counts and XP is paid; the lesson's place is already saved. */
  function partShown(detail = {}) {
    const hash = g.location?.hash || '';
    if (!/[?&]quick=1/.test(hash) || calm()) return null;
    if (quick.hash !== hash) { quick.hash = hash; quick.parts = 0; }
    quick.parts += 1;
    if (quick.parts !== QUICK_PARTS || detail.part >= detail.of - 1) return null; // the last part leads to the lesson's own end card
    const out = lessonFinished({ quick: true, lessonId: detail.lessonId || hash, accuracy: 0 });
    return out ? { ...out, quick: true } : null;
  }
  function answered(detail = {}) {
    const hash = g.location?.hash || '';
    if (!(/^#\/learn/.test(hash) || isLessonHash(hash)) || /[?&]review=1/.test(hash)) return; // I8: intermediate lessons too
    touch();
    if (detail.action === 'correct') { combo.run += 1; combo.max = Math.max(combo.max, combo.run); if (combo.run === 5 || combo.run === 8) questStep({ combo: combo.run }); return; }
    combo.run = 0;
    const rec = get();
    if (detail.retry || !isLessonHash(hash) || !heartsOn(rec, opts())) return; // I8: hearts are taken on lesson routes only, the same in every lesson type
    const qid = detail.questionId ?? doc.querySelector('.alef-ex-card')?.getAttribute('data-ex') ?? `q${++seq}`;
    const out = loseHeart(rec, `${hash}|${qid}`, now());
    if (!out.lost) return;
    update(() => out.rec);
    // S-05 (lane 1): the toast names the count the hearts display now shows ("Oops, one heart" read as "one heart left" beside 4 of 5).
    const left = `${out.left} of ${HEARTS.max} left`;
    if (out.left === 0) say(`That was your last heart (0 of ${HEARTS.max}). You can still finish this lesson.`);
    else if (out.left === 1) { say(`That cost a heart: ${left}. Take your time.`); later(() => showRimon('heart_last'), 900); }
    else { say(`Oops, that cost a heart: ${left}. You've got this.`); later(() => showRimon('heart_lost'), 900); }
  }
  function reviewRated(detail = {}) {
    const t = now(); touch();
    let res = award(get(), { awardId: `review|${t}|${++seq}`, kind: 'review', amount: XP.review, now: t });
    const p = practiceCard(res.rec, Number(detail.rating) >= 3, t); let rec = p.rec;
    if (p.roundDone && p.xpEarned) rec = award(rec, { awardId: `refill|${t}|${seq}`, kind: 'refill', amount: XP.refillRound, now: t }).rec;
    update(() => rec);
    if (p.heartBack && heartsOn(rec, { calm: calm() })) { say('+1 heart! Memory, meet muscle.'); showRimon('heart_back'); }
    questStep({ review: 1, xp: res.paid });
    if (res.goalCrossed) goalReached();
  }
  function gameFinished(detail = {}) {
    if (!(Number(detail.stars) >= 1)) return;
    const t = now(); const res = award(get(), { awardId: `game|${t}|${++seq}`, kind: 'game', amount: XP.game, now: t });
    update(() => logSession(res.rec, t));
    questStep({ game: 1, xp: res.paid });
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
    try { // settle the XP and lesson quests against today's counts, only when one is reached but not yet paid
      const r = get(), lv = live();
      if (questsOn(r, { calm: calm() }) && r.quests?.day === dayKey(now()) && r.quests.items.some((i) => !i.paid && ((i.id === 'xp' && lv.xpToday >= i.n) || (i.id === 'lesson' && lv.lessonsToday >= i.n)))) questStep({});
    } catch { /* quests are optional */ }
    if (freezeNoteShown) { freezeNoteShown = false; update((r) => freezeNoteSeen(r)); }
    if (!isLessonHash(hash)) { lessonHash = null; return { gate: false }; }
    if (hash === lessonHash) return { gate: false };
    const rec = get();
    if (!canStartLesson(rec, opts(), now())) return { gate: true, hash };
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
        opt: () => { const r = load(store, now()), on = leagueOn(r, { calm: calm() }); return { ...quietOpt, calm: calm(), leagueDone: on && r.league.joined && r.league.settled === r.league.weekId, toPromote: on && r.league.joined ? leagueView(r, now()).toPromote : 0 }; },
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

  api = { get, update, streakRaw, calm, rollover, lessonFinished, partShown, weekDots: () => weekDays(streakRaw(), get(), now(), readCounts(store).rest), freezeNoteShown: () => { if (!freezeNoteShown) { freezeNoteShown = true; save(store, (r) => markFreezeNote(r, now()), now()); } }, answered, reviewRated, gameFinished, streakChanged, routeShown, armNotifications, turnOnReminders,
    status: () => streakStatus(streakRaw(), get(), now()), streakShown: () => streakVisible(ctx), heartsShown: () => heartsOn(get(), { calm: calm() }), leagueShown: () => leagueOn(get(), { calm: calm() }),
    setStreak: (v) => { muteStreakSub = true; try { store.set(STREAK_KEY, v); } finally { muteStreakSub = false; } lastCount = projectStreak(v, now()).count; emit(); },
    rearm: () => scheduler?.arm(), quietOpt: () => quietOpt, say, ctx, revealed,
    comeback: () => { const r = get(); return isComebackDay(r, now()) && todayXp(r, now()) === 0 ? comebackView(r, now()) : null; },
    recap: () => (recapDue(get(), now(), { calm: calm() }) ? lastWeek(get(), now()) : null), recapSeen: () => update((r) => recapSeen(r, now())),
    loginView: () => loginView(get(), now()),
    monthView: () => monthView(get(), now(), { calm: calm() }),
    questView: () => questView(get(), now(), { calm: calm(), mode: quietOpt.mode, live: live() }), questsShown: () => questsOn(get(), { calm: calm() }),
    expeditionView: () => expeditionView(get(), now(), { calm: calm(), mode: quietOpt.mode }), expeditionShown: () => expeditionOn(get(), { calm: calm() }),
    /** A lesson the learner has been let into (so a later redraw of the same page never gates it). */
    admit: (hash) => { lessonHash = hash; } };
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
  doc.addEventListener('alef:lesson-part', safe((e) => { const out = R.partShown(e.detail || {}); if (out) UI.showQuickDone(R, out, g); }));
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
      : away >= 3 || first.events.includes('welcome_back') ? 'welcome_back' : new Date(t).getDay() === 0 ? 'shavua_tov' : null;
    R.update((r) => markLogin(r, t));
    if (pick) g.setTimeout(safe(() => showRimon(pick)), 2600);
  })();
  R.armNotifications();
  return R;
}
