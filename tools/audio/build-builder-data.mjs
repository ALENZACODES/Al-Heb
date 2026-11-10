import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { bare, levelFor } from '../../src/home/builder-model.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = p => JSON.parse(fs.readFileSync(root + p, 'utf8'));
const bank = read('data/games/firstwords.json').words;
const extra = read('data/firstday/buildable-words.json').words;
extra.push(
  {id:'kelev',bare:'כלב',he:'כֶּלֶב',translit:'kelev',en:'dog'},
  {id:'chatul',bare:'חתול',he:'חָתוּל',translit:'chatul',en:'cat'},
  {id:'perach',bare:'פרח',he:'פֶּרַח',translit:'perach',en:'flower'},
);
const requested = ['שלום','אבא','אמא','ילד','בית','מים','ספר','שמש','לב','יד','ראש','יום','שם','טוב','גדול','קטן','אור','מלך','דרך','עיר','ארץ','שנה','לחם','כלב','חתול','דג','עץ','פרח','אש','רוח'];
const selected = bank.slice(0, 160).filter(w => !['סבתא','דוקטור','מכל'].includes(bare(w.he)));
for (const he of requested) {
  if (selected.some(w => bare(w.he) === he)) continue;
  const w = bank.find(w => bare(w.he) === he) || extra.find(w => w.bare === he);
  if (!w) throw new Error('Missing requested word: ' + he);
  selected.push(w);
}
const words = selected.map(w => ({
  id: w.id, hebrew: bare(w.he), nikud: w.he.normalize('NFC'),
  translit_israeli: w.translit,
  translit_sephardi: transliterate(w.he, { tradition: 'sephardi', finalHe: 'silent' }),
  translit_ashkenazi: transliterate(w.he, { tradition: 'ashkenazi', cholam: 'oy', finalHe: 'silent' }),
  meaning_en: w.en, letters: [...bare(w.he)], level: levelFor(bare(w.he)),
  audio_ari: `audio/builder/${w.id}_ari.mp3`, audio_noa: `audio/builder/${w.id}_noa.mp3`,
}));
fs.writeFileSync(root + 'data/builder_words.json', JSON.stringify(words, null, 2) + '\n');
console.log(JSON.stringify({ words: words.length, threeLetter: words.filter(w => w.letters.length === 3).length, levels: [1,2,3,4,5].map(level => words.filter(w=>w.level===level).length) }));
