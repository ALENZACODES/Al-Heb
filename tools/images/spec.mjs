// Source-of-truth transcription of the 100-command image doc
// (the "100 image commands" prompt doc, read 2026-11-03).
// Pure data + prompt templates. No I/O. Used by build_prompt_groups.mjs.

export const DOC_COUNTS = { A: 32, B: 270, C: 162, D: 75, E: 150, F: 76, total: 765 };
/** Block G is NOT in the doc: added by lane 7 (command 101). DOC_COUNTS above stays the doc's own numbers. */
export const EXTRA_BLOCKS = { G: 'Quirky mnemonic images, one per letter form (added after the doc; not part of the doc\'s 765)' };

export const STYLE_GUIDE =
  'STYLE GUIDE v1: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), ' +
  'palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and ' +
  'charcoal (#2B2B2B); no gradients, no photoreal, no text of any kind (no Hebrew, no nikkud, no Latin letters, no numerals); ' +
  'square 1024x1024 unless stated; every object centred with 10% margin; consistent 3/4 top-down light from upper left.';

export const ARI =
  "CHARACTER SHEET A 'Ari': a friendly Israeli man around 35, short dark curly hair, trimmed beard, warm brown skin tone, navy T-shirt, simple silver chain; expression open and encouraging; no kippah by default.";
export const NOA =
  "CHARACTER SHEET B 'Noa': a friendly Israeli woman around 32, shoulder-length wavy dark hair, olive skin, terracotta blouse, small gold hoop earrings; expression warm and confident.";

