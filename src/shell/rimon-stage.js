// Rimon's stage: puts the 200 stills (docs/images/RIMON-STILLS.md) where src/shell/rimon-triggers.js says.
//
// It listens to what the app already announces (alef:ready on every screen, alef:rimon for answers and game moments,
// store writes for streaks, badges, Brain Lab, books and lessons, online/offline, the learner going idle) and asks the
// trigger map which still fits. Views can also mark a spot: <img data-rimon-still="trigger"> swaps an existing Rimon
// picture for the still, and <div data-rimon-slot="trigger"> receives a large Rimon.
//
// Nothing here changes scores, streaks or saved progress. Only stills listed in data/images/rimon/present.json are
// ever requested, so until the pictures exist the app looks and behaves exactly as before. Every failure is silent.
import {
  TRIGGERS, stillPath, presentSet, presentFiles, pickStill, alreadySeen, lineFor, dayContext, greetingCandidates, routeTrigger,
  createAnswerTracker, ACTION_TRIGGERS, ANSWER_WINDOW_MS, streakChangeTrigger, labChangeTrigger, booksChangeTrigger,
  awardsChangeTrigger, lessonsChangeTrigger, breakTrigger, QUIET_ROUTES, seasonTrigger,
} from './rimon-triggers.js';
import { projectStreak } from '../curriculum/streak.js';
import { IN_PAGE_RIMON, GREETING_SITUATIONS } from './rimon.js';

export const SEEN_KEY = 'rimon.seen.v1';
/** Quiet days and screens (QUIET_DAYS, QUIET_ROUTES): Rimon and every still step aside. Injected by the stage so it works before any still exists. */
/** Rimon pictures that other screens draw into the page: one list, kept in src/shell/rimon.js. */
export { IN_PAGE_RIMON };
export const QUIET_CSS = 'body[data-rimon-quiet] .rimon-companion,body[data-rimon-quiet] .rimon-restore,body[data-rimon-quiet] .rimon-bubble,body[data-rimon-quiet] .rimon-toast,body[data-rimon-quiet] .rimon-hero,body[data-rimon-quiet] .rimon-moment{display:none!important}body[data-rimon-quiet=day] img[data-rimon-still],body[data-rimon-quiet=day] img.alef-celebrate-rimon,body[data-rimon-quiet=day] .rimon-inline,body[data-rimon-quiet=day] .alef-rimon-spot{visibility:hidden}'
  // one Rimon on screen: another branch's floating Rimon (.alef-rimon-spot, .rimon-moment) sends the corner one away while it shows
  + 'body:has(.alef-rimon-spot) .rimon-companion.rimon-corner,body:has(.alef-rimon-spot) .rimon-bubble,body:has(.rimon-moment:not([hidden])) .rimon-companion.rimon-corner,body:has(.rimon-moment:not([hidden])) .rimon-bubble{visibility:hidden}'
  // ...and so does a Rimon drawn into the page itself: the animated in-page Rimon and the Brain Lab pictures that show Rimon
  + IN_PAGE_RIMON.map((sel) => `body:has(#main ${sel}) .rimon-companion.rimon-corner,body:has(#main ${sel}) .rimon-bubble,body:has(#main ${sel}) .rimon-moment,body:has(#main ${sel}) .alef-rimon-spot`).join(',') + '{visibility:hidden}';
/** Rimon pictures that views draw without a mark: the selector and how to pick the trigger. */
const IMPLICIT = [['img.alef-celebrate-rimon', (acc) => (acc >= 0.9 ? 'lesson.complete.perfect' : acc >= 0.7 ? 'lesson.complete.great' : 'lesson.complete.done')]];
/** Screens where Rimon is already on the page (the Home greeting, the setup screens): other Rimon surfaces stay away there. */
export const STAGE_OWNS = Object.freeze(['home', 'welcome', 'onboarding', 'welcome-back', 'welcomeBack']);
/**
 * Situations used by the shared showRimon(situation) hook (src/shell/rimon-show.js on overnight/launch-ready-2026-11-10)
 * mapped to triggers, so that hook can ask the stage: registerRimonProvider(stage.urlsForSituation).
 */
