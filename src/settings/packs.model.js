// @ts-check
// Language packs page: what can be listed, what is on the device, and the words shown for each state. No DOM.
// The list comes from data/packs/catalog.json, written by tools/alef-tools/sync.mjs from the pinned alef-tools manifest.
// Only packs marked published are offered: a pack nobody has built yet is never shown as a dead button.
import { loader } from './tools.js';

export const CATALOG_URL = new URL('../../data/packs/catalog.json', import.meta.url).href;
const SITE_ROOT = new URL('../../', import.meta.url).href;
export const MiB = 1048576;
/** Storage limits the learner can choose, in bytes. 0 is no limit. */
export const LIMIT_CHOICES = Object.freeze([0, 250 * MiB, 500 * MiB, 1024 * MiB, 2048 * MiB]);
export const limitLabel = (bytes) => (!bytes ? 'No limit' : bytes >= 1024 * MiB ? `${bytes / (1024 * MiB)} GB` : `${Math.round(bytes / MiB)} MB`);
/** The older Talk cache holds both translation packs; it is counted with the packs. */
const OLDER_CACHES = Object.freeze({ 'alef-talk-pack-v1': 'talk' });

export const COPY = Object.freeze({
  title: 'Language Packs',
  lead: 'A language pack adds something Aleph can do on this device, with nothing sent anywhere. Packs are large, so Aleph downloads one only when you ask for it here. You can delete any pack at any time.',
  none: 'There are no language packs to download yet.',
  wifi: 'Only download on Wi-Fi',
  wifiHelp: 'When this is on, a pack will not download over mobile data or while data saving is on. Not every browser can tell Aleph which connection it is using.',
  limit: 'Most space language packs may use',
  shabbat: 'It is Shabbat or a holiday. Nothing downloads by itself. A download you start here still works.',
  offline: 'The list of packs could not be read. Check your connection and open this page again.',
  noStorage: 'This browser cannot keep language packs. Everything else in Aleph still works.',
});

/** @param {{fetch?:any}} [env] */
export async function loadCatalog(env = {}) {
  const res = await (env.fetch ?? globalThis.fetch)(CATALOG_URL);
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const c = await res.json();
  if (c?.schema !== 'alef.packs.catalog.v1' || !Array.isArray(c.packs)) throw new Error('not a pack catalog');
  return c;
}

/** One line for a pack's state. @param {{ready:boolean, have:number, total:number, missing:number}} st */
export function statusLine(st) {
  const mb = loader.megabytes;
  if (st.ready) return `On this device. ${mb(st.total)} MB.`;
  if (st.have > 0) return `Part of it is on this device: ${mb(st.have)} of ${mb(st.total)} MB.`;
  return `Not on this device. About ${mb(st.total)} MB to download.`;
}

/** What to say when a download cannot start or stops. @param {string} code a loader code */
export function whyLine(code) {
  switch (code) {
    case 'wifi-only': return 'This does not look like Wi-Fi, and “Only download on Wi-Fi” is on. Turn it off above to download now.';
    case 'too-full': case 'quota': return 'This device reports too little free space for this pack.';
    case 'over-limit': return 'That would pass the storage limit you set above. Raise the limit or delete another pack first.';
    case 'cannot-run': return 'This device cannot run this pack.';
    case 'no-storage': return COPY.noStorage;
    case 'shabbat': return COPY.shabbat;
    case 'aborted': return 'Stopped. What arrived is kept; press Download to carry on.';
    case 'no-pack-list': return 'This pack could not be found. Check your connection and try again.';
    default: return 'The download stopped. What arrived is kept; press Download to carry on.';
  }
}

/** Who a pack is for, in plain words. '' when it runs anywhere. @param {{webgpu?:boolean, minRamGB?:number}} [device] */
export function deviceLine(device) {
  const needs = [];
  if (device?.webgpu) needs.push('a computer with a graphics card');
  if (device?.minRamGB) needs.push(`${device.minRamGB} GB of memory or more`);
  return needs.length ? `Needs ${needs.join(' and ')}.` : '';
}

/** The storage line. @param {{used:number, limit:number, browser:{free:number}|null}} r */
export function storageLine(r) {
  const mb = (b) => Math.round(b / MiB).toLocaleString('en');
  const used = r.used > 0 ? `Language packs on this device use ${mb(r.used)} MB.` : 'No language packs are on this device.';
  const free = r.browser ? ` This browser reports about ${mb(r.browser.free)} MB free.` : '';
  return used + free;
}

/**
 * @param {{catalog:any, talk?:any, env?:any}} cfg `talk` is the Talk pack client (src/talk/nmt/client.js sharedPack()); `env` carries stand-ins for tests
 */
export function createPacks(cfg) {
  const env = cfg.env || {};
  const bases = [new URL(cfg.catalog.sitePacks, SITE_ROOT).href, cfg.catalog.packHost];
  const offered = cfg.catalog.packs.filter((p) => p.published && (p.legacy?.adapter !== 'talk' || cfg.talk));
  const find = (name) => { const p = offered.find((x) => x.name === name); if (!p) throw new loader.PackError('no-pack-list', name); return p; };
  const isTalk = (p) => p.legacy?.adapter === 'talk';
  return {
    /** The packs a learner can be offered here. */
    list: () => offered.map((p) => ({ name: p.name, title: p.title, what: p.what, device: deviceLine(p.device), credits: p.credits || [] })),
    /** @returns {Promise<{ready:boolean, have:number, total:number, missing:number}>} */
    async state(name) {
      const p = find(name);
      const st = isTalk(p) ? await cfg.talk.state(p.legacy.direction) : await loader.packState(name, { ...env, bases, cacheName: p.cache });
      return { ready: st.ready, have: st.have, total: st.total, missing: st.missing };
    },
    /** Starts a download the learner asked for. @param {string} name @param {{onProgress?:(have:number,total:number)=>void, signal?:AbortSignal}} [opts] */
    async download(name, opts = {}) {
      const p = find(name);
      if (isTalk(p)) return cfg.talk.download(p.legacy.direction, { ...opts, userStarted: true });
      return loader.downloadPack(name, { ...env, ...opts, bases, cacheName: p.cache, device: p.device, userStarted: true, extra: OLDER_CACHES });
    },
    /** Deletes one pack from this device. */
    async remove(name) {
      const p = find(name);
      return isTalk(p) ? cfg.talk.removeOne(p.legacy.direction) : loader.removePack(name, { ...env, cacheName: p.cache });
    },
    storage: () => loader.storageReport({ ...env, extra: OLDER_CACHES }),
    getWifiOnly: () => loader.getWifiOnly(env), setWifiOnly: (on) => loader.setWifiOnly(on, env),
    getLimit: () => loader.getLimit(env), setLimit: (bytes) => loader.setLimit(bytes, env),
    why: (e) => whyLine(loader.codeOf(e)),
  };
}
