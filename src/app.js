// ALEF boot: wires store, settings, audio, router, and lazily mounted views.
import { store } from './store.js';
import { createSettings } from './shell/settings.js';
import { createRouter, ROUTES, loadRouteModule, availableRoutes } from './shell/router.js';
import { VIEW_FILES } from './shell/views.generated.js';
import { t, tHe } from './shell/i18n.js';
import { createStubAudio } from './shell/audio-stub.js';
import { createShellAudio } from './shell/audio.js';
import { h, heSpan, unavailableCard } from './shell/ui.js';

const settings = createSettings(store);

async function makeAudio() {
  try {
    const [m, res] = await Promise.all([import('./audio/player.js'), fetch('data/audio/manifest.json')]);
    if (typeof m.createAudio !== 'function' || !res.ok) throw new Error('player or manifest unavailable');
    return createShellAudio({ settings, manifest: await res.json(), createAudio: m.createAudio });
  } catch (e) { console.warn('lane 4 audio player not used:', e?.message); }
  return createStubAudio({ settings });
}
function wireSoundStatus(audio) {
  const el = document.getElementById('sound-status');
  if (!el) return;
  if (typeof audio.subscribe === 'function') audio.subscribe((s) => { el.textContent = s.text; el.dataset.mode = s.mode; });
  else { el.textContent = "Sound: your browser's text-to-speech voice (fallback player). No recordings."; el.dataset.mode = 'tts'; }
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

/** Phone bottom bar shows these five; everything else with a nav entry goes in the "More" sheet (on wide screens both lists sit in one row). */
const MAIN_NAV = ['home', 'learn', 'letters', 'sounds', 'read'];
function navCurrent(r, current) {
  return current === r.name || (r.name === 'letters' && current === 'letter') || (r.name === 'read' && current === 'text') || (r.name === 'learn' && ['loanwords', 'loanword', 'spotit', 'checkpoint', 'dialogues', 'dialogue'].includes(current));
}
function renderNav(current) {
  const nav = document.getElementById('nav'), more = document.getElementById('nav-more'), btn = document.getElementById('more-btn');
  const item = (r) => h('li', {}, h('a', { href: '#' + (r.pattern === '/' ? '/' : r.pattern), 'aria-current': navCurrent(r, current) ? 'page' : null },
    h('span', {}, t(r.nav)), tHe(r.nav) ? heSpan(tHe(r.nav), 'he nav-he') : null));
  const rs = ROUTES.filter((r) => r.nav && available.has(r.name));
  const main = rs.filter((r) => MAIN_NAV.includes(r.name)), rest = rs.filter((r) => !MAIN_NAV.includes(r.name));
  nav.replaceChildren(...main.map(item));
  more.replaceChildren(...rest.map(item));
  btn.hidden = rest.length === 0;
  btn.toggleAttribute('data-current', rest.some((r) => navCurrent(r, current)));
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
  // the one-line sound status is cut with an ellipsis on a phone; tap it to read the whole message
  const st = document.getElementById('sound-status');
  st.addEventListener('click', () => st.classList.toggle('open'));
}

let unmount = () => {};
let navToken = 0;
let firstShow = true; // do not steal focus on the initial page load (keyboard users start at the skip link)

async function show(match, ctxBase) {
  const token = ++navToken;
  const root = document.getElementById('main');
  try { unmount(); } catch (e) { console.warn('unmount failed', e); }
  unmount = () => {};
  const { route, params, query, path } = match;
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
    if (hd && !firstShow) { if (!hd.hasAttribute('tabindex')) hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    firstShow = false;
    live.textContent = document.title;
    window.scrollTo(0, 0);
    document.body.dataset.route = route?.name ?? 'notfound';
    document.body.dataset.ready = '1';
  }
}

async function boot() {
  // The skip link's #main href would be read by the hash router as the route "/main"; focus <main> directly instead.
  document.querySelector('.skip-link')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('main')?.focus(); });
  applyTheme(); applyScript(); wireChrome();
  settings.subscribe((_, changed) => { if (changed.includes('theme')) applyTheme(); if (changed.includes('script')) applyScript(); });
  const audio = await makeAudio();
  available = availableRoutes(VIEW_FILES);
  wireSoundStatus(audio);
  let router;
  const ctxBase = { settings, store, audio, route: (p) => router.go(p), t, installPrompt, hasRoute: (name) => available.has(name) };
  router = createRouter((m) => { show(m, ctxBase); });
  window.alef = { settings, store, audio, router }; // debugging handle
  router.start();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('service worker not registered', e));
  }
}

window.addEventListener('error', (e) => { document.body.dataset.lastError = e.message; });
boot().catch((e) => {
  console.error(e);
  document.getElementById('main').textContent = 'ALEF failed to start: ' + e.message;
});
