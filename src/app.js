// ALEF boot: wires store, settings, audio, router, and lazily mounted views.
import { store } from './store.js';
import { createSettings } from './shell/settings.js';
import { createRouter, ROUTES, loadRouteModule } from './shell/router.js';
import { t, tHe } from './shell/i18n.js';
import { createStubAudio } from './shell/audio-stub.js';
import { h, heSpan, unavailableCard } from './shell/ui.js';

const settings = createSettings(store);

async function makeAudio() {
  try {
    const m = await import('./audio/player.js');
    if (typeof m.createAudio === 'function') return m.createAudio({ settings });
  } catch { /* lane 4 not present: fall back */ }
  return createStubAudio({ settings });
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

function renderNav(current) {
  const nav = document.getElementById('nav');
  nav.replaceChildren(...ROUTES.filter((r) => r.nav).map((r) => {
    const a = h('a', { href: '#' + (r.pattern === '/' ? '/' : r.pattern), 'aria-current': current === r.name || (r.name === 'letters' && current === 'letter') || (r.name === 'read' && current === 'text') ? 'page' : null },
      h('span', {}, t(r.nav)), heSpan(tHe(r.nav), 'he nav-he'));
    return h('li', {}, a);
  }));
}

let unmount = () => {};
let navToken = 0;

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
    // focus management: move focus to the view heading, announce title, reset scroll
    const hd = root.querySelector('#view-title, h1');
    if (hd) { if (!hd.hasAttribute('tabindex')) hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    live.textContent = document.title;
    window.scrollTo(0, 0);
    document.body.dataset.route = route?.name ?? 'notfound';
    document.body.dataset.ready = '1';
  }
}

async function boot() {
  applyTheme(); applyScript();
  settings.subscribe((_, changed) => { if (changed.includes('theme')) applyTheme(); if (changed.includes('script')) applyScript(); });
  const audio = await makeAudio();
  let router;
  const ctxBase = { settings, store, audio, route: (p) => router.go(p), t, installPrompt };
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
