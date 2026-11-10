// Build data/corpus/registry.json from data/corpus/source-snapshot.json (fetched by fetch_sources.py)
// plus the hand-written metadata below (original glosses, roster levels, notes).
// Run: node src/corpus/tools/build-registry.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cleanLine, clipWords, cleanEnglish, largeLetters, wordsOf, applyTransforms } from '../normalize.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const snap = JSON.parse(fs.readFileSync(path.join(root, 'data/corpus/source-snapshot.json'), 'utf8'));
const FETCHED = snap.fetchedAt.slice(0, 10);
const fetchedOf = (src) => (src.fetchedAt || snap.fetchedAt).slice(0, 10);

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

  // ---------- Round 3 additions (sources fetched by fetch_sources_extra.py) ----------
  // Tanakh verses used in the liturgy (UXLC Hebrew; JPS 1917 English unless a gloss is given)
  'ein-kamocha': { ref: 'Psalm 86:8', cat: 'torah', level: 'intro-3', title: 'Ein Kamocha (opening line of the Torah-ark prayer)', notes: 'Said when the ark is opened in most Ashkenazi-tradition services. This record is the Psalm 86:8 verse only; the full Ein Kamocha sequence continues (see data/corpus/gaps.json).' },
  'malchutcha': { ref: 'Psalm 145:13', cat: 'torah', level: 'inter-1', title: 'Malchutcha (second line of Ein Kamocha)' },
  'adonai-oz': { ref: 'Psalm 29:11', cat: 'torah', level: 'inter-1', title: "Adonai oz l'amo yiten (closing line of Ein Kamocha)" },
  'gadlu': { ref: 'Psalm 34:4', cat: 'torah', level: 'intro-3', title: "Gadlu l'Adonai iti (leader invites the congregation to magnify)" },
  'yehalelu': { ref: 'Psalm 148:13-14', cat: 'torah', level: 'inter-1', title: 'Yehalelu (said as the Torah is returned to the ark)' },
  'hashivenu': { ref: 'Lamentations 5:21', cat: 'torah', level: 'inter-1', title: "Hashivenu (sung as the Torah is returned; 'Chadesh yameinu kekedem')" },
  'kedushah-kadosh': { ref: 'Isaiah 6:3', cat: 'torah', level: 'intro-3', title: 'Kadosh, kadosh, kadosh (Kedushah)' },
  'kedushah-baruch': { ref: 'Ezekiel 3:12 (last three words)', cat: 'torah', level: 'intro-3', title: 'Baruch kevod Adonai mimkomo (Kedushah)', clip: { last: 3 }, gloss: 'Blessed be the glory of the LORD from his place.', notes: 'Clipped from Ezekiel 3:12: the last three words, as used in the Kedushah.' },
  'kedushah-yimloch': { ref: 'Psalm 146:10', cat: 'torah', level: 'intro-3', title: "Yimloch Adonai l'olam (Kedushah)" },
  'kiddush-veshamru': { ref: 'Exodus 31:16-17', cat: 'torah', level: 'inter-1', title: "V'shamru (Shabbat-day Kiddush; also in the Shabbat Amidah)", notes: 'The word hu (it) in verse 17 is written hi with a chirik in the Leningrad Codex (a Torah spelling); siddurim usually print hu. Read it as the congregation does.' },
  'kiddush-zachor': { ref: 'Exodus 20:8-11', cat: 'torah', level: 'inter-1', title: 'Zachor et yom hashabbat (Shabbat-day Kiddush, second passage)', notes: 'Many Ashkenazi custom books say this after V\'shamru; some communities say only V\'shamru. Confirm local custom.' },
  'ashrei-84-5': { ref: 'Psalm 84:5', cat: 'torah', level: 'intro-3', title: 'Ashrei yoshvei veitecha (first line of Ashrei)' },
  'ashrei-144-15': { ref: 'Psalm 144:15', cat: 'torah', level: 'intro-3', title: 'Ashrei ha-am she-kacha lo (second line of Ashrei)', notes: 'UXLC points the divine name here as yod + chataf-patach (she-yahweh); that is how the Leningrad Codex has it. Readers say "Adonai".' },
  'ashrei-145-1-3': { ref: 'Psalm 145:1-3', cat: 'torah', level: 'intro-3', title: "Tehilah l'David (Psalm 145, opening verses of Ashrei)" },
  'ashrei-145-16': { ref: 'Psalm 145:16', cat: 'torah', level: 'inter-1', title: "Poteach et yadecha (the verse said with concentration in Ashrei)" },
  'shir-hamaalot': { ref: 'Psalm 126:1-6', cat: 'torah', level: 'inter-2', title: "Shir hamaalot (sung before Birkat Hamazon on Shabbat and festivals)" },
  // Siddur lines
  'vayehi-binsoa': { corrections: [['\u05D5\u05B7\u05D9\u05BC\u05D0\u05DE\u05B6\u05E8', '\u05D5\u05B7\u05D9\u05B9\u05D0\u05DE\u05B6\u05E8'], ['\u05DE\u05E9\u05C1\u05B6\u05D4', '\u05DE\u05B9\u05E9\u05C1\u05B6\u05D4']], ref: 'Siddur: Vayehi binsoa (Numbers 10:35, Isaiah 2:3, blessing)', cat: 'siddur', level: 'intro-3', title: 'Vayehi binsoa ha-aron (opening the ark)', nusach: 'Ashkenaz (Metsudah)',
    gloss: 'And it was, when the ark set out, Moses said: Arise, LORD, and let your enemies be scattered, and let those who hate you flee before you. For from Zion will go forth Torah, and the word of the LORD from Jerusalem. Blessed is the one who gave the Torah to his people Israel in his holiness.',
    notes: 'Metsudah weekday text. The Shabbat service in Ashkenazi books uses the same words. Sephardi/Mizrahi order of the Torah service differs.' },
  'lecha-hashem': { ref: 'Siddur: Lecha Adonai hagedulah (1 Chronicles 29:11, Psalm 99:5, 99:9)', cat: 'siddur', level: 'inter-1', title: 'Lecha Adonai hagedulah (carrying the Torah around)', nusach: 'Ashkenaz (Metsudah)', dropTokens: ['והקהל', 'עונימ'],
    gloss: 'Yours, LORD, are the greatness and the might and the splendour and the victory and the majesty, for everything in heaven and on earth is yours. Yours, LORD, is the kingdom, and you are exalted as head over all. Exalt the LORD our God and bow at his footstool: he is holy. Exalt the LORD our God and bow at his holy mountain, for the LORD our God is holy.',
    notes: 'The source line begins with a rubric ("the congregation answers") which is removed here.' },
  'vezot-hatorah': { corrections: [['\u05DE\u05E9\u05C1\u05B6\u05D4', '\u05DE\u05B9\u05E9\u05C1\u05B6\u05D4']], ref: 'Siddur: V\'zot haTorah (Deuteronomy 4:44, Numbers 9:23)', cat: 'siddur', level: 'intro-3', title: "V'zot haTorah (said when the Torah is lifted)", nusach: 'Ashkenaz (Metsudah)',
    gloss: 'This is the Torah that Moses set before the children of Israel, by the word of the LORD, by the hand of Moses.', notes: 'Sephardi/Mizrahi books add further verses. Confirm local custom.' },
  'etz-chaim': { corrections: [['\u05E2\u05E9\u05C1\u05B6\u05E8', '\u05E2\u05B9\u05E9\u05C1\u05B6\u05E8']], ref: 'Siddur: Etz chaim hi (Proverbs 3:18, 3:17, 3:16, Isaiah 42:21)', cat: 'siddur', level: 'intro-3', title: "Etz chaim hi (sung as the Torah is returned to the ark)", nusach: 'Ashkenaz (Metsudah)',
    gloss: 'It is a tree of life to those who hold fast to it, and those who support it are happy. Its ways are ways of pleasantness and all its paths are peace. Length of days is in its right hand, in its left hand riches and honour. The LORD desired, for the sake of his righteousness, to make the Torah great and glorious.',
    notes: 'The Hebrew here is the Metsudah text. Many congregations sing only the first one or two verses, then Hashivenu.' },
  'brich-shmei': { ref: 'Siddur: Berich shmei (Zohar, Vayakhel)', cat: 'siddur', level: 'inter-3', title: 'Berich shmei (Aramaic prayer when the ark is opened)', language: 'aramaic', nusach: 'Ashkenaz (Metsudah)',
    gloss: 'Blessed is the name of the Master of the world; blessed is your crown and your place. May your good will be with your people Israel for ever; show your people the redemption of your right hand in your Temple, bring us of the goodness of your light, and accept our prayer in mercy. May it be your will to lengthen our life in goodness, and let me be counted among the righteous, so that you have mercy on me and guard me and all that is mine and your people Israel\'s. You feed and sustain all; you rule over all; you rule over kings, and the kingdom is yours. I am a servant of the Holy One, blessed be he, before whom and before whose glorious Torah I bow at every time. Not in any person do I trust, and not on any angel do I rely, but on the God of heaven, who is the God of truth, whose Torah is truth and whose prophets are truth, and who abounds in deeds of goodness and truth. In him I trust, and to his holy and glorious name I utter praises. May it be your will to open my heart to Torah, to fulfil the requests of my heart and the heart of all your people Israel, for good, for life and for peace.',
    notes: 'Aramaic. Taken from the Zohar. Reform and many Reconstructionist services omit it; Conservative and Orthodox services often sing or say it when the ark is opened, and some use the Hebrew text only. The Torat Emet Edot HaMizrach text of the same prayer is available and not used here.' },
  'hagomel': { ref: 'Siddur: Birkat Hagomel', cat: 'siddur', level: 'inter-1', title: 'Birkat Hagomel (after recovery or safe travel) and the congregation\'s response', nusach: 'Ashkenaz (Metsudah)', dropTokens: ['והקהל', 'עונימ'],
    gloss: ['Blessed are you, LORD our God, king of the world, who bestows good things on the undeserving, and has bestowed every good on me.', 'May the one who has bestowed good on you bestow on you every good. Selah.'],
    notes: 'The second line is the congregation\'s answer. The source rubric ("the congregation answers") is removed. Line 1 is said by the person giving thanks, usually after the Torah reading.' },
  'avot-closing': { ref: 'Siddur: Amidah, first blessing, closing lines', cat: 'siddur', level: 'inter-2', title: 'Amidah first blessing, closing (Magen Avraham)', nusach: 'Ashkenaz (Metsudah)',
    gloss: 'King, helper, saviour and shield. Blessed are you, LORD, shield of Abraham.',
    notes: 'Completes avot-1, which stops before this clause. Metsudah\'s Ten-Days-of-Repentance insertion is not included.' },
  'amidah-yihyu': { ref: 'Siddur: Amidah, closing verse (Psalm 19:15)', cat: 'siddur', level: 'intro-3', title: 'Yihyu leratzon imrei fi (verse that closes the Amidah)', nusach: 'Ashkenaz (Metsudah)',
    gloss: 'May the words of my mouth and the thoughts of my heart be acceptable before you, LORD, my rock and my redeemer.' },
  'amidah-elohai-netzor': { ref: 'Siddur: Amidah, Elohai netzor', cat: 'siddur', level: 'inter-2', title: 'Elohai netzor (private prayer ending the Amidah)', nusach: 'Ashkenaz (Metsudah)',
    gloss: 'My God, guard my tongue from evil and my lips from speaking deceit. To those who curse me, let my soul be silent; let my soul be like dust to all. Open my heart to your Torah, and let my soul pursue your commandments. As for all who plan evil against me, quickly annul their counsel and frustrate their plans. Act for the sake of your name; act for the sake of your right hand; act for the sake of your holiness; act for the sake of your Torah. That your beloved may be rescued, save with your right hand and answer me. May the words of my mouth and the thoughts of my heart be acceptable before you, LORD, my rock and my redeemer.' },
  'oseh-shalom': { ref: 'Siddur: Oseh shalom', cat: 'siddur', level: 'intro-3', title: 'Oseh shalom (end of the Amidah and of Kaddish)', nusach: 'Ashkenaz (Metsudah)', dropParen: true,
    gloss: 'He who makes peace in his high places, may he make peace for us and for all Israel; and say: Amen.',
    notes: 'The source has a parenthetical Ten-Days-of-Repentance variant ("hashalom") which is removed. Reform and some Conservative books end with a variant wording in English; the Hebrew is the same.' },
  'sim-shalom': { ref: 'Siddur: Amidah, Sim shalom (morning)', cat: 'siddur', level: 'inter-2', title: 'Sim shalom (peace blessing of the morning Amidah)', nusach: 'Ashkenaz (Metsudah)',
    gloss: ['Grant peace, goodness and blessing, grace, kindness and mercy upon us and upon all Israel your people. Bless us, our father, all of us as one, with the light of your face; for by the light of your face you gave us, LORD our God, a Torah of life, love of kindness, righteousness, blessing, mercy, life and peace. And may it be good in your eyes to bless your people Israel at every time and every hour with your peace.', 'Blessed are you, LORD, who blesses his people Israel with peace.'],
    notes: 'Morning (Shacharit) wording. Afternoon and evening services use Shalom rav instead.' },
  'kiddush-shabbat-eve': { ref: 'Siddur: Kiddush for Friday night, the sanctification', cat: 'siddur', level: 'inter-1', title: 'Kiddush for Shabbat evening (the sanctification blessing)', nusach: 'Ashkenaz (Metsudah)',
    gloss: 'Blessed are you, LORD our God, king of the world, who made us holy with his commandments and was pleased with us, and in love and favour gave us his holy Shabbat as an inheritance, a remembrance of the work of creation. For it is the first of the holy convocations, a remembrance of the exodus from Egypt. For you chose us and made us holy from all the peoples, and in love and favour you gave us your holy Shabbat as an inheritance. Blessed are you, LORD, who makes the Shabbat holy.',
    notes: 'Metsudah prints two phrases in parentheses ("ki hu yom" and "ki vanu vacharta ... mikol ha-amim"); the words are kept and the parentheses are not shown. Whether the parenthesised words are said is a matter of printing convention that an educator should confirm. Pair with kiddush-gen-2-1-3 (the Genesis verses) and kiddush-wine-1 (wine).' },
  'lecha-dodi-1': { ref: 'Siddur: Lecha Dodi, refrain and first verse', cat: 'siddur', level: 'inter-3', title: 'Lecha Dodi (refrain and first verse)', nusach: 'Ashkenaz (Metsudah)',
    gloss: ['Come, my beloved, to meet the bride; let us welcome the presence of Shabbat.', '"Keep" and "remember" in a single utterance, the one God made us hear; the LORD is one and his name is one, for renown, for glory and for praise.'],
    notes: 'Only the refrain and verse 1 of the Friday-night hymn. The refrain is repeated between verses.' },
  'yigdal': { corrections: [['\u05DB\u05B0\u05BC\u05DE\u05E9\u05C1\u05B6\u05D4', '\u05DB\u05B0\u05BC\u05DE\u05B9\u05E9\u05C1\u05B6\u05D4']], ref: 'Siddur: Yigdal', cat: 'siddur', level: 'inter-3', title: 'Yigdal (hymn of the Thirteen Principles)', nusach: 'Ashkenaz (Metsudah)',
    gloss: ['May the living God be magnified and praised; he exists, and his existence is not bound by time.', 'He is one, and there is no unity like his unity; hidden, and without end to his oneness.', 'He has no bodily form and is not a body; his holiness cannot be compared.', 'He preceded everything that was created; first, and with no beginning to his beginning.', 'Behold, he is master of the world to every creature; he shows his greatness and his sovereignty.', 'The abundance of his prophecy he gave to the people he treasured and who are his glory.', 'No one has arisen in Israel like Moses, a prophet who beheld his likeness.', 'A Torah of truth God gave to his people through his prophet, trusted in his house.', 'God will not alter or exchange his law, for ever, for any other.', 'He watches and knows our secrets; he sees the end of a matter at its beginning.', 'He repays a person with kindness according to his deeds; he gives the wicked evil according to his wickedness.', 'At the end of days he will send our anointed one, to redeem those who await the end of his salvation.', 'God will revive the dead in his great kindness; blessed for ever is his praised name.'],
    notes: 'Thirteen lines; the small headings in the source naming each principle are removed. Line 12 and 13 mention a messiah and revival of the dead; Reform and some Conservative books change or omit these ideas. Check the local siddur.' },
  'zimun-opening': { ref: 'Siddur: Birkat Hamazon, zimun (invitation)', cat: 'siddur', level: 'inter-2', title: 'Zimun: "Rabotai nevarech" and the response', nusach: 'Ashkenaz (Metsudah)',
    gloss: ['Gentlemen, let us bless.', 'May the name of the LORD be blessed from now and for ever.'],
    notes: 'The invitation said by the leader of the meal, then the group repeats the response. The longer form with "Eloheinu" is said with ten or more; not included here.' },
  'haftarah-before': { ref: 'Siddur: Haftarah, blessings before', cat: 'siddur', level: 'inter-2', title: 'Haftarah blessings before the reading', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'Blessed are you, LORD our God, king of the world, who chose good prophets and was pleased with their words, which were spoken in truth. Blessed are you, LORD, who chooses the Torah, and Moses his servant, and Israel his people, and prophets of truth and righteousness.',
    notes: 'Two blessings in the Sephardi/Mizrahi form (the first and last of the haftarah blessings before the reading). Ashkenazi books print the same two but some communities add more; confirm local custom.' },
  'haftarah-after': { corrections: [['\u05D9\u05B5\u05E9\u05B6\u05C1\u05D1', '\u05D9\u05B5\u05E9\u05B5\u05C1\u05D1']], ref: 'Siddur: Haftarah, blessings after (Shabbat)', cat: 'siddur', level: 'inter-3', title: 'Haftarah blessings after the reading (Shabbat)', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: ['Blessed are you, LORD our God, king of the world, rock of all the worlds, righteous in all generations, the faithful God who says and does, who speaks and fulfils, all of whose words are true and just. You are faithful, LORD our God, and your words are faithful, and not one of your words returns empty, for you are a faithful and merciful God and king. Blessed are you, LORD, the God who is faithful in all his words.', 'Have mercy on Zion, for it is the home of our life, and save the one with a grieving soul quickly in our days. Blessed are you, LORD, who gladdens Zion through her children.', 'Gladden us, LORD our God, with Elijah the prophet your servant and with the kingdom of the house of David your anointed; may he come quickly and make our heart rejoice. On his throne let no stranger sit, and let others not inherit his glory any more, for by your holy name you swore to him that his light would never go out. Blessed are you, LORD, shield of David.', 'For the Torah, and for the service, and for the prophets, and for this Shabbat day which you gave us, LORD our God, for holiness and rest, for honour and glory. For all this, LORD our God, we thank you and bless you. May your name be blessed by every living being, always, for ever. Blessed are you, LORD, who makes the Shabbat holy.'],
    notes: 'One vowel is corrected (yeshev, tzere on the bet-bearing letter) because the Shaliehsaboo text prints a segol (the Torat Emet text on the same page also prints a segol; the Torat Emet Sefard "Haftarah Blessings" page and standard texts print a tzere). Wording of the Zion, Elijah and David paragraphs varies in Reform and Conservative books (some shorten or reword). Check the local siddur.' },
  'mi-sheberach-opening': { ref: 'Siddur: Mi sheberach, opening words', cat: 'siddur', level: 'intro-3', title: 'Mi sheberach avoteinu (opening words only)', nusach: 'Sefard (Torat Emet)', clip: { first: 6, noStop: true },
    gloss: 'He who blessed our ancestors Abraham, Isaac and Jacob',
    notes: 'Opening words only. The rest of the prayer changes with the occasion (an aliyah, healing, a birth, a bar or bat mitzvah) and contains places for a name; see gaps. Many Reform, Reconstructionist and Conservative congregations add "Sarah, Rebecca, Rachel and Leah"; that addition is not sourced here.' },
  'havdalah-opening': { ref: 'Siddur: Havdalah, opening verses (Hinei El yeshuati)', cat: 'siddur', level: 'inter-2', title: 'Hinei El yeshuati (opening of Havdalah)', nusach: 'Sefard (Torat Emet)',
    gloss: 'Behold, God is my salvation; I will trust and not be afraid, for the LORD God is my strength and my song, and he has become my salvation. You will draw water with joy from the springs of salvation. Salvation belongs to the LORD; your blessing is upon your people, Selah. The LORD of hosts is with us; the God of Jacob is our stronghold, Selah. LORD of hosts, happy is the one who trusts in you. LORD, save; may the King answer us on the day we call. The Jews had light and gladness, joy and honour; so may it be for us. I will lift the cup of salvation and call on the name of the LORD.',
    notes: 'A chain of verses (Isaiah 12, Psalms 46, 84, 20, Esther 8:16, Psalm 116:13). Order and extent vary a little between communities.' },
  'havdalah-spices': { dropTokens: ['על', 'הבשמימ'], ref: 'Siddur: Havdalah, blessing over spices', cat: 'siddur', level: 'intro-3', title: 'Havdalah: blessing over spices (besamim)', nusach: 'Sefard (Torat Emet)',
    gloss: 'Blessed are you, LORD our God, king of the world, who creates kinds of spices.' },
  'havdalah-flame': { ref: 'Siddur: Havdalah, blessing over the flame', cat: 'siddur', level: 'intro-3', title: 'Havdalah: blessing over the flame', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'Blessed are you, LORD our God, king of the world, who creates the lights of the fire.' },
  'havdalah-hamavdil': { ref: 'Siddur: Havdalah, the separation blessing', cat: 'siddur', level: 'intro-3', title: 'Havdalah: Hamavdil bein kodesh lechol', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'Blessed are you, LORD our God, king of the world, who separates between holy and ordinary, between light and darkness, between Israel and the nations, between the seventh day and the six days of work. Blessed are you, LORD, who separates between holy and ordinary.',
    notes: 'The blessing over the wine at Havdalah is the same words as kiddush-wine-1.' },
  'hanukkah-candle': { ref: 'Siddur: Hanukkah candle blessing', cat: 'siddur', level: 'intro-3', title: 'Hanukkah: blessing to light the candles', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'Blessed are you, LORD our God, king of the world, who made us holy with his commandments and commanded us to light the Hanukkah light.',
    notes: 'Some books print "ner shel Hanukkah" (the light of Hanukkah) instead of "ner Hanukkah". Both are in use; this record shows the shorter form.' },
  'hanukkah-nissim': { ref: 'Siddur: Hanukkah, blessing for the miracles', cat: 'siddur', level: 'intro-3', title: 'Hanukkah: sheasah nissim (who performed miracles)', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'Blessed are you, LORD our God, king of the world, who performed miracles for our ancestors in those days, at this time.' },
  'shehecheyanu': { ref: 'Siddur: Shehecheyanu', cat: 'siddur', level: 'intro-2', title: 'Shehecheyanu (first-time and festival blessing)', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'Blessed are you, LORD our God, king of the world, who has kept us alive, sustained us, and brought us to this time.',
    notes: 'Taken from the Hanukkah candle-lighting page; the wording is the same for festivals, new fruit and other firsts.' },
  'hanerot-halalu': { ref: 'Siddur: Hanerot halalu', cat: 'siddur', level: 'inter-1', title: 'Hanerot halalu (said while lighting Hanukkah candles)', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'We light these lights for the miracles, the deliverances, and the wonders that you did for our ancestors through your holy priests. Throughout the eight days of Hanukkah these lights are holy, and we may not use them, only look at them, in order to thank and praise your name for your miracles, your wonders and your salvations.' },
  'maoz-tzur-1': { ref: 'Siddur: Maoz Tzur, first verse', cat: 'siddur', level: 'inter-2', title: 'Maoz Tzur (first verse)', nusach: 'Edot HaMizrach (Shaliehsaboo edition)',
    gloss: 'Rock of my salvation, to praise you is fitting. Restore my house of prayer, and there we will bring a thanksgiving offering. When you have prepared the slaughter of the barking foe, then I shall complete with a song of psalm the dedication of the altar.',
    notes: 'First verse only. Ashkenazi congregations sing the best-known tune; Sephardi/Mizrahi tunes differ.' },
  // Selected Hallel verses and festival Kiddush, added 2026-11-10 (lesson-integrity). Do not rewrite existing keys.
  'hallel-113-1': { ref: 'Psalms 113:1', cat: 'torah', level: 'inter-1', title: 'Hallel: opening verse (Psalm 113:1)',
    notes: 'First verse of Hallel. The rest of Psalms 113-118, and the half-Hallel cuts used on Rosh Chodesh and the later days of Pesach, are still a gap (g-hallel).' },
  'hallel-115-1': { ref: 'Psalms 115:1', cat: 'torah', level: 'inter-1', title: "Hallel: 'Not to us, LORD' (Psalm 115:1)" },
  'hallel-116-13': { ref: 'Psalms 116:13', cat: 'torah', level: 'inter-1', title: "Hallel: 'I will lift the cup of salvation' (Psalm 116:13)",
    notes: 'This verse is also said in the opening chain of Havdalah (havdalah-opening).' },
  'hallel-117': { ref: 'Psalms 117:1-2', cat: 'torah', level: 'inter-1', title: 'Hallel: Psalm 117 (whole psalm)',
    notes: 'The shortest psalm; said in full Hallel. "Kol goyim" here means the nations, the usual biblical sense.' },
  'hallel-118-1-4': { ref: 'Psalms 118:1-4', cat: 'torah', level: 'inter-1', title: "Hallel: 'Hodu' and the responsive opening of Psalm 118",
    notes: 'The congregation answers each call with "ki l\'olam chasdo".' },
  'hallel-118-5': { ref: 'Psalms 118:5', cat: 'torah', level: 'inter-1', title: "Hallel: 'From the narrow place I called' (Psalm 118:5)" },
  'hallel-118-6': { ref: 'Psalms 118:6', cat: 'torah', level: 'inter-1', title: "Hallel: 'The LORD is with me; I will not fear' (Psalm 118:6)" },
  'hallel-118-24': { ref: 'Psalms 118:24', cat: 'torah', level: 'inter-1', title: "Hallel: 'This is the day the LORD made' (Psalm 118:24)" },
  'hallel-118-25': { ref: 'Psalms 118:25', cat: 'torah', level: 'inter-1', title: "Hallel: 'Anna Adonai hoshia na' (Psalm 118:25)" },
  'hallel-118-28': { ref: 'Psalms 118:28', cat: 'torah', level: 'inter-1', title: "Hallel: 'You are my God' (Psalm 118:28)" },
  'kiddush-festival-day-verses': { ref: 'Leviticus 23:4, 23:44', cat: 'torah', level: 'inter-1', title: 'Festival daytime Kiddush: the two Leviticus verses',
    notes: 'These two verses (not a contiguous range) are the Torah passages recited at daytime Kiddush on a festival. Pair with kiddush-wine-1. The siddur sometimes prints slightly different cantillation; the consonants follow UXLC.' },
  'kiddush-festival-eve-open': { dropParen: true, ref: 'Siddur: Yom Tov evening Kiddush, opening of the sanctification', cat: 'siddur', level: 'inter-1', title: 'Festival evening Kiddush: opening (weekday form)', nusach: 'Sefard (Torat Emet)',
    gloss: 'Blessed are you, LORD our God, king of the world, who chose us from every people, raised us above every language, and made us holy with his commandments. And you gave us, LORD our God, in love, appointed times for gladness, festivals and seasons for joy, this day of',
    notes: 'Weekday (non-Shabbat) form: parenthetical Shabbat phrases in the source were dropped with dropParen, so the line ends mid-phrase ("this day of") and must be followed by the festival insert (kiddush-festival-pesach / shavuot / sukkot / shemini) and then kiddush-festival-eve-close. Pair with kiddush-wine-1. When a festival falls on Friday night, say the parenthetical Shabbat words as well; they are not in this record.' },
  'kiddush-festival-pesach': { dropTokens: ['לפסח'], ref: 'Siddur: Yom Tov evening Kiddush, Pesach insert', cat: 'siddur', level: 'inter-1', title: 'Festival Kiddush insert: Pesach', nusach: 'Sefard (Torat Emet)',
    gloss: 'this Festival of Matzot, the time of our freedom',
    notes: 'The source rubric "for Pesach" is dropped (dropTokens). Insert this line between kiddush-festival-eve-open and kiddush-festival-eve-close.' },
  'kiddush-festival-shavuot': { dropTokens: ['לשבועות'], ref: 'Siddur: Yom Tov evening Kiddush, Shavuot insert', cat: 'siddur', level: 'inter-1', title: 'Festival Kiddush insert: Shavuot', nusach: 'Sefard (Torat Emet)',
    gloss: 'this Festival of Shavuot, the time of the giving of our Torah',
    notes: 'The source rubric "for Shavuot" is dropped. The Torat Emet text prints תּוֹרָתֵינוּ (an extra yod) and הַשָׁבוּעוֹת (shin without dagesh after the definite article). Both are kept as in the source; standard siddurim usually print תּוֹרָתֵנוּ and הַשָּׁבוּעוֹת. An educator should confirm the local book.' },
  'kiddush-festival-sukkot': { dropTokens: ['לסוכות'], ref: 'Siddur: Yom Tov evening Kiddush, Sukkot insert', cat: 'siddur', level: 'inter-1', title: 'Festival Kiddush insert: Sukkot', nusach: 'Sefard (Torat Emet)',
    gloss: 'this Festival of Sukkot, the time of our gladness',
    notes: 'The source rubric "for Sukkot" is dropped. Insert between the opening and the close. On Sukkot also say leshev-basukkah.' },
  'kiddush-festival-shemini': { dropTokens: ['לשמע', 'ולשת'], ref: 'Siddur: Yom Tov evening Kiddush, Shemini Atzeret insert', cat: 'siddur', level: 'inter-1', title: 'Festival Kiddush insert: Shemini Atzeret', nusach: 'Sefard (Torat Emet)',
    gloss: 'this Festival of Shemini Atzeret, the time of our gladness',
    notes: 'The source rubric abbreviated "for Shemini Atzeret and for Simchat Torah" is dropped. Some books print "Shemini Atzeret this festival"; the source wording is kept.' },
  'kiddush-festival-eve-close': { dropParen: true, ref: 'Siddur: Yom Tov evening Kiddush, close of the sanctification', cat: 'siddur', level: 'inter-1', title: 'Festival evening Kiddush: close (weekday form)', nusach: 'Sefard (Torat Emet)',
    gloss: 'a holy convocation, a remembrance of the exodus from Egypt. For you chose us and made us holy from all the peoples, and your holy appointed times you have given us as an inheritance in gladness and in joy. Blessed are you, LORD, who makes Israel and the seasons holy.',
    notes: 'Weekday form: parenthetical Shabbat phrases in the source were dropped with dropParen. The closing formula is "who makes Israel and the seasons holy" (not the Shabbat close "who makes the Shabbat holy"). When a festival falls on Friday night, say the parenthetical Shabbat words as well; they are not in this record.' },
  'leshev-basukkah': { ref: 'Siddur: blessing to dwell in the sukkah', cat: 'siddur', level: 'intro-3', title: 'Leshev basukkah (blessing to dwell in the sukkah)', nusach: 'Sefard (Torat Emet)',
    gloss: 'Blessed are you, LORD our God, king of the world, who made us holy with his commandments and commanded us to dwell in the sukkah.',
    notes: 'Said in the sukkah, usually after Kiddush (or after hamotzi when there is no Kiddush). Customs differ on which meals and which days of Sukkot this blessing is said; confirm local custom.' },
};


