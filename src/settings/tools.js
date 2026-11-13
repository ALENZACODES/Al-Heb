// @ts-check
// The one door to the shared alef-tools code for every screen: the language pack loader (vendored under
// assets/vendor/_alef-tools, pinned in data/alef-tools.lock.json) with the app's own Shabbat check already registered.
// Import the loader from here, never from the vendored folder, so no screen hard-codes a version or skips the check.
import './shabbat.js';
export { loader, toolUrl, ALEF_TOOLS } from './alef-tools.generated.js';
