// Aleph boot: wires store, settings, audio, router, and lazily mounted views.
import { mountRimon } from './shell/rimon.js';
import { mountRimonStillsLazy } from './shell/rimon-stills-lazy.js';
import { watchTitleCase, titleCase } from './shell/title-case.js';
import { store } from './store.js';
import { createSettings } from './shell/settings.js';
import { applyComfort, COMFORT_KEYS } from './shell/comfort.js';
import { createRouter, ROUTES, loadRouteModule, availableRoutes } from './shell/router.js';
import { VIEW_FILES } from './shell/views.generated.js';
import { renderNav as renderNavBar } from './shell/nav.js';
import { t, tHe } from './shell/i18n.js';
import { createShellAudio } from './shell/audio.js';
import { createShardLoader, warmShardAfterInstall } from './shell/audio-shards.js';
import { isRealProgressWrite } from './shell/persist-gate.js';
import { fetchFullManifest, fetchAudioSummary, afterPaint } from './shell/audio-manifest.js';
import { h, heSpan, unavailableCard } from './shell/ui.js';
import { loadImageResolver, img as imgEl } from './img/resolve.js';
import { updateCompanions } from './shell/companions.js';
import { applyMotor, MOTOR_KEYS } from './shell/motor.js';
import { gameMusic } from './audio/music.js';
import { mountGameMusic, syncGameMusic } from './audio/music-bar.js';
import { mountMediaPrompt } from './audio/media-prompt.js';
import { stampDayStart } from './awards/daystart.js';
import { rosterById } from './letters/roster.js';
import { installSpeechChunker } from './shell/speech-chunker.js';
import { sfx } from './audio/sfx.js';
installSpeechChunker(); // the device voice never gets one long utterance (phones cut it off after a few seconds)
document.querySelectorAll('link[data-defer-style]').forEach((link)=>{link.media='all';}); // non-critical CSS is linked with media=print so it is not render-blocking
import('./shell/voice-help.js').then((m) => m.installVoiceHelp()).catch(() => {}); // a computer with no Hebrew voice gets one note with the fix

const settings = createSettings(store);

/** The player module is small and loads at boot; the ~1.9 MB core manifest does NOT: it loads on first need (see scheduleManifest). */
async function makeAudio() {
  try {
    const m = await import('./audio/player.js');
    if (typeof m.createAudio !== 'function') throw new Error('player unavailable');
    return createShellAudio({ settings, loadManifest: () => fetchFullManifest((u) => fetch(u)), loadSummary: () => fetchAudioSummary((u) => fetch(u)), createAudio: m.createAudio });
  } catch (e) { console.warn('lane 4 audio player not used:', e?.message); }
  return (await import('./shell/audio-stub.js')).createStubAudio({ settings }); // fallback only: loaded when the player is unavailable
}
// The preview banner module loads only once a preview-tier route is shown (v0 routes never need it); afterwards it also clears a stale banner.
let lastCtx = null, lastMatch = null, touched = false;
// Finer-grained than `touched`, for the late-manifest retry: a gesture outside a text field, or an edit to any field.
let touchedOutsideField = false, fieldEdited = false;
/** serviceWorker is read inside try: some browsers throw on the property itself (blocked storage / cookies), and boot must never depend on it. */
function swContainer() { try { return location.protocol !== 'file:' && 'serviceWorker' in navigator ? navigator.serviceWorker || null : null; } catch { return null; } }
// Scroll restore on Back (src/shell/scroll-restore.js): loaded lazily; until it loads (or offline before it is precached) every
// navigation just scrolls to the top as before. Links and ctx.route() mark a forward navigation; an unmarked hashchange is Back/Forward.
let scrollKeeper = null, lastHashShown = null;
import('./shell/scroll-restore.js').then((m) => { scrollKeeper = m.createScrollRestore(); }).catch(() => {});
document.addEventListener('click', (e) => {
  const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
  if (!a || a.getAttribute('href').startsWith('#main')) return;
  // Only a click that will change the hash marks a forward navigation; otherwise the flag would stay set and make the next Back skip its restore.
  if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.getAttribute('href') === location.hash) return;
  scrollKeeper?.markForward();
}, true);
// Progress protection (mobile FINDINGS item 4): ask for persistent storage the first time real progress (any non-settings key)
// is written (boot-time bookkeeping such as an empty streak record does not count), not only when Settings is opened. Once per page load; the answer is logged once and never shown as an error.
let persistAsked = false;
store.subscribe((key, _value, info) => {
  if (persistAsked || info?.external || !isRealProgressWrite(key, _value)) return;
  persistAsked = true;
  import('./shell/backup.js').then((m) => m.requestPersistence()).then((r) => { if (r?.supported) console.info(`storage persistence after first save of "${key}": ${r.persisted ? 'granted' : 'not granted (keep a backup file)'}`); }).catch(() => {});
});
/** The core manifest is NOT fetched at boot: the shell audio loads it the first time a view asks about a clip (status/has/play) or a
 * button calls ensureManifest. This watches that load: when it lands and the learner has not touched the page since the route
 * mounted, re-render that route once so audio buttons reflect the real list (otherwise they keep the honest "checking" state until
 * the next navigation, never a claim that a clip exists). window.alefManifest resolves once the first route has painted and any
 * load that is already in flight has settled; it never starts a load itself. */
