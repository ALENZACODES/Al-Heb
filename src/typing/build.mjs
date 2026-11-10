// Build data/typing/drills.json: node src/typing/build.mjs [--check]
//   words: the first 200 entries of data/vocab/deck-order.json (by `pos`), unpointed, only words made entirely of the 27 letters and 2 or more letters long, de-duplicated by spelling
//   lines: Hebrew entries of category "siddur" in data/corpus/registry.json, cut only at the source's own line breaks and sof pasuk, unpointed, 2 to 10 words, letters and spaces only, de-duplicated
// --check: exit 1 if the committed file differs from what would be built (used by tests/typing.test.js).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { stripPoints } from "./typing.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (p) => JSON.parse(readFileSync(root + p, "utf8"));
export const WORD_COUNT = 200;
export const MAX_LINE_WORDS = 10;

export function build() {
  const deck = read("data/vocab/deck-order.json"), reg = read("data/corpus/registry.json");
  const ok = /^[א-ת]{2,}$/;
  const seen = new Set(), words = [];
  for (const e of [...deck.entries].sort((a, b) => a.pos - b.pos).slice(0, WORD_COUNT)) {
    const he = stripPoints(e.he); if (!ok.test(he) || seen.has(he)) continue; seen.add(he);
    words.push({ id: e.id, he, pointed: e.he, en: e.en });
  }
  const seenL = new Set(), lines = [];
  for (const e of reg.entries) {
    if (e.category !== "siddur" || e.language !== "hebrew") continue;
    const parts = String(e.he).split(/[\n\u05C3]/).map((x) => x.trim()).filter(Boolean); // the source's own line breaks and sof pasuk, never an arbitrary cut
    parts.forEach((part, i) => {
      const he = stripPoints(part), n = he.split(" ").length;
      if (!/^[\u05D0-\u05EA ]+$/.test(he) || n < 2 || n > MAX_LINE_WORDS || seenL.has(he)) return; seenL.add(he);
      const whole = parts.length === 1;
      lines.push({ id: whole ? e.id : `${e.id}#${i + 1}`, title: e.title, he, pointed: stripPoints0(part), en: whole ? (e.english || "") : `From: ${e.title}` });
    });
  }
  return { schema: "alef-typing-drills/1", note: "Built by src/typing/build.mjs; do not edit by hand. Unpointed forms are machine-derived from the pointed source text; the word list inherits deck-order.json's not-native-reviewed status.", source: { deckOrder: `data/vocab/deck-order.json (first ${WORD_COUNT} entries)`, registry: "data/corpus/registry.json (category siddur, Hebrew)" }, words, lines };
}
/** Pointed form for display: keep vowel points, drop sof pasuk and cantillation. */
function stripPoints0(s) { return String(s).normalize("NFC").replace(/[֑-֯׃]/g, "").replace(/\s+/g, " ").trim(); }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = JSON.stringify(build(), null, 1) + "\n";
  if (process.argv.includes("--check")) { let cur = ""; try { cur = readFileSync(root + "data/typing/drills.json", "utf8"); } catch { /* missing */ } if (cur !== text) { console.error("data/typing/drills.json is stale: run node src/typing/build.mjs"); process.exit(1); } console.log("drills.json is current"); }
  else { writeFileSync(root + "data/typing/drills.json", text); const d = JSON.parse(text); console.log(`wrote data/typing/drills.json: ${d.words.length} words, ${d.lines.length} lines`); }
}
