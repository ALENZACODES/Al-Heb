// ALEF boot: wires store, settings, audio, router, and lazily mounted views.
import { store } from './store.js';
import { createSettings } from './shell/settings.js';
import { createRouter, ROUTES, loadRouteModule, availableRoutes } from './shell/router.js';
import { VIEW_FILES } from './shell/views.generated.js';
import { renderNav as renderNavBar } from './shell/nav.js';
import { mountPreviewBanner } from './shell/preview-banner.js';
import { t, tHe } from './shell/i18n.js';
import { createStubAudio } from './shell/audio-stub.js';
import { createShellAudio } from './shell/audio.js';
import { createShardLoader } from './shell/audio-shards.js';
import { fetchCoreManifest, afterPaint } from './shell/audio-manifest.js';
import { h, heSpan, unavailableCard } from './shell/ui.js';
import { loadImageResolver, img as imgEl } from './img/resolve.js';

const settings = createSettings(store);

/** The player module is small and loads at boot; the ~1.3 MB core manifest does NOT: it resolves after first paint (see scheduleManifest). */
async function makeAudio() {
  try {
    const m = await import('./audio/player.js');
    if (typeof m.createAudio !== 'function') throw new Error('player unavailable');
    return createShellAudio({ settings, loadManifest: () => fetchCoreManifest((u) => fetch(u)), createAudio: m.createAudio });
  } catch (e) { console.warn('lane 4 audio player not used:', e?.message); }
  return createStubAudio({ settings });
}
let lastCtx = null, lastMatch = null, touched = false;
// Scroll restore on Back (src/shell/scroll-restore.js): loaded lazily; until it loads (or offline before it is precached) every
// navigation just scrolls to the top as before. Links and ctx.route() mark a forward navigation; an unmarked hashchange is Back/Forward.
let scrollKeeper = null, lastHashShown = null;
import('./shell/scroll-restore.js').then((m) => { scrollKeeper = m.createScrollRestore(); }).catch(() => {});
document.addEventListener('click', (e) => { const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null; if (a && !a.getAttribute('href').startsWith('#main')) scrollKeeper?.markForward(); }, true);
// Progress protection (mobile FINDINGS item 4): ask for persistent storage the first time real progress (any non-settings key)
// is written, not only when Settings is opened. Once per page load; the answer is logged once and never shown as an error.
let persistAsked = false;
store.subscribe((key, _value, info) => {
  if (persistAsked || key === 'settings' || info?.external) return;
  persistAsked = true;
  import('./shell/backup.js').then((m) => m.requestPersistence()).then((r) => { if (r?.supported) console.info(`storage persistence after first save of "${key}": ${r.persisted ? 'granted' : 'not granted (keep a backup file)'}`); }).catch(() => {});
});
/** After the first route has rendered: load the core manifest in an idle slot; if it arrives and the learner has not touched the
 * page since the route mounted, re-render that route once so audio buttons reflect the real manifest. Otherwise they keep the
 * honest "checking" state until the next navigation (never a claim that a clip exists). */
function scheduleManifest(audio) {
  if (typeof audio.ensureManifest !== 'function') return;
  const go = async () => {
    const was = lastMatch;
    const ok = await audio.ensureManifest();
    document.body.dataset.audioManifest = audio.manifestState;
    if (ok && was && was === lastMatch && !touched && lastCtx) show(was, lastCtx, { quiet: true });
  };
  window.alefManifest = new Promise((res) => { shownFirst.then(() => afterPaint(() => go().then(res, res))); });
}
let shownFirstResolve; const shownFirst = new Promise((r) => { shownFirstResolve = r; });
function wireSoundStatus(audio) {
  const el = document.getElementById('sound-status');
  if (!el) return;
  if (typeof audio.subscribe === 'function') audio.subscribe((s) => { el.textContent = s.text; el.dataset.mode = s.mode; });
  else { el.textContent = "Sound: your browser's text-to-speech voice (fallback player). No recordings."; el.dataset.mode = 'tts'; }
}

/** After first paint: lazily load the word-clip shard for the learner's congregation, and reload it when the setting changes. */
function startShardLoading(audio) {
  if (typeof audio.extend !== 'function') return; // stub player: nothing to extend
  const loader = createShardLoader({
    fetch: (u) => fetch(u), audio, settings,
    onState: (s) => { audio.setNote?.(s.note); document.body.dataset.audioShard = s.state; },
  });
  loader.watch();
  window.alefShards = loader;
  const go = () => { loader.load(); };
  requestAnimationFrame(() => setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2000 }) : go()), 0));
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

/** Names of routes whose view file exists in this build (from the generated view list). */
let available = availableRoutes(VIEW_FILES);

/** Navigation (bottom bar of four section tabs + the More menu) lives in shell/nav.js; see docs/nav/NAV.md. */
function renderNav(current) {
  renderNavBar(current, { routes: ROUTES, available });
  setMore(false);
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
  // the one-line sound status is cut with an ellipsis on a phone; tap it to read the whole message
  const st = document.getElementById('sound-status');
  st.addEventListener('click', () => st.classList.toggle('open'));
}

