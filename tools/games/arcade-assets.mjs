#!/usr/bin/env node
// Writes the arcade asset lists: docs/games/arcade-images.csv (every picture the thirty games can show, with its exact path)
// and docs/games/arcade-voice-lines.csv (every Hebrew clip they can play, with its exact path). Run after changing the catalogue.
import { writeFileSync, readFileSync } from 'node:fs';
import { ARCADE_GAMES } from '../../src/games/arcade.catalog.js';

const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const scenes = {
  letterchomp: 'a maze of paper-cream corridors seen from above, charcoal walls, Rimon peeking in from the entrance',
  fallingletters: 'a tall stone well with a soft glow at the bottom, loose letter tiles drifting down like leaves (no readable letters)',
  lettertwins: 'a café table with face-down cards in a neat grid, Ari and Noa seated at the sides',
  soundsnap: 'a garden lawn with round holes, an ear-shaped flower in the corner, dusk light',
  lookalikes: 'three wooden sorting bins on a market table, Noa holding up two look-alike tiles (blank)',
  alefbetrun: 'a running track curving across a Tel Aviv beach promenade, Rimon mid-stride',
  finalfive: 'five coat hooks by a door with five little coats, warm hallway light',
  letterdrop: 'rain falling in soft lanes over a market street, Noa holding a wicker basket, Ari calling with a hand to his mouth',
  vowelstack: 'a tower of smooth blocks on a workbench, Ari balancing the top one',
  syllablesnake: 'a garden path winding between pomegranate bushes, a long trail of leaf tiles behind Rimon',
  wordbuilder: 'a construction site with a small wall of blank bricks going up, Noa in a hard hat handing a brick',
  meltdown: 'a hot Tel Aviv afternoon, Noa under a beach umbrella holding an ice pop that is just beginning to drip',
  flapvowel: 'a sky over the sea with soft cloud gates, Rimon flying with two tiny leaf wings',
  bingoletters: 'a community hall table with a bingo card and dauber, Ari at a lectern with a tumbler of balls (no letters visible)',
  wordsearch: 'a newspaper spread on a café table, a pencil, a cup of coffee, morning light',
  minicross: 'a crossword-shaped lattice of white squares floating over Jerusalem stone, pencil and eraser',
  wordmaze: 'hedges of a garden maze with stepping stones in the paths, Rimon at the gate',
  scramble: 'letter tiles tumbling out of a tipped bag onto a kitchen table, Noa laughing',
  bubbleword: 'soap bubbles rising over a bathtub, Rimon blowing a bubble wand',
  trueornot: 'two doors side by side, one green and one red, in a Bauhaus hallway',
  lettercrush: 'a candy-shop counter with rows of coloured gems in a glass case',
  lettersudoku: 'a grid of tiles on a chalkboard easel in a classroom, chalk dust in the light',
  quizladder: 'a TV quiz studio with a tall glowing ladder, Ari as host at a podium, Noa at a side desk',
  speedtype: 'an old typewriter and a modern laptop side by side on a desk, coffee, a window onto the sea',
  gendersplit: 'Ari on the left and Noa on the right of a market square, a stream of blank word tiles between them',
  pluralpop: 'balloons rising over a Jerusalem rooftop at sunset, Rimon holding the strings of two of them',
  sentencetrain: 'a small steam train on a platform, Noa in a conductor cap with a whistle, carriages with blank sides',
  noahseven: 'a wooden ark on a calm sea under a rainbow, seven doves in a row (no text)',
  tenwords: 'two rounded stone tablets on a mountain top at dawn, blank faces, light breaking over them',
  mitzvot613: 'a long library shelf of tall scrolls, a ladder, two stacks of cards, one green and one red',
};
const cast = [
  ['assets/games/arcade/cast/rimon-face.png', 'Rimon, head only, big friendly dot eyes, facing front, transparent background, 256x256'],
  ['assets/games/arcade/cast/rimon-fly.png', 'Rimon flying with two small leaf wings, side view, transparent background, 256x256'],
  ['assets/games/arcade/cast/noa-basket.png', 'Noa waist-up holding a wicker basket in both hands, transparent background, 256x256'],
  ['assets/games/arcade/cast/noa-icepop.png', 'Noa waist-up holding an ice pop, hot-day squint, transparent background, 256x256'],
  ['assets/games/arcade/cast/noa-hint.png', 'Noa waist-up with one finger raised, about to give a hint, transparent background, 256x256'],
  ['assets/games/arcade/cast/noa-conductor.png', 'Noa waist-up in a conductor cap with a whistle, transparent background, 256x256'],
  ['assets/games/arcade/cast/noa-side.png', 'Noa waist-up, arms open in welcome, transparent background, 256x256'],
  ['assets/games/arcade/cast/ari-caller.png', 'Ari waist-up with a hand cupped to his mouth, calling out, transparent background, 256x256'],
  ['assets/games/arcade/cast/ari-host.png', 'Ari waist-up as a quiz host holding question cards, transparent background, 256x256'],
  ['assets/games/arcade/cast/ari-side.png', 'Ari waist-up, arms open in welcome, transparent background, 256x256'],
];
const letters = JSON.parse(readFileSync(new URL('../../data/letters/letters.json', import.meta.url), 'utf8'));
const img = [['path', 'game', 'kind', 'size', 'description'].join(',')];
for (const g of ARCADE_GAMES) img.push([`assets/games/arcade/${g.id}/env.png`, g.id, 'backdrop', '1600x600', `${g.title}: ${scenes[g.id]}`].map(q).join(','));
for (const [p, d] of cast) img.push([p, 'cast', 'sprite', '256x256', d].map(q).join(','));
for (const l of letters) img.push([`assets/games/arcade/letters/${l.id}.png`, 'letters', 'letter sprite', '256x256', `The letter ${l.name} (${l.he}) as a chunky friendly tile character in the house style: the glyph shape itself, thick charcoal outline, pomegranate-red or sea-blue fill, two dot eyes near the top, no other text`].map(q).join(','));
writeFileSync(new URL('../../docs/games/arcade-images.csv', import.meta.url), img.join('\n') + '\n');