/** Letter ids (contract) in the doc's order, nn = 01..27. `file` is the name used inside file names. */
export const LETTERS = [
  { nn: '01', id: 'alef', title: 'Alef', sound: 'silent', shape: 'two diagonal horns joined by a slanted body', keyword: 'Ox head', vocab: [['dad', 'aba'], ['mom', 'ima'], ['light', 'or']], cursive: 'a person leaning on a walking pole' },
  { nn: '02', id: 'bet', title: 'Bet / Vet', sound: 'b / v', shape: 'a box open to the left with a dot inside', keyword: 'Bed inside a house', vocab: [['house', 'bayit'], ['banana', 'banana'], ['sunrise', 'boker']], cursive: 'a swan gliding' },
  { nn: '03', id: 'gimel', title: 'Gimel', sound: 'g', shape: 'a tall stroke with a short foot kicking out to the left', keyword: 'Giraffe mid-stride', vocab: [['camel', 'gamal'], ['garden', 'gan'], ['carrot', 'gezer']], cursive: 'a curled shrimp' },
  { nn: '04', id: 'dalet', title: 'Dalet', sound: 'd', shape: 'a flat lintel with one post hanging from its right end', keyword: 'Door frame', vocab: [['door', 'delet'], ['fish', 'dag'], ['honey', 'dvash']], cursive: "a duck's head and neck" },
  { nn: '05', id: 'he', title: 'He', sound: 'h', shape: 'a lintel with a right post and a short detached left post leaving a gap at the top', keyword: 'House with an open window', vocab: [['mountain', 'har'], ['sun and calendar day (today)', 'hayom'], ['balloon', 'balon']], cursive: 'a horse clearing a jump' },
  { nn: '06', id: 'vav', title: 'Vav', sound: 'v', shape: 'one straight vertical with a tiny hook at top', keyword: 'Vine on a stake', vocab: [['rose', 'vered'], ['curtain', 'vilon'], ['waffle', 'waffle']], cursive: 'a single vine stake' },
  { nn: '07', id: 'zayin', title: 'Zayin', sound: 'z', shape: 'a vertical with a small crossbar crown', keyword: 'Zipper pull', vocab: [['olive', 'zayit'], ['gold', 'zahav'], ['clock', "sha'on; time = zman"]], cursive: 'a zigzag lightning bolt' },
  { nn: '08', id: 'chet', title: 'Chet', sound: 'kh, throat-clearing', shape: 'a gateway: two posts with a flat roof, no gap', keyword: 'Hut doorway', vocab: [['milk', 'chalav'], ['challah', 'challah'], ['cat', 'chatul']], cursive: 'a stone archway' },
  { nn: '09', id: 'tet', title: 'Tet', sound: 't', shape: 'a bowl whose left rim curls inward', keyword: 'Teacup with a curled handle', vocab: [['good (thumbs up)', 'tov'], ['hike', 'tiyul'], ['telephone', 'telefon']], cursive: 'a tadpole curled on itself' },
  { nn: '10', id: 'yod', title: 'Yod', sound: 'y', shape: 'a small comma hanging at the top of the line', keyword: 'Yo-yo on a short string', vocab: [['hand', 'yad'], ['sea', 'yam'], ['boy', 'yeled']], cursive: 'a yo-yo at the end of its string' },
  { nn: '11', id: 'kaf', title: 'Kaf / Khaf', sound: 'k / kh', shape: 'a rounded bracket open to the left, like a cupped hand', keyword: 'Cupped palm', vocab: [['dog', 'kelev'], ['cup', 'kos'], ['kippah', 'kipa']], cursive: 'a cupped hand' },
  { nn: '12', id: 'lamed', title: 'Lamed', sound: 'l', shape: 'the tallest letter, a staff rising above the line with a hooked foot', keyword: "Lighthouse / shepherd's staff", vocab: [['bread', 'lechem'], ['night', 'layla'], ['lemon', 'limon']], cursive: 'a lighthouse with a spiral stair' },
  { nn: '13', id: 'mem', title: 'Mem', sound: 'm', shape: 'a square with a gap at bottom left and a wave-like top', keyword: 'Mountain over water (mayim)', vocab: [['water', 'mayim'], ['king', 'melech'], ['family', 'mishpacha']], cursive: 'twin mountain peaks' },
  { nn: '14', id: 'nun', title: 'Nun', sound: 'n', shape: 'a short bent stroke like a seed or a fish', keyword: 'Nail bent at the top', vocab: [['candle', 'ner'], ['river', 'nahar'], ['miracle (shooting star)', 'nes']], cursive: 'a fishing hook' },
  { nn: '15', id: 'samekh', title: 'Samekh', sound: 's', shape: 'a closed round loop', keyword: 'Sun', vocab: [['book', 'sefer'], ['horse', 'sus'], ['salad', 'salat']], cursive: 'the sun' },
  { nn: '16', id: 'ayin', title: 'Ayin', sound: 'silent in Tel Aviv, throaty in Mizrahi speech', shape: 'a Y with the left branch curling', keyword: 'Eye (ayin)', vocab: [['eye', 'ayin'], ['tree', 'etz'], ['city skyline', 'ir']], cursive: 'a tulip with two leaves' },
  { nn: '17', id: 'pe', title: 'Pe / Fe', sound: 'p / f', shape: 'a coiled mouth with a tooth inside', keyword: 'Pie in an open mouth', vocab: [['flower', 'perach'], ['elephant', 'pil'], ['pita', 'pita']], cursive: 'a snail shell' },
  { nn: '18', id: 'tsadi', title: 'Tsadi', sound: 'ts', shape: 'a sitting cat with pointed ears on a flat base', keyword: "Cat sitting (ts of 'cats')", vocab: [['bird', 'tsipor'], ['yellow (swatch)', 'tsahov'], ['frog', 'tsfardea']], cursive: 'a cat curled up asleep' },
  { nn: '19', id: 'qof', title: 'Kof', sound: 'k', shape: 'a rounded top with a long tail dropping below the line', keyword: 'Kangaroo tail / monkey (kof) hanging', vocab: [['coffee', 'kafe'], ['voice (speech bubble, empty)', 'kol'], ['small', 'katan']], cursive: 'a kangaroo with its tail down' },
  { nn: '20', id: 'resh', title: 'Resh', sound: 'r, Israeli uvular', shape: 'a single rounded corner, like a bowed head', keyword: 'Rainbow arc / head (rosh)', vocab: [['head', 'rosh'], ['foot', 'regel'], ['train', 'rakevet']], cursive: 'a rainbow arc' },
  { nn: '21', id: 'shin', title: 'Shin / Sin', sound: 'sh / s', shape: 'three prongs rising from a base', keyword: 'Shark teeth / three flames', vocab: [['peace handshake', 'shalom'], ['sun', 'shemesh'], ['Shabbat candles', 'nerot shabbat']], cursive: 'a breaking wave' },
  { nn: '22', id: 'tav', title: 'Tav', sound: 't', shape: 'a lintel on two legs, the left leg with a foot', keyword: 'Table / tent', vocab: [['apple', 'tapuach'], ['thank-you gift', 'toda'], ['Torah scroll', 'torah']], cursive: 'a tent with one peg' },
  { nn: '23', id: 'kaf-final', title: 'Khaf sofit', sound: 'kh (final)', shape: 'like kaf but the leg drops far below the line', keyword: 'Key hanging on a hook', vocab: [['king', 'melech'], ['way', 'derech'], ['go (arrow)', 'lech']], cursive: 'a long key' },
  { nn: '24', id: 'mem-final', title: 'Mem sofit', sound: 'm (final)', shape: 'a fully closed square', keyword: 'Sealed box', vocab: [['water', 'mayim'], ['day (sun over horizon)', 'yom'], ['peace (dove)', 'shalom']], cursive: 'a padlock' },
  { nn: '25', id: 'nun-final', title: 'Nun sofit', sound: 'n (final)', shape: 'one long straight line dropping below the baseline', keyword: 'Nail driven down', vocab: [['garden', 'gan'], ['son', 'ben'], ['wine', 'yayin']], cursive: 'a nail' },
  { nn: '26', id: 'pe-final', title: 'Fe sofit', sound: 'f (final)', shape: 'pe with its tail dropping below the line', keyword: 'Flag on a pole', vocab: [['body', 'guf'], ['end (finish line)', 'sof'], ['beach', 'chof']], cursive: 'a flag on a tall pole' },
  { nn: '27', id: 'tsadi-final', title: 'Tsadi sofit', sound: 'ts (final)', shape: 'tsadi with a long straight descender', keyword: 'Tree with a taproot', vocab: [['tree', 'etz'], ['land', 'eretz'], ['summer', 'kayitz']], cursive: 'a sapling with a taproot' },
];

