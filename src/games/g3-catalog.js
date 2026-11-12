// Grammar in Action games (g3-*): twenty arcade games on Hebrew grammar, intermediate to advanced (levels 3 to 5).
// id = route and file name (src/games/<id>.view.js); level = where it sits on the arcade's 1 to 5 ladder; band groups the hub
// section. Kept out of ARCADE_GAMES, so the thirty-game arcade rotation (game of the day, art set) is unchanged; the games hub
// shows them in their own section. art: a scene brief for the game's backdrop (assets/games/arcade/<id>/env.png, not made yet;
// no text or letters in the picture). Hebrew titles are words from the app's own data (data/vocab/words.json, or
// data/games/g3 for הַבַּיִת), pointed as they are there.
export const G3_GAMES = Object.freeze([
  // Intermediate (level 3): forms you meet every day
  { id: 'g3-conveyor', title: 'Tense Conveyor', titleHe: 'זְמַן', level: 3, band: 'forms', tag: 'Sort verb forms off the belt: did, doing, will do, to do', art: 'a factory conveyor belt with four sorting chutes, Rimon in a hard hat at the controls' },
  { id: 'g3-lostfound', title: 'Lost and Found', titleHe: 'אֲבֵדָה', level: 3, band: 'forms', tag: 'Read the tag: mine, his, hers or ours? Put it in the right box', art: 'a lost-property counter with labelled cardboard boxes, an umbrella and a phone on the desk, Noa behind it' },
  { id: 'g3-whack', title: 'Article Whack', titleHe: 'הַבַּיִת', level: 3, band: 'forms', tag: 'Tap only the words that mean "the …"', art: 'a garden with nine round molehills and a soft rubber mallet, Rimon peeking out of one hole' },
  { id: 'g3-onetwomany', title: 'One, Two, Many', titleHe: 'שְׁנַיִם', level: 3, band: 'forms', tag: 'One day, two days, many days: Hebrew has a word for two', art: 'a kitchen table with one cup, then a pair of cups, then a long row of cups, morning light' },
  { id: 'g3-questions', title: 'Question Radar', titleHe: 'שְׁאֵלָה', level: 3, band: 'forms', tag: 'Who, what, where, when: put the question word in the question', art: 'a friendly radar dish on a rooftop with question-shaped clouds drifting past, Ari holding binoculars' },
  { id: 'g3-packcheck', title: 'Pack Check', titleHe: 'תִּיק', level: 3, band: 'forms', tag: 'Do you have it? Remember the pack, then say yes, I have, or no, I don\'t', art: 'an open hiking backpack on a bench with a water bottle, a map and a hat spread out beside it' },
  // Upper intermediate (level 4): patterns and agreement
  { id: 'g3-clues', title: 'Pattern Clues', titleHe: 'בִּנְיָן', level: 4, band: 'patterns', tag: 'Which verb pattern is it? The fewer clues you need, the more points', art: 'a detective desk with five labelled folders, a magnifying glass and a pomegranate paperweight' },
  { id: 'g3-gate', title: 'Pattern Gate', titleHe: 'דֶּלֶת', level: 4, band: 'patterns', tag: 'Let in only the verbs of one pattern; wave the rest on', art: 'a garden gate with a small guard booth, Ari as the gatekeeper waving visitors through' },
  { id: 'g3-grid', title: 'Ending Grid', titleHe: 'לוּחַ', level: 4, band: 'patterns', tag: 'Fill the table: mine, to me, with me, me, for every person', art: 'a classroom whiteboard ruled into a neat table, coloured magnets waiting in a tray below' },
  { id: 'g3-arrows', title: 'Gift Arrows', titleHe: 'מַתָּנָה', level: 4, band: 'patterns', tag: 'Follow the arrow: to me, to him, to her, to us, with them', art: 'a party room with wrapped gifts and dotted arrows on the floor leading to different chairs' },
  { id: 'g3-agree', title: 'Agreement Match', titleHe: 'זוּג', level: 4, band: 'patterns', tag: 'Big house, big car, big houses: pair each noun with its adjective', art: 'a dance floor where cards pair up two by two under string lights' },
  { id: 'g3-negate', title: 'Not-Word Gap', titleHe: 'לֹא', level: 4, band: 'patterns', tag: 'Put "not" or "there is no" back where it belongs', art: 'a jigsaw table with one missing piece in a sentence-shaped puzzle, the piece in Noa\'s hand' },
  { id: 'g3-swapfix', title: 'Swap Fix', titleHe: 'מִשְׁפָּט', level: 4, band: 'patterns', tag: 'Two words swapped places. Swap them back', art: 'a printing press tray with wooden letter blocks, two blocks lifted out and crossed over' },
  { id: 'g3-mirror', title: 'Mirror Flip', titleHe: 'מַרְאָה', level: 4, band: 'patterns', tag: 'Ari said it; now Noa says it. Which words change?', art: 'a tall standing mirror in a hallway, Ari on one side and Noa as the reflection, both smiling' },
  // Advanced (level 5): building and repairing
  { id: 'g3-shop', title: 'Counting Shop', titleHe: 'חֲנוּת', level: 5, band: 'building', tag: 'Three shirts or three bags? The number takes the other ending', art: 'a corner shop counter with a cash register, stacked shirts and bags on the shelves, Rimon as shopkeeper' },
  { id: 'g3-chains', title: 'Chain Links', titleHe: 'שַׁרְשֶׁרֶת', level: 5, band: 'building', tag: 'House of the sick, number of the phone: link two nouns into one', art: 'two large golden chain links joining on a workbench, small tools around them' },
  { id: 'g3-press', title: 'Pattern Press', titleHe: 'תַּבְנִית', level: 5, band: 'building', tag: 'Three letters go into a pattern; which verb comes out?', art: 'an old cookie press with three dough balls going in and shaped biscuits coming out on a tray' },
  { id: 'g3-sieve', title: 'Letter Sieve', titleHe: 'נָפָה', level: 5, band: 'building', tag: 'Keep the three family letters, let the pattern letters fall through', art: 'a flour sieve over a bowl, three large letters-shaped stones caught in the mesh (no real letters drawn)' },
  { id: 'g3-repair', title: 'Repair Shop', titleHe: 'בְּעָיָה', level: 5, band: 'building', tag: 'One word does not agree. Find it and fix it', art: 'a tidy repair bench with a toolbox, a lamp and a cracked tile being mended, Noa in an apron' },
  { id: 'g3-decoder', title: 'Ending Decoder', titleHe: 'קוֹד', level: 5, band: 'building', tag: 'Read the ending, name the person: me, you, him, her, us, them', art: 'a vintage code machine with round keys and a paper tape, Ari pressing a key' },
]);
export const G3_IDS = Object.freeze(G3_GAMES.map((g) => g.id));
/** Hub groups, in order. */
export const G3_BANDS = Object.freeze([
  ['forms', 'Level 3: Forms You Meet Every Day'],
  ['patterns', 'Level 4: Patterns and Agreement'],
  ['building', 'Level 5: Building and Repairing'],
]);
