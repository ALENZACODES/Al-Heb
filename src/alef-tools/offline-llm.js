// The pinned alef-tools "offline-llm" build (assets/vendor/_alef-tools/offline-llm@<version>/, copied by
// tools/alef-tools/sync-offline-llm.mjs): the search index over checked answers, lessons, units and words, extra checked
// content for Ask the Torah, and per-unit checked example sentences and fill-in-the-word items. All of it is static, is
// fetched from this site only when a page asks for it, and is never in the first install. Nothing is sent anywhere.
// When the shared tools module (src/settings/tools.js) is on main, FOLDER comes from it instead of being written here.
export const VERSION = '0.1.0';
export const FOLDER = new URL(`../../assets/vendor/_alef-tools/offline-llm@${VERSION}/`, import.meta.url);

let api = null;
/** The package's working API: search(text, opts), askExtra(text), unitExtras(unitId), report(). fetchImpl is for tests. */
export function tools(fetchImpl) {
  if (!api) {
    api = import(new URL('index.js', FOLDER).href).then((pkg) => pkg.load(fetchImpl ? { fetch: fetchImpl } : {}));
    api.catch(() => { api = null; });
  }
  return api;
}
export const closest = async (text, { limit = 3, types = null, fetchImpl } = {}) => (await tools(fetchImpl)).search(text, { limit, types });
export const askExtra = async (text, fetchImpl) => (await tools(fetchImpl)).askExtra(text);
export const unitExtras = async (unitId, fetchImpl) => (await tools(fetchImpl)).unitExtras(unitId);