// WCAG 2.4.11: on phones the bottom nav is position:fixed; keep the keyboard-focused control above it.
document.addEventListener('focusin', (e) => {
  const nav = document.querySelector('.site-nav'); const el = e.target;
  if (!nav || !(el instanceof Element) || el.closest('.site-nav') || getComputedStyle(nav).position !== 'fixed') return;
  requestAnimationFrame(() => {
    if (document.activeElement !== el) return;
    const over = el.getBoundingClientRect().bottom - nav.getBoundingClientRect().top;
    if (over > 0) window.scrollBy({ top: over + 8, behavior: 'instant' });
  });
});

let unmount = () => {};
let navToken = 0;
let firstShow = true; // do not steal focus on the initial page load (keyboard users start at the skip link)

async function show(match, ctxBase, { quiet = false } = {}) {
  const token = ++navToken;
  const root = document.getElementById('main');
  try { unmount(); } catch (e) { console.warn('unmount failed', e); }
  unmount = () => {};
  const { route, params, query, path } = match;
  if (!quiet) { lastMatch = match; lastCtx = ctxBase; touched = false; if (lastHashShown != null) scrollKeeper?.leave(lastHashShown); lastHashShown = location.hash; }
  const live = document.getElementById('announcer');
  if (!route) {
    root.replaceChildren(h('section', { class: 'card' }, h('h1', { id: 'view-title', tabindex: '-1' }, t('notfound.title')), h('p', { class: 'mono' }, path), h('a', { class: 'btn', href: '#/' }, t('nav.home'))));
    renderNav(null); document.title = `${t('notfound.title')} - ALEF`; return finish();
  }
  if (route.name === 'home' && !settings.get('onboarded')) { ctxBase.route('/welcome'); return; }
  renderNav(route.name);
  document.title = route.name === 'home' ? 'ALEF' : `${route.title} - ALEF`;
  const ctx = { ...ctxBase, params, query, path, routeName: route.name };
  root.setAttribute('aria-busy', 'true');
  let mod;
  try { mod = await loadRouteModule(route); }
  catch (err) {
    if (token !== navToken) return;
    unavailableCard(root, { title: route.title, t, module: route.module, error: err?.message });
    root.removeAttribute('aria-busy'); return finish();
  }
  if (token !== navToken) return;
  try {
    if (typeof mod.mount !== 'function') throw new Error('module has no mount(root, ctx) export');
    root.replaceChildren();
    const u = await mod.mount(root, ctx);
    if (typeof u === 'function') unmount = u;
    mountPreviewBanner(root, route); // preview-tier pages (docs/v0/SCOPE.md) get a small "unreviewed, may change" note on top
  } catch (err) {
    console.error(`view ${route.name} failed`, err);
    unavailableCard(root, { title: route.title, t, module: route.module, error: err?.message, kind: 'error' });
  }
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
    if (hd && !firstShow && !quiet) { if (!hd.hasAttribute('tabindex')) hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    firstShow = false;
    if (!quiet) { live.textContent = document.title; if (scrollKeeper) scrollKeeper.arrive(location.hash); else window.scrollTo(0, 0); }
    document.body.dataset.route = route?.name ?? 'notfound';
    document.body.dataset.ready = '1';
    shownFirstResolve();
  }
}

async function boot() {
  // The skip link's #main href would be read by the hash router as the route "/main"; focus <main> directly instead.
  document.querySelector('.skip-link')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('main')?.focus(); });
  applyTheme(); applyScript(); wireChrome();
  settings.subscribe((_, changed) => { if (changed.includes('theme')) applyTheme(); if (changed.includes('script')) applyScript(); });
  const audio = await makeAudio();
  document.getElementById('main').addEventListener('pointerdown', () => { touched = true; }, true);
  document.getElementById('main').addEventListener('keydown', () => { touched = true; }, true);
  // iOS audio unlock: prime the sound engines synchronously inside the first gesture (src/shell/audio.js createAudioUnlock)
  const unlockOnce = () => { try { audio.unlock?.(); } catch { /* ignore */ } for (const t of ['pointerdown', 'keydown', 'touchend']) document.removeEventListener(t, unlockOnce, true); };
  for (const t of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(t, unlockOnce, true);
  available = availableRoutes(VIEW_FILES);
  wireSoundStatus(audio);
  import('./shell/audio-access.js').then((m) => import('./shell/ui.js').then((u) => m.mountAudioBanner(u.h, audio))).catch(() => {});
  let router;
  let images = null;
  try { images = await loadImageResolver((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }), { settings }); } catch { images = null; }
  const ctxBase = { settings, store, audio, route: (p) => { scrollKeeper?.markForward(); router.go(p); }, t, installPrompt, hasRoute: (name) => available.has(name), images, img: (hh, spec) => (images ? imgEl(hh, { R: images, ...spec }) : null) };
  router = createRouter((m) => { show(m, ctxBase); });
  window.alef = { settings, store, audio, router }; // debugging handle
  router.start();
  import('./shell/boot-hooks.js').then((m) => m.armReminders(ctxBase)).catch(() => {});
  import('./morning/boot.js').then((m) => m.startMorning({ store, audio })).catch(() => {});
  scheduleManifest(audio);
  startShardLoading(audio);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('service worker not registered', e));
  }
  // Always: the storage notice (private mode, quota) matters most where there is no service worker; the update banner is inert there.
  import('./shell/update.js').then((m) => { window.alef.update = m.startUpdateBanner().handle; }).catch(() => {});
}

window.addEventListener('error', (e) => { document.body.dataset.lastError = e.message; });
boot().catch((e) => {
  console.error(e);
  document.getElementById('main').textContent = 'ALEF failed to start: ' + e.message;
});
