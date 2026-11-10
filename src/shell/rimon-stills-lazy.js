// The big-moment Rimon (src/shell/rimon-stills.js with its picture lists and flip-books, about 16 KB) is fetched on the first
// moment that could use it, not with the first page. Home and the setup screens never show it (Rimon's stage owns those
// screens), so a first visit to Home no longer downloads it. The event that wakes it is replayed once it has mounted;
// after that the module's own listeners take over. If the download fails, the next moment tries again.

/** True for the screens where the big-moment Rimon never shows: Home and the setup screens. */
export function stageOwnsHash(hash = '') {
  const h = String(hash || '').toLowerCase();
  return h === '' || h === '#' || h === '#/' || h.startsWith('#/home') || h.startsWith('#/welcome');
}

/**
 * @param {{doc?:Document, win?:Window, load?:()=>Promise<any>}} [o]
 * @returns {{ready:()=>Promise<any>, destroy:()=>void}|null}
 */
export function mountRimonStillsLazy({ doc = globalThis.document, win = doc?.defaultView || globalThis, load = () => import('./rimon-stills.js') } = {}) {
  if (!doc?.addEventListener) return null;
  let alive = true, api = null, loading = null, replay = null;
  function wake(pick) {
    if (!alive || api) return;
    replay = pick; // only the latest moment is replayed
    loading ||= Promise.resolve().then(load).then((m) => {
      if (!alive) return null;
      detach();
      api = m.mountRimonStills();
      const s = replay?.(m); replay = null;
      if (api && s) api.show(s);
      return api;
    }).catch(() => { loading = null; return null; });
  }
  const onRimon = (e) => { const a = e?.detail?.action; wake((m) => m.situationForAction(a)); };
  const onReady = () => { const h = win?.location?.hash || ''; if (!stageOwnsHash(h)) wake((m) => m.situationForHash(h)); };
  const onOffline = () => wake(() => 'offline');
  const onOnline = () => wake(() => 'recovered');
  function detach() {
    doc.removeEventListener('alef:rimon', onRimon);
    doc.removeEventListener('alef:ready', onReady);
    win?.removeEventListener?.('offline', onOffline);
    win?.removeEventListener?.('online', onOnline);
  }
  doc.addEventListener('alef:rimon', onRimon);
  doc.addEventListener('alef:ready', onReady);
  win?.addEventListener?.('offline', onOffline);
  win?.addEventListener?.('online', onOnline);
  return {
    ready: () => loading || Promise.resolve(api),
    destroy() { alive = false; detach(); try { api?.destroy?.(); } catch { /* already gone */ } },
  };
}
