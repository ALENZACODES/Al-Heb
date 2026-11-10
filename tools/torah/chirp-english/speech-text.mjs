// Displayed JPS 1917 remains unchanged. English speech uses the conventional LORD substitute.
export const ENGLISH_SPEECH_POLICY = 'english-divine-name-LORD-v1';
export function englishSpeechText(source) {
  const text = String(source).replace(/(?<![א-ת])י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה[֑-ׇ]*(?![א-ת])/gu, 'LORD');
  if (/[א-ת]/u.test(text)) throw new Error('English speech contains untranslated Hebrew; review the source before synthesis');
  return text;
}
