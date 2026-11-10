// @ts-check
// Brain Lab works offline and on a weak connection.
//
// Brain Lab (#/lab) is a v0 page linked from Learn, but its code and its word lists are not in the first install:
// tools/build-precache.mjs lists them as on-demand so the first install stays under its 4 MiB budget. On-demand files reach
// the device only when a page asks for them, and sw.js keeps that copy per build (it drops the copy when the next build
// takes over). So, before this, Brain Lab showed "This screen did not load" when the app was offline, or waited on a stalled
// connection, until it had been opened online once, and again after every update.
//
// warmFiles() asks for those files once, after the first paint, while the app is online and the service worker controls
// the page; sw.js stores each answer, so the next open works with no connection. A file the worker already holds is not
// fetched again. Data saver, offline, or no service worker: nothing is fetched.

/** Root of the app (this file is src/shell/warm-routes.js). */
const ROOT = new URL('../../', import.meta.url);

/**
 * Brain Lab files that are not in the first install: the on-demand modules Brain Lab imports, and the data files its drills
 * load. tests/warm-routes.test.js rebuilds this list from the code and the precache rules, and fails if it drifts.
 * Fetched once per build (the six games added 2026-11-10 brought about 70 KB: their code and data/lab/words.json; the 3D Studio
 * games add lab.studio.js and lab.art.js; their 3D scene module lab.fx3d.js and the studio pictures load only when a studio game opens).
 */
export const LAB_FILES = Object.freeze([
  'src/lab/lab.view.js', 'src/lab/lab.core.js', 'src/lab/lab.games.js', 'src/lab/lab.games2.js', 'src/lab/lab.studio.js', 'src/lab/lab.art.js', 'src/games/engine.js',
  'data/lab/syllables.json', 'data/lab/numbers.json', 'data/lab/words.json', 'data/roots/families.json',
]);

/**
 * Fetch, one at a time, each file the service worker has not stored yet. Never throws.
 * @param {readonly string[]} files paths from the app root
 * @param {{fetchFn?:Function, cachesApi?:any, navigatorLike?:any, root?:URL|string, timeoutMs?:number}} [o]
 * @returns {Promise<'skipped'|'offline'|'saver'|'warmed'|'partial'>}
 */
export async function warmFiles(files, { fetchFn = globalThis.fetch, cachesApi = globalThis.caches, navigatorLike = globalThis.navigator, root = ROOT, timeoutMs = 20000 } = {}) {
  try {
    const sw = navigatorLike?.serviceWorker;
    if (!sw || typeof fetchFn !== 'function' || typeof cachesApi?.match !== 'function') return 'skipped';
    if (navigatorLike.onLine === false) return 'offline';
    if (navigatorLike.connection?.saveData) return 'saver';
    if (!sw.controller) { // a first install: the worker claims the page when it activates; wait for that, but not forever
      await new Promise((res) => {
        const t = setTimeout(res, timeoutMs);
        sw.addEventListener?.('controllerchange', () => { clearTimeout(t); res(undefined); }, { once: true });
        if (sw.controller) { clearTimeout(t); res(undefined); }
      });
      if (!sw.controller) return 'skipped'; // without a worker a fetched copy would not be kept
    }
    let missed = 0;
    for (const f of files) {
      if (navigatorLike.onLine === false) return 'offline';
      const url = new URL(f, root).href;
      if (await cachesApi.match(url)) continue;
      try {
        const res = await fetchFn(url);
        if (!res?.ok) { missed++; continue; }
        await res.arrayBuffer?.(); // read to the end so the worker's copy is complete
      } catch { missed++; }
    }
    return missed ? 'partial' : 'warmed';
  } catch { return 'partial'; }
}