/** File-name token for a letter: contract id with '-' -> '_' (kaf-final -> kaf_final). */
export const letterToken = (l) => l.id.replace(/-/g, '_');

export const VOWELS = [
  { nn: '01', token: 'kamatz', title: 'Kamatz', ids: ['kamatz'], sound: "'ah' as in father", keyword: 'Father with arms wide', mouth: 'MOUTH_ah', position: 'under the letter, centred' },
  { nn: '02', token: 'patach', title: 'Patach', ids: ['patach'], sound: "'ah'", keyword: 'Open palm (same sound as kamatz)', mouth: 'MOUTH_ah', position: 'under the letter, centred, flat' },
  { nn: '03', token: 'tzere', title: 'Tzere', ids: ['tzere'], sound: "'eh' as in they, no glide", keyword: 'Egg in a cup', mouth: 'MOUTH_eh', position: 'under the letter, two side-by-side marks' },
  { nn: '04', token: 'segol', title: 'Segol', ids: ['segol'], sound: "'eh' as in bed", keyword: 'Bed', mouth: 'MOUTH_eh', position: 'under the letter, three marks in a triangle' },
  { nn: '05', token: 'chirik', title: 'Chirik', ids: ['chirik'], sound: "'ee' as in see", keyword: 'Key', mouth: 'MOUTH_ee', position: 'under the letter, one mark' },
  { nn: '06', token: 'cholam_male', title: 'Cholam male', ids: ['cholam'], sound: "'oh' as in go, no glide", keyword: 'Open door with a ball', mouth: 'MOUTH_oh', position: 'above and to the left of the letter, after a vav-shaped empty slot' },
  { nn: '07', token: 'cholam_chaser', title: 'Cholam chaser', ids: ['cholam'], sound: "'oh'", keyword: 'Globe', mouth: 'MOUTH_oh', position: 'above the letter at its upper-left corner' },
  { nn: '08', token: 'kubutz', title: 'Kubutz', ids: ['kubutz'], sound: "'oo' as in boot", keyword: 'Boot', mouth: 'MOUTH_oo', position: 'under the letter, three marks on a diagonal' },
  { nn: '09', token: 'shuruk', title: 'Shuruk', ids: ['shuruk'], sound: "'oo'", keyword: 'Moon', mouth: 'MOUTH_oo', position: 'a single mark inside an empty vav-shaped slot beside the letter' },
  { nn: '10', token: 'shva', title: 'Shva', ids: ['shva'], sound: "either silent or a quick 'uh'", keyword: "a finger on closed lips, and a second tiny 'uh' hiccup bubble", mouth: 'MOUTH_none', position: 'under the letter, two marks stacked' },
  { nn: '11', token: 'chataf_patach', title: 'Chataf patach', ids: ['chataf-patach'], sound: "quick 'ah'", keyword: 'Open palm with a running figure (speed)', mouth: 'MOUTH_ah', position: 'under the letter, flat mark plus stacked pair' },
  { nn: '12', token: 'chataf_segol', title: 'Chataf segol', ids: ['chataf-segol'], sound: "quick 'eh'", keyword: 'Bed with a running figure', mouth: 'MOUTH_eh', position: 'under the letter, triangle plus stacked pair' },
  { nn: '13', token: 'chataf_kamatz', title: 'Chataf kamatz', ids: ['chataf-kamatz'], sound: "quick 'oh'", keyword: 'Globe with a running figure', mouth: 'MOUTH_oh', position: 'under the letter, kamatz plus stacked pair' },
  { nn: '14', token: 'dagesh', title: 'Dagesh', ids: ['dagesh'], sound: 'not a vowel: a dot that hardens b/k/p', keyword: 'a Drum (hard beat) beside a soft Pillow', mouth: 'MOUTH_none', position: 'a single mark inside the empty letter box' },
  { nn: '15', token: 'shin_sin_dots', title: 'Shin and sin dots', ids: ['shin-dot', 'sin-dot'], sound: "right dot 'sh', left dot 's'", keyword: "Shark fin (right dot, 'sh') and Sun (left dot, 's')", mouth: 'MOUTH_none', position: 'a mark above the right prong, then a second card with it above the left prong' },
];

