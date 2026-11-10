// Camera translator: the only network requests it makes. All three fetch the app's own data files from the app's own
// address. No photo, text or anything else of the learner's is sent anywhere: the Camera Translator has no server.

/**
 * The sign word list (about 20 KB) together with its guard list of real words (about 46 KB, its own file because it is
 * derived from share-alike data). Without the guard list the translator still works but guesses more freely, so a missing
 * guard file is an error, not a fallback.
 */
export async function loadGlossaryData(fetchImpl = globalThis.fetch) {
  const [list, guard] = await Promise.all([
    fetchImpl(new URL('../../data/camera/sign-glossary.json', import.meta.url)),
    fetchImpl(new URL('../../data/camera/real-neighbours.json', import.meta.url))]);
  if (!list.ok || !guard.ok) throw new Error('word list missing');
  const data = await list.json();
  return { ...data, realNeighbours: (await guard.json()).words || [] };
}

/** The app's own phrasebook entries (already installed with the app). An empty list if it cannot be read. */
export async function loadPhrasebook(fetchImpl = globalThis.fetch) {
  try {
    const r = await fetchImpl(new URL('../../data/corpus/phrasebook.json', import.meta.url));
    return r.ok ? ((await r.json())?.entries || []) : [];
  } catch { return []; }
}

/** The app's own dictionary index (about 0.9 MB, already used by the vocabulary pages). Fetched only when a line needs it or the learner asks for word-by-word help. */
export async function loadDictionaryIndex(fetchImpl = globalThis.fetch) {
  const r = await fetchImpl(new URL('../../data/vocab/index.json', import.meta.url));
  if (!r.ok) throw new Error('dictionary missing');
  return r.json();
}
