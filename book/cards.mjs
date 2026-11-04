// Mnemonic cards: data/letters/mnemonics.json (read fresh on every call; lane 2 may refine it) joined to the contract
// letter list. Shared by the "Remember every letter" chapter (build.mjs) and the cut-out flashcards (flashcards.mjs).
// Nothing here writes Hebrew: the anchor word is taken verbatim from mnemonics.json.
import { LETTERS, letterToken } from '../tools/images/spec.mjs';
import { readJson } from './content.mjs';

/** @returns {{L: any, m: any, id: string, stem: string, name: string, sound: string, shape: string, story: string, lookalike: string, word: string, wordSound: string, wordMeaning: string, reason: string, final: boolean}[]} */
export function mnemonicCards() {
  const data = readJson('data/letters/mnemonics.json');
  if (!data?.letters) throw new Error('data/letters/mnemonics.json missing or unreadable');
  return LETTERS.map((L) => {
    const m = data.letters.find((x) => x.id === L.id);
    if (!m) throw new Error(`mnemonics.json has no record for ${L.id}`);
    return { L, m, id: L.id, nn: L.nn, stem: `L${L.nn}_${letterToken(L)}_quirky`, name: m.name, sound: m.sound, shape: m.shape, story: m.story, lookalike: m.lookalike, word: m.word, wordSound: m.wordSound, wordMeaning: m.wordMeaning, reason: m.reason, final: L.id.endsWith('-final') };
  });
}

/** The status line printed with the cards (what is and is not verified). */
export function mnemonicStatus() {
  const meta = readJson('data/letters/mnemonics.json')?.meta ?? {};
  return { draft: meta.status === 'draft' || meta.proofread === false, needsNativeReview: meta.needsNativeReview !== false };
}
