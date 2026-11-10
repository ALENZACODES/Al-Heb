// Source-reviewed regression set. Every word and reading below is read from data/pronunciation/ at run time
// (drills.json, soundgap.json, prayerwords.json); nothing is invented here. The lists only name the rows where the
// engines AGREE with the stored reading today. Rows where they disagree are deliberately not asserted:
// they are listed in docs/qa/PRONUNCIATION-ENGINE-AUDIT.md for a human reviewer. Agreement is not proof the stored
// reading is right (those files are marked unproofread); it only pins engine behaviour on words that have a stored reading.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { syllabifyWord } from '../src/photo/syllabify.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../data/pronunciation/${f}`, import.meta.url), 'utf8'));
const norm = (s) => s.toLowerCase().replace(/\(.*$/, '').split('/')[0].replace(/kh/g, 'ch').replace(/[^a-z]/g, '');
const stressFromEnd = (s) => {
  const g = [...s.matchAll(/[aeiouAEIOU]+/g)];
  const i = g.findIndex((m) => /[A-Z]/.test(m[0]));
  return i < 0 ? null : i - g.length;
};

/** @returns {Map<string, {he:string, stored:string, ash:boolean}>} key = he|stored */
function storedReadings() {
  const m = new Map();
  const add = (he, stored, gloss) => { if (typeof he === 'string' && typeof stored === 'string' && !stored.includes('/')) m.set(`${he}|${stored}`, { he, stored, ash: /Ashkenazi\)/.test(gloss || '') }); };
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === 'object') { if (typeof n.he === 'string' && typeof n.translit === 'string') add(n.he, n.translit, n.gloss); Object.values(n).forEach(walk); }
  };
  walk(load('drills.json')); walk(load('soundgap.json'));
  for (const w of load('prayerwords.json').words) add(w.he, w.israeli.say, w.gloss);
  return m;
}
const STORED = storedReadings();
const row = (key) => { const r = STORED.get(key); assert.ok(r, `not in data/pronunciation: ${key}`); return r; };
const opts = (r) => (r.ash ? { scheme: 'ashkenazi-siddur', finalHe: 'silent' } : { scheme: 'siddur', tradition: 'israeli', finalHe: 'silent' });

