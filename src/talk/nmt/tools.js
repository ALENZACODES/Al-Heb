// @ts-check
// Where the pinned translation code is. It lives in the tools repository (alef-tools, packages/translate) and is vendored under
// assets/vendor/_alef-tools at the commit data/alef-tools.lock.json pins. Nothing here names a version: the folder comes from the
// file tools/alef-tools/sync.mjs writes.
import { ALEF_TOOLS } from '../../settings/alef-tools.generated.js';

/** Address of one module of the pinned translate package. @param {string} file */
export const translateUrl = (file) => new URL(ALEF_TOOLS.packages.translate.base + file, new URL('../../settings/', import.meta.url)).href;