const SIDDUR_ATTR = {
  'Metsudah': 'Hebrew text: The Metsudah siddur (Metsudah Publications, 1981), as digitised on Sefaria where it is labelled CC-BY. Attribute to Metsudah Publications and credit Sefaria as the source. THE LICENCE LABEL IS SEFARIA\'S AND IS NOT INDEPENDENTLY VERIFIED.',
  'Shaliehsaboo': 'Hebrew text: Siddur Edot HaMizrach, "Shaliehsaboo Edition", from Sefaria where it is labelled CC0 (no attribution required; credit given as a courtesy). Label not independently verified.',
  'Torat Emet': 'Hebrew text: Torat Emet 357 (toratemetfreeware.com), as digitised on Sefaria where it is labelled Public Domain. Label not independently verified.',
};

const OLD_IDS = new Set(Object.keys(META).slice(0, 27)); // round-1/2 records: original derivation path, unchanged
const entries = [];
const bySnap = new Map();
for (const [id, meta] of Object.entries(META)) {
  const src = meta.derive ? snap.items[meta.derive.from] : snap.items[id];
  if (!src) throw new Error('no snapshot for ' + id);
  const big = meta.keepLarge ? largeLetters(src.rawLines.join(' ')) : [];
  let lines, transforms;
  if (OLD_IDS.has(id)) {
    lines = src.rawLines.map((l) => cleanLine(l, { dropSmall: !!meta.dropSmall }));
    if (meta.clip || meta.derive) {
      const joined = lines.join(' ');
      lines = [clipWords(joined, meta.clip || { first: meta.derive.first, noStop: meta.derive.noStop })];
    }
  } else {
    transforms = {};
    for (const k of ['dropParen', 'dropSmall', 'dropTokens', 'corrections', 'clip']) if (meta[k]) transforms[k] = meta[k];
    lines = applyTransforms(src.rawLines, transforms);
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
    status: meta.corrections ? 'transcribed-needs-check' : 'verified',
    verifiedAgainst: `Normalised he equals the programmatic normalisation (src/corpus/normalize.js) of the raw string fetched on ${fetchedOf(src)} from ${isTanach ? src.url : src.apiUrl}. This is a machine comparison against the cited source, NOT proofreading by a Hebrew educator (see proofread).`,
    proofread: false,
    retrieved: fetchedOf(src),
    typedFromMemory: false,
    traditionNeutral: true,
    snapshotId: meta.derive ? meta.derive.from : id,
  };
  if (transforms) rec.transforms = transforms;
  if (meta.corrections) rec.verifiedAgainst += ' EXCEPT these exact corrections, made because the source visibly omits a vowel: ' + meta.corrections.map(([a, b]) => `${a} -> ${b}`).join('; ') + '. Status is therefore transcribed-needs-check.';
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
const registryPath = path.join(root, 'data/corpus/registry.json');
const built = {
  schema: 'alef-corpus-registry/1',
  note: 'Built by src/corpus/tools/build-registry.mjs from data/corpus/source-snapshot.json. Do not edit by hand; edit META in the builder and re-run. See docs/corpus/LICENSES.md.',
  generated: FETCHED,
  normalisation: 'Pointed Hebrew, cantillation removed, NFC; see src/corpus/normalize.js header.',
  entries: order.map((id) => entries.find((e) => e.id === id)),
};
let out = built;
if (fs.existsSync(registryPath)) {
  // A later Metsudah re-source pass stamps `resourced` and sometimes adjusts nusach,
  // attribution and dropTokens. A fresh META build would drop that work (and, for a
  // few lines, change the Hebrew). Preserve every already-committed record; only add
  // ids that are not yet in the file. applyTransforms still ran for every META id so
  // a stale vowel correction cannot hide in an unbuilt record.
  const prev = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const prevBy = new Map(prev.entries.map((e) => [e.id, e]));
  const preserved = [];
  const added = [];
  out = { ...prev, entries: order.map((id) => {
    if (prevBy.has(id)) { preserved.push(id); return prevBy.get(id); }
    added.push(id);
    return built.entries.find((e) => e.id === id);
  }) };
  const dropped = prev.entries.filter((e) => !order.includes(e.id)).map((e) => e.id);
  if (dropped.length) throw new Error('refusing to drop registry ids: ' + dropped.join(', '));
  console.log('registry: preserved', preserved.length, 'existing records, added', added.length || 0, added.join(', ') || '');
} else {
  console.log('wrote new registry.json with', built.entries.length, 'entries');
}
fs.writeFileSync(registryPath, JSON.stringify(out, null, 1) + '\n');
