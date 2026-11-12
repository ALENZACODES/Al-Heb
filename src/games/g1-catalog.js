// Letters, vowels and reading sounds (lane g1): twenty games from the first letter shapes to reading whole words.
// id = route and file name (src/games/<id>.view.js); level = where it sits on the arcade's 1 to 5 ladder. Kept apart from
// ARCADE_GAMES (its count and the game-of-the-day rotation stay as they are); the games hub lists them in one section.
// art: a scene brief for the game's backdrop (assets/games/arcade/<id>/env.png, not made yet; no text or letters in the
// picture). Hebrew titles are words from the app's word list (data/vocab/words.json), pointed as they are there.
export const G1_GAMES = Object.freeze([
  // Beginner: letter shapes, names and sounds
  { id: 'g1-strokeorder', title: 'Stroke Order', titleHe: 'קַו', level: 1, band: 'shapes', tag: 'Tap the strokes of a letter in the order you write them', art: 'a writing desk with a fountain pen and a sheet of wide-ruled paper, Rimon holding a pencil like a baton' },
  { id: 'g1-reveal', title: 'Slow Reveal', titleHe: 'אַט', level: 1, band: 'shapes', tag: 'A letter draws itself bit by bit: name it as early as you can', art: 'a dark stage where a thin beam of light slowly sweeps across a blank easel, Noa watching from a chair' },
  { id: 'g1-script', title: 'Print and Script', titleHe: 'כְּתָב', level: 1, band: 'shapes', tag: 'Link each handwritten letter to its printed twin', art: 'a postcard and a printed book page side by side on a table, a ribbon running between them' },
  { id: 'g1-duel', title: 'Look-Alike Duel', titleHe: 'תְּאוֹם', level: 1, band: 'shapes', tag: 'Two letters that look alike, one name called: pick a side, fast', art: 'two matching wooden doors under a stone arch, Ari standing between them with a whistle' },
  { id: 'g1-sounddash', title: 'Sound Dash', titleHe: 'מָהִיר', level: 1, band: 'sounds', tag: 'Race Ari to the finish: hear the sound, tap its letter', art: 'a sunny running track with two lanes and a ribbon at the finish, Rimon and Ari crouched at the start' },
  { id: 'g1-rhythm', title: 'Letter Rhythm', titleHe: 'קֶצֶב', level: 1, band: 'shapes', tag: 'Watch the letters light up, then play the pattern back', art: 'four round drum pads glowing in soft colours on a music room floor, Noa holding drumsticks' },
  { id: 'g1-gaptrain', title: 'Gap Train', titleHe: 'רַכֶּבֶת', level: 1, band: 'shapes', tag: 'Some carriages are missing: put the letters back in order', art: 'a toy train of wooden carriages on a curling track across a rug, a few carriages waiting on a siding' },
  { id: 'g1-whereis', title: 'Start, Middle or End', titleHe: 'אֶמְצַע', level: 1, band: 'sounds', tag: 'Find where the letter sits in a real word', art: 'a long garden path with a gate at each end and a bench in the middle, Rimon pointing along it' },
  // Vowels and syllables
  { id: 'g1-finalswitch', title: 'Final Switch', titleHe: 'קָצֶה', level: 2, band: 'sounds', tag: 'Tap the letters that change shape at the end of a word', art: 'a coat rack by a front door with five long coats hanging at the end of the row' },
  { id: 'g1-sounddots', title: 'Dot or No Dot', titleHe: 'נְקֻדָּה', level: 2, band: 'sounds', tag: 'b or v? k or kh? The dot inside decides', art: 'a light table with a single bright dot of light in the centre and a magnifying glass beside it' },
  { id: 'g1-vowelchain', title: 'Vowel Dominoes', titleHe: 'שַׁרְשֶׁרֶת', level: 2, band: 'vowels', tag: 'Play a syllable that shares the letter or the vowel sound', art: 'a long snaking line of ivory domino tiles on a green table, Ari reaching to place the next one' },
  { id: 'g1-soundpairs', title: 'Same Sound Pairs', titleHe: 'צֶמֶד', level: 2, band: 'vowels', tag: 'Two spellings, one sound: find the pairs on an open board', art: 'pairs of matching socks pegged on a washing line in a sunny yard' },
  { id: 'g1-blend', title: 'Blend It', titleHe: 'עִרְבֵּב', level: 2, band: 'vowels', tag: 'Syllables slide together: which word do they make?', art: 'a kitchen counter with two mixing bowls being poured into a third, Rimon in an apron' },
  { id: 'g1-nonsense', title: 'Nonsense Reader', titleHe: 'קְרִיאָה', level: 2, band: 'vowels', tag: 'Read made-up words: no guessing from meaning, just the sounds', art: 'a cosy reading nook with a stack of blank-covered books and a lamp, Noa reading aloud' },
  { id: 'g1-dagesh', title: 'Dagesh Spotter', titleHe: 'דָּגֵשׁ', level: 2, band: 'vowels', tag: 'Find every letter with a dot inside', art: 'a spotter\'s telescope on a balcony pointed at a night sky full of small bright stars' },
  { id: 'g1-riverhop', title: 'River Hop', titleHe: 'קָפַץ', level: 2, band: 'vowels', tag: 'Hop from stone to stone, reading each syllable called', art: 'a shallow river with round stepping stones in rows, Rimon mid-hop with arms out' },
  // Reading whole words
  { id: 'g1-shva', title: 'Shva: Said or Silent', titleHe: 'שְׁוָא', level: 3, band: 'reading', tag: 'Two dots under a letter: do you say them or not?', art: 'a quiet library desk with a bell and a finger raised to lips beside it' },
  { id: 'g1-helpers', title: 'Silent Helpers', titleHe: 'סָמוּי', level: 3, band: 'reading', tag: 'Tap the letters that help the vowel and are not said', art: 'stagehands in dark clothes moving scenery behind a lit stage, only their shadows visible' },
  { id: 'g1-syllablecut', title: 'Syllable Cut', titleHe: 'חִלֵּק', level: 3, band: 'reading', tag: 'Cut a word into the beats you say', art: 'a baker slicing a long braided loaf into neat pieces on a wooden board' },
  { id: 'g1-flashread', title: 'Flash Read', titleHe: 'בָּזָק', level: 3, band: 'reading', tag: 'A word flashes and hides: how did it sound?', art: 'a camera flash going off in a dim room, a card held up in the bright moment' },
]);
export const G1_IDS = Object.freeze(G1_GAMES.map((g) => g.id));
/** The hub groups, in order. */
export const G1_BANDS = Object.freeze([
  ['shapes', 'Letter Shapes and Names'], ['sounds', 'Letter Sounds and Final Forms'], ['vowels', 'Vowels and Syllables'], ['reading', 'Reading Whole Words'],
]);