const lines = [['clip_id', 'voice', 'output_path', 'hebrew', 'phonetic', 'english', 'used_in'].join(',')];
const common = [[2, 'בּוֹא נַתְחִיל!', "Bo natchil!", "Let's start!"], [3, 'כָּל הַכָּבוֹד!', 'Kol ha-kavod!', 'Well done!'], [4, 'נַסֵּה שׁוּב.', 'Naseh shuv.', 'Try again.']];
for (const g of ARCADE_GAMES) for (const v of ['m', 'f']) {
  lines.push([`${g.id}-01`, v, `audio/${v}/israeli/games/${g.id}-01.mp3`, g.titleHe, g.title, g.title, g.id].map(q).join(','));
  for (const [n, he, tr, en] of common) lines.push([`${g.id}-${String(n).padStart(2, '0')}`, v, `audio/${v}/israeli/games/${g.id}-${String(n).padStart(2, '0')}.mp3`, he, tr, en, g.id].map(q).join(','));
}
const laws = JSON.parse(readFileSync(new URL('../../data/games/mitzvot.json', import.meta.url), 'utf8'));
for (const v of ['m', 'f']) {
  laws.noahide.forEach((x) => lines.push([`laws/noah-${String(x.n).padStart(2, '0')}`, v, `audio/${v}/israeli/games/laws/noah-${String(x.n).padStart(2, '0')}.mp3`, x.he, x.translit, x.en, 'noahseven'].map(q).join(',')));
  laws.ten.forEach((x) => lines.push([`laws/ten-${String(x.n).padStart(2, '0')}`, v, `audio/${v}/israeli/games/laws/ten-${String(x.n).padStart(2, '0')}.mp3`, x.he, x.translit, x.en, 'tenwords'].map(q).join(',')));
  laws.mitzvot.forEach((x, i) => lines.push([`laws/mitzvah-${String(i + 1).padStart(2, '0')}`, v, `audio/${v}/israeli/games/laws/mitzvah-${String(i + 1).padStart(2, '0')}.mp3`, x.he, x.translit, x.en, 'mitzvot613'].map(q).join(',')));
}
writeFileSync(new URL('../../docs/games/arcade-voice-lines.csv', import.meta.url), lines.join('\n') + '\n');
console.log(`images: ${img.length - 1} rows · voice lines: ${lines.length - 1} rows`);
