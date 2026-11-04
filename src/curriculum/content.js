/** Display content for lessons and review cards, loaded lazily from the data files (fetch in browser, fs in Node). */
import { loadJSON } from "./data.js";
import { loadLadder, allItems } from "./ladder.js";
import { loadGender } from "./gender.js";

let content;
export function loadContent() {
  content ??= (async () => {
    const [letters, niq, registry, confusables, mn, ladder, gender, cons] = await Promise.all([
      loadJSON("data/letters/letters.json"), loadJSON("data/pronunciation/niqqud.json"),
      loadJSON("data/corpus/registry.json"), loadJSON("data/letters/confusables.json"), loadJSON("data/letters/mnemonics.json"), loadLadder(), loadGender(),
      loadJSON("data/pronunciation/consonants.json"),
    ]);
    return {
      letters: new Map(letters.map((l) => [l.id, l])),
      consonants: new Map(Object.entries(cons.letters || {})),
      vowels: new Map(niq.records.map((r) => [r.id, r])),
      corpus: new Map(registry.entries.map((e) => [e.id, e])),
      confusables,
      mnemonics: new Map((mn.letters || []).map((m) => [m.id, m])),
      mnemonicsMeta: mn.meta || {},
      ladderItems: new Map(allItems(ladder).map((i) => [i.id, i])),
      genderPairs: new Map(gender.pairs.map((p) => [p.id, p])),
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
