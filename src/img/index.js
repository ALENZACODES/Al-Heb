// Games call loadImageResolver({ fetchFn, settings, base, indexUrl, approvalsUrl }).
// The shell resolver (src/img/resolve.js) takes (fetchJson, opts) instead.
// This file is the adapter named in the games contract. A failure here is
// caught by loadGameImages, and the game keeps playing with text only.
import { loadImageResolver as loadShellResolver } from './resolve.js';

/**
 * @param {{ fetchFn?: (url:string)=>Promise<any>, settings?: any, base?: string, indexUrl?: string, approvalsUrl?: string }} [opts]
 * fetchFn may be a fetch (returns a Response) or already return JSON.
 */
export async function loadImageResolver({ fetchFn, settings, base, indexUrl, approvalsUrl } = {}) {
  const raw = fetchFn || globalThis.fetch?.bind(globalThis);
  if (typeof raw !== 'function') throw new Error('no fetch');
  const fetchJson = async (url) => {
    const res = await raw(url);
    if (res && typeof res.json === 'function') {
      if (res.ok === false) throw new Error(String(res.status || 'fetch failed'));
      return res.json();
    }
    return res;
  };
  return loadShellResolver(fetchJson, { settings, base, indexUrl, approvalsUrl });
}
