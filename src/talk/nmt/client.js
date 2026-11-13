// @ts-check
// Talk translation pack: the page's side. One shared instance serves the Talk screen and the Camera Translator.
// The client itself lives in the tools repository (alef-tools, packages/translate), vendored at the pinned commit.
// A pack is known by its name in the pack list: a direction (he-en, en-he) or the high-quality pack (he-en-hq). translate(direction)
// is answered by the best pack loaded for that direction.
import { store } from './pack.js';
import { translateUrl } from './tools.js';
const { createPackClient: create, MAX_LINE } = await import(translateUrl('client.js'));

export { MAX_LINE };

/**
 * @param {{WorkerCtor?:any, env?:any}} [cfg]
 */
export function createPackClient(cfg = {}) {
  return create({ store, workerUrl: new URL('./worker.js', import.meta.url), WorkerCtor: cfg.WorkerCtor, env: cfg.env,
    slowMs: () => /** @type {any} */ (globalThis).__alefGpuSlowMs || 0, forceGraphics: () => !!(/** @type {any} */ (globalThis).__alefSoftwareGraphics) });
}

/** @type {ReturnType<typeof createPackClient>|null} */
let shared = null;
/** The one pack client of this page. */
export function sharedPack() { if (!shared) shared = createPackClient(); return shared; }
