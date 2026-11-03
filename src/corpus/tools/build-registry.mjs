// Build data/corpus/registry.json from data/corpus/source-snapshot.json (fetched by fetch_sources.py)
// plus the hand-written metadata below (original glosses, roster levels, notes).
// Run: node src/corpus/tools/build-registry.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cleanLine, clipWords, cleanEnglish, largeLetters, wordsOf } from '../normalize.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const snap = JSON.parse(fs.readFileSync(path.join(root, 'data/corpus/source-snapshot.json'), 'utf8'));
const FETCHED = snap.fetchedAt.slice(0, 10);

const G = 'original-gloss';
/** earlier descriptive ids -> current (lane 1) ids */
const ALIASES = { 'shema-2': ['shema-baruch-shem'], 'bless-formula-1': ['blessing-formula'], 'torah-bless-1': ['torah-blessing-before'], 'torah-bless-2': ['torah-blessing-after'], 'mah-tovu-1': ['mah-tovu-num-24-5'], 'kiddush-wine-1': ['kiddush-wine'], 'avot-1': ['amidah-avot'], 'mi-chamocha-1': ['mi-chamocha-ex-15-11'], 'adon-olam-1': ['adon-olam'], 'kaddish-1': ['mourners-kaddish'], 'birkat-hamazon-1': ['birkat-hamazon-hazan'], 'vahavta-full': ['vahavta'] };
/** per-id metadata. `gloss` = original literal English (array = one per Hebrew line). */
const META = {
  'bless-priestly-1': { ref: 'Numbers 6:24', cat: 'torah', level: 'intro-1', title: 'Priestly Blessing, line 1', words: ['may-he-bless-you', 'the LORD', 'and-may-he-keep-you'] },
  'bless-priestly-2': { ref: 'Numbers 6:25', cat: 'torah', level: 'intro-1', title: 'Priestly Blessing, line 2', words: ['may-he-shine', 'the LORD', 'his-face', 'toward-you', 'and-may-he-be-gracious-to-you'] },
  'bless-priestly-3': { ref: 'Numbers 6:26', cat: 'torah', level: 'intro-1', title: 'Priestly Blessing, line 3', words: ['may-he-lift', 'the LORD', 'his-face', 'toward-you', 'and-may-he-set', 'for-you', 'peace'] },
  'shema-1': { ref: 'Deuteronomy 6:4', cat: 'torah', level: 'intro-1', title: 'Shema Yisrael', words: ['hear', 'Israel', 'the LORD', 'our-God', 'the LORD', 'one'], keepLarge: true,
    notes: 'UXLC marks the final letters of the first and last words (ayin of shema, dalet of echad) as enlarged; in a Torah scroll these are written large. The display here is NOT enlarged: use largeLetters if you want to style them.' },
  'vahavta-1': { ref: 'Deuteronomy 6:5', cat: 'torah', level: 'intro-3', title: "V'ahavta, verse 1" },
  'vahavta-2': { ref: 'Deuteronomy 6:6-7', cat: 'torah', level: 'intro-3', title: "V'ahavta, verses 2-3" },
  'vahavta-full': { ref: 'Deuteronomy 6:5-9', cat: 'torah', level: 'intro-3', title: "V'ahavta" },
  'shema-vahavta': { ref: 'Deuteronomy 6:4-9', cat: 'torah', level: 'intro-3', title: "Shema and V'ahavta (Deut 6:4-9)", keepLarge: true },
  'shema-2': { ref: 'Siddur: Baruch shem kevod malchuto', cat: 'siddur', level: 'intro-1', title: 'Baruch shem (said after Shema line)', nusach: 'Ashkenaz (Metsudah)', gloss: 'Blessed is the name of the glory of his kingship for ever and ever.' },
  'bless-formula-1': { ref: 'Siddur: blessing formula', cat: 'siddur', level: 'intro-2', title: "Blessing formula (Baruch atah Adonai Eloheinu Melech ha'olam)", derive: { from: 'hamotzi', first: 6, noStop: true }, gloss: 'Blessed are you, LORD our God, king of the world,', notes: 'The six-word opening of most blessings. Derived by clipping the first six words of the hamotzi text.' },
  'mah-tovu-1': { ref: 'Numbers 24:5', cat: 'torah', level: 'inter-1', title: 'Mah Tovu (first verse)' },
  'mi-chamocha-1': { ref: 'Exodus 15:11', cat: 'torah', level: 'inter-2', title: 'Mi Chamocha' },
  'num-12-13': { ref: 'Numbers 12:13 (second half)', cat: 'torah', level: 'intro-1', title: "El na refa na lah (Moses' prayer for healing)", clip: { last: 5 }, gloss: 'God, please, heal her, please.',
    notes: 'Clipped from Num 12:13: the last five words of the verse. The JPS 1917 translation of the whole verse reads: "And Moses cried unto the LORD, saying: Heal her now, O God, I beseech Thee."' },
  'kiddush-gen-2-1-3': { ref: 'Genesis 2:1-3', cat: 'torah', level: 'inter-1', title: 'Kiddush (Shabbat verses)', notes: 'The Shabbat-evening Kiddush recites these verses, preceded in the Ashkenaz siddur by "vayehi erev vayehi voker yom hashishi"; that prefix is not part of Gen 2:1-3 and is not included here.' },
  'kiddush-wine-1': { ref: 'Siddur: blessing over wine', cat: 'siddur', level: 'intro-2', title: 'Blessing over wine', nusach: 'Sefard (Torat Emet)', gloss: 'Blessed are you, LORD our God, king of the world, who creates the fruit of the vine.' },
  'hamotzi': { ref: 'Siddur: HaMotzi', cat: 'siddur', level: 'intro-2', title: 'HaMotzi (blessing over bread)', nusach: 'Edot HaMizrach (Shaliehsaboo edition)', gloss: 'Blessed are you, LORD our God, king of the world, who brings forth bread from the earth.' },
  'candle-shabbat': { ref: 'Siddur: Shabbat candle blessing', cat: 'siddur', level: 'intro-2', title: 'Shabbat candle blessing', nusach: 'Sefard (Torat Emet)', gloss: 'Blessed are you, LORD our God, king of the world, who made us holy with his commandments and commanded us to light the lamp of Shabbat.' },
  'torah-bless-1': { ref: 'Siddur: Torah blessing (asher bachar banu)', cat: 'siddur', level: 'intro-3', title: 'Torah blessing (before reading/study)', nusach: 'Edot HaMizrach (Shaliehsaboo edition)', gloss: 'Blessed are you, LORD our God, king of the world, who chose us from all the peoples and gave us his Torah. Blessed are you, LORD, giver of the Torah.', notes: 'Sourced from the morning "Torah Blessings" section; the wording is the same blessing said by one called up for an aliyah.' },
  'torah-barchu': { ref: 'Siddur: Barchu before the Torah reading', cat: 'siddur', level: 'intro-3', title: 'Barchu (call to the Torah blessing)', nusach: 'Ashkenaz (Metsudah)', gloss: ['Bless the LORD, the blessed one.', 'Blessed is the LORD, the blessed one, for ever and ever.'] },
  'torah-bless-2': { ref: 'Siddur: Torah blessing after the reading', cat: 'siddur', level: 'intro-3', title: 'Torah blessing (after reading)', nusach: 'Ashkenaz (Metsudah)', gloss: 'Blessed are you, LORD our God, king of the world, who gave us a Torah of truth and planted eternal life in our midst. Blessed are you, LORD, giver of the Torah.' },
  'amidah-lips': { ref: 'Psalm 51:17 (Amidah preface)', cat: 'siddur', level: 'inter-2', title: 'Amidah preface: open my lips', nusach: 'Edot HaMizrach (Shaliehsaboo edition)', gloss: 'My Lord, open my lips, and my mouth will declare your praise.' },
  'avot-1': { ref: 'Siddur: Amidah, first blessing (Avot)', cat: 'siddur', level: 'inter-2', title: 'Amidah opening (Avot)', nusach: 'Edot HaMizrach (Shaliehsaboo edition)', dropSmall: true, clip: { endAfter: 'ומגן' },
    gloss: 'Blessed are you, LORD our God and God of our ancestors, God of Abraham, God of Isaac and God of Jacob; the great, mighty and awesome God, God Most High, who bestows loving-kindnesses, creates all things, remembers the kindnesses of the ancestors, and brings a redeemer to their children\'s children for the sake of his name, in love. King, helper, saviour and shield.',
    notes: 'Clipped at "u-magen". The source line ends with "Baruch atah ... magen Avraham" but writes the divine name there in a scrambled form (a deliberate obfuscation in the source), so the closing clause is left out rather than altered. The Ten Days of Repentance insertion (in the source) is dropped.' },
  'aleinu-1': { ref: 'Siddur: Aleinu (first paragraph)', cat: 'siddur', level: 'inter-2', title: 'Aleinu, first paragraph', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'It is our duty to praise the Master of all, to ascribe greatness to the Creator of the beginning: that he has not made us like the nations of the lands and has not placed us like the families of the earth, that he has not set our portion like theirs nor our lot like all their multitude. For they bow to vanity and emptiness and pray to a god who does not save; but we bow before the King of kings of kings, the Holy One, blessed be he, who stretches out the heavens and founds the earth, whose seat of glory is in the heavens above and the presence of his might in the loftiest heights. He is our God; there is no other. Truly he is our king; there is nothing besides him. As it is written in the Torah: "You shall know this day and take it to heart that the LORD is God, in the heavens above and on the earth beneath; there is no other."',
    notes: 'The source text carries the quotation of Deuteronomy 4:39 at the end. Sephardi/Mizrahi and Ashkenazi texts differ in small details of this paragraph.' },
  'modeh-ani-1': { ref: 'Siddur: Modeh Ani', cat: 'siddur', level: 'intro-2', title: 'Modeh Ani (on waking)', nusach: 'Ashkenaz (Metsudah)',
    gloss: 'I give thanks before you, living and enduring king, that you have returned my soul to me in mercy; great is your faithfulness.',
    clip: { endAfter: 'אמונתך' },
    feminine: { replaceFirstWord: true },
    notes: 'Men say modeh, women say modah. The masculine text is the fetched source. The feminine form is DERIVED by this project (the first word modeh changed to modah) and is NOT in the fetched source line; it is marked transcribed-needs-check.' },
  'adon-olam-1': { ref: 'Siddur: Adon Olam', cat: 'siddur', level: 'inter-3', title: 'Adon Olam', nusach: 'Ashkenaz (Metsudah)',
    gloss: ['Lord of the world, who reigned before any form was created.', 'At the time when all was made by his will, then "King" was his name proclaimed.', 'And after all things have ended, he alone, the awesome one, will reign.', 'And he was, and he is, and he will be, in glory.', 'And he is one, and there is no second, to compare to him or to join with him.', 'Without beginning, without end; to him belong the power and the dominion.', 'And he is my God, and my living redeemer, and the rock of my portion in time of distress.', 'And he is my banner and my refuge, the portion of my cup on the day I call.', 'Into his hand I commit my spirit, when I sleep and when I wake.', 'And with my spirit, my body too: the LORD is with me and I will not fear.'] },
  'kaddish-1': { ref: "Siddur: Mourner's Kaddish", cat: 'siddur', level: 'inter-3', title: "Mourner's Kaddish", language: 'aramaic', nusach: 'Ashkenaz (Metsudah)',
    gloss: ['Magnified and sanctified be his great name. (Amen.)', 'In the world that he created by his will; may he establish his kingdom in your lifetime and in your days and in the lifetime of all the house of Israel, speedily and soon; and say: Amen.', 'May his great name be blessed for ever and for all eternities.', 'Blessed, praised, glorified, exalted, extolled, honoured, raised and lauded be the name of the Holy One, blessed be he,', 'beyond all the blessings and songs, praises and consolations that are uttered in the world; and say: Amen.', 'May there be great peace from heaven, and life, for us and for all Israel; and say: Amen.', 'He who makes peace in his high places, may he make peace for us and for all Israel; and say: Amen.'],
    notes: 'Aramaic, not Hebrew (the last line, "Oseh shalom", is Hebrew). The source marks Ten Days of Repentance variants in parentheses; those variants are omitted.' },
  'birkat-hamazon-1': { ref: 'Siddur: Birkat Hamazon, first blessing (opening)', cat: 'siddur', level: 'inter-3', title: 'Birkat Hamazon opener (HaZan et haolam)', nusach: 'Sefard (Torat Emet)', clip: { endAfter: 'חסדו' },
    gloss: 'Blessed are you, LORD our God, king of the world, who feeds the whole world, all of it, in his goodness, with grace, kindness and mercy. He gives bread to all flesh, for his kindness is for ever.',
    notes: 'Clipped after "ki leolam chasdo" (the opening of the first blessing only).' },
};

