// Aggregator for the extra book chapters (lessons, vocabulary appendix, sounds reference, answer key): one call from book/build.mjs.
import { lessonChapters, answerKeyChapter, LESSON_CSS, TRACKS } from './lessons.mjs';
import { vocabAppendix, VOCAB_CSS, VOCAB_ID } from './vocab.mjs';
import { soundsChapter, SOUNDS_CSS, SOUNDS_ID } from './sounds.mjs';

const li = (toc, id, label) => toc(id, label);
/** @param {{pages?:Record<string,number>, img?:Function, alt?:object, toc:(id:string,label:string)=>string}} ctx */
export function extraChapters(ctx) {
  const L = lessonChapters(ctx); const V = vocabAppendix(ctx.pages); const S = soundsChapter(); const K = answerKeyChapter(L.keyRows);
  const has = (h) => !!h;
  return {
    css: LESSON_CSS + VOCAB_CSS + SOUNDS_CSS,
    sounds: S.html, synagogue: L.html.read ?? '', israel: L.html.israel ?? '', vocab: V.html, key: K,
    tocSounds: has(S.html) ? li(ctx.toc, SOUNDS_ID, 'Sounds of three traditions') : '',
    tocInter: (L.html.read ? li(ctx.toc, TRACKS.read.id, TRACKS.read.title) : '') + (L.html.israel ? li(ctx.toc, TRACKS.israel.id, TRACKS.israel.title) : ''),
    tocBack: (has(V.html) ? li(ctx.toc, VOCAB_ID, 'Vocabulary by theme') : '') + (has(K) ? li(ctx.toc, 'ch-int-key', 'Answer key: intermediate lessons') : ''),
    indexTopics: [[SOUNDS_ID, 'Sounds of three traditions'], [TRACKS.read.id, TRACKS.read.title], [TRACKS.israel.id, TRACKS.israel.title], [VOCAB_ID, 'Vocabulary by theme'], ['ch-int-key', 'Answer key: intermediate lessons']].filter(([id]) => ({ [SOUNDS_ID]: S.html, [TRACKS.read.id]: L.html.read, [TRACKS.israel.id]: L.html.israel, [VOCAB_ID]: V.html, 'ch-int-key': K })[id])
  };
}