export const SITUATION_TRIGGERS = Object.freeze({
  home: 'greet.day', welcome: 'greet.first', onboarding: 'onboarding.letters', 'welcome-back': 'greet.back', 'lesson-start': 'learn.continue.next',
  correct: 'answer.correct', wrong: 'answer.wrong', hint: 'answer.wrong.repeat', streak: 'goal.reached', 'streak-risk': 'streak.atrisk',
  comeback: 'answer.comeback', 'lesson-complete': 'lesson.complete.great', 'next-lesson': 'lesson.next', idle: 'idle.fidget', loading: 'loading.slow',
  empty: 'awards.empty', error: 'error.view', offline: 'offline.lost', shabbat: 'shabbat.day', 'brain-lab': 'lab.home', library: 'library.home',
  award: 'award.new', reminder: 'reminder.streak',
  // the big-moment situations of src/shell/rimon-stills.js
  welcomeBack: 'greet.back', lessonStart: 'learn.continue.next', bigCorrect: 'answer.correct.streak5', streakRisk: 'streak.atrisk',
  rest: 'streak.rest', lessonComplete: 'lesson.complete.great', unitComplete: 'lessons.10', recovered: 'offline.back', holiday: 'calendar.home',
  brainLab: 'lab.home', brainLabWin: 'lab.result.best', brainLabMiss: 'answer.wrong', storybooks: 'books.shelf', storyReader: 'books.shelf',
  // section-home screens: settings, vocab, games, and the other learn hubs
  settings: 'settings.home', vocab: 'vocab.home', games: 'games.hub', 'games-hub': 'games.hub',
  phrases: 'phrases.home', typing: 'typing.home', grammar: 'grammar.home', roots: 'roots.home',
  listen: 'listen.home', speak: 'speak.home', letters: 'letters.home', search: 'search.home',
  about: 'about.home', help: 'help.home', israel: 'israel.home', synagogues: 'synagogues.home',
  traditions: 'traditions.home', scan: 'scan.home', dialogues: 'dialogues.home',
});
const WATCHED = ['streak', 'awards.v1', 'lab.v1', 'books.finished.v1', 'curriculum.progress'];
const IDLE_FIDGET_MS = 45000, IDLE_REPEAT_MS = 40000, IDLE_SLEEP_MS = 180000, LOADING_MS = 700, FLUSH_MS = 120;
const CORRECT = /^answer\.(correct|comeback)/;

/** Root-relative URL of a still, resolved against this module so a sub-path deploy still works. */
const urlOf = (id, files) => new URL(`../../${stillPath(id, files)}`, import.meta.url).href;
const presentUrl = () => new URL('../../data/images/rimon/present.json', import.meta.url).href;

async function defaultFetchJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`could not load ${url}: HTTP ${r.status}`);
  return r.json();
}

/**
 * @param {{store:any, companion?:{showStill?:Function, clearPose?:Function}|null, doc?:Document, win?:any,
 *          fetchJson?:(url:string)=>Promise<any>, now?:()=>Date, present?:Iterable<string>|{ids:string[], files?:Object<string,string>}|null, loadImage?:(src:string)=>Promise<boolean>}} opt
 */