export const VOCAB = [
  { nn: '80', token: 'greetings', title: 'Greetings & fillers', track: 'israel', items: ['a handshake (shalom)', 'thumbs-up with a relaxed face (sababa)', 'a hand waving someone forward (yalla)', "a shrug with a smile (ein be'aya, no problem)", 'a wink (achla)', "Ari asking 'how's it going' with open palms (ma nishma)", 'a fist bump (achi, bro)', 'a goodbye wave (lehitraot)', 'a yawn at night (layla tov)', 'morning stretch at a window (boker tov)'] },
  { nn: '81', token: 'cafe', title: 'Cafe & ordering', track: 'israel', items: ['iced coffee in a tall glass (kafe kar)', 'a cappuccino (hafuch)', 'a bottle of water', 'a plate of hummus with pita', 'shakshuka in a pan', 'a falafel in pita', 'a slice of chocolate cake', 'a bill on a small tray with coins', 'a raised hand calling a waiter', 'a tip jar'] },
  { nn: '82', token: 'numbers', title: 'Numbers 1-10', track: 'israel', items: ['one lemon', 'two oranges', 'three figs', 'four dates', 'five olives', 'six pomegranate seeds on a plate', 'seven candles', 'eight falafel balls', 'nine stars', 'ten fingers held up'] },
  { nn: '83', token: 'market', title: 'Market & shopping', track: 'israel', items: ['a kilo weight on a scale', 'a basket of tomatoes', 'a bunch of grapes', "a vendor's hand holding out change", 'a price tag left blank', 'a tote bag', 'a loaf of challah', 'a jar of tahini', 'a wedge of cheese', "a cashier's card reader"] },
  { nn: '84', token: 'directions', title: 'Directions & city', track: 'israel', items: ['a street corner sign post left blank', 'a bus stop', 'a taxi', 'a train platform', 'a traffic light', 'a map pin', 'a left-turn arrow', 'a right-turn arrow', "a 'straight ahead' arrow", 'a pedestrian crossing'] },
  { nn: '85', token: 'transport', title: 'Transport & travel', track: 'israel', items: ['an airplane', 'a suitcase', 'a passport (blank cover)', 'a Rav-Kav-style transit card (blank)', 'a scooter', 'a bicycle', 'a beach umbrella', 'a hotel key card', 'a backpack', 'a sunhat'] },
  { nn: '86', token: 'home', title: 'Home & family', track: 'israel', items: ['a house', 'a door', 'a key', 'a kitchen table', 'a bed', 'a window', 'a mother and child', 'a father and child', 'grandparents on a bench', 'a dog'] },
  { nn: '87', token: 'body', title: 'Body & health', track: 'israel', items: ['a head in profile', 'an eye', 'an ear', 'a hand', 'a foot', 'a heart', 'a smile', 'a pharmacy cross', 'a glass of water with a pill', 'a thermometer'] },
  { nn: '88', token: 'colours', title: 'Colours & days', track: 'israel', items: ['a red paint blot', 'a blue paint blot', 'a yellow paint blot', 'a green paint blot', 'a white paint blot', 'a black paint blot', 'an orange paint blot', 'a purple paint blot', "a sunrise for 'day'", "a crescent moon for 'night'"] },
  { nn: '89', token: 'synagogue', title: 'Synagogue objects', track: 'synagogue', items: ['a siddur (closed, blank cover)', 'a Torah scroll', 'a tallit folded', 'a kippah', 'a Torah pointer (yad)', 'the ark with its curtain', 'a shofar', 'a bimah', 'a mezuzah', 'a pair of tefillin'] },
  { nn: '90', token: 'shabbat', title: 'Shabbat table', track: 'synagogue', items: ['two candlesticks lit', 'a kiddush cup', 'a challah under its cover', 'a salt dish', 'a white tablecloth', 'a bouquet', 'a wine bottle', 'a challah knife', 'two hands over candles', 'a family around the table (small, from above)'] },
  { nn: '91', token: 'holidays', title: 'Holidays', track: 'synagogue', items: ['apples and honey (Rosh Hashanah)', 'a shofar on a white cloth (Yom Kippur)', 'a sukkah with a lulav and etrog (Sukkot)', 'a nine-branch menorah (Hanukkah)', 'a seder plate (Passover)', 'a scroll and a grogger (Purim)', 'a tree sapling (Tu BiShvat)', 'a basket of first fruits (Shavuot)', 'an Israeli flag (Yom HaAtzmaut)', 'a lit yahrzeit-style memorial candle (Yom HaShoah)'] },
  { nn: '92', token: 'prayer_actions', title: 'Prayer verbs & actions', track: 'synagogue', items: ['standing', 'bowing slightly', 'covering the eyes with one hand (Shema)', 'holding a book open', 'lifting a cup', 'washing hands from a two-handled cup', 'kissing a tallit fringe', 'a congregation facing the ark (backs, small)', 'a child reading beside an adult', 'a cantor with hands open'] },
  { nn: '93', token: 'classroom', title: 'Classroom & learning', track: 'synagogue', items: ['a pencil', 'a notebook', 'a tablet with a blank screen', 'headphones', 'a microphone', 'a flashcard stack', 'a stopwatch', 'a trophy', 'a hand raised', 'a lightbulb'] },
  { nn: '94', token: 'weather', title: 'Weather, time & small talk', track: 'synagogue', items: ['the sun', 'rain', 'a hot thermometer', 'a clock face without numbers', 'a calendar grid, blank', 'a cold drink sweating', 'a beach', 'a traffic jam', 'a phone with a blank screen', 'a cup of tea with mint (nana)'] },
];

