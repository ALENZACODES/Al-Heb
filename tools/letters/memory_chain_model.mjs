// Pure model for the "Memory chain": one cell per letter (27 = 22 letters + 5 final forms) with picture, hook word and an example word.
// Real data: data/letters/memory-chain.json {meta, letters:[{id, hebrew, name, picture:{idea, alt, svg}, sound:{hook, line, perTradition},
// word:{he, vocabId, rank, gloss}, story, tip, risk}]}. Until that file exists a FIXTURE is built from data/letters/mnemonics.json and
// letters.json (marked fixture:true; the posters/cards/chapter print a visible notice). Nothing Hebrew is invented here.
// Optional drawings: assets/letters/morph/<id>.svg (used only when picture.svg is empty).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
export const CHAIN_PATH = 'data/letters/memory-chain.json';
export const morphPath = (id) => join(root, 'assets/letters/morph', id + '.svg');
export const TRADITIONS = [
  { key: 'israeli', label: 'Israeli', alt: [] },
  { key: 'sephardi', label: 'Sephardi', alt: ['american'] },
  { key: 'ashkenazi', label: 'Ashkenazi', alt: [] },
];
export const CHAIN_DRAFT = 'DRAFT: pictures, hooks and example words not reviewed by a Hebrew teacher; not tested with learners.';

function fixtureChain() {
  const letters = rd('data/letters/letters.json'); const mn = Object.fromEntries(rd('data/letters/mnemonics.json').letters.map((m) => [m.id, m]));
  return {
    meta: { fixture: true, status: 'fixture' },
    letters: letters.map((l) => {
      const m = mn[l.id] || {};
      return { id: l.id, hebrew: l.he, name: l.name, picture: { idea: m.imageIdea || '', alt: m.imageIdea || l.name, svg: '' },
        sound: { hook: m.soundAnchor || '', line: m.sound || l.sound.en, perTradition: { israeli: l.sound.en } },
        word: { he: m.word || '', vocabId: null, rank: null, gloss: m.wordMeaning || '' }, story: m.story || '', tip: m.lookalike || '', risk: '' };
    }),
  };
}

/** @returns {{meta:object, fixture:boolean, cells:object[]}} 27 cells in letters.json order (alphabet, finals last). */
export function buildChainModel({ chain } = {}) {
  const letters = rd('data/letters/letters.json');
  const src = chain || (existsSync(join(root, CHAIN_PATH)) ? rd(CHAIN_PATH) : fixtureChain());
  const by = Object.fromEntries((src.letters || []).map((c) => [c.id, c]));
  const cells = letters.map((l, i) => {
    const c = by[l.id]; if (!c) throw new Error('memory chain has no letter ' + l.id);
    const drawn = existsSync(morphPath(l.id));
    return { n: i + 1, id: l.id, he: l.he, name: c.name || l.name, final: /-final$/.test(l.id), picture: c.picture || {}, hasMorph: drawn, hasSvg: !!(c.picture && c.picture.svg),
      matches: c.sound?.matches || {}, hook: c.sound?.hook || '', line: c.sound?.line || '', perTradition: c.sound?.perTradition || {}, word: c.word || {}, story: c.story || '', tip: c.tip || '', risk: c.risk || '' };
  });
  return { meta: src.meta || {}, fixture: !!(src.meta && src.meta.fixture), cells };
}

const clip = (t, max) => { const x = String(t).replace(/^Hook is a spelling cue only\.\s*/, '').replace(/^Differs:\s*/, '').split(/(?<=\.)\s/)[0]; if (x.length <= max) return x; const c = x.slice(0, max); return c.replace(/[\s,;(\[]+\S*$/, '') + '…'; };
/** Tradition lines for a cell. `differs` is true when the data says a tradition does not match (sound.matches), else when the lines are not all equal.
 *  `short` = only the differing traditions, each clipped to one short sentence (for the small in-cell note). */
export function traditionLines(cell, max = 64) {
  const m = cell.matches || {};
  const out = TRADITIONS.map((t) => { const k = [t.key, ...t.alt].find((x) => cell.perTradition[x]); return k ? { key: t.key, label: t.label, text: cell.perTradition[k], matches: m[k] } : null; }).filter(Boolean);
  const differs = out.some((o) => o.matches === false) || (out.every((o) => o.matches === undefined) && new Set(out.map((o) => o.text)).size > 1);
  return { lines: out, differs, short: out.filter((o) => o.matches !== true).map((o) => ({ ...o, text: clip(o.text, max) })) };
}

/** Picture for the state-B drawing as an <img> with a data: URI (each drawing keeps its own styles, so 27 on one page cannot clash; stays vector in PDF).
 *  Source: picture.svg when it is a path under the repo, else assets/letters/morph/<id>.svg. Inline '<svg' strings are also accepted. '' when none. */
export function pictureSvg(cell) {
  const s = cell.picture && cell.picture.svg; let txt = '';
  if (s && /^\s*<svg/i.test(s)) txt = s;
  else { const f = s && !/^[a-z]+:|^\//i.test(s) && existsSync(join(root, s)) ? join(root, s) : (cell.hasMorph ? morphPath(cell.id) : ''); if (f) txt = readFileSync(f, 'utf8'); }
  if (!txt) return '';
  const alt = String(cell.picture.alt || cell.picture.idea || cell.name).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<img alt="${alt}" src="data:image/svg+xml;base64,${Buffer.from(txt.replace(/<\?xml[^>]*\?>/, '')).toString('base64')}"/>`;
}
