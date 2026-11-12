// J1 offline indicator: a plain line under the header while the device is offline. Visited pages and everything installed keep
// working offline (sw.js serves the precache and keeps a copy of every same-origin page file it has fetched); the line says so
// and links to "Use Aleph offline". Not a transient message: it stays exactly as long as the device is offline.
export const OFFLINE_TEXT = 'You are offline. Pages you have opened before and everything installed still work.';
export function watchOnline(win = globalThis) {
  const doc = win.document; if (!doc?.createElement || !win.addEventListener) return null;
  const line = doc.createElement('p'); line.className = 'alef-offline-line'; line.setAttribute('role', 'status'); line.hidden = true;
  line.style.cssText = 'margin:0;padding:.35rem .75rem;text-align:center;background:#fff3cd;color:#3d2e00;font-size:.95rem';
  const set = () => {
    const off = win.navigator?.onLine === false; line.hidden = !off;
    if (!off) { line.textContent = ''; return; }
    const a = doc.createElement('a'); a.href = '#/offline'; a.textContent = 'Offline help'; a.style.color = 'inherit';
    line.replaceChildren(OFFLINE_TEXT + ' ', a);
  };
  win.addEventListener('online', set); win.addEventListener('offline', set);
  const header = doc.querySelector?.('.site-header'); if (header?.after) header.after(line); else doc.body?.prepend?.(line);
  set();
  return { line, set, stop() { win.removeEventListener?.('online', set); win.removeEventListener?.('offline', set); line.remove?.(); } };
}