const SPELLING_AGREE = [
  "קַר|kar",
  "רִאשׁוֹן|rishon",
  "רֶכֶב|rekhev",
  "שָׁלוֹם|shalom",
  "לֹא|lo",
  "בֵּן|ben",
  "בְּגָדִים|begadIM",
  "יַלְדָּה|yaldA",
  "לִלְמֹד|lilmOD",
  "סֵפֶר|SEfer",
  "מְדַבֶּרֶת|medabEret",
  "תַּפּוּחַ|tapUach",
  "בֹּקֶר|BOker",
  "בּוֹקֵר|boKER",
  "חֶדֶר|cheder",
  "חֲבֵרָה|chavera",
  "בָּחַר|bachar",
  "נוֹחַ|no'ach",
  "עַכְשָׁיו|achshav",
  "חַם|cham",
  "הַר|har",
  "פִּיתָה|pita",
  "תּוֹדָה|toda",
  "קָפֶה|kafe",
  "אֱלֹהֵינוּ|Eloheinu",
  "הוֹרִים|horim",
  "חוֹרִים|chorim",
  "הֵן|hen",
  "חֵן|chen",
  "הֶבֶל|hevel",
  "חֶבֶל|chevel",
  "חַף|chaf",
  "כַּף|kaf",
  "אָח|ach",
  "אַךְ|akh",
  "אִם|im",
  "עִם|im",
  "אוֹר|or",
  "עוֹר|or",
  "אֵת|et",
  "עֵת|et",
  "אָב|av",
  "עָב|av",
  "קָרָא|kara",
  "קָרַע|kara",
  "קַל|kal",
  "גָּר|gar",
  "גָּל|gal",
  "צַל|tzal",
  "סַל|sal",
  "צוֹר|tzor",
  "שׁוֹר|shor",
  "כֵּן|ken",
  "קֵן|ken",
  "כָּל|kol",
  "קוֹל|kol",
  "כַּר|kar",
  "טוֹר|tor",
  "תּוֹר|tor",
  "שַׁבָּת|shabat",
  "שַׁבָּת|shabos",
  "סָר|sar",
  "שָׂר|sar",
  "סַם|sam",
  "שָׂם|sam",
  "שָׁם|sham",
  "וַעַד|va'ad",
  "בַּעַד|ba'ad",
  "דָּבָר|davar",
  "דִּבֵּר|diber",
  "בָּרוּךְ|ba-RUKH",
  "אַתָּה|a-TA",
  "אֲדֹנָי|a-do-NAI",
  "מֶלֶךְ|ME-lekh",
  "הָעוֹלָם|ha-o-LAM",
  "שָׁלוֹם|sha-LOM",
  "אָמֵן|a-MEN",
  "שַׁבָּת|sha-BAT",
  "תּוֹרָה|to-RA",
];
const SYLLABIFY_SPELLING_AGREE = [
  "קַר|kar",
  "רִאשׁוֹן|rishon",
  "רֶכֶב|rekhev",
  "שָׁלוֹם|shalom",
  "לֹא|lo",
  "בֵּן|ben",
  "בְּגָדִים|begadIM",
  "יַלְדָּה|yaldA",
  "לִלְמֹד|lilmOD",
  "סֵפֶר|SEfer",
  "מְדַבֶּרֶת|medabEret",
  "תַּפּוּחַ|tapUach",
  "בֹּקֶר|BOker",
  "בּוֹקֵר|boKER",
  "יָלְדָה|YALda",
  "חֶדֶר|cheder",
  "חֲבֵרָה|chavera",
  "בָּחַר|bachar",
  "נוֹחַ|no'ach",
  "עַכְשָׁיו|achshav",
  "חַם|cham",
  "הַר|har",
  "פִּיתָה|pita",
  "תּוֹדָה|toda",
  "קָפֶה|kafe",
  "הוֹרִים|horim",
  "חוֹרִים|chorim",
  "הֵן|hen",
  "חֵן|chen",
  "הֶבֶל|hevel",
  "חֶבֶל|chevel",
  "חַף|chaf",
  "כַּף|kaf",
  "אָח|ach",
  "אַךְ|akh",
  "אִם|im",
  "עִם|im",
  "אוֹר|or",
  "עוֹר|or",
  "אֵת|et",
  "עֵת|et",
  "אָב|av",
  "עָב|av",
  "קָרָא|kara",
  "קָרַע|kara",
  "קַל|kal",
  "גָּר|gar",
  "גָּל|gal",
  "סַל|sal",
  "שׁוֹר|shor",
  "כֵּן|ken",
  "קֵן|ken",
  "קוֹל|kol",
  "כַּר|kar",
  "טוֹר|tor",
  "תּוֹר|tor",
  "שַׁבָּת|shabat",
  "סָר|sar",
  "שָׂר|sar",
  "סַם|sam",
  "שָׂם|sam",
  "שָׁם|sham",
  "וַעַד|va'ad",
  "בַּעַד|ba'ad",
  "דָּבָר|davar",
  "דִּבֵּר|diber",
  "בָּרוּךְ|ba-RUKH",
  "אַתָּה|a-TA",
  "מֶלֶךְ|ME-lekh",
  "הָעוֹלָם|ha-o-LAM",
  "שָׁלוֹם|sha-LOM",
  "אָמֵן|a-MEN",
  "שַׁבָּת|sha-BAT",
  "תּוֹרָה|to-RA",
];
const COLLOQUIAL_ONLY_AGREE = [
  "זְמַן|zman",
  "גְּדוֹלָה|gdola",
  "קְטַנָּה|ktana",
  "גְּדוֹלִים|gdolim",
  "קְטַנִּים|ktanim",
  "תְּחִינָה|tchina",
];
const STRESS_AGREE = [
  "בְּגָדִים|begadIM",
  "יַלְדָּה|yaldA",
  "לִלְמֹד|lilmOD",
  "סֵפֶר|SEfer",
  "בּוֹקֵר|boKER",
  "בָּרוּךְ|ba-RUKH",
  "אַתָּה|a-TA",
  "אֲדֹנָי|a-do-NAI",
  "הָעוֹלָם|ha-o-LAM",
  "שָׁלוֹם|sha-LOM",
  "אָמֵן|a-MEN",
  "שַׁבָּת|sha-BAT",
  "תּוֹרָה|to-RA",
];

test('regression set is large enough and every key comes from stored data', () => {
  assert.ok(new Set(SPELLING_AGREE.map((k) => k.split('|')[0])).size >= 40, 'at least 40 distinct words');
  for (const k of [...SPELLING_AGREE, ...SYLLABIFY_SPELLING_AGREE, ...COLLOQUIAL_ONLY_AGREE, ...STRESS_AGREE]) row(k);
});

test('transliterate() agrees with the stored reading on the listed words', () => {
  for (const k of SPELLING_AGREE) { const r = row(k); assert.equal(norm(transliterate(r.he, opts(r))), norm(r.stored), k); }
});

test('syllabifyWord() transliteration agrees with the stored reading on the listed words', () => {
  for (const k of SYLLABIFY_SPELLING_AGREE) { const r = row(k); assert.equal(norm(syllabifyWord(r.he).map((s) => s.translit).join('')), norm(r.stored), k); }
});

test('colloquial shva mode agrees where the liturgical default does not (stored colloquial forms)', () => {
  for (const k of COLLOQUIAL_ONLY_AGREE) { const r = row(k); assert.equal(norm(transliterate(r.he, { ...opts(r), shvaMode: 'colloquial' })), norm(r.stored), k); }
});

test('syllabifyWord() stress position agrees with the stored capitalised syllable on the listed words', () => {
  for (const k of STRESS_AGREE) {
    const r = row(k); const syl = syllabifyWord(r.he);
    assert.equal(syl.findIndex((s) => s.stressed) - syl.length, stressFromEnd(r.stored), k);
  }
});
