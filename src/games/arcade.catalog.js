// The arcade: short games in the order a learner meets them (level 1 to 5).
// id = route and file name (src/games/<id>.view.js); level = where it fits on the 1 to 5 ladder.
import { TG_GAMES } from './tg-catalog.js';
const BASE_GAMES = [
  // Level 1: letters and their shapes
  { id: 'letterchomp', title: 'Letter Chomp', titleHe: 'אוֹכֵל אוֹתִיּוֹת', level: 1, tag: 'Maze chase: eat only the target letter' },
  { id: 'fallingletters', title: 'Falling Letters', titleHe: 'אוֹתִיּוֹת נוֹפְלוֹת', level: 1, tag: 'Steer falling letters to spell the word' },
  { id: 'lettertwins', title: 'Letter Twins', titleHe: 'תְּאוֹמִים', level: 1, tag: 'Memory pairs: letter and its name' },
  { id: 'soundsnap', title: 'Sound Snap', titleHe: 'שְׁמַע וְלַחֵץ', level: 1, tag: 'Hear a letter, tap it before it hides' },
  { id: 'lookalikes', title: 'Look-Alike Sorter', titleHe: 'דּוֹמִים', level: 1, tag: 'Sort the letters that look alike' },
  { id: 'alefbetrun', title: 'Aleph-Bet Run', titleHe: 'רִיצַת אָלֶף־בֵּית', level: 1, tag: 'Tap the letters in order, fast' },
  { id: 'finalfive', title: 'Final Five', titleHe: 'אוֹתִיּוֹת סוֹפִיּוֹת', level: 1, tag: 'Pick the final form at the end of a word' },
  { id: 'letterdrop', title: 'Letter Drop', titleHe: 'אוֹתִיּוֹת יוֹרְדוֹת', level: 1, tag: 'Catch the matching letter in your basket' },
  // Level 2: vowels, syllables, first words
  { id: 'vowelstack', title: 'Vowel Stack', titleHe: 'עֲרֵמַת נִקּוּד', level: 2, tag: 'Put the right vowel under the letter' },
  { id: 'syllablesnake', title: 'Syllable Snake', titleHe: 'נָחָשׁ', level: 2, tag: 'Eat the syllables in order to grow the word' },
  { id: 'wordbuilder', title: 'Word Builder', titleHe: 'בּוֹנֶה מִלִּים', level: 2, tag: 'Tap letters in order to build the word' },
  { id: 'meltdown', title: 'Meltdown', titleHe: 'הַקַּרְטִיב נָמֵס', level: 2, tag: 'Guess the word before the ice pop melts' },
  { id: 'flapvowel', title: 'Flap the Vowel', titleHe: 'עוּף!', level: 2, tag: 'Flap through the gate with the right vowel' },
  { id: 'bingoletters', title: 'Letter Bingo', titleHe: 'בִּינְגוֹ', level: 2, tag: 'Hear the sound, mark the card' },
  // Level 3: words
  { id: 'wordsearch', title: 'Word Search', titleHe: 'חִפּוּשׂ מִלִּים', level: 3, tag: 'Find the hidden words, right to left' },
  { id: 'minicross', title: 'Mini Crossword', titleHe: 'תַּשְׁבֵּץ', level: 3, tag: 'English clues, Hebrew answers' },
  { id: 'wordmaze', title: 'Word Maze', titleHe: 'מָבוֹךְ מִלִּים', level: 3, tag: 'Walk the path that spells the word' },
  { id: 'scramble', title: 'Scramble', titleHe: 'בִּלְבּוּל', level: 3, tag: 'Unscramble the letters' },
  { id: 'bubbleword', title: 'Bubble Word', titleHe: 'בּוּעוֹת', level: 3, tag: 'Pop the bubble that completes the word' },
  { id: 'trueornot', title: 'True or Not', titleHe: 'נָכוֹן אוֹ לֹא', level: 3, tag: 'Is the meaning right? Left or right, fast' },
  { id: 'lettercrush', title: 'Letter Crush', titleHe: 'רִסּוּק אוֹתִיּוֹת', level: 3, tag: 'Swap tiles to line up three letters' },
  { id: 'lettersudoku', title: 'Letter Sudoku', titleHe: 'סוּדוֹקוּ', level: 3, tag: 'Every row, column and box gets each letter once' },
  { id: 'quizladder', title: 'Quiz Ladder', titleHe: 'סֻלָּם', level: 3, tag: 'Climb ten questions with two lifelines' },
  { id: 'speedtype', title: 'Speed Type', titleHe: 'הַקְלָדָה מְהִירָה', level: 3, tag: 'Type the word on the Hebrew keyboard' },
  // Level 4: grammar in motion
  { id: 'gendersplit', title: 'Gender Split', titleHe: 'זָכָר אוֹ נְקֵבָה', level: 4, tag: 'He or she? Sort the nouns' },
  { id: 'pluralpop', title: 'Plural Pop', titleHe: 'רַבִּים', level: 4, tag: 'Pop the right plural ending' },
  { id: 'sentencetrain', title: 'Sentence Train', titleHe: 'רַכֶּבֶת מִשְׁפָּטִים', level: 4, tag: 'Couple the words into a sentence' },
  // Level 5: the laws
  { id: 'noahseven', title: 'The Seven Laws', titleHe: 'שֶׁבַע מִצְווֹת', level: 5, tag: 'The seven laws given to all humanity' },
  { id: 'tenwords', title: 'The Ten Words', titleHe: 'עֲשֶׂרֶת הַדִּבְּרוֹת', level: 5, tag: 'Place the ten statements on the tablets' },
  { id: 'mitzvot613', title: '613 Sorter', titleHe: 'תַּרְיַ"ג מִצְווֹת', level: 5, tag: 'Do or do not? Sort the mitzvot' },
];
// Torah and Hebrew games (src/games/tg-catalog.js) join each level after its existing games; the advanced ones extend level 5.
export const ARCADE_GAMES = Object.freeze([...BASE_GAMES, ...TG_GAMES].sort((a, b) => a.level - b.level));

export const ARCADE_IDS = Object.freeze(ARCADE_GAMES.map((g) => g.id));