function scheduleManifest(audio) {
  document.body.dataset.audioManifest = audio.manifestState || 'ready';
  let wasAtStart = null;
  if (typeof audio.onManifestState === 'function') {
    audio.onManifestState((st) => {
      document.body.dataset.audioManifest = st;
      if (st === 'checking') wasAtStart = lastMatch;
      else if (st === 'ready') refreshWhenCalm(wasAtStart || lastMatch);
    });
  }
  window.alefManifest = new Promise((res) => { shownFirst.then(() => afterPaint(() => Promise.resolve(audio.loading).then(() => audio.manifestState === 'ready').then(res, res))); });
}
/** Re-render `was` once so audio buttons reflect the manifest, unless that would clobber the learner. Settings has no audio buttons and
 * holds live form state (a file picked for Restore, a half-typed value), so it is never refreshed. While a text field has focus the
 * refresh waits and retries on blur: it fires once focus has left every control in the view, the learner has made no edit and no
 * gesture outside a field, and the route is unchanged. Focus moving to another control (Tab) keeps waiting, so focus is never dropped. */
let disarmRefresh = () => {};
function refreshWhenCalm(was) {
  if (!was || was !== lastMatch || touched || !lastCtx || was.route?.name === 'settings') return;
  const main = document.getElementById('main');
  const a = document.activeElement;
  if (!(main && a && main.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName || ''))) { show(was, lastCtx, { quiet: true }); return; }
  disarmRefresh();
  const onOut = () => setTimeout(() => {
    if (was !== lastMatch || touchedOutsideField || fieldEdited) { disarmRefresh(); return; }
    const now = document.activeElement;
    if (now && now !== document.body && main.contains(now)) return; // focus moved to another control: keep waiting
    disarmRefresh(); show(was, lastCtx, { quiet: true });
  }, 0);
  main.addEventListener('focusout', onOut);
  disarmRefresh = () => { main.removeEventListener('focusout', onOut); disarmRefresh = () => {}; };
}
let shownFirstResolve; const shownFirst = new Promise((r) => { shownFirstResolve = r; });
let soundBar = null; // the one sound bar's dismiss control, set once audio-access.js has loaded (until then the bar shows)
function wireSoundStatus(audio) {
  const el = document.getElementById('sound-status');
  if (!el) return;
  if (typeof audio.subscribe === 'function') audio.subscribe((s) => { el.textContent = s.text; el.dataset.mode = s.mode; if (soundBar) soundBar.show(s.mode, !!s.pending); else { const bar = el.closest('.sound-bar'); if (bar) bar.hidden = !!s.pending; } });
  else { el.textContent = "Sound: your browser's text-to-speech voice (fallback player). No recordings."; el.dataset.mode = 'tts'; const bar = el.closest('.sound-bar'); if (bar) bar.hidden = false; }
}

/** The word-clip shard for the learner's congregation is fetched only when something asks about a 'word' clip (audio.onNeed), and
 * again when the congregation setting changes after that. A route that never asks about word clips never downloads it. */