export function mountRimonStage({ store, companion = null, doc = globalThis.document, win = globalThis, fetchJson = defaultFetchJson, now = () => new Date(), present: given = null, loadImage = null } = {}) {
  let alive = true, present = new Set(), files = {}, listKnown = false, observer = null, scanTimer = 0, flushTimer = 0, idleTimer = 0, loadTimer = 0, mainObserver = null;
  const counters = new Map(), tracker = createAnswerTracker(), images = new Map(), toasts = [], ready2 = new Map();
  const last = Object.fromEntries(WATCHED.map((k) => [k, read(k)]));
  let lastActivity = now().getTime(), fidgets = 0, lastFidget = 0, slept = false, activeMs = 0, lastTick = lastActivity, wasOffline = false;
  const breaksShown = new Set();
  let toastEl = null, toastTimer = 0, lastAccuracy = null;
  const onCelebrate = (e) => { const a = Number(e?.detail?.accuracy); if (Number.isFinite(a)) lastAccuracy = a; };

  function read(key, dflt = null) { try { const v = store?.get?.(key, dflt); return v === undefined ? dflt : v; } catch { return dflt; } }
  function seen() { const s = read(SEEN_KEY, null); return s && typeof s === 'object' ? s : {}; }
  function writeSeen(patch) { try { store?.set?.(SEEN_KEY, { ...seen(), ...patch }); } catch { /* remembering is optional */ } }
  const hidden = () => read('rimon.dismissed', false) === true;

  function ctxNow() {
    const p = read('calendar.prefs', null) || {};
    const loc = Number.isFinite(p.lat) && Number.isFinite(p.lon) ? { lat: p.lat, lon: p.lon, offsetMinutes: Number.isInteger(p.candleMinutes) ? p.candleMinutes : undefined } : null;
    const rec = read('streak', null);
    return dayContext(now(), { loc, mode: p.observance || rec?.mode || 'reform', havdalahOpt: p.havdalah });
  }
  function facts(ctx) {
    const s = seen(), rec = read('streak', null);
    let streak = {};
    try { streak = projectStreak(rec, now()); } catch { streak = {}; }
    const lessonsDone = Object.keys(read('curriculum.progress', null)?.completed || {}).length;
    const veteran = lessonsDone > 0 || (streak.best || 0) > 0;
    const daysAway = s.lastDay && s.lastDay < ctx.iso ? Math.round((Date.parse(`${ctx.iso}T12:00:00Z`) - Date.parse(`${s.lastDay}T12:00:00Z`)) / 86400000) : 0;
    return {
      streak, lessonsDone, newLearner: lessonsDone === 0,
      badges: Object.keys(read('awards.v1', null)?.awards || {}).length,
      // the hello belongs to a new learner's first day (the welcome steps may already have recorded that day)
      firstVisit: !veteran && !s['greet.first'] && (!s.firstDay || s.firstDay === ctx.iso),
      secondDay: !!s.firstDay && s.firstDay < ctx.iso && !s['first.return'] && !!s['greet.first'],
      daysAway,
    };
  }
  const quietDay = (ctx) => ctx.quiet;
  const quietRoute = () => QUIET_ROUTES.includes(doc?.body?.dataset?.route || '');
  function quiet() { return quietRoute() || quietDay(ctxNow()); }
  function inPageRimon() { try { const main = doc?.getElementById?.('main'); return !!main && IN_PAGE_RIMON.some((sel) => main.querySelector(sel)); } catch { return false; } }
  function applyQuiet(ctx) {
    const body = doc?.body; if (!body) return;
    const q = quietDay(ctx) ? 'day' : quietRoute() ? 'route' : '';
    if (q) body.dataset.rimonQuiet = q; else delete body.dataset.rimonQuiet;
  }

  /** Load a still; resolves to the URL to show (a cut-out copy for the cream-background drawings) or null when it fails. */
  function preload(src) {
    if (!images.has(src)) images.set(src, (loadImage ? Promise.resolve(loadImage(src)) : new Promise((resolve) => {
      const Img = win?.Image; if (typeof Img !== 'function') { resolve(false); return; }
      const im = new Img(); im.decoding = 'async'; im.onload = () => resolve(im); im.onerror = () => resolve(false); im.src = src;
    })).then((r) => (r === true ? src : typeof r === 'string' ? r : r ? cutout(r, src) : null)).then((u) => { if (u) ready2.set(src, u); return u; }).catch(() => null));
    return images.get(src);
  }
  /**
   * The drawn set (art-map.mjs) has a flat cream background. Clear it to transparent by flood fill from the edges, with a
   * soft rim, so Rimon sits cleanly on dark green pages and over the corner companion. Already transparent: unchanged.
   */
  async function cutout(im, src) {
    try {
      const w = im.naturalWidth, h = im.naturalHeight;
      if (!w || !h || w * h > 1200 * 1200) return src;
      const c = doc.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      const img = g.getImageData(0, 0, w, h), d = img.data;
      const br = d[0], bg = d[1], bb = d[2];
      if (d[3] < 250 || br + bg + bb < 600) return src; // transparent already, or not a light paper background
      const dist = (i) => Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb);
      const NEAR = 48, EDGE = 120, seen = new Uint8Array(w * h), stack = [];
      for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
      for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
      while (stack.length) {
        const p = stack.pop();
        if (seen[p]) continue;
        const k = dist(p * 4);
        if (k >= EDGE) continue;
        seen[p] = 1;
        d[p * 4 + 3] = k < NEAR ? 0 : Math.round(255 * (k - NEAR) / (EDGE - NEAR));
        if (k >= NEAR) continue; // a rim pixel: softened, the fill stops here
        const x = p % w;
        if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1);
        if (p >= w) stack.push(p - w); if (p < w * (h - 1)) stack.push(p + w);
      }
      g.putImageData(img, 0, 0);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      return blob && win?.URL?.createObjectURL ? win.URL.createObjectURL(blob) : src;
    } catch { return src; }
  }

  /** The still for a trigger, or null (no drawing yet, already shown, or Rimon is away). */
  function choose(trigger, { ignoreSeen = false } = {}) {
    if (!present.size || !TRIGGERS[trigger]) return null;
    const ctx = ctxNow();
    if (!ignoreSeen && alreadySeen(trigger, seen(), ctx.iso)) return null;
    const p = pickStill(trigger, { present, now: now(), counters });
    return p ? { ...p, src: urlOf(p.id, files), iso: ctx.iso } : null;
  }
  function remember(trigger, iso) {
    const once = TRIGGERS[trigger]?.once;
    if (once) writeSeen({ [trigger]: once === 'ever' ? true : iso });
  }

  // ---------------------------------------------------------------- surfaces
  /** A moment on the companion. Resolves true when a still was shown. */
  async function pose(trigger, { vars = {}, ms = null, line = true } = {}) {
    if (!alive || hidden() || quiet() || typeof companion?.showStill !== 'function') return false;
    const p = choose(trigger);
    const url = p ? await preload(p.src) : null;
    if (!url || !alive) return false;
    const shown = companion.showStill(url, { id: p.id, ms: ms ?? TRIGGERS[trigger].ms ?? 2000, line: line ? lineFor(trigger, vars) : null });
    if (shown !== false) remember(trigger, p.iso);
    return shown !== false;
  }
  /** Rimon dressed for the screen until the next screen. */
  async function page(trigger) {
    if (!alive || hidden() || typeof companion?.showStill !== 'function') return false;
    const p = choose(trigger, { ignoreSeen: true });
    if (!p) return false;
    const route = doc?.body?.dataset?.route;
    const url = await preload(p.src);
    if (!url || !alive || doc?.body?.dataset?.route !== route) return false;
    const s = seen(), key = `line:${trigger}`, line = s[key] === p.iso ? null : lineFor(trigger);
    companion.showStill(url, { id: p.id, line });
    if (line) writeSeen({ [key]: p.iso });
    return true;
  }
  function figure(trigger, p, cls) {
    const fig = doc.createElement('figure'); fig.className = cls; fig.dataset.rimonTrigger = trigger;
    const img = doc.createElement('img'); img.alt = ''; img.width = 200; img.height = 200; img.decoding = 'async'; img.src = p.src; img.setAttribute('data-rimon-id', p.id);
    img.addEventListener?.('error', () => fig.remove());
    preload(p.src).then((u) => { if (u && u !== p.src && img.getAttribute('src') === p.src) img.src = u; });
    fig.append(img);
    const l = lineFor(trigger);
    if (l) {
      const cap = doc.createElement('figcaption'); cap.className = 'rimon-hero-line';
      if (l.he) { const he = doc.createElement('span'); he.lang = 'he'; he.dir = 'rtl'; he.className = 'rimon-hero-he'; he.textContent = l.he; cap.append(he); }
      const en = doc.createElement('span'); en.textContent = l.en; cap.append(en);
      fig.append(cap);
    }
    return fig;
  }
  /** A large Rimon in the page: into `slot`, or right after the first heading of #main. */
  function hero(trigger, slot = null) {
    if (!alive || hidden() || quiet()) return null;
    const p = choose(trigger, { ignoreSeen: true });
    if (!p) return null;
    const fig = figure(trigger, p, 'rimon-hero');
    if (slot) slot.replaceChildren(fig);
    else {
      const main = doc.getElementById('main'); if (!main) return null;
      main.querySelector('.rimon-hero')?.remove();
      const h1 = main.querySelector('h1');
      if (h1?.parentNode) h1.parentNode.insertBefore(fig, h1.nextSibling); else main.prepend(fig);
    }
    doc.body.dataset.rimonHero = trigger;
    remember(trigger, p.iso);
    return fig;
  }
  /** A card at the bottom of the screen, one at a time. */
  function toast(trigger, vars = {}) {
    if (!alive || hidden() || quiet()) return false;
    const p = choose(trigger);
    if (!p) return false;
    remember(trigger, p.iso);
    toasts.push({ trigger, p, vars });
    if (toasts.length > 2) toasts.splice(1, toasts.length - 2); // never a backlog: the newest waits, older ones drop
    if (!toastEl) nextToast();
    return true;
  }
  async function nextToast() {
    const item = toasts.shift();
    if (!item || !alive) return;
    const url = await preload(item.p.src);
    if (!url || !alive) { nextToast(); return; }
    const box = doc.createElement('div'); box.className = 'rimon-toast'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); box.dataset.rimonTrigger = item.trigger;
    const img = doc.createElement('img'); img.alt = ''; img.width = 72; img.height = 72; img.src = url; img.setAttribute('data-rimon-id', item.p.id);
    const text = doc.createElement('p'); text.className = 'rimon-toast-line';
    const l = lineFor(item.trigger, item.vars);
    if (l?.he) { const he = doc.createElement('span'); he.lang = 'he'; he.dir = 'rtl'; he.className = 'rimon-toast-he'; he.textContent = l.he; text.append(he); }
    const en = doc.createElement('span'); en.textContent = l?.en || ''; text.append(en);
    const x = doc.createElement('button'); x.type = 'button'; x.className = 'rimon-toast-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    const close = () => { clearTimeout(toastTimer); box.remove(); if (toastEl === box) { toastEl = null; delete doc.body.dataset.rimonToast; } setTimeout(nextToast, 400); };
    x.addEventListener('click', close);
    box.append(img, text, x);
    doc.body.append(box);
    toastEl = box; doc.body.dataset.rimonToast = item.trigger; // one Rimon on screen: the card's (CSS hides the companion meanwhile)
    toastTimer = setTimeout(close, TRIGGERS[item.trigger].ms || 5000);
  }
  /** Swap one marked picture for its still (or put it back). */
  function swap(img) {
    const want = img.getAttribute('data-rimon-still') || '';
    if (!TRIGGERS[want] || img.dataset.rimonDone === want) return; // not one of ours (another hook's mark): leave it alone
    img.dataset.rimonDone = want;
    let trigger = want;
    const f = facts(ctxNow());
    if (/^lesson\.complete\./.test(want) && f.lessonsDone <= 1 && !seen()['first.lesson']) trigger = 'first.lesson';
    const p = hidden() || quiet() ? null : choose(trigger);
    if (img.dataset.rimonFallback == null) img.dataset.rimonFallback = img.getAttribute('src') || '';
    if (!p) { if (img.dataset.rimonShown) { img.src = img.dataset.rimonFallback; delete img.dataset.rimonShown; } return; }
    img.addEventListener('error', function back() { img.removeEventListener('error', back); if (img.dataset.rimonFallback) img.src = img.dataset.rimonFallback; delete img.dataset.rimonShown; });
    img.src = p.src; img.dataset.rimonShown = String(p.id);
    preload(p.src).then((u) => { if (u && u !== p.src && img.dataset.rimonShown === String(p.id)) img.src = u; });
    remember(trigger, p.iso);
  }
  function fillSlot(el) {
    const want = el.getAttribute('data-rimon-slot') || '';
    if (!TRIGGERS[want] || el.dataset.rimonDone === want) return; // e.g. rimonSlot('welcome') from the shared hook fills itself
    el.dataset.rimonDone = want;
    if (!hero(want, el)) el.replaceChildren();
  }
  function scan() {
    scanTimer = 0;
    if (!alive || !doc?.querySelectorAll) return;
    for (const [sel, pick] of IMPLICIT) for (const img of doc.querySelectorAll(sel)) if (!img.hasAttribute('data-rimon-still') && lastAccuracy != null) img.setAttribute('data-rimon-still', pick(lastAccuracy));
    for (const img of doc.querySelectorAll('img[data-rimon-still]')) swap(img);
    for (const el of doc.querySelectorAll('[data-rimon-slot]')) fillSlot(el);
    // one Rimon on screen: a swapped picture inside the page stands in for the corner companion
    const main = doc.getElementById?.('main');
    const inPage = !!main && [...doc.querySelectorAll('img[data-rimon-shown]')].some((img) => main.contains ? main.contains(img) : img.closest?.('#main'));
    if (inPage) doc.body.dataset.rimonInpage = '1'; else delete doc.body.dataset.rimonInpage;
  }
  const scanSoon = () => { if (!scanTimer) scanTimer = setTimeout(scan, 120); };

  // ---------------------------------------------------------------- screens
  async function onReady() {
    if (!alive) return;
    const body = doc?.body; if (!body) return;
    delete body.dataset.rimonHero;
    const ctx = ctxNow();
    applyQuiet(ctx);
    // remember the day of this visit (for "you're back" and day two)
    const s = seen(), f = facts(ctx);
    if (s.lastDay !== ctx.iso) writeSeen({ lastDay: ctx.iso, ...(s.firstDay ? {} : { firstDay: ctx.iso }) });
    if (!present.size || body.dataset.rimonQuiet || hidden()) return;
    const route = body.dataset.route || '';
    scan();
    if (route === 'home') { await greet(ctx, f); return; }
    if (route === 'notfound') { hero('error.notfound'); return; }
    if (doc.getElementById('main')?.querySelector('.alef-unavailable')) { hero('error.view'); return; }
    const t = routeTrigger(route, ctx, f, win?.location?.hash || '');
    if (t) await page(t);
  }
  async function greet(ctx, f) {
    const s = seen();
    for (const t of greetingCandidates(ctx, f)) {
      const gate = TRIGGERS[t]?.once ? null : `greet:${t}`;
      if (gate && s[gate] === ctx.iso) continue;
      if (await pose(t, { ms: TRIGGERS[t].ms || 5000, line: s.greeted !== ctx.iso })) { writeSeen({ ...(gate ? { [gate]: ctx.iso } : {}), ...(lineFor(t) ? { greeted: ctx.iso } : {}) }); return t; }
    }
    return null;
  }

  // ---------------------------------------------------------------- answers and game moments
  function answer(t) {
    if (!t) return;
    const f = facts(ctxNow());
    let trigger = t;
    if (f.newLearner) {
      const s = seen();
      if (CORRECT.test(t) && !s['first.correct']) trigger = 'first.correct';
      else if (/^answer\.wrong/.test(t) && !s['first.mistake']) trigger = 'first.mistake';
    }
    const line = trigger !== t || /^answer\.wrong\.(repeat|many)$/.test(t);
    if (doc?.querySelector?.('.alef-rimon-spot, .rimon-moment:not([hidden])')) { if (TRIGGERS[trigger]?.once) remember(trigger, ctxNow().iso); return; } // a floating Rimon already answers
    pose(trigger, { line });
  }
  function onRimon(e) {
    const action = e?.detail?.action;
    // a retention greeting said its line first (src/retention/boot.js): the stage's own hello today comes without one
    const d = e?.detail;
    if (d?.retention && d.say && GREETING_SITUATIONS.includes(d.situation)) { try { const iso = ctxNow().iso; if (seen().greeted !== iso) writeSeen({ greeted: iso }); } catch { /* optional */ } }
    if (!action || !present.size) return;
    activity();
    answer(tracker.feed(action, now().getTime()));
    clearTimeout(flushTimer);
    if (tracker.pending) flushTimer = setTimeout(() => answer(tracker.flush()), FLUSH_MS);
    const other = ACTION_TRIGGERS[action];
    if (other) pose(other);
  }

  // ---------------------------------------------------------------- store changes
  function onStore(key, value, info) {
    if (!WATCHED.includes(key) || info?.external) return;
    const before = last[key]; last[key] = value;
    if (!present.size) return;
    const ctx = ctxNow();
    if (key === 'streak') {
      let a = null, b = null;
      try { a = before ? projectStreak(before, now()) : null; b = projectStreak(value, now()); } catch { return; }
      const t = streakChangeTrigger(a, b, ctx.hour);
      if (t) toast(t, { n: b.count });
    } else if (key === 'awards.v1') {
      const t = awardsChangeTrigger(before, value); if (t) toast(t);
    } else if (key === 'lab.v1') {
      const r = labChangeTrigger(before, value, ctx.iso);
      if (r) (TRIGGERS[r.trigger].surface === 'toast' ? toast(r.trigger, { n: r.n }) : pose(r.trigger));
    } else if (key === 'books.finished.v1') {
      const r = booksChangeTrigger(before, value); if (r) toast(r.trigger, { n: r.n });
    } else if (key === 'curriculum.progress') {
      const t = lessonsChangeTrigger(before, value); if (t) toast(t);
    }
  }

  // ---------------------------------------------------------------- idle, breaks, network, slow screens
  function activity() {
    const t = now().getTime();
    if (slept) companion?.clearPose?.();
    lastActivity = t; fidgets = 0; slept = false;
  }
  function tick() {
    if (!alive || doc?.hidden || !present.size) return;
    const t = now().getTime();
    if (t - lastTick <= 15000 && t - lastActivity < 5 * 60000) activeMs += t - lastTick;
    if (t - lastActivity >= 15 * 60000) activeMs = 0; // a long pause starts a new sitting
    lastTick = t;
    const idle = t - lastActivity;
    if (idle >= IDLE_SLEEP_MS && !slept) { slept = true; pose('idle.sleep'); }
    else if (!slept && idle >= IDLE_FIDGET_MS && fidgets < 3 && t - lastFidget >= IDLE_REPEAT_MS) { fidgets++; lastFidget = t; pose('idle.fidget'); }
    const b = breakTrigger(activeMs, breaksShown);
    if (b) { breaksShown.add(b); toast(b); }
  }
  const onOffline = () => { wasOffline = true; toast('offline.lost'); };
  const onOnline = () => { if (wasOffline) toast('offline.back'); wasOffline = false; };
  function watchLoading() {
    const main = doc?.getElementById?.('main');
    if (!main || typeof win?.MutationObserver !== 'function') return;
    mainObserver = new win.MutationObserver(() => {
      clearTimeout(loadTimer);
      if (main.getAttribute('aria-busy') !== 'true') return;
      loadTimer = setTimeout(() => {
        if (!alive || main.getAttribute('aria-busy') !== 'true' || main.querySelector('.rimon-hero')) return;
        const p = hidden() || quiet() ? null : choose('loading.slow', { ignoreSeen: true });
        if (p) main.append(figure('loading.slow', p, 'rimon-hero rimon-loading'));
      }, LOADING_MS);
    });
    mainObserver.observe(main, { attributes: true, attributeFilter: ['aria-busy'] });
  }
  function watchMarks() {
    if (observer || typeof win?.MutationObserver !== 'function' || !doc?.body) return;
    observer = new win.MutationObserver(scanSoon);
    observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-rimon-still', 'data-rimon-slot'] });
  }

  // ---------------------------------------------------------------- wiring
  const actEvents = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
  const unsub = store?.subscribe?.(onStore);
  doc?.addEventListener?.('alef:ready', onReady);
  doc?.addEventListener?.('alef:rimon', onRimon);
  doc?.addEventListener?.('alef:celebrate', onCelebrate);
  if (doc?.head && !doc.querySelector?.('style[data-rimon-quiet]')) { const st = doc.createElement('style'); st.setAttribute('data-rimon-quiet', ''); st.textContent = QUIET_CSS; doc.head.append(st); }
  for (const ev of actEvents) doc?.addEventListener?.(ev, activity, { passive: true, capture: true });
  win?.addEventListener?.('offline', onOffline);
  win?.addEventListener?.('online', onOnline);

  /** The stills stylesheet (assets/css/rimon-stills.css) loads only once a still exists; resolves false if it cannot. */
  function styles() {
    if (!doc?.head) return true; // tests: no stylesheet to wait for
    const have = doc.querySelector('link[data-rimon-stills]');
    if (have) return true;
    const css = doc.createElement('link'); css.rel = 'stylesheet'; css.setAttribute('data-rimon-stills', '');
    css.href = new URL('../../assets/css/rimon-stills.css', import.meta.url).href;
    const loaded = new Promise((resolve) => { css.onload = () => resolve(true); css.onerror = () => resolve(false); setTimeout(() => resolve(false), 8000); });
    doc.head.append(css);
    return loaded;
  }

  const ready = (given ? Promise.resolve(given.ids ? given : { ids: [...given] }) : fetchJson(presentUrl()).catch(() => null)).then((json) => {
    if (!alive) return false;
    try { applyQuiet(ctxNow()); } catch { /* the calendar is optional here */ }
    files = presentFiles(json); listKnown = true;
    const listed = new Set([...presentSet(json)].filter((id) => !id.startsWith('a') || files[id])); // a catalogue still needs its file name
    if (!listed.size) return false; // no stills yet: stay out of the way entirely
    // without the stylesheet a still would sit in the wrong place, so stills switch on only once it has loaded
    return Promise.resolve(styles()).then((ok) => { if (ok) present = listed; return ok; });
  }).then((ok) => {
    if (!ok || !alive) return false;
    idleTimer = setInterval(tick, 5000);
    watchMarks(); watchLoading();
    // warm the offline picture while online, so it can show once the connection is gone
    const off = choose('offline.lost', { ignoreSeen: true }); if (off && win?.navigator?.onLine !== false) preload(off.src);
    if (doc?.body?.dataset?.ready === '1') onReady(); else scan();
    return true;
  });

  const handle = {
    ready,
    /** Show a trigger now (used by views and tests): returns whatever the surface returns. */
    show(trigger, vars = {}) {
      const s = TRIGGERS[trigger]?.surface;
      if (s === 'pose') return pose(trigger, { vars });
      if (s === 'page') return page(trigger);
      if (s === 'toast') return toast(trigger, vars);
      if (s === 'hero') return hero(trigger);
      return false;
    },
    get present() { return new Set(present); },
    /**
     * For the shared showRimon hook: still URLs for a situation, best first. [] means "show no Rimon now" (hidden, or a quiet
     * day or screen); null means "the stage has no picture for this": the hook then uses its own map.
     */
    /** True when Rimon already said a greeting line today (Shabbat Shalom, welcome back...): other greeters keep quiet. */
    greetedToday() { try { return seen().greeted === ctxNow().iso; } catch { return false; } },
    urlsForSituation(situation) {
      if (hidden() || quiet() || STAGE_OWNS.includes(situation)) return [];
      if (inPageRimon()) return []; // the page already shows Rimon (Brain Lab pictures, the in-page animation)
      const t = SITUATION_TRIGGERS[situation];
      if (!t) return null;
      const ctx = ctxNow(), season = situation === 'shabbat' || situation === 'home' || situation === 'holiday' ? seasonTrigger(ctx) : null;
      const p = choose(season || t, { ignoreSeen: true });
      // once present.json is read it is the whole truth: nothing listed for this moment means no still (not another
      // module's pick, which could be a picture that is not listed or is held)
      if (!p) return listKnown ? [] : null;
      preload(p.src); // the cut-out copy is used from the next time on
      return [ready2.get(p.src) || p.src];
    },
    _test: { onReady, onRimon, onStore, tick, scan, greet, facts, ctxNow, get activeMs() { return activeMs; }, set activeMs(v) { activeMs = v; }, set lastActivity(v) { lastActivity = v; lastTick = v; } },
    destroy() {
      alive = false;
      clearTimeout(scanTimer); clearTimeout(flushTimer); clearInterval(idleTimer); clearTimeout(loadTimer); clearTimeout(toastTimer);
      observer?.disconnect(); mainObserver?.disconnect(); unsub?.();
      doc?.removeEventListener?.('alef:ready', onReady);
      doc?.removeEventListener?.('alef:rimon', onRimon);
      doc?.removeEventListener?.('alef:celebrate', onCelebrate);
      for (const ev of actEvents) doc?.removeEventListener?.(ev, activity, { capture: true });
      win?.removeEventListener?.('offline', onOffline);
      win?.removeEventListener?.('online', onOnline);
      toastEl?.remove();
    },
  };
  // The shared showRimon hook (overnight/launch-ready-2026-11-10, src/shell/rimon-show.js) can ask for stills:
  //   const p = globalThis.alefRimonStage?.urlsForSituation?.(situation); if (Array.isArray(p)) return p;   ([] = show no Rimon now)
  if (doc && doc === globalThis.document) globalThis.alefRimonStage = handle;
  return handle;
}
