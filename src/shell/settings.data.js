// @ts-check
// Data safety actions behind Settings -> Back up / Restore / Delete (no DOM here, so Node tests can run them).
// Backup and restore themselves live in src/store.js (versioned, checksummed, validated, all-or-nothing).

export const CONFIRM_WORD = 'DELETE';
/** @param {string} typed */
export const confirmMatches = (typed) => String(typed ?? '').trim().toUpperCase() === CONFIRM_WORD;

/** @param {number|Date} [now] */
export const backupFileName = (now = Date.now()) => `alef-backup-${new Date(now).toISOString().slice(0, 10)}.json`;

/** Plain-language lines describing what a restore will do. @param {any} preview result of store.previewImport */
export function describePreview(preview) {
  if (!preview?.ok) return [];
  const d = preview.diff, n = (a) => a.length;
  const lines = [];
  lines.push(`This backup${preview.exportedAt ? ' was made on ' + preview.exportedAt.slice(0, 10) + ' and' : ''} holds ${preview.items} saved item${preview.items === 1 ? '' : 's'}.`);
  const parts = [];
  if (n(d.added)) parts.push(`${n(d.added)} will be added`);
  if (n(d.changed)) parts.push(`${n(d.changed)} will be replaced by the backup's version`);
  if (n(d.removed)) parts.push(`${n(d.removed)} on this device but not in the backup will be removed`);
  if (n(d.unchanged)) parts.push(`${n(d.unchanged)} are already identical`);
  lines.push(parts.length ? parts.join('; ') + '.' : 'Nothing on this device would change.');
  if (preview.migrated) lines.push('The backup is from an older version of ALEF and will be upgraded as it is restored.');
  return lines;
}

/** Message for a store that cannot keep data across reloads, or null when everything is fine. @param {{persistent:boolean,reason:string|null,newerSchema?:boolean}} s */
export function storageNotice(s) {
  if (s?.persistent === false) {
    if (s.reason === 'quota') return 'This device is out of storage space for ALEF. Your progress is being kept in memory only and will be lost when you close this tab. Download a backup now, free some space, then press "Try saving again".';
    if (s.reason === 'error') return 'The browser refused to save your progress. It is kept in memory only and will be lost when you close this tab. Download a backup now.';
    return 'This browser is not letting ALEF save anything (private browsing or blocked storage). The app works, but your progress is kept in memory only and will be lost when you close this tab. Download a backup before you leave.';
  }
  if (s?.newerSchema) return 'Your saved data was written by a newer version of ALEF. It is read as it is and not upgraded or downgraded; update the app to be safe.';
  return null;
}

/**
 * Delete everything Aleph keeps on this device (the offline app copy stays unless the service worker is removed). Each step is independent and reported; one failing does not stop the others.
 * @param {{store:any, caches?:any, navigator?:any, storage?:any, unregisterServiceWorker?:boolean}} o
 * @returns {Promise<{store:boolean, extraKeys:number, caches:number, serviceWorkers:number, errors:string[]}>}
 */
export async function wipeAllData(o) {
  const rep = { store: false, extraKeys: 0, caches: 0, serviceWorkers: 0, errors: /** @type {string[]} */ ([]) };
  try { o.store.clear(); rep.store = o.store.keys().length === 0; } catch (e) { rep.errors.push('saved data: ' + (/** @type {any} */ (e)?.message || e)); }
  try { // direct keys outside the store (for example a dismissed-banner flag); prefixes "alef:" (store) and "alef." (flags)
    const st = o.storage; if (st && typeof st.key === 'function') {
      const names = []; for (let i = 0; i < st.length; i++) { const k = st.key(i); if (k && (k.startsWith('alef.') || k.startsWith('alef:'))) names.push(k); }
      for (const k of names) { st.removeItem(k); rep.extraKeys++; }
    }
  } catch (e) { rep.errors.push('local flags: ' + (/** @type {any} */ (e)?.message || e)); }
  // alef-shell-* and alef-runtime-* hold the app and static audio, not learner progress, so they stay unless the worker
  // is being removed too: wiping them would leave the installed app unable to open offline. alef-data, alef-music-v1 and
  // alef-retention (which reminders were already shown) are removed with the rest of the learner's data.
  try { const c = o.caches; if (c?.keys) { for (const k of await c.keys()) { if (!o.unregisterServiceWorker && /^alef-(shell|runtime)-/.test(k)) continue; if (await c.delete(k)) rep.caches++; } } } catch (e) { rep.errors.push('offline copies: ' + (/** @type {any} */ (e)?.message || e)); }
  if (o.unregisterServiceWorker) {
    try { const sw = o.navigator?.serviceWorker; const regs = sw?.getRegistrations ? await sw.getRegistrations() : []; for (const r of regs) { if (await r.unregister()) rep.serviceWorkers++; } }
    catch (e) { rep.errors.push('service worker: ' + (/** @type {any} */ (e)?.message || e)); }
  }
  return rep;
}
