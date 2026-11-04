// Lazy per-tradition word-clip shards (data/audio/manifest-words-<tradition>.json, group prayer-word).
// The core manifest loads at boot; this loads ONLY the shard for the learner's congregation setting, after first paint,
// and feeds it to player.extend(). Pure of DOM: fetch/settings/audio are injected so it can be tested with a fake fetch.
export const SHARD_TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const OFFLINE_NOTE = 'audio info unavailable offline';
export const shardPath = (tradition) => `data/audio/manifest-words-${tradition}.json`;

/**
 * @param {{ fetch: Function, audio: {extend?: Function}, settings: {get:Function, subscribe?:Function},
 *           onState?: (s:{state:string, tradition:string, loaded:string|null, note:string}) => void }} o
 * state: 'idle' | 'loading' | 'loaded' | 'fallback' (sephardi shard absent, israeli used) | 'offline'
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
    let r = await fetchShard(tradition);
    let used = tradition;
    if (r.missing && tradition === 'sephardi') { // no sephardi recordings: use the israeli shard; the player keeps its mismatch warning
      used = 'israeli';
      if (loaded.has('israeli')) r = { list: null }; else r = await fetchShard('israeli');
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

  function watch() {
    return settings.subscribe?.((_, changed) => { if (Array.isArray(changed) && changed.includes('congregation')) load(); });
  }
  return { load, watch, get state() { return last; }, isLoaded: (t) => loaded.has(t) };
}
