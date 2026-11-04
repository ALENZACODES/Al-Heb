/** Display content for lessons and review cards, loaded lazily from the data files (fetch in browser, fs in Node). */
import { loadJSON } from "./data.js";

let content;
export function loadContent() {
  content ??= (async () => {
    const [letters, niq, registry, confusables] = await Promise.all([
      loadJSON("data/letters/letters.json"), loadJSON("data/pronunciation/niqqud.json"),
      loadJSON("data/corpus/registry.json"), loadJSON("data/letters/confusables.json"),
    ]);
    return {
      letters: new Map(letters.map((l) => [l.id, l])),
      vowels: new Map(niq.records.map((r) => [r.id, r])),
      corpus: new Map(registry.entries.map((e) => [e.id, e])),
      confusables,
    };
  })();
  content.catch(() => { content = undefined; });
  return content;
}

/** Best English approximation of a vowel for a tradition; American-synagogue wording for sephardi. */
export function vowelEnglish(rec, congregation) {
  const e = rec?.english || {};
  return e[congregation] || e.american_synagogue || e.israeli || "";
}
export function vowelIpa(rec, congregation) { return rec?.ipa?.[congregation] || rec?.ipa?.israeli || ""; }
