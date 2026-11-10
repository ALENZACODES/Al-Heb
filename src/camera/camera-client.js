// Camera translator: the only network requests it makes. All three fetch the app's own data files from the app's own
// address. No photo, text or anything else of the learner's is sent anywhere: the Camera Translator has no server.

/** The sign word list (about 25 KB). */
export async function loadGlossaryData(fetchImpl = globalThis.fetch) {
  const r = await fetchImpl(new URL('../../data/camera/sign-glossary.json', import.meta.url));
  if (!r.ok) throw new Error('word list missing');
  return r.json();
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
