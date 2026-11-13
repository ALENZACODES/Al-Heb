// @ts-check
// The one file of this lane that names the vendored alef-tools folders. The folders, and the pin they come from, are written by
// tools/alef-tools/sync.mjs (data/alef-tools.lock.json, src/settings/alef-tools.generated.js); tests/nikud.test.js fails if the
// path below falls out of step with that pin.
import { ALEF_TOOLS, loader } from '../settings/alef-tools.generated.js';
import * as nikud from '../../assets/vendor/_alef-tools/nikud@0.1.0/index.js';
export { loader, nikud };
export const NIKUD_FOLDER = new URL(ALEF_TOOLS.packages.nikud.base, new URL('../settings/', import.meta.url)).href;
