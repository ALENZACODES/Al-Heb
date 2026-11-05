// Printable workbook page: links to the generated PDFs in assets/workbook/ (manifest.json lists them). Lane 7/2 produce the PDFs.
import { h } from './ui.js';

const mb = (b) => (b / 1048576).toFixed(1) + ' MB';
const LABEL = { print: 'Print letters', cursive: 'Cursive letters' };

export async function mount(root, ctx) {
  let m = null; let err = null;
  try { const res = await fetch(new URL('../../assets/workbook/manifest.json', import.meta.url)); if (!res.ok) throw new Error('HTTP ' + res.status); m = await res.json(); }
  catch (e) { err = e; }
  const files = Array.isArray(m?.files) ? m.files : [];
  const list = files.length
    ? h('ul', { class: 'credits', 'aria-label': 'Workbook PDFs' }, ...files.map((f) => h('li', {},
        h('strong', {}, `${LABEL[f.script] ?? f.script}, ${f.paper}${f.mnemonics ? ', with memory hooks' : ''}`),
        h('span', { class: 'block muted' }, `${f.pages} pages, ${mb(f.bytes)}`),
        h('a', { class: 'btn', href: new URL('../../assets/workbook/' + f.pdf, import.meta.url).href, download: f.pdf, 'aria-label': `Download PDF: ${LABEL[f.script] ?? f.script} workbook, ${f.paper}${f.mnemonics ? ', with memory hooks' : ''}` }, 'Download PDF'))))
    : h('p', { class: 'muted', role: 'status' }, err ? `The workbook list could not be loaded (${err.message}). It may not be available offline: PDFs are not stored for offline use until you open them once.` : 'No workbook files are listed in this build.');
  root.replaceChildren(h('article', { class: 'stack' },
    h('section', { class: 'card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Printable workbook'),
      h('p', {}, 'Stroke-order guides and tracing pages for the letters, then syllables and words. Print it and write with a pen: handwriting helps you remember the shapes.'),
      m?.status ? h('p', { class: 'draft-flag', role: 'note' }, m.status) : null,
      h('p', { class: 'muted' }, 'These are large files and are not saved for offline use automatically. Download them while you are online.')),
    h('section', { class: 'card', 'aria-labelledby': 'wb-files' }, h('h2', { id: 'wb-files' }, 'Choose a version'),
      h('p', { class: 'muted' }, 'Pick the paper size you have: A4 outside North America, US Letter in the US and Canada.'), list),
    h('section', { class: 'card', 'aria-labelledby': 'wb-print' }, h('h2', { id: 'wb-print' }, 'How to print'),
      h('ol', {},
        h('li', {}, 'Open the PDF and choose Print.'),
        h('li', {}, 'Set scale to 100% (or "Actual size"). Do not choose "Fit to page", which shrinks the letters and the guide lines.'),
        h('li', {}, 'Print single-sided, in black and white is fine. Grey guide lines should stay light.'),
        h('li', {}, 'Use a pencil or a fine pen. These draft stroke-order arrows need teacher review. Use them only after the form has been confirmed.')),
      m?.fonts ? h('p', { class: 'muted' }, 'Fonts: ' + m.fonts + '.') : null,
      h('p', {}, h('a', { class: 'btn secondary', href: '#/letters' }, 'Trace letters on screen')))));
  return () => {};
}
