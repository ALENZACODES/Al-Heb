// ALEF word tracing: niqqud placement step. Pure model + scoring (no DOM).
// The learner picks a mark from a small tray and taps the letter cell it belongs on; the board scores each cell by exact set match.
// @ts-check
import { cellsOf, MARK } from '../curriculum/hebrew.js';

/** mark id -> { char, name, where }. Chars are the Unicode points; ids match the shared contract (shuruk = dagesh inside a vav). */
export const MARKS = Object.freeze({
  kamatz: { char: 'ָ', name: 'Kamatz', where: 'below' },
  patach: { char: 'ַ', name: 'Patach', where: 'below' },
  tzere: { char: 'ֵ', name: 'Tzere', where: 'below' },
  segol: { char: 'ֶ', name: 'Segol', where: 'below' },
  chirik: { char: 'ִ', name: 'Chirik', where: 'below' },
  cholam: { char: 'ֹ', name: 'Cholam', where: 'above' },
  kubutz: { char: 'ֻ', name: 'Kubutz', where: 'below' },
  shva: { char: 'ְ', name: 'Shva', where: 'below' },
  'chataf-patach': { char: 'ֲ', name: 'Chataf patach', where: 'below' },
  'chataf-segol': { char: 'ֱ', name: 'Chataf segol', where: 'below' },
  'chataf-kamatz': { char: 'ֳ', name: 'Chataf kamatz', where: 'below' },
  dagesh: { char: 'ּ', name: 'Dagesh (dot inside; shuruk on a vav)', where: 'inside' },
  'shin-dot': { char: 'ׁ', name: 'Shin dot (right)', where: 'above' },
  'sin-dot': { char: 'ׂ', name: 'Sin dot (left)', where: 'above' }
});
export const MARK_IDS = Object.freeze(Object.keys(MARKS));

/** Look-alike groups used to pick plausible wrong choices for the tray. */
const NEIGHBOURS = {
  kamatz: ['patach', 'cholam', 'chataf-kamatz'], patach: ['kamatz', 'segol', 'chataf-patach'], tzere: ['segol', 'chirik', 'shva'],
  segol: ['tzere', 'patach', 'chataf-segol'], chirik: ['tzere', 'shva', 'dagesh'], cholam: ['kamatz', 'dagesh', 'kubutz'],
  kubutz: ['dagesh', 'cholam', 'shva'], shva: ['chirik', 'tzere', 'kubutz'], 'chataf-patach': ['patach', 'chataf-segol', 'shva'],
  'chataf-segol': ['segol', 'chataf-patach', 'shva'], 'chataf-kamatz': ['kamatz', 'chataf-patach', 'cholam'],
  dagesh: ['cholam', 'chirik', 'kubutz'], 'shin-dot': ['sin-dot', 'dagesh', 'cholam'], 'sin-dot': ['shin-dot', 'dagesh', 'cholam']
};

/**
 * Expected marks per letter cell. Order matches reading order (right to left on screen).
 * @param {string} he pointed word
 * @returns {{index:number, base:string, text:string, marks:string[]}[]}
 */
export function expectedCells(he) {
  return cellsOf(he).map((c, index) => ({ index, base: c.base, text: c.text, marks: [...new Set([...c.text].filter(ch => MARK[ch]).map(ch => MARK[ch]))].sort() }));
}

/** Does the word have anything for the niqqud step (at least one vowel mark)? */
export const hasNiqqud = (he) => expectedCells(he).some(c => c.marks.some(m => !['dagesh', 'shin-dot', 'sin-dot'].includes(m)));

/** Unicode combining-class-friendly order: shin/sin dot, dagesh, then vowels. */
const ORDER = ['shin-dot', 'sin-dot', 'dagesh'];
/** Display string for a base letter char plus placed mark ids. @param {string} baseChar @param {string[]} marks */
export function composeCell(baseChar, marks) {
  const sorted = [...marks].sort((a, b) => (ORDER.indexOf(a) < 0 ? 9 : ORDER.indexOf(a)) - (ORDER.indexOf(b) < 0 ? 9 : ORDER.indexOf(b)));
  return baseChar + sorted.map(m => (MARKS[m] || {}).char || '').join('');
}

/**
 * The tray: every mark the word needs plus plausible wrong ones, at most `max` (default 6), stable order.
 * @param {string} he @param {number} [max]
 */
export function buildTray(he, max = 6) {
  const need = [];
  for (const c of expectedCells(he)) for (const m of c.marks) if (!need.includes(m)) need.push(m);
  const tray = need.slice(0, max);
  for (const m of need) for (const alt of NEIGHBOURS[m] || []) {
    if (tray.length >= Math.min(max, need.length + 2)) break;
    if (!tray.includes(alt)) tray.push(alt);
  }
  // stable display order: by MARK_IDS order, so position never hints at the answer
  return tray.sort((a, b) => MARK_IDS.indexOf(a) - MARK_IDS.indexOf(b));
}

/**
 * Placement board state for one word.
 * @param {string} he
 */
export function createBoard(he) {
  const exp = expectedCells(he);
  /** @type {Set<string>[]} */ const placed = exp.map(() => new Set());
  let checked = false;
  const api = {
    cells: exp,
    tray: buildTray(he),
    /** Toggle a mark on a cell. Returns true if now placed. */
    place(index, mark) {
      if (!placed[index] || !MARKS[mark]) throw new RangeError('bad cell or mark');
      if (placed[index].has(mark)) { placed[index].delete(mark); return false; }
      placed[index].add(mark); return true;
    },
    marksAt(index) { return [...(placed[index] || [])].sort(); },
    clear() { placed.forEach(s => s.clear()); checked = false; },
    /** Fill in the answer (a "show me" action). The result then counts as assisted. */
    reveal() { exp.forEach((c, i) => { placed[i] = new Set(c.marks); }); },
    /** Score: a cell is right when its placed set equals the expected set. Cells with no expected marks and none placed are right too. */
    check() {
      checked = true;
      const perCell = exp.map((c, i) => {
        const got = [...placed[i]].sort();
        const missing = c.marks.filter(m => !placed[i].has(m));
        const extra = got.filter(m => !c.marks.includes(m));
        return { index: i, ok: !missing.length && !extra.length, expected: c.marks, got, missing, extra };
      });
      const correct = perCell.filter(c => c.ok).length;
      return { perCell, correct, total: perCell.length, perfect: correct === perCell.length, score: perCell.length ? correct / perCell.length : 1 };
    },
    get checked() { return checked; }
  };
  return api;
}

/** Plain-English label for a mark, with where it sits. @param {string} id */
export const markLabel = (id) => { const m = MARKS[id]; return m ? `${m.name}, ${m.where}` : id; };
