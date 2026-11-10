// Songs (#/songs): the original songs, one at a time, with their words. Nothing starts by itself, nothing loops.
// Not a sacred route: these are songs, not prayer audio. A lesson voice or word clip pauses the song (pauseOnSpeech).
// The game bar's beds stay on game routes (src/audio/music.js); songs are here because sung words would sit between a game's Hebrew clips.
import { h, heSpan } from '../shell/ui.js';
import { reactRimon } from '../shell/rimon-events.js';
import { MUSIC_BASE, ORIGINAL_SONG_TRACKS } from './catalog.js';
import { createShelfPlayer } from './player.js';

/** Words as sung (audio/music/ORIGINAL-MANIFEST.json is the source; tests/listen.songs.test.js keeps the two the same). */
export const SONG_WORDS = Object.freeze({
  yachad: 'Come sit close, the candles glow / Friends and family, row by row / Bread is warm and hearts are wide / No one waiting left outside / Yachad, yachad, we sing as one / Shalom from dusk to rising sun / Lai lai lai, lai lai lai lai',
  'open-hands': 'In every hand a little flame / In every voice a gentle name / We open doors and build with care / We mend the world with what we share / Shalom, shalom, let peace begin / With open hands we welcome in',
  'gates-of-morning-a': 'Ah, ah, ah / Open the gates of morning light / Carry my voice beyond the night / Every breath a quiet prayer / Rising slowly through the air / Ana, ana, hear me sing / Shalom upon the dawn you bring',
  'gates-of-morning-b': 'Ah, ah, ah / Open the gates of morning light / Carry my voice beyond the night / Every breath a quiet prayer / Rising slowly through the air / Ana, ana, hear me sing / Shalom upon the dawn you bring',
  'adon-olam': 'Ai, ai, ai, yai-dai-dai, bim-bam',
  'hava-nagila': 'Ai, ai, ai, yai-dai-dai, bim-bam',
  'ma-oz-tzur': "Ma'oz tzur y'shu'ati / l'cha na'eh l'shabe'ach / tikon beit t'filati / v'sham todah n'zabe'ach",
  dayenu: 'Ilu hotzi hotzianu, hotzianu mimitzrayim, dayenu / Day-dayenu, day-dayenu, day-dayenu, dayenu dayenu',
  'hevenu-shalom-aleichem': 'Hevenu shalom aleichem / hevenu shalom aleichem / hevenu shalom, shalom, shalom aleichem',
  'yom-zeh-l-yisrael': "Yom zeh l'Yisrael orah v'simcha / Shabbat m'nuchah",
});

/** Hebrew heard in the songs. `clip` is a word recording that already exists (data/audio/manifest-kind-word.json); no clip, no Hear button. */
export const SONG_HEBREW = Object.freeze([
  { word: 'yachad', he: 'יַחַד', say: 'yah-KHAHD', en: 'together', songs: ['yachad'] },
  { word: 'shalom', he: 'שָׁלוֹם', say: 'shah-LOHM', en: 'peace; also hello and goodbye', songs: ['yachad', 'open-hands', 'gates-of-morning-a', 'gates-of-morning-b', 'hevenu-shalom-aleichem'], clip: 'r03-w1' },
  { word: 'ana', he: 'אָנָּא', say: 'AH-nah', en: 'please (an old word from the prayers)', songs: ['gates-of-morning-a', 'gates-of-morning-b'] },
  { word: 'lai', he: '', say: 'lai lai lai', en: 'no meaning: tune syllables, sung the way a niggun is sung', songs: ['yachad'] },
  { word: 'yai-dai-dai', he: '', say: 'yai-dai-dai', en: 'no meaning: tune syllables, sung the way a niggun is sung', songs: ['adon-olam', 'hava-nagila'] },
  { word: 'bim-bam', he: '', say: 'bim-bam', en: 'no meaning: tune syllables, sung the way a niggun is sung', songs: ['adon-olam', 'hava-nagila'] },
  { word: "ma'oz", he: 'מָעוֹז', say: 'mah-OHZ', en: 'stronghold; a fortress', songs: ['ma-oz-tzur'] },
  { word: 'tzur', he: 'צוּר', say: 'tsoor', en: 'rock', songs: ['ma-oz-tzur'] },
  { word: 'dayenu', he: 'דַּיֵּנוּ', say: 'dah-YAY-noo', en: 'it would have been enough for us', songs: ['dayenu'] },
  { word: 'mitzrayim', he: 'מִצְרַיִם', say: 'meets-RAH-yeem', en: 'Egypt', songs: ['dayenu'] },
  { word: 'hevenu', he: 'הֵבֵאנוּ', say: 'hay-VAY-noo', en: 'we have brought', songs: ['hevenu-shalom-aleichem'] },
  { word: 'aleichem', he: 'עֲלֵיכֶם', say: 'ah-LAY-khem', en: 'upon you', songs: ['hevenu-shalom-aleichem'] },
  { word: 'yisrael', he: 'יִשְׂרָאֵל', say: 'yis-rah-EL', en: 'Israel', songs: ['yom-zeh-l-yisrael'] },
  { word: 'shabbat', he: 'שַׁבָּת', say: 'shah-BAHT', en: 'Shabbat', songs: ['yom-zeh-l-yisrael'] },
  { word: 'simcha', he: 'שִׂמְחָה', say: 'sim-KHAH', en: 'joy', songs: ['yom-zeh-l-yisrael'] },
]);

