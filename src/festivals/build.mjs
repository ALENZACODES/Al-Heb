// Dev tool (not loaded by the app): builds data/festivals/vocab.json, the festival vocabulary packs.
// Usage: node src/festivals/build.mjs         (writes the file)
// Rules: every word is a record that already exists in data/vocab/words.json (picked here BY ID, after reading its gloss);
// every reading-practice line is copied verbatim from data/corpus (registry.json or phrasebook.json), never composed;
// no Hebrew is typed in this file except the lookup keys in GAP_CHECK, which are only used to prove a term is absent.
// Whether a word means the same thing in the festival as its gloss says was NOT checked by a Hebrew speaker.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const FESTIVAL_IDS = ["rosh-hashanah", "yom-kippur", "sukkot", "shemini-atzeret", "hanukkah", "tu-bishvat", "purim", "pesach", "shavuot", "tisha-bav"];
export const PACK_SIZE = 12;

/** Picks by word id, in teaching order. A `note` marks a word whose dictionary gloss is not obviously the festival sense. */
export const PICKS = {
  "rosh-hashanah": ["h88576753", "hbb1dc7a2", "hc008b0a9", "hf07c1580", "h53c53bdf", "h61f0d2fb", "h725d19e2", "h8b7d0341", "h58d8d8fe", "h93295b86", "h9790d078", "h51ed2ee5"],
  "yom-kippur": ["hb7990a7a", "hf8b5d278", "h33cf0d1b", "hdd847ae4", "hb59a3ee1", "h2035ee1a", "h89d3ba77", "h5271b622", "hccd921cd", "hc09d494d", "h9a1ab3f5", "h0d9fc785"],
  sukkot: ["ha76619e4", "h81fd04d9", "hff7974cf", "hfcd9d9b6", "h519ce338", "hc5e80001", "h3612be9c", "h991d080e", "h769a6c3e", "h5b3d2b4c", "h166d92b0", "hd2fac0d2"],
  "shemini-atzeret": ["h63ca5856", "h1f7cf03f", "h16b7af50", "h3612be9c", "h57665cd9", "h06992de5", "h617c6136", "hc5e80001", "h231c624a", "h0fc2ca76", "h2d1e4a74", "h8cbd3155"],
  hanukkah: ["h64fb7d35", "h8459058d", "h3674f19e", "hf1772ec6", "he10c2446", "h4700de9c", "h8246132a", "h8e236dac", "h745593b8", "h1999d835", "h81fd04d9", "hf16db4f8"],
  "tu-bishvat": ["hd2fac0d2", "h166d92b0", "hb67e1917", "h08e0fe5b", "h5d939fef", "h5ef32c54", "hf1b8cedf", "h2a49fab3", "hef745501", "h85cda534", "h2d90f840", "h991d080e"],
  purim: ["h58d8d8fe", "h571c298a", "hffd4de51", "h3612be9c", "h03763c94", "hfcc1a370", "he1fb2094", "hb88ee2ce", "h407a8f11", "hc5b0c1a0", "h492d82b0", "h6e73aa1f"],
  pesach: ["h4ebf1a3c", "h5f4ecfc7", "h6ad3ddd8", "hd60cd96a", "h1414a3a2", "h8c6b1e0c", "h129dd70a", "hf9047f4b", "h050cbd4d", "h0073b076", "h5ad2503a", "h8f56fc93"],
  shavuot: ["h16b7af50", "h8b8da70a", "h35be21c5", "h4ef6ec03", "ha664d093", "hc91c0d80", "h44a725b6", "h519ce338", "h2ff06831", "h39b463af", "ha3fb2785", "h92151b55"],
  "tisha-bav": ["hf8b5d278", "hf1772ec6", "hb629c4c6", "he945f31c", "h4bb1b2a9", "h2d75f6cf", "h9432ab7f", "ha8df8ecd", "h4981fa93", "h141dc740", "h5b3adbaf", "h1de12f34"],
};
/** Words whose dictionary gloss differs from, or only partly covers, the festival sense. Shown next to the word. */
export const SENSE_NOTES = {
  h0d9fc785: "Gloss is \"to sign, seal\"; the Yom Kippur use is being sealed in the Book of Life.",
  hffd4de51: "Gloss is \"shipment\"; the Purim custom is mishloach manot, gifts of food.",
  h63ca5856: "Gloss is a general word for a gathering; Atzeret is the festival's name.",
  h35be21c5: "Milk; the Shavuot custom of dairy foods is a custom, not a rule.",
  h92151b55: "Week; Shavuot means \"weeks\", the seven weeks counted from Pesach.",
  h5ef32c54: "Fig tree; one of the seven species named for Tu BiShvat.",
  hf1b8cedf: "Gloss is \"the grains of various...\"; the entry is about grapes, one of the seven species.",
  h4700de9c: "Light in general; Hanukkah is the Festival of Lights.",
  he10c2446: "Gloss is \"a light, a lamp\"; this is the word for the menorah.",
  hb7990a7a: "Gloss is \"repentance, atonement\"; the festival name is Yom Kippur.",
  h8f56fc93: "Spring; Pesach is the spring festival, the word is not a Pesach term as such.",
  h6ad3ddd8: "\"Order\"; the Pesach seder is the ordered meal.",
  h725d19e2: "Memory; Rosh Hashanah is called Yom HaZikaron in the liturgy.",
  h5b3adbaf: "\"How, alas\"; the opening word of the Book of Lamentations read on Tisha B'Av.",
};
/** Terms looked up (exact unpointed match in words.json) and found absent. Hebrew keys are lookup keys only; the data keeps English. */
export const GAP_CHECK = {
  "rosh-hashanah": [["עגול", "round (challah)"]],
  "yom-kippur": [["וידוי", "confession (vidui)"], ["כפרה", "atonement (kapparah)"], ["מחילה", "pardon (mechilah)"], ["נעילה", "Ne'ilah"]],
  sukkot: [["סוכה", "sukkah"], ["לולב", "lulav"], ["אתרוג", "etrog"], ["סכך", "s'chach (roof covering)"], ["אסיף", "ingathering (asif)"]],
  "shemini-atzeret": [["ריקוד", "dancing (rikud)"], ["הקפות", "hakafot"]],
  hanukkah: [["חנוכה", "Hanukkah"], ["חנוכיה", "hanukkiah"], ["סביבון", "dreidel (sevivon)"], ["מכבי", "Maccabee"], ["ניצחון", "victory"]],
  "tu-bishvat": [["רימון", "pomegranate"], ["חרוב", "carob"], ["חיטה", "wheat"], ["שעורה", "barley"]],
  purim: [["פורים", "Purim"], ["מגילה", "megillah"], ["אסתר", "Esther"], ["מרדכי", "Mordechai"], ["המן", "Haman"], ["תחפושת", "costume"]],
  pesach: [["מרור", "maror (bitter herbs)"], ["חרוסת", "charoset"], ["הגדה", "Haggadah"], ["מצרים", "Egypt (Mitzrayim)"], ["משה", "Moses"], ["אפיקומן", "afikoman"]],
  shavuot: [["שבועות", "Shavuot"], ["עומר", "Omer"], ["דברות", "(Ten) Utterances"]],
  "tisha-bav": [["חורבן", "destruction (churban)"], ["קינה", "lamentation (kinah)"], ["בכי", "weeping"]],
};
/** Honest extra notes where the vocabulary holds a same-spelling word with a different meaning (so a lookup would mislead). */
export const FALSE_FRIENDS = {
  shavuot: ["The 5,000-word list has an entry spelled like Sinai with the gloss \"Chinese\", and one spelled like Ruth with the gloss \"roger\"; neither is used."],
  "yom-kippur": ["The entry spelled like teshuvah is glossed \"answer, response\", not repentance, so it is not used."],
};

