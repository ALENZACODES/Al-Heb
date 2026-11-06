// Lazy per-tradition word-clip shards (data/audio/manifest-words-<tradition>.json, group prayer-word).
// This loads ONLY the shard for the learner's congregation setting, when the shell first needs a word clip (see app.js),
// and feeds it to player.extend(). Pure of DOM: fetch/settings/audio are injected so it can be tested with a fake fetch.
export const SHARD_TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const OFFLINE_NOTE = 'audio info unavailable offline';
export const shardPath = (tradition) => `data/audio/manifest-words-${tradition}.json`;

/**
 * @param {{ fetch: Function, audio: {extend?: Function}, settings: {get:Function, subscribe?:Function},
 *           onState?: (s:{state:string, tradition:string, loaded:string|null, note:string}) => void }} o
 * state: 'idle' | 'loading' | 'loaded' | 'missing' (this pronunciation has no word list) | 'offline'
 */
export function createShardLoader({ fetch, audio, settings, onState = () => {} }) {
  const loaded = new Map();   // tradition -> true (entries already given to the player; extend is not repeated)
  let seq = 0;                // latest request wins
  let last = { state: 'idle', tradition: '', loaded: null, note: '' };
  const emit = (s) => { last = s; try { onState(s); } catch { /* ignore */ } };

  async function fetchShard(tradition) {
    let res;
    try { res = await fetch(shardPath(tradition)); } catch { return { offline: true }; }
    if (res.status === 404) return { missing: true };
    if (!res.ok) return { offline: true };
    try {
      const list = await res.json();
      return Array.isArray(list) ? { list } : { offline: true };
    } catch { return { offline: true }; } // e.g. the service worker's offline.html answering a JSON request
  }
  function give(tradition, list) {
    if (loaded.has(tradition)) return;
    audio.extend?.(list); loaded.set(tradition, true);
  }

  /** Load the shard for the current (or given) congregation. Never throws. */
  async function load(tradition = settings.get('congregation')) {
    const my = ++seq;
    if (!SHARD_TRADITIONS.includes(tradition)) { emit({ state: 'idle', tradition, loaded: null, note: '' }); return last; }
    if (loaded.has(tradition)) { emit({ state: 'loaded', tradition, loaded: tradition, note: '' }); return last; }
    emit({ state: 'loading', tradition, loaded: null, note: '' });
    const r = await fetchShard(tradition);
    const used = tradition;
    if (r.missing) {
      if (my !== seq) return last;
      emit({ state: 'missing', tradition, loaded: null, note: 'No word-clip list for this pronunciation on this copy.' });
      return last;
    }
    if (my !== seq) return last; // the setting changed while this was in flight
    if (r.list !== undefined) {
      if (r.list) give(used, r.list);
      emit({ state: used === tradition ? 'loaded' : 'fallback', tradition, loaded: used, note: '' });
    } else {
      emit({ state: 'offline', tradition, loaded: null, note: OFFLINE_NOTE });
    }
    return last;
  }

  /** reload when the congregation setting changes; `enabled()` (default always) lets the shell hold this back until a shard was ever asked for */
  function watch(enabled = () => true) {
    return settings.subscribe?.((_, changed) => { if (Array.isArray(changed) && changed.includes('congregation') && enabled()) load(); });
  }
  return { load, watch, get state() { return last; }, isLoaded: (t) => loaded.has(t) };
}

/**
 * Fresh install: the first page load is not controlled by the service worker, so its shard fetch bypasses the worker's runtime
 * cache. Once the worker is active and controlling this page, fetch the active tradition's shard once more (through the worker)
 * so it is stored for offline use. Keeps the core precache small; only the learner's own shard is fetched. Never throws.
 * Skipped when the page was already controlled at load (the normal fetch already went through the worker).
 * @param {{ fetch: Function, settings: {get:Function}, serviceWorker?: any, timeoutMs?: number }} o
 * @returns {Promise<'skipped'|'warmed'|'unavailable'>}
 */
export async function warmShardAfterInstall({ fetch, settings, serviceWorker, timeoutMs = 20000 }) {
  try {
    if (!serviceWorker || serviceWorker.controller) return 'skipped';
    const tradition = settings.get('congregation');
    if (!SHARD_TRADITIONS.includes(tradition)) return 'skipped';
    await serviceWorker.ready;
    if (!serviceWorker.controller) { // activate() claims clients; wait for that, but not forever
      await new Promise((res) => {
        const t = setTimeout(res, timeoutMs);
        serviceWorker.addEventListener?.('controllerchange', () => { clearTimeout(t); res(); }, { once: true });
        if (serviceWorker.controller) { clearTimeout(t); res(); }
      });
    }
    if (!serviceWorker.controller) return 'unavailable';
    const res = await fetch(shardPath(tradition));
    if (!res.ok) return 'unavailable';
    await res.arrayBuffer?.();
    return 'warmed';
  } catch { return 'unavailable'; }
}
