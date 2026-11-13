// Names the vendored nikud folder. The pinned alef-tools commit is in data/alef-tools.lock.json (tools/alef-tools/sync.mjs).
// The loader comes through src/settings/tools.js, the one door for every screen: it registers the app's Shabbat check first.
import { loader } from '../settings/tools.js';
import * as nikud from '../../assets/vendor/_alef-tools/nikud@0.1.0/index.js';
export { loader, nikud };
export const NIKUD_FOLDER = new URL('../../assets/vendor/_alef-tools/nikud@0.1.0/', import.meta.url).href;
