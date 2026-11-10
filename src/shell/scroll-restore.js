// @ts-check
// Scroll position restore for the hash router (mobile FINDINGS item 3).
// The router re-renders on every hashchange and app.js used to scrollTo(0,0) each time, so Back landed at the top of a long
// list. Hash navigations do not get the browser's own scroll restoration (the document never unloads), so this keeps one
// scrollY per path in sessionStorage (per tab, gone when the tab closes) and puts it back on Back/Forward only.
//
// Back/Forward detection: `popstate` is no use on its own, because browsers also fire it when a page sets location.hash.
// Instead every navigation the app starts itself (a click on an `a[href^="#"]` or ctx.route()) is marked with markForward()
// before the hash changes; a hashchange that was not marked is a history traversal (Back, Forward, or a typed URL) and restores.
// DOM-free and injectable so it runs in Node tests.
export const KEY = 'alef.scroll.v1';
const MAX_ENTRIES = 60;

/** '#/learn?x=1' | '/learn' -> '/learn?x=1' */
export function normalizePath(hash) {
  let h = String(hash || '').replace(/^#/, '');
  if (!h.startsWith('/')) h = '/' + h;
  return h;
}

/**
 * @param {{storage?:any, scrollTo?:(x:number,y:number)=>void, scrollY?:()=>number, raf?:(f:Function)=>any}} [o]
 *   storage: sessionStorage-like; defaults to globalThis.sessionStorage; everything is best effort and never throws.
 */
export function createScrollRestore(o = {}) {
  const g = /** @type {any} */ (globalThis);
  const storage = o.storage !== undefined ? o.storage : (() => { try { return g.sessionStorage; } catch { return null; } })();
  const scrollTo = o.scrollTo || ((x, y) => { try { g.scrollTo(x, y); } catch { /* ignore */ } });
  const scrollY = o.scrollY || (() => { try { return Number(g.scrollY ?? g.pageYOffset) || 0; } catch { return 0; } });
  const raf = o.raf || ((f) => { try { return typeof g.requestAnimationFrame === 'function' ? g.requestAnimationFrame(f) : null; } catch { return null; } });
  let forward = false;

  const load = () => { try { const v = JSON.parse(storage?.getItem(KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
  const save = (m) => { try { storage?.setItem(KEY, JSON.stringify(m)); } catch { /* quota / private mode: forget it */ } };

  return {
    /** The next hashchange is a navigation the app started (link or route()): do not restore, scroll to the top. */
    markForward() { forward = true; },
    /** For tests and debugging. */
    get pendingForward() { return forward; },
    /** Remember where the learner was on `path` (call before the view unmounts). */
    leave(path) {
      if (path == null) return;
      const m = load(); const y = Math.max(0, Math.round(scrollY()));
      m[normalizePath(path)] = y;
      const keys = Object.keys(m); if (keys.length > MAX_ENTRIES) for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete m[k];
      save(m);
    },
    /** The view for `path` is mounted. Restores on a traversal, otherwise scrolls to the top. @returns {{restored:boolean, y:number}} */
    arrive(path) {
      const wasForward = forward; forward = false;
      const saved = wasForward ? undefined : load()[normalizePath(path)];
      const y = Number.isFinite(saved) && saved > 0 ? saved : 0;
      scrollTo(0, y);
      if (y > 0) raf(() => scrollTo(0, y)); // once more after layout, for views whose height settles a frame later
      return { restored: y > 0, y };
    },
    saved(path) { const v = load()[normalizePath(path)]; return Number.isFinite(v) ? v : null; },
  };
}
