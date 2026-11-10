/** Small pure helpers for pointed Hebrew strings (no DOM). Letter ids follow the shared contract ids. */
export const BASE = {
  "א": "alef", "ב": "bet", "ג": "gimel", "ד": "dalet", "ה": "he", "ו": "vav", "ז": "zayin", "ח": "chet", "ט": "tet", "י": "yod",
  "כ": "kaf", "ך": "kaf-final", "ל": "lamed", "מ": "mem", "ם": "mem-final", "נ": "nun", "ן": "nun-final", "ס": "samekh", "ע": "ayin",
  "פ": "pe", "ף": "pe-final", "צ": "tsadi", "ץ": "tsadi-final", "ק": "qof", "ר": "resh", "ש": "shin", "ת": "tav",
};
export const MARK = { "ַ": "patach", "ָ": "kamatz", "ֵ": "tzere", "ֶ": "segol", "ִ": "chirik", "ֹ": "cholam", "ֻ": "kubutz",
  "ְ": "shva", "ֲ": "chataf-patach", "ֱ": "chataf-segol", "ֳ": "chataf-kamatz", "ּ": "dagesh", "ׁ": "shin-dot", "ׂ": "sin-dot" };

/** Split a pointed word into letter cells: [{text, base}] where text includes the attached marks. Non-letters are skipped. */
export function cellsOf(word) {
  const out = [];
  for (const ch of word) {
    if (BASE[ch]) out.push({ text: ch, base: BASE[ch] });
    else if (out.length && MARK[ch]) out.at(-1).text += ch;
  }
  return out;
}
export const lettersOf = (word) => [...new Set(cellsOf(word).map((c) => c.base))];
export const marksOf = (word) => [...new Set([...word].filter((c) => MARK[c]).map((c) => MARK[c]))];
