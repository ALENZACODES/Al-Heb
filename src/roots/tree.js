// Word Families Explorer (vocabulary systems P1): a family laid out as a tree, and a way to browse every family by its first letter.
// Pure functions over data/roots/families.json. Nothing is added to a family here: a branch is a part of speech, and for verbs a
// pattern (binyan), exactly as the word list records them. A group is called "family letters", never a confirmed root.
import { BINYAN, binyanName, groupFamily } from './model.js';

export const TREE_NOTE = 'A tree shows the words the word list holds under the same family letters, split by kind of word and, for verbs, by pattern. Tap a word for its meaning and sound.';
const KIND = { verb: 'Verbs', noun: 'Nouns', adj: 'Adjectives', adv: 'Adverbs', prep: 'Prepositions', num: 'Numbers', pron: 'Pronouns', conj: 'Linking Words', intj: 'Exclamations' };
const ONE = { verb: 'verb', noun: 'noun', adj: 'adjective', adv: 'adverb', prep: 'preposition', num: 'number', pron: 'pronoun', conj: 'linking word', intj: 'exclamation' };
export const kindLabel = (pos) => KIND[pos] || 'Other Words';
const byRank = (a, b) => (a.rank ?? 99999) - (b.rank ?? 99999);

/** The first family letter (the letters are stored as כ־ת־ב). */
export const firstLetter = (root) => [...String(root || '')].find((c) => c >= 'א' && c <= 'ת') || '';

/**
 * @returns {{root:string, size:number, branches:{key:string, label:string, gist:string|null, pos:string, binyan:string|null, words:any[]}[]}}
 * Branch order: verbs by pattern in the taught order, then nouns, adjectives and the rest. Within a branch, most common word first.
 */
export function familyTree(fam) {
  const branches = [];
  for (const g of groupFamily(fam)) {
    if (g.byBinyan) {
      for (const b of g.byBinyan) branches.push({ key: `verb:${b.binyan || 'none'}`, label: b.binyan ? `Verbs: ${binyanName(b.binyan)}` : 'Verbs: Pattern Not Listed', gist: BINYAN[b.binyan]?.gist || null, pos: 'verb', binyan: b.binyan || null, words: [...b.words].sort(byRank) });
    } else branches.push({ key: g.pos, label: kindLabel(g.pos), gist: null, pos: g.pos, binyan: null, words: [...g.words].sort(byRank) });
  }
  return { root: fam.root, size: fam.size, branches };
}

/** One line a screen reader can take in before the tree: "9 words in 4 branches: Verbs: Pi'el (1), Nouns (5), ...". */
export function treeSummary(tree) {
  return `${tree.size} words in ${tree.branches.length} ${tree.branches.length === 1 ? 'branch' : 'branches'}: ${tree.branches.map((b) => `${b.label} (${b.words.length})`).join(', ')}.`;
}

/** What a tapped word shows. Only fields the data holds; a missing one is left out, never guessed. */
export function wordCard(w, loose = false) {
  const lines = [`Sounds like: ${w.translit}`, `Meaning: ${w.en}`, `Kind of word: ${ONE[w.pos] || 'not listed'}${w.pos === 'verb' && w.binyan ? `, ${binyanName(w.binyan)} pattern${BINYAN[w.binyan] ? ` (${BINYAN[w.binyan].gist})` : ''}` : ''}`];
  if (w.level) lines.push(`Level: ${w.level}`);
  if (loose) lines.push('A loose match: it shares the letters, and may not belong to this family.');
  return { he: w.he, lines, hasForms: w.pos === 'verb' && !!w.forms };
}

/** The 22 letters, each with how many families start with it. */
export function letterIndex(families) {
  const n = new Map();
  for (const f of families) { const l = firstLetter(f.root); if (l) n.set(l, (n.get(l) || 0) + 1); }
  return [...'אבגדהוזחטיכלמנסעפצקרשת'].map((letter) => ({ letter, count: n.get(letter) || 0 }));
}
/** Families that start with a letter, in alphabet order of their letters. */
export function familiesByLetter(families, letter) {
  return families.filter((f) => firstLetter(f.root) === letter).sort((a, b) => (a.root < b.root ? -1 : a.root > b.root ? 1 : 0));
}
/** The family before and after this one inside its letter, for stepping through. */
export function neighbours(families, root) {
  const list = familiesByLetter(families, firstLetter(root)), i = list.findIndex((f) => f.root === root);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null, index: i, of: list.length };
}