function startShardLoading(audio) {
  if (typeof audio.extend !== 'function' || typeof audio.onNeed !== 'function') return; // stub player: nothing to extend
  let asked = false, wasAtAsk = null;
  const loader = createShardLoader({
    fetch: (u) => fetch(u), audio, settings,
    onState: (s) => {
      audio.setNote?.(s.note); document.body.dataset.audioShard = s.state;
      if (s.state === 'loaded' || s.state === 'fallback') refreshWhenCalm(wasAtAsk || lastMatch);
    },
  });
  loader.watch(() => asked);
  window.alefShards = loader;
  let loading = null;
  audio.onNeed((kind) => {
    if (kind !== 'word') return undefined;
    if (!asked) { asked = true; wasAtAsk = lastMatch; loading = loader.load(); }
    return loading; // a word play waits for this (src/shell/audio.js need), so the first tap plays the recording
  });
  // Fresh install: store the shard through the worker once it controls the page (the first load bypassed it).
  const swc = swContainer();
  if (swc) warmShardAfterInstall({ fetch: (u) => fetch(u), settings, serviceWorker: swc }).then((r) => { document.body.dataset.audioShardWarm = r; }).catch(() => {});
}

// Install prompt (Chromium). Not supported on iOS Safari (Add to Home Screen is manual).
let deferredPrompt = null;
const installPrompt = { available: () => !!deferredPrompt, async prompt() { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; } };
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

function applyTheme() {
  const th = settings.get('theme');
  if (th === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th);
}
function applyScript() { document.documentElement.dataset.script = settings.get('script'); }
// Calm mode and reading comfort: CSS variables and data-calm on the root (src/shell/comfort.js)
function applyComfortNow() { applyComfort(document.documentElement, settings.all()); }

/** Names of routes whose view file exists in this build (from the generated view list). */
let available = availableRoutes(VIEW_FILES);

/** Navigation (bottom bar of four section tabs + the More menu) lives in shell/nav.js; see docs/nav/NAV.md. */
function renderNav(current) {
  renderNavBar(current, { routes: ROUTES, available });
  setMore(false);
  import('./curriculum/practical.view.js').then((m) => m.paintPracticalDueBadge({ store })).catch(() => {});
}
function setMore(open) {
  const more = document.getElementById('nav-more'), btn = document.getElementById('more-btn');
  more.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
}
function wireChrome() {
  const btn = document.getElementById('more-btn'), more = document.getElementById('nav-more');
  btn.addEventListener('click', () => setMore(btn.getAttribute('aria-expanded') !== 'true'));
  more.addEventListener('click', (e) => { if (e.target.closest('a')) setMore(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && more.classList.contains('open')) { setMore(false); btn.focus(); } });
  document.addEventListener('click', (e) => { if (more.classList.contains('open') && !e.target.closest('.site-nav')) setMore(false); });
  // keyboard: tabbing out of the open More sheet (forwards or backwards) closes it, so it never hangs open over the page
  document.querySelector('.site-nav').addEventListener('focusout', (e) => { if (more.classList.contains('open') && e.relatedTarget && !e.relatedTarget.closest('.site-nav')) setMore(false); });
  // the sound status is cut after two lines on a phone. A real button (Tab, Enter, Space) shows the whole message and carries
  // aria-expanded; a tap on the text itself still works for pointer users and keeps the button in step.
  const st = document.getElementById('sound-status'), soundMore = document.querySelector('.sound-bar-more');
  const setOpen = (open) => { st.classList.toggle('open', open); if (soundMore) soundMore.setAttribute('aria-expanded', String(open)); };
  st.addEventListener('click', () => setOpen(!st.classList.contains('open')));
  if (soundMore) soundMore.addEventListener('click', () => setOpen(!st.classList.contains('open')));
}

// WCAG 2.4.11: on phones the bottom nav is position:fixed; keep the keyboard-focused control above it.
document.addEventListener('focusin', (e) => {
  const nav = document.querySelector('.site-nav'); const el = e.target;
  if (!nav || !(el instanceof Element) || el.closest('.site-nav')) return;
  const ns = getComputedStyle(nav);
  // A hidden bar (full-screen setup and lesson players hide it) has no top edge: measuring it scrolled the page down on every tap of an answer.
  if (ns.position !== 'fixed' || ns.display === 'none' || ns.visibility === 'hidden') return;
  requestAnimationFrame(() => {
    if (document.activeElement !== el) return;
    const navBox = nav.getBoundingClientRect();
    if (!navBox.height) return;
    const over = el.getBoundingClientRect().bottom - navBox.top;
    if (over > 0) window.scrollBy({ top: over + 8, behavior: 'instant' });
  });
});