const SIDDUR_ATTR = {
  'Metsudah': 'Hebrew text: The Metsudah siddur (Metsudah Publications, 1981), as digitised on Sefaria where it is labelled CC-BY. Attribute to Metsudah Publications and credit Sefaria as the source. THE LICENCE LABEL IS SEFARIA\'S AND IS NOT INDEPENDENTLY VERIFIED.',
  'Shaliehsaboo': 'Hebrew text: Siddur Edot HaMizrach, "Shaliehsaboo Edition", from Sefaria where it is labelled CC0 (no attribution required; credit given as a courtesy). Label not independently verified.',
  'Torat Emet': 'Hebrew text: Torat Emet 357 (toratemetfreeware.com), as digitised on Sefaria where it is labelled Public Domain. Label not independently verified.',
};

const entries = [];
const bySnap = new Map();
for (const [id, meta] of Object.entries(META)) {
  const src = meta.derive ? snap.items[meta.derive.from] : snap.items[id];
  if (!src) throw new Error('no snapshot for ' + id);
  let lines = src.rawLines.map((l) => cleanLine(l, { dropSmall: !!meta.dropSmall }));
  const big = meta.keepLarge ? largeLetters(src.rawLines.join(' ')) : [];
  if (meta.clip || meta.derive) {
    const joined = lines.join(' ');
    lines = [clipWords(joined, meta.clip || { first: meta.derive.first, noStop: meta.derive.noStop })];
  }
  const isTanach = src.kind === 'tanach-us';
  let english, englishSource, englishLicense;
  if (isTanach && !meta.gloss) {
    english = src.english.rawLines.map(cleanEnglish).join('\n');
    englishSource = 'JPS 1917 (The Holy Scriptures: A New Translation)'; englishLicense = 'Public Domain';
  } else {
    english = Array.isArray(meta.gloss) ? meta.gloss.join('\n') : meta.gloss;
    englishSource = G; englishLicense = 'original (project-owned)';
  }
  if (Array.isArray(meta.gloss) && meta.gloss.length !== lines.length) throw new Error('gloss/lines mismatch for ' + id);
  const he = lines.join('\n');
  const attribution = isTanach
    ? `Hebrew text: ${src.versionTitle}, Tanach.us Inc., West Redding, CT, USA (tanach.us; "may be viewed or copied without restriction"). Cantillation marks removed. Not the WLC.` + (englishSource !== G ? ' English: JPS 1917, public domain.' : ' English: original literal gloss.')
    : (SIDDUR_ATTR[Object.keys(SIDDUR_ATTR).find((k) => src.versionTitle.includes(k))] + ' English: original literal gloss.');
  const rec = {
    id, ref: meta.ref, title: meta.title, category: meta.cat, level: meta.level,
    language: meta.language || 'hebrew',
    he, lines: lines.length,
    english, englishSource, englishLicense,
    source: src.versionTitle + (isTanach ? '' : ' via Sefaria: ' + src.ref),
    sourceUrl: isTanach ? src.url : src.url,
    license: src.license,
    attribution,
    status: 'verified',
    verifiedAgainst: `Normalised he equals the programmatic normalisation (src/corpus/normalize.js) of the raw string fetched on ${FETCHED} from ${isTanach ? src.url : src.apiUrl}. This is a machine comparison against the cited source, NOT proofreading by a Hebrew educator (see proofread).`,
    proofread: false,
    traditionNeutral: true,
    snapshotId: meta.derive ? meta.derive.from : id,
  };
  if (meta.nusach) rec.nusach = meta.nusach;
  if (meta.notes) rec.notes = meta.notes;
  if (big.length) rec.largeLetters = big;
  if (meta.words) rec.wordGlosses = meta.words;
  if (meta.words && meta.words.length !== wordsOf(he).length) throw new Error('word gloss count mismatch ' + id);
  if (meta.derive) rec.derivedFrom = meta.derive.from;
  if (ALIASES[id]) rec.aliases = ALIASES[id];
  if (meta.feminine) {
    const ws = he.split(' ');
    ws[0] = ws[0].replace(/\u05D5\u05B9\u05D3\u05B6\u05D4$/u, '\u05D5\u05B9\u05D3\u05B8\u05D4');
    if (ws[0] === he.split(' ')[0]) throw new Error('feminine derivation did not change the first word');
    rec.variants = { f: { he: ws.join(' ').normalize('NFC'), status: 'transcribed-needs-check', derivedBy: 'project: first word modeh -> modah; not in the fetched source line' } };
  }
  if (isTanach) rec.sefariaCache = src.english.ref;
  entries.push(rec);
}

const order = Object.keys(META);
const out = {
  schema: 'alef-corpus-registry/1',
  note: 'Generated by src/corpus/tools/build-registry.mjs from data/corpus/source-snapshot.json. Do not edit by hand; edit META in the builder and re-run. See docs/corpus/LICENSES.md.',
  generated: FETCHED,
  normalisation: 'Pointed Hebrew, cantillation removed, NFC; see src/corpus/normalize.js header.',
  entries: order.map((id) => entries.find((e) => e.id === id)),
};
fs.writeFileSync(path.join(root, 'data/corpus/registry.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote registry.json with', entries.length, 'entries');
