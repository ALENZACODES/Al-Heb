// @ts-check
// More games (lane games-books, 12 Nov): the games and two-player and listening versions added in this round. id = route.
// level = where each sits on the arcade's 1 to 5 ladder. Hebrew titles are words from the app's word list (data/vocab/words.json),
// pointed as they are there. variantOf names the game a version is built on (it still counts as its own card, with its own scores).
export const MORE_GAMES = Object.freeze([
  { id: 'rootbuilder', title: 'Root Builder', titleHe: 'שֹׁרֶשׁ', level: 4, tag: 'Three root letters: build every word of the family you can', skills: ['grammar', 'vocabulary'], practice: 'roots' },
  { id: 'sprint60', title: 'Sixty-Second Sprint', titleHe: 'דַּקָּה', level: 2, tag: 'Words from your lessons, one minute, a combo for every run of right answers', skills: ['vocabulary'], practice: 'reading' },
  { id: 'wordfinder-listen', title: 'Word Finder: Listening', titleHe: 'שֵׁמַע', level: 1, tag: 'Hear a word, then find it: no English, no sounds-like help', skills: ['vocabulary', 'listening'], practice: 'first', variantOf: 'wordfinder' },
  { id: 'listenspot', title: 'Listen and Spot', titleHe: 'שָׁמַע', level: 2, tag: 'Hear a word from your lessons and tap it on the board', skills: ['reading', 'listening'], practice: 'reading' },
  { id: 'quizladder-duo', title: 'Quiz Ladder for Two', titleHe: 'שְׁנַיִם', level: 3, tag: 'Two players, one device: take turns climbing the same ladder', skills: ['vocabulary'], practice: 'words', variantOf: 'quizladder' },
  { id: 'dreidel-duo', title: 'Dreidel for Two to Four', titleHe: 'סְבִיבוֹן', level: 1, tag: 'Pass-and-play dreidel: two to four players take turns on one device', skills: ['culture', 'vocabulary'], practice: 'festivals', variantOf: 'hanukkah-dreidel1' },
]);
export const MORE_IDS = Object.freeze(MORE_GAMES.map((g) => g.id));
