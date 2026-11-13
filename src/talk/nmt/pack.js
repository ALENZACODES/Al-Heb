// @ts-check
// Talk translation pack: finding, downloading, checking and keeping the pack files. No DOM.
// The files are part of the site itself (assets/vendor/_nmt and assets/vendor/_ort); nothing is fetched from anywhere else.
// They are never part of the first install. A pack is fetched only when the learner asks for it, part by part (16 MiB at most),
// each part checked against the size and SHA-256 in the manifest, and kept in its own cache so an app update does not throw it away.
// The downloading, checking and keeping is the shared language pack loader's (alef-tools, vendored under assets/vendor/_alef-tools);
// the mapping of the Talk pack list onto it is the tools repository's too (packages/translate). The pack format and the cache name
// are unchanged, so nobody downloads a pack twice.
import { loader } from '../../settings/tools.js';
import { translateUrl } from './tools.js';

export const PACK_CACHE = 'alef-talk-pack-v1';
export const NMT_BASE = new URL('../../../assets/vendor/_nmt/', import.meta.url).href;
/** The runtime's code files always come from the site itself, wherever the data files come from. */
export const ORT_LOCAL = new URL('../_ort/', NMT_BASE).href;
export const HOSTS_FILE = new URL('../../../data/talk/pack-host.json', import.meta.url).href;
export const DIRECTIONS = Object.freeze(['he-en', 'en-he']);
export const DIRECTION_LABEL = Object.freeze({ 'he-en': 'Hebrew to English', 'en-he': 'English to Hebrew' });

/** The larger Hebrew to English pack. It is offered only on a browser with a real graphics adapter, and only once the pack host carries it. */
export const HQ_PACK = 'he-en-hq';
/** Every pack the Talk screen can list, by its name in the pack list. */
export const PACK_NAMES = Object.freeze([...DIRECTIONS, HQ_PACK]);
export const PACK_LABEL = Object.freeze({ ...DIRECTION_LABEL, [HQ_PACK]: 'Hebrew to English, High Quality' });
export const PACK_DIRECTION = Object.freeze({ 'he-en': 'he-en', 'en-he': 'en-he', [HQ_PACK]: 'he-en' });

export const megabytes = loader.megabytes;

// The Talk pack list mapped onto the shared loader: which files a pack needs, where they are fetched from (the site, or the pack
// host for a pack this copy of the site does not carry), what is on the device, downloading, removing. The code is the tools
// repository's (packages/translate/src/pack.js); this file only says where this app keeps things.
const { createPackStore } = await import(translateUrl('pack.js'));
export const store = createPackStore({ loader, base: NMT_BASE, cacheName: PACK_CACHE, hostsFile: HOSTS_FILE, ortLocal: ORT_LOCAL, label: 'talk' });
/**
 * packFiles(list, name, {gpu}): every file one pack needs, as {key, url, bytes, sha256}.
 * loadManifest(env): the pack list (the site's own, else the pack host's, else the copy kept with the pack), plus any published remote pack.
 * packState(list, name, env): {ready, gpu, have, total, missing} in bytes.
 * downloadPack(list, name, opts): fetches what is missing, part by part, each checked; `userStarted` must be true when the learner pressed the button.
 * removePacks(env) removes everything; removePack(list, name, env) removes one pack and keeps what the others still need.
 */
export const { packFiles, loadManifest, packState, downloadPack, removePacks, removePack } = store;

/** True when this browser hands out a real graphics adapter. A browser without one, or one that refuses, gets the ordinary files. */
export async function hasGraphics(nav = globalThis.navigator, force = !!(/** @type {any} */ (globalThis).__alefSoftwareGraphics)) {
  // A software stand-in for a graphics card is many times slower than the processor way: not worth the larger runtime. (Tests force it.)
  return loader.hasGraphics({ navigator: nav ?? {}, force });
}

/** What the browser says about the connection, when it says anything. @returns {'cellular'|'saver'|''} */
export function connectionKind(nav = globalThis.navigator) { return loader.connectionKind({ navigator: nav ?? {} }); }

/** True when the browser reports too little free space for `bytes` more. Unknown counts as enough. */
export async function tooFull(bytes, nav = globalThis.navigator) { return loader.tooFull(bytes, { navigator: nav ?? {} }); }

/** Why a download or a pack could not go ahead, as the loader's short code ('shabbat', 'wifi-only', 'no-storage', ...). */
export const whyNot = (e) => loader.codeOf(e);
/** The learner's "Only on Wi-Fi" choice (Language packs page). On unless switched off. */
export const wifiOnly = () => loader.getWifiOnly();