const CSS = `
.songs{max-inline-size:40rem;margin-inline:auto;display:grid;gap:1.25rem}
.songs article{display:grid;gap:.4rem;padding:.75rem 0;border-block-end:1px solid var(--line,#d7d0c4)}
.songs .words{white-space:pre-line;margin:0}
.songs .row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.songs button{min-block-size:44px}
.songs dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem .75rem;margin:0}
`;

function styleOnce() {
  if (document.getElementById('songs-style')) return;
  const style = document.createElement('style');
  style.id = 'songs-style';
  style.textContent = CSS;
  document.head?.append(style);
}

function hasClip(ctx, id) {
  try { return ctx?.audio?.status?.('word', id)?.source === 'file'; } catch { return false; }
}

export function mount(root, ctx = {}) {
  styleOnce();
  const player = ctx.player || createShelfPlayer({ base: MUSIC_BASE, pauseOnSpeech: true, ...(ctx.makeAudio ? { makeAudio: ctx.makeAudio } : {}) });
  const buttons = new Map();
  const status = h('p', { role: 'status', 'aria-live': 'polite' }, 'Nothing is playing.');
  const songs = ORIGINAL_SONG_TRACKS.map((song) => {
    const button = h('button', { type: 'button', class: 'btn', 'data-song-id': song.id, 'data-title': song.title, 'aria-pressed': 'false', onclick: () => player.toggle(song) }, `Play ${song.title}`);
    buttons.set(song.id, button);
    const hebrew = SONG_HEBREW.filter((w) => w.songs.includes(song.id));
    return h('article', { 'data-song': song.id },
      h('h2', {}, song.title),
      h('div', { class: 'row' }, button),
      SONG_WORDS[song.id] ? h('p', { class: 'words', lang: 'en' }, SONG_WORDS[song.id].split(' / ').join('\n')) : null,
      hebrew.length ? h('h3', {}, 'Hebrew in This Song') : null,
      hebrew.length ? h('dl', {}, ...hebrew.flatMap((w) => [
        h('dt', {}, w.he ? heSpan(w.he) : w.say),
        h('dd', {}, w.he ? `${w.say}: ${w.en}` : w.en, ' ',
          w.clip && hasClip(ctx, w.clip) ? h('button', { type: 'button', class: 'btn secondary', onclick: () => { try { Promise.resolve(ctx.audio.play('word', w.clip, { text: w.he })).catch(() => {}); } catch { /* the word stays readable */ } } }, `Hear ${w.word}`) : null),
      ])) : null);
  });
  root.replaceChildren(h('div', { class: 'songs' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Songs'),
    h('p', {}, 'Songs made for ALEF, including modern arrangements of traditional public-domain melodies. Press play to listen; nothing starts by itself. If a lesson voice plays, the song pauses.'),
    status,
    ...songs,
    h('p', {}, h('a', { href: '#/games' }, 'Play a game with music'))));
  const unsub = player.subscribe((state) => {
    for (const [id, button] of buttons) {
      const title = button.getAttribute('data-title') || '';
      const on = id === state.id && state.phase === 'playing';
      button.textContent = on ? `Pause ${title}` : id === state.id && state.phase === 'loading' ? `Loading ${title}` : `Play ${title}`;
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (state.phase === 'playing') { try { reactRimon('bounce'); } catch { /* Rimon is decoration */ } }
    status.textContent = state.error || (state.phase === 'playing' ? 'Playing.' : state.phase === 'paused' ? 'Paused.' : state.phase === 'ended' ? 'Finished.' : 'Nothing is playing.');
  });
  return () => { unsub(); if (player.dispose) player.dispose(); else player.stop(); };
}
