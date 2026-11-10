export const BUILDER_KEY = 'home.builder.v1';
export const GAME_KEY = 'games.homebuilder.v1';
export const LEVEL_LETTERS = ['אבמלשיום', 'אבמלשיוםדהרתנח', 'אבגדהוזחטיכךלמםנןסעפףצץקרשת'];
export const bare = (text) => String(text).replace(/[\u0591-\u05c7]/g, '');
export function trayFor(level) { return [...LEVEL_LETTERS[Math.min(3, Math.max(1, level)) - 1]]; }
export function levelFor(hebrew) {
  const chars = [...hebrew];
  if (chars.length <= 3 && chars.every(c => LEVEL_LETTERS[0].includes(c))) return 1;
  if (chars.length <= 3 && chars.every(c => LEVEL_LETTERS[1].includes(c))) return 2;
  return chars.length <= 4 ? 3 : chars.length <= 5 ? 4 : 5;
}
export function wordsFor(words, level) { return words.filter(w => w.level <= level); }
export function tokensFor(word, vowels = false) {
  return vowels ? [...word.nikud.normalize('NFD')] : word.letters;
}
export function phonetics(word, tradition) {
  return word['translit_' + tradition] || word.translit_israeli;
}
export function clipFor(word, voice) { return voice === 'm' ? word.audio_ari : word.audio_noa; }
export function recordWord(store, word, points, now = Date.now()) {
  const previous = store?.get(BUILDER_KEY) || {};
  const built = { ...(previous.built || {}) };
  if (built[word.id]) return { fresh: false, count: Object.keys(built).length, points: previous.points || 0 };
  built[word.id] = now;
  const record = { built, points: (previous.points || 0) + points };
  store?.set(BUILDER_KEY, record);
  return { fresh: true, count: Object.keys(built).length, points: record.points };
}