export const ICONS = ['home', 'letters', 'vowels', 'read', 'speak', 'write', 'trace', 'camera', 'translate', 'calendar', 'shabbat_candles', 'synagogue', 'cafe', 'map', 'play', 'pause', 'replay', 'slow', 'man_voice', 'woman_voice', 'microphone', 'check', 'retry', 'star', 'streak_flame', 'settings', 'search', 'bookmark', 'share', 'lock', 'unlock', 'trophy', 'hint', 'sound_on', 'sound_off', 'next', 'back', 'profile', 'help', 'download'];

export const BADGES = ['a single candle', 'two candles', 'an open book', 'a reading glass over a page', 'a pomegranate', 'a shofar', 'a Torah pointer (yad)', 'a crown'];

export const PRAYER_TRACK = ['a hand covering eyes (Shema)', 'a doorpost mezuzah being touched', 'lit Shabbat candles with hands circling', 'a kiddush cup raised', 'a challah being torn', 'a Torah scroll being lifted open', 'a congregation standing in silence (Amidah)', 'a row of people bowing (Aleinu)', 'a shofar blown at sunrise', 'a tent village seen from a hill at dawn (Mah Tovu)'];

export const BLESSING_SCENES = ['two hands raised in the priestly blessing gesture (fingers split in pairs) over a soft light', "a parent's hands resting on a child's head at a Shabbat table", "sunlight breaking over Jerusalem hills (the 'shine his face' line)", 'a calm sea at dawn (peace)', 'an open blank scroll on a reading table with a yad pointer', 'a doorway with light spilling out'];

