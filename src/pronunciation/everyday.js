// @ts-check
// Everyday words of modern Hebrew that every speaker says the same way.
//
// The Ashkenazi and Sephardi reading styles belong to the prayer book and the Torah. A word such as אַבָּא (dad)
// has no older reading, so every style spells it the way it is said today: "aba", never "abo".
// Entries are exact pointed forms. None of them occurs in the Torah or prayer texts, with or without a prefix,
// so no line of liturgy changes (tests/pronunciation.everyday.test.js checks this against data/corpus).

import { stripTaamim } from './hebrew.js';

const WORDS = [
  // family
  'אַבָּא', 'אִמָּא', 'סַבָּא', 'סַבְתָּא',
  // courtesy and conversation
  'בְּבַקָּשָׁה', 'סַבָּבָה', 'אַחְלָה', 'יַאללָה', 'עַכְשָׁו', 'כָּאן',
  // getting around
  'מְכוֹנִית', 'מוֹנִית', 'רַכֶּבֶת', 'תַּחֲנָה', 'מִסְעָדָה', 'מִשְׂרָד', 'חֲנָיָה', 'דּוֹלָר',
  // food and home
  'קָפֶה', 'תֵּה', 'פִּיצָה', 'גְּלִידָה', 'סַפָּה', 'נְיָר', 'חָתוּל', 'מַחְשֵׁב',
  // school
  'מוֹרָה', 'תַּלְמִידָה', 'אוּנִיבֶרְסִיטָה',
];

export const EVERYDAY = Object.freeze(new Set(WORDS.map((w) => w.normalize('NFC'))));

/** One prefix letter (and, the, in, like, to, from, that) with its vowel marks. */
const PREFIX = /^[והבכלמש][\u05B0-\u05BC\u05C1\u05C2\u05C7]*/u;
/** A prefix can add or remove the dot in the first letter (לְכָאן, לַמִּסְעָדָה); compare without it. */
const softStart = (w) => w.replace(/^([\u05D0-\u05EA][\u05B0-\u05BB\u05C1\u05C2\u05C7]*)\u05BC/u, '$1');
const SOFT = new Set([...EVERYDAY].map(softStart));

/** True when a single pointed word is an everyday word, with or without a prefix (וְאַבָּא, לְכָאן). */
export function isEveryday(word) {
  const w = stripTaamim(String(word ?? '')).normalize('NFC');
  if (EVERYDAY.has(w)) return true;
  let rest = w;
  for (let i = 0; i < 2; i++) {
    const m = PREFIX.exec(rest);
    if (!m) return false;
    rest = rest.slice(m[0].length);
    if (EVERYDAY.has(rest)) return true;
    // Short words are left out of the loose match: שְׁתֵה (drink!) must not read as ש + תֵּה (tea).
    if ((rest.match(/[\u05D0-\u05EA]/gu) || []).length >= 3 && SOFT.has(softStart(rest))) return true;
  }
  return false;
}