let unmount = () => {};
let statbar = null; // header streak and daily-goal chips (src/shell/statbar.js), loaded after the first page paints
let navToken = 0;
let heldFocusId = '';
let navFocusOwed = false; // a real navigation has begun but its heading has not been focused yet (a quiet re-render that supersedes it must still do that)
let firstShow = true; // do not steal focus on the initial page load (keyboard users start at the skip link)


function firstPaintTitle(route, params) {
  if (route?.name === 'letter' && params?.id && rosterById[params.id]) {
    const L = rosterById[params.id];
    return `${L.name} ${L.he}`;
  }
  if (route?.name === 'learn') return 'Lessons';
  if (route?.name === 'sounds') return 'Vowels and sounds';
  return route?.title ?? 'ALEF';
}
function firstPaintClass(route) {
  if (route?.name === 'learn') return 'alef-first-paint alef-learn-hero';
  if (route?.name === 'letter') return 'alef-first-paint alef-letter-hero';
  return 'alef-first-paint';
}

async function show(match, ctxBase, { quiet = false } = {}) {
  const token = ++navToken;
  const root = document.getElementById('main');
  if (!quiet) navFocusOwed = true;
  if (quiet && root.contains(document.activeElement) && document.activeElement.id) heldFocusId = document.activeElement.id; // a quiet re-render must not drop focus the learner already has (kept across a quiet render that a second one supersedes)
  if (!quiet) { try { ctxBase?.audio?.stop?.(); } catch { /* nothing was playing */ } }
  try { unmount(); } catch (e) { console.warn('unmount failed', e); }
  unmount = () => {};
  const { route, params, query, path } = match;
  disarmRefresh();
  // lastHashShown is the page actually on screen; it moves to the new hash only once that page has rendered (finish), so a navigation
  // superseded before it rendered cannot file the previous page's scroll position under the wrong path.
  if (!quiet) { lastMatch = match; lastCtx = ctxBase; touched = false; touchedOutsideField = false; fieldEdited = false; if (lastHashShown != null) scrollKeeper?.leave(lastHashShown); }
  const live = document.getElementById('announcer');
  if (!route) {
    const updating = h('p', { class: 'muted', role: 'status' });
    root.replaceChildren(h('section', { class: 'card' }, h('h1', { id: 'view-title', tabindex: '-1' }, t('notfound.title')), h('p', { class: 'mono' }, path), updating, h('a', { class: 'btn', href: '#/' }, t('nav.home'))));
    renderNav(null); document.title = `${t('notfound.title')} - ALEF`;
    updateForMissingPage(path, () => { updating.textContent = t('notfound.updating'); });
    return finish();
  }
  if (route.name === 'home' && !settings.get('onboarded')) { ctxBase.route('/welcome'); return; }
  renderNav(route.name);
  try { statbar?.refresh(); } catch { /* the bar is decoration */ }
  document.title = route.name === 'home' ? 'ALEF' : `${titleCase(route.title)} - ALEF`;
  const ctx = { ...ctxBase, params, query, path, routeName: route.name };
  // U-24: never a blank page while a view module loads — a named skeleton
  // stands in, replaced the moment the view mounts (or by the error card).
  // Keep a first-paint title on Learn, Letters and Sounds so LCP can be the heading, not a late view block.
  if (!quiet) {
    const keepTitle = route.name === 'learn' || route.name === 'letter' || route.name === 'sounds';
    const existing = root.querySelector('#view-title');
    const glyph = root.querySelector('.alef-first-glyph');
    if (keepTitle) {
      const title = existing || h('h1', { id: 'view-title', tabindex: '-1' }, firstPaintTitle(route, params));
      title.id = 'view-title';
      title.setAttribute('tabindex', '-1');
      title.className = firstPaintClass(route);
      title.textContent = firstPaintTitle(route, params);
      for (const n of [...root.childNodes]) {
        if (n === title || (route.name === 'letter' && n === glyph)) continue;
        n.remove?.();
      }
      if (!title.parentNode) root.prepend(title);
      if (route.name === 'letter' && glyph && params?.id && rosterById[params.id]) glyph.textContent = rosterById[params.id].he;
    } else {
      root.replaceChildren();
    }
    if (!root.querySelector('.alef-skeleton')) {
      root.append(
        h('div', { class: 'alef-skeleton', 'aria-hidden': 'true' },
          h('div', { class: 'skel-bar skel-title' }), h('div', { class: 'skel-bar' }), h('div', { class: 'skel-bar short' })),
        h('p', { class: 'muted alef-skeleton-note' }, `Loading ${route.title}…`));
    }
  }
  root.setAttribute('aria-busy', 'true');
  let mod;
  try { mod = await loadRouteModule(route); }
  catch (err) {
    if (token !== navToken) return;
    // Offline and the screen's code is not on this device yet (an on-demand page never opened online): say that, not "did not load".
    unavailableCard(root, { title: route.title, t, module: route.module, error: err?.message, kind: globalThis.navigator?.onLine === false ? 'offline' : 'error' });
    root.removeAttribute('aria-busy'); return finish();
  }
  if (token !== navToken) return;
  try {
    if (typeof mod.mount !== 'function') throw new Error('module has no mount(root, ctx) export');
    // Keep #view-title (already painted, often the LCP element) and only drop the skeleton.
    for (const n of [...root.querySelectorAll('.alef-skeleton, .alef-skeleton-note')]) n.remove();
    const u = await mod.mount(root, ctx);
    // Superseded while mounting: this view's cleanup would never be registered (unmount now belongs to the newer navigation), so run it here.
    if (token !== navToken) { if (typeof u === 'function') { try { u(); } catch (e) { console.warn('unmount failed', e); } } return; }
    if (typeof u === 'function') unmount = u;
  } catch (err) {
    if (token !== navToken) { console.warn(`view ${route.name} failed after being superseded`, err); return; }
    console.error(`view ${route.name} failed`, err);
    unavailableCard(root, { title: route.title, t, module: route.module, error: err?.message, kind: 'error' });
  }
  if (route.name === 'letter' && params?.id && token === navToken) { // "Letter Bet - ALEF" rather than a generic title; falls back to the id, then to the route title
    let nm = '';
    try { const L = await (await fetch(new URL('../data/letters/letters.json', import.meta.url))).json(); nm = (Array.isArray(L) ? L : L.letters || []).find((x) => x.id === params.id)?.name || ''; } catch { /* keep the generic title */ }
    if (token === navToken) document.title = `${route.title} ${nm || params.id.charAt(0).toUpperCase() + params.id.slice(1)} - ALEF`;
  }
  // No preview note on pages: every page is presented as a finished part of Aleph.
  root.removeAttribute('aria-busy');
  finish();

  function finish() {
    // Every screen needs a level-one heading and a focus target. Views should provide `<h1 id="view-title">`; if one does
    // not (some lane views still don't), add a visually hidden one from the route title so screen readers have a heading.
    if (!root.querySelector('h1')) {
      root.prepend(h('h1', { id: 'view-title', class: 'visually-hidden', tabindex: '-1' }, route?.title ?? t('notfound.title')));
    }
    // focus management on navigation: move focus to the view heading, announce title, reset scroll
    const hd = root.querySelector('#view-title, h1');
    if (hd && !firstShow && (!quiet || navFocusOwed)) { if (!hd.hasAttribute('tabindex')) hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    firstShow = false; navFocusOwed = false;
    if (quiet && heldFocusId && (!document.activeElement || document.activeElement === document.body)) document.getElementById(heldFocusId)?.focus({ preventScroll: true });
    heldFocusId = '';
    if (!quiet) { live.textContent = document.title; if (scrollKeeper) scrollKeeper.arrive(location.hash); else window.scrollTo(0, 0); lastHashShown = location.hash; }
    document.body.dataset.route = route?.name ?? 'notfound';
    try { updateCompanions(route?.name, { R: ctx.images, voice: ctx.settings?.get?.('voice') }); } catch (e) { console.warn('companions band failed', e); } // Ari and Noa on every screen; a band fault must not break the view
    try { syncGameMusic(route, settings); } catch (e) { console.warn('game music bar failed', e); }
    document.body.dataset.ready = '1';
    document.dispatchEvent(new Event('alef:ready'));
    shownFirstResolve();
  }
}

async function boot() {
  try { watchTitleCase(document.body); } catch { /* casing is cosmetic */ }
  mountRimon({store});
  // Bold stills are decoration: a missing file or a mount fault must not break boot.
  try { mountRimonStillsLazy(); } catch (e) { console.warn('rimon stills failed', e); } // fetched on the first big moment, not on Home
  // Day-start stamp (Early Bird / Night Owl evidence): first opening of the day, before any study can happen.
  try { stampDayStart(store, Date.now()); } catch { /* stamp is an addition */ }
  // The skip link's #main href would be read by the hash router as the route "/main"; focus <main> directly instead.
  document.querySelector('.skip-link')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('main')?.focus(); });
  applyTheme(); applyScript(); applyComfortNow(); applyMotor(document.documentElement, settings.all()); wireChrome();
  settings.subscribe((all, changed) => { if (changed.some((k) => MOTOR_KEYS.includes(k))) applyMotor(document.documentElement, all); if (changed.includes('theme')) applyTheme(); if (changed.includes('script')) applyScript(); if (changed.some((k) => COMFORT_KEYS.includes(k))) applyComfortNow(); });
  const audio = await makeAudio();
  gameMusic.usePrefs({
    readPrefs: () => ({
      // Music starts with the game by default, like sound effects (owner
      // order, Nov 7 2026). Only an explicit off in the music bar is kept.
      want: settings.get('gameMusic') === true,
      muted: settings.get('gameMusicMuted') === true,
      volume: settings.get('gameMusicVolume'),
      trackId: settings.get('gameMusicTrack'),
      picked: settings.get('gameMusicPicked') === true,
    }),
    writePrefs: (p) => settings.set({
      gameMusic: !!p.want, gameMusicMuted: !!p.muted, gameMusicVolume: p.volume, gameMusicTrack: p.trackId, gameMusicPicked: !!p.picked,
    }),
  });
  try { mountGameMusic(document.body); } catch { /* the bar appears once a game route asks for it */ }
  // Lesson finished: a few seconds of an original song, only with music turned on (rules in src/audio/sting.js).
  document.addEventListener('alef:celebrate', () => { import('./audio/sting.js').then((m) => m.playSting({ settings })).catch(() => {}); });
  try { mountMediaPrompt(document.body, settings); } catch { /* the prompt is optional */ }
  const mainEl = document.getElementById('main');
  const gesture = (e) => { touched = true; if (!(e.target instanceof Element && e.target.closest('input, textarea, select'))) touchedOutsideField = true; };
  mainEl.addEventListener('pointerdown', gesture, true);
  mainEl.addEventListener('keydown', gesture, true);
  mainEl.addEventListener('input', () => { fieldEdited = true; }, true);
  mainEl.addEventListener('change', () => { fieldEdited = true; }, true);
  // iOS audio unlock: prime the sound engines synchronously inside the first gesture (src/shell/audio.js createAudioUnlock)
  const unlockOnce = () => { try { audio.unlock?.(); } catch { /* ignore */ } for (const t of ['pointerdown', 'keydown', 'touchend']) document.removeEventListener(t, unlockOnce, true); };
  for (const t of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(t, unlockOnce, true);
  available = availableRoutes(VIEW_FILES);
  wireSoundStatus(audio);
  for (const btn of document.querySelectorAll('.sound-rate')) {
    btn.addEventListener('click', () => {
      const rate = btn.getAttribute('data-rate') === 'slow' ? 'slow' : 'normal';
      settings.set({ clipRate: rate });
      for (const b of document.querySelectorAll('.sound-rate')) b.setAttribute('aria-pressed', String(b === btn));
    });
  }
  const savedRate = settings.get('clipRate') === 'slow' ? 'slow' : 'normal';
  for (const b of document.querySelectorAll('.sound-rate')) b.setAttribute('aria-pressed', String(b.getAttribute('data-rate') === savedRate));
  import('./shell/audio-access.js').then((m) => { soundBar = m.wireSoundBar(audio); }).catch(() => {});
  let router;
  let images = null;
  const resolveImages = () => loadImageResolver((u) => fetch(u).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }), { settings });
  // No route waits for picture approvals or the image index before first paint.
  // After the first view has painted, load the resolver and fill the teacher band;
  // the next navigation (or a later quiet refresh) can draw pictures.
  const lessonSfx = { play(name) { try { sfx.enter({ settings }); return sfx.play(name === 'correct' ? 'success' : name === 'wrong' ? 'miss' : name); } catch { return false; } } }; // lessons and First day share the games' CC0 set
  const ctxBase = { settings, store, audio, sfx: lessonSfx, route: (p) => { scrollKeeper?.markForward(); router.go(p); }, t, installPrompt, hasRoute: (name) => available.has(name), images, img: (hh, spec) => (images ? imgEl(hh, { R: images, ...spec }) : null) };
  router = createRouter((m) => { show(m, ctxBase); });
  window.alef = { settings, store, audio, router }; // debugging handle
  // Rimon's study reminders: armed at boot only when the learner turned them on (src/shell/notify.js; nothing is asked here).
  Promise.resolve().then(() => store.get('notify.prefs')).then((p) => { if (p && p.enabled === true) return import('./shell/notify.js').then((m) => m.armFromPrefs(ctxBase)); }).catch(() => {});
  router.start();
  if (firstIsHome) {
    // Deferring the optional resolver avoids blocking the hero and the first
    // usable lesson. A later route sees the loaded resolver in the shared ctx.
    shownFirst.then(() => afterPaint(async () => {
      try { images = await resolveImages(); ctxBase.images = images; try { updateCompanions(document.body.dataset.route, { R: images, voice: settings.get('voice') }); } catch { /* band fills on next navigation */ } } catch { images = null; }
    })).catch(() => {});
  }
  import('./shell/boot-hooks.js').then((m) => m.armReminders(ctxBase)).catch(() => {});
  shownFirst.then(() => import('./shell/boot-hooks.js')).then((m) => m.armRetention(ctxBase)).catch(() => {}); // streak freezes, XP, gems, hearts, league (src/retention/, lazy)
  import('./morning/boot.js').then((m) => m.startMorning({ store, audio })).catch(() => {});
  shownFirst.then(() => import('./shell/statbar.js')).then((m) => { statbar = m.mountStatbar({ store, settings }); }).catch(() => {});
  scheduleManifest(audio);
  startShardLoading(audio);
  const swc = swContainer();
  if (swc) { try { swc.register('sw.js').catch((e) => console.warn('service worker not registered', e)); } catch (e) { console.warn('service worker not registered', e); } }
  // Always: the storage notice (private mode, quota) matters most where there is no service worker; the update banner is inert there.
  import('./shell/update.js').then((m) => { window.alef.update = m.startUpdateBanner().handle; }).catch(() => {});
  // Brain Lab is a v0 page whose files are on demand: keep them on the device once per build (src/shell/warm-routes.js).
  if (swc && available.has('lab')) shownFirst.then(() => afterPaint(() => import('./shell/warm-routes.js').then((m) => m.warmFiles(m.LAB_FILES)).then((r) => { document.body.dataset.labWarm = r; }))).catch(() => {});
}

