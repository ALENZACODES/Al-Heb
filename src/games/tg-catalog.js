// Torah and Hebrew games (tg-*): twelve arcade games from first letters to Torah verses, prayers and holidays.
// id = route and file name (src/games/<id>.view.js); level = where it sits on the arcade's 1 to 5 ladder.
// Spread into ARCADE_GAMES by src/games/arcade.catalog.js. art: a scene brief for the game's backdrop
// (assets/games/arcade/<id>/env.png, not made yet; no text or letters in the picture). Hebrew titles are words from the app's own word list
// or the existing catalogue (data/vocab/words.json, src/games/arcade.catalog.js), pointed as they are there.
export const TG_GAMES = Object.freeze([
  // Beginner: letters, vowels and letter numbers
  { id: 'tg-tilepairs', title: 'Tile Pairs', titleHe: 'זוּג', level: 1, tag: 'Clear the stacked tiles two by two: letter and name', art: 'a warm wooden table with a neat stack of cream tiles in layers, Rimon peeking over the top', band: 'beginner' },
  { id: 'tg-letterhunt', title: 'Verse Letter Hunt', titleHe: 'צַיִד אוֹתִיּוֹת', level: 2, tag: 'Find every letter or vowel in a real Torah verse', art: 'an open Chumash on a reading stand under soft window light, a magnifying glass resting on the page', band: 'beginner' },
  { id: 'tg-numerals', title: 'Letter Numbers', titleHe: 'עֵרֶךְ הָאוֹתִיּוֹת', level: 2, tag: 'Every letter is a number: read chapter numbers and dates', art: 'a wall calendar and a page of a printed book with large chapter letters, an abacus beside them', band: 'beginner' },
  // Intermediate: words, shared letters, verbs
  { id: 'tg-wordguess', title: 'Six Tries', titleHe: 'נַחֵשׁ', level: 3, tag: 'Guess the hidden word; the tiles tell you how close you are', art: 'six rows of blank square tiles on a green felt board, a few tiles glowing gold', band: 'intermediate' },
  { id: 'tg-torahwords', title: 'Torah Top Thirty', titleHe: 'מִלִּים בַּתּוֹרָה', level: 3, tag: 'The words the Torah uses most, and which comes up more', art: 'a long scroll unrolled on a table with small brass counters lined up beside it', band: 'intermediate' },
  { id: 'tg-family', title: 'Family Letters', titleHe: 'מִשְׁפָּחָה', level: 4, tag: 'Tap the three letters a word shares with its family', art: 'a family tree drawn as a pomegranate tree, three gold fruit at the trunk, leaves on the branches', band: 'intermediate' },
  { id: 'tg-verbslots', title: 'Verb Slots', titleHe: 'פֹּעַל', level: 4, tag: 'Put each verb form in its slot: to do, doing, will do', art: 'three wooden pigeonholes on a wall, labelled only with arrows, cards being slotted in', band: 'intermediate' },
  // Advanced: Torah, trope, prayer and the year
  { id: 'tg-storyorder', title: 'Story Order', titleHe: 'סֵדֶר הַסִּפּוּר', level: 5, tag: 'Put Torah moments in the order the Torah tells them', art: 'a row of picture frames on a gallery wall: a dove, a ladder, a coat, a burning bush, all softly lit', band: 'advanced' },
  { id: 'tg-whosaid', title: 'Who Said It?', titleHe: 'מִי אָמַר?', level: 5, tag: 'A line from the Torah: who said it?', art: 'a stage with a single microphone and speech bubbles hanging in the air, Ari in the audience', band: 'advanced' },
  { id: 'tg-parashah', title: 'Parashah Path', titleHe: 'פָּרָשָׁה', level: 5, tag: 'The 54 weekly portions: their books, names and order', art: 'a winding path through hills with 54 small stone markers, a Torah scroll at the start', band: 'advanced' },
  { id: 'tg-tropehunt', title: 'Trope Hunt', titleHe: 'טְעָמִים', level: 5, tag: 'Find the word that carries the mark in a real verse', art: 'a cantor\'s lectern with an open book, small musical marks floating above the lines like birds', band: 'advanced' },
  { id: 'tg-holidays', title: 'Holiday Sorter', titleHe: 'חַגִּים', level: 5, tag: 'Sort the words by holiday, then line up the year', art: 'a round table split into wedges: a shofar, a lulav, a menorah, a seder plate and a Purim mask', band: 'advanced' },
]);
export const TG_IDS = Object.freeze(TG_GAMES.map((g) => g.id));
