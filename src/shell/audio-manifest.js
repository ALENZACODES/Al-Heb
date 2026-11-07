// Core audio manifest (data/audio/manifest.json, ~1.5 MB) is NOT needed to paint the first route, so it loads after first paint.
// Its kind=word entries live in data/audio/manifest-kind-word.json (~1.1 MB, same budget reason) and load with it.
// Pure of DOM: fetch is injected. The result is fed to player.extend() by the shell audio wrapper (see audio.js).
export const MANIFEST_URL = 'data/audio/manifest.json';
export const WORD_MANIFEST_URL = 'data/audio/manifest-kind-word.json';

/** Fetch + validate the core manifest. Rejects (never returns junk) so the caller can show an honest "unavailable" state. */
export async function fetchCoreManifest(fetchFn, url = MANIFEST_URL) {
  const res = await fetchFn(url);
  if (!res || !res.ok) throw new Error('audio manifest HTTP ' + (res && res.status));
  const list = await res.json(); // e.g. offline.html answering a JSON request throws here
  if (!Array.isArray(list)) throw new Error('audio manifest is not a list');
  return list;
}

/** Fetch the core manifest plus its kind=word shard and return the combined list (the same entries the core used to hold alone). */
export async function fetchFullManifest(fetchFn, coreUrl = MANIFEST_URL, wordUrl = WORD_MANIFEST_URL) {
  const [core, words] = await Promise.all([fetchCoreManifest(fetchFn, coreUrl), fetchCoreManifest(fetchFn, wordUrl)]);
  return [...core, ...words];
}

/** Fetch the tiny shipped clip-count summary; rejects on anything but {recorded:number, tts:number}. */
export async function fetchAudioSummary(fetchFn, url = 'data/audio/summary.json') {
  const res = await fetchFn(url);
  if (!res || !res.ok) throw new Error('audio summary HTTP ' + (res && res.status));
  const t = await res.json();
  if (!t || typeof t.recorded !== 'number' || typeof t.tts !== 'number') throw new Error('audio summary malformed');
  return t;
}

/** Run fn after the browser has had a chance to paint: next frame, then an idle slot (max waitMs), else a timeout. */
export function afterPaint(fn, { win = globalThis, waitMs = 1500 } = {}) {
  const idle = () => ('requestIdleCallback' in win ? win.requestIdleCallback(fn, { timeout: waitMs }) : win.setTimeout(fn, 0));
  if (typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(() => win.setTimeout(idle, 0));
  else win.setTimeout(idle, 0);
}
