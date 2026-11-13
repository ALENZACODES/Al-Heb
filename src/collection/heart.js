// @ts-check
// S3 the heart, on every page: one tap saves the page being looked at to My Collection as a favorite; a second tap takes it off.
// Fetched after a page has been shown (never part of the first install). The same call writes the page into the learner's own
// diary of pages opened (S5 timeline) and, for a text, onto the reading shelf with its place (S10). All of it stays on this device.
import { KEY, read, write, toggleFav, isFav } from './model.js';
import { VISITS_KEY, addVisit, kindOfRoute } from './diary.js';

// Pages that are not content: no heart and no diary line.
export const SKIP = new Set(['home', 'welcome', 'collection', 'timeline', 'my-hebrew', 'paths', 'shelf', 'settings', 'search', 'focus', 'privacy', 'terms', 'credits', 'about', 'help', 'how',
  'install', 'offline', 'move', 'my-data', 'accessibility', 'reminders', 'shortcuts', 'whats-new', 'placement', 'firstday', 'firstwin', 'share', 'classsummary']);

/** What would be saved for the page on screen. */
export function pageItem(route, hash, heading) {
  const href = typeof hash === 'string' && hash.startsWith('#/') ? hash : '#' + (route?.pattern || '/');
  return { kind: kindOfRoute(route), title: String(heading || route?.title || 'Page').trim().slice(0, 160), href };
}

/**
 * @param {HTMLElement} root the page @param {{name:string,title:string,pattern:string,module?:string}} route @param {{store?:any}} ctx
 * @param {{hash?:string, doc?:Document, now?:()=>number}} [env]
 */
export async function attach(root, route, ctx, env = {}) {
  if (!route || SKIP.has(route.name) || !ctx?.store) return null;
  const doc = env.doc || globalThis.document; const now = env.now || (() => Date.now());
  const hash = env.hash ?? globalThis.location?.hash ?? '';
  const heading = (root.querySelector?.('#view-title') || root.querySelector?.('h1'))?.textContent || route.title;
  const item = pageItem(route, hash, heading);
  await write(ctx.store, VISITS_KEY, addVisit(await read(ctx.store, VISITS_KEY), { name: route.name, title: item.title, hash: item.href }, now()));
  if (!doc || root.querySelector?.('[data-collection-heart]')) return null;
  const status = doc.createElement('span'); status.setAttribute('role', 'status'); status.className = 'muted';
  const btn = doc.createElement('button'); btn.type = 'button'; btn.className = 'btn secondary'; btn.setAttribute('data-collection-heart', '');
  const paint = (on) => { btn.textContent = on ? '♥ Saved' : '♡ Save'; btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? `Saved to My Collection: ${item.title}. Press to take it off.` : `Save to My Collection: ${item.title}`); };
  paint(isFav(await read(ctx.store), item));
  btn.addEventListener('click', async () => {
    const r = toggleFav(await read(ctx.store), item, now());
    if (r.error) { status.textContent = ' ' + r.error; return; }
    const ok = await write(ctx.store, KEY, r.rec);
    paint(ok && r.fav);
    status.textContent = ok ? (r.fav ? ' Saved to My Collection.' : ' Taken off your favorites.') : ' This could not be saved on this device.';
  });
  const link = doc.createElement('a'); link.href = '#/collection'; link.textContent = 'My Collection';
  const box = doc.createElement('p'); box.className = 'collection-heart'; box.append(btn, ' ', link, status);
  root.append(box);
  return box;
}