export const stripMarks = (s) => String(s).normalize("NFD").replace(/[֑-ׇ]/g, "").normalize("NFC");
const tokens = (line) => stripMarks(line).replace(/[־׀׃׳״.,;:!?()"'—–\-׃]/g, " ").split(/\s+/).filter(Boolean);
const PREFIX = new Set(["ו", "ה", "ב", "ל", "מ", "כ", "ש"]);
/** Does the (unpointed) token equal the word, or the word with one prefix letter? */
export const tokenMatches = (tok, word) => tok === word || (tok.length === word.length + 1 && PREFIX.has(tok[0]) && tok.slice(1) === word);

/** Corpus lines: registry entries and phrasebook entries, each split on newlines. */
export function corpusLines(registry, phrasebook) {
  const out = [];
  for (const e of registry) String(e.he).split("\n").map((x) => x.trim()).filter(Boolean).forEach((he, i) => out.push({ he, source: "registry", id: e.id, n: i + 1, title: e.title }));
  for (const e of phrasebook) { const he = String(e.he ?? "").trim(); if (he) out.push({ he, source: "phrasebook", id: e.id, n: 1, title: e.en }); }
  return out;
}
/** Shortest corpus line (fewest words, then source order) that contains the word; null when none. */
export function readingLineFor(unpointed, lines) {
  let best = null;
  for (const l of lines) {
    const toks = tokens(l.he);
    if (!toks.some((t) => tokenMatches(t, unpointed))) continue;
    if (!best || toks.length < best.k) best = { k: toks.length, l };
  }
  return best ? { he: best.l.he, source: best.l.source, id: best.l.id, n: best.l.n, title: best.l.title } : null;
}

export function buildVocab({ words, registry, phrasebook }) {
  const byId = new Map(words.map((w) => [w.id, w]));
  const byUnpointed = new Set(words.map((w) => w.heUnpointed));
  const lines = corpusLines(registry, phrasebook);
  const packs = FESTIVAL_IDS.map((fid) => {
    const picks = PICKS[fid];
    if (picks.length > PACK_SIZE) throw new Error(`${fid}: more than ${PACK_SIZE} picks`);
    const entries = picks.map((id) => {
      const w = byId.get(id);
      if (!w) throw new Error(`${fid}: no word ${id} in words.json`);
      const line = readingLineFor(w.heUnpointed, lines);
      return { id: w.id, he: w.he, translit: w.translit, en: w.en, pos: w.pos, ...(SENSE_NOTES[id] ? { senseNote: SENSE_NOTES[id] } : {}), line };
    });
    const gaps = (GAP_CHECK[fid] || []).map(([key, en]) => {
      if (byUnpointed.has(key)) throw new Error(`${fid}: gap term "${en}" is actually in words.json; remove it from GAP_CHECK`);
      return { en };
    });
    return { id: fid, size: entries.length, short: PACK_SIZE - entries.length, withLine: entries.filter((e) => e.line).length, words: entries, gaps, notes: FALSE_FRIENDS[fid] || [] };
  });
  return {
    schema: "alef-festival-vocab/1",
    note: "Draft. Words are records of data/vocab/words.json picked by id; reading lines are copied verbatim from data/corpus (registry.json, phrasebook.json), shortest line holding the word (exact spelling or one prefix letter). Whether the word means the same in the line, or in the festival, was not checked by a Hebrew speaker.",
    packSize: PACK_SIZE, packs,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  const out = buildVocab({ words: rd("data/vocab/words.json").words, registry: rd("data/corpus/registry.json").entries, phrasebook: rd("data/corpus/phrasebook.json").entries });
  fs.writeFileSync(path.join(ROOT, "data/festivals/vocab.json"), JSON.stringify(out, null, 1) + "\n");
  for (const p of out.packs) console.log(p.id.padEnd(16), `${p.size}/12 words, ${p.withLine} with a corpus line, ${p.gaps.length} gaps`);
}