export const BACKGROUNDS = [
  ['jerusalem', 'a Jerusalem stone courtyard at golden hour'], ['telaviv', 'a Tel Aviv beachfront boulevard'],
  ['shabbat', 'a Shabbat table before the meal'], ['synagogue', 'a synagogue interior facing the ark'],
  ['market', 'a Carmel Market stall of fruit'], ['cafe', 'an Israeli cafe terrace'],
];

export const BRAND = [
  ['icon', 1024, 1024, 'a 1024x1024 app icon (an open book whose pages form a rising sun, cream and blue)'],
  ['store', 1792, 1024, 'a 1792x1024 app-store banner with Ari and Noa at a cafe table, one tablet between them showing a blank screen'],
  ['cover_a', 1024, 1536, 'a 1024x1536 book-cover illustration (the two raised hands from the opening blessing art over a cream field, space left for the title in the top third)'],
  ['cover_b', 1024, 1536, 'the same cover illustration with a Tel Aviv skyline instead of the raised hands, 1024x1536, space left for the title in the top third'],
  ['hero', 1792, 1024, 'a 1792x1024 website hero with the beach background and the two narrators'],
  ['ad', 1024, 1024, 'an ad tile of a finger tracing on a tablet'],
];

/** Block G (command 101): quirky mnemonic style addendum, applied on top of STYLE_GUIDE. */
export const QUIRKY_STYLE =
  'QUIRKY ADDENDUM: a funny, slightly absurd cartoon in the same flat-vector style, one hero subject only (plus at most one small prop), ' +
  'a cheeky expression or pose, the same line weight and the same limited palette in every image of the set, plain cream background, ' +
  'subject centred and large. Do not draw any letter or letter-like shape: the Hebrew letter is added later as vector type, so keep the image free of writing, signs, labels, speech-bubble text and numerals; any book, sign, page or screen in the picture stays completely blank.';

/**
 * Sound-variant forms that have no record of their own in data/letters/mnemonics.json (it has 27 records, one per
 * contract letter id). Each idea is taken from that letter's `story` field; ids are the file tokens.
 * `of` = parent contract id, `story` = the sentence of the parent story it is drawn from.
 */
export const QUIRKY_VARIANTS = [
  { of: 'bet', token: 'vet', title: 'Vet (bet without the dot)', sound: 'v', idea: 'the same cozy cartoon house with the ball gone, a startled cat peeking out and a vase on the windowsill', story: 'Take the ball out and the house goes Vvvvery quiet: V, like a Vase on the shelf.' },
  { of: 'kaf', token: 'khaf', title: 'Khaf (kaf without the dot)', sound: 'kh', idea: 'a dog clearing its throat with a paw at its chest, a little dust cloud puffing out', story: 'Without the dot it clears its throat: Kh.' },
  { of: 'pe', token: 'fe', title: 'Fe (pe without the dot)', sound: 'f', idea: 'a mouth with its tongue out softly blowing a feather away', story: 'Without the dot, the tongue falls out and the air leaks softly: Ffff! like blowing a feather.' },
  { of: 'shin', token: 'sin', title: 'Sin (shin with the dot on the left)', sound: 's', idea: 'a cartoon person mid-sneeze beside a candle whose three flames lean away', story: 'The dot on the left means s (left side, like a Sneeze): Sin.' },
];
export const QUIRKY_ADDENDUM_SHORT = 'funny, slightly absurd flat-vector cartoons, one hero subject, same line weight and palette in every image, plain cream background, no letters or writing of any kind (the Hebrew letter is added later as vector).';
