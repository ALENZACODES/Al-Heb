// Book section "Letters you will never forget": the 27 memory-chain cells (letter, state-B picture, hook word, example word with gloss)
// as one grid, same cells as the poster (tools/letters/memory_chain.mjs). Pure: data in, HTML out. Hooked into book/build.mjs
// (import + one chapter insert + one contents line + one index line). Real data: data/letters/memory-chain.json; a fixture notice is
// printed while only the older mnemonics file exists.
import { buildChainModel, traditionLines, pictureSvg, CHAIN_DRAFT } from '../../tools/letters/memory_chain_model.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const MEMCHAIN_ID = 'ch-memchain';
export const MEMCHAIN_TITLE = 'Letters you will never forget';
export const MEMCHAIN_FIXTURE = 'FIXTURE: the memory-chain data file is not there yet; pictures are blank frames and hooks come from the older mnemonics file.';

export function memChainCell(c, pages = {}) {
  const svg = pictureSvg(c); const alt = esc(c.picture.alt || c.picture.idea || c.name);
  const t = traditionLines(c);
  const pg = pages['letter-' + c.id] ? ` (p. ${pages['letter-' + c.id]})` : '';
  return `<div class="mc${c.final ? ' fin' : ''}" data-mc-letter="${esc(c.id)}"><div class="mct"><span class="mcl he" lang="he" dir="rtl">${esc(c.he)}</span><span class="mcp" role="img" aria-label="${alt}">${svg || '<i>picture to come</i>'}</span></div>
<b class="mch">${esc(c.hook)}</b><span class="mcw"><span class="he" lang="he" dir="rtl">${esc(c.word.he || '')}</span> ${esc(c.word.gloss || '')}</span>
<span class="mcn">${c.n}. ${esc(c.name)}${c.final ? ' (final form)' : ''}${pg}</span>${t.differs ? `<span class="mcd">${t.short.map((x) => `<b>${x.label[0]}</b> ${esc(x.text)}`).join('; ')}</span>` : ''}</div>`;
}

/** @param {Record<string,number>} pages anchor -> printed page */
export function memChainChapter(pages = {}) {
  const m = buildChainModel();
  return `<section class="chapter" id="${MEMCHAIN_ID}"><h2>${MEMCHAIN_TITLE}</h2>
<p class="draft-flag">${esc(m.fixture ? MEMCHAIN_FIXTURE : CHAIN_DRAFT)}</p>
<p>One cell per letter: the letter in its frame, the picture it turns into, a <b>hook</b> (a sound you already know) and a Hebrew word that uses the letter. Cover the hook and the word, look only at the picture, and say the letter back; then check. The five final forms have a double border. In black and white the cells read by frame and shape, not colour. Where Israeli (<b>I</b>), Sephardi (<b>S</b>) and Ashkenazi (<b>A</b>) readings differ, the cell says so in one line. A one-page poster and cut-out cards of the same cells are in the printable workbooks (alef-memory-chain-a4.pdf, alef-flashcards-letters-a4.pdf; US Letter versions too).</p>
<div class="mcgrid">${m.cells.map((c) => memChainCell(c, pages)).join('')}</div></section>`;
}