/**
 * The address is not a page in this build. It may be a page a newer build has (Nov 9: the newer Games page linked to Brain Lab for
 * learners still running the build before it). If an update is waiting, or turns up within a few seconds, apply it now: nothing is in
 * progress on this screen, and the reload opens the same address in the new build. It cannot loop: after the reload no update is
 * waiting, so an address the new build lacks too just shows "Page not found". Nothing is stored.
 */
let missingPageStop = () => {};
function updateForMissingPage(path, onUpdating) {
  missingPageStop(); missingPageStop = () => {};
  const handleNow = () => window.alef?.update;
  const waitHandle = async () => { for (let i = 0; i < 20 && !handleNow(); i++) await new Promise((r) => setTimeout(r, 250)); return handleNow(); };
  import('./shell/update.js').then(async (m) => {
    const handle = await waitHandle();
    if (!handle || location.hash.split('?')[0] !== '#' + path) return; // the learner has moved on
    missingPageStop = m.updateForMissingPage(handle, { onUpdating });
    const stopOnLeave = () => { window.removeEventListener('hashchange', stopOnLeave); missingPageStop(); };
    window.addEventListener('hashchange', stopOnLeave);
  }).catch(() => {});
}

window.addEventListener('error', (e) => { document.body.dataset.lastError = e.message; });
boot().catch((e) => {
  console.error(e);
  document.getElementById('main').textContent = 'ALEF could not start. Reload the page. If it keeps happening, try another browser.';
});
