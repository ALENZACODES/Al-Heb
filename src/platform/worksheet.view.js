// J4 Printable Worksheet (#/worksheet): a practice sheet for the learner's current lesson (or any lesson they pick), from the lesson
// data: copy the letters, copy the words, match each word to its meaning, answer key at the end. Printed with the browser's own
// print dialog (which can also save a PDF); a print stylesheet hides the app around the sheet.
import { h, heSpan } from '../shell/ui.js';
import { buildSheet, currentLesson } from './worksheet.js';
import { lessonQr } from '../together/printshare.js'; // together lane (R10): a QR code on the sheet that opens the lesson, so its sounds can be heard

const PRINT_CSS = `
.ws-sheet{max-inline-size:46rem;margin-inline:auto}
.ws-sheet .ws-he{font-size:2.2rem;line-height:1.6}
.ws-sheet .ws-line{border-block-end:1px solid #888;block-size:2.4rem;margin-block:.3rem 1rem}
.ws-sheet table{border-collapse:collapse;inline-size:100%}
.ws-sheet td,.ws-sheet th{border:1px solid #999;padding:.4rem;vertical-align:middle}
.ws-sheet .ws-box{inline-size:3.2rem;block-size:3.2rem}
.ws-key{font-size:.9rem}
.ws-qr{display:flex;gap:1rem;align-items:center}
.ws-qr img{inline-size:7rem;block-size:7rem}
@media print{
  body *{visibility:hidden}
  .ws-sheet,.ws-sheet *{visibility:visible}
  .ws-sheet{position:absolute;inset-inline-start:0;inset-block-start:0;inline-size:100%;max-inline-size:none;color:#000;background:#fff}
  .ws-noprint{display:none!important}
  .ws-key{break-before:page}
  .ws-sheet section{break-inside:avoid}
}`;

async function loadJSON(rel, fetchFn = globalThis.fetch) {
  const url = new URL(rel, import.meta.url);
  if (url.protocol === 'file:') { const { readFile } = await import('node:fs/promises'); return JSON.parse(await readFile(url, 'utf8')); }
  const r = await fetchFn(url); if (!r.ok) throw new Error(`${rel} HTTP ${r.status}`); return r.json();
}

export function mount(root, ctx) {
  let style = null;
  try { style = document.createElement('style'); style.id = 'ws-style'; style.textContent = PRINT_CSS; document.head.append(style); } catch { style = null; }
  const status = h('p', { role: 'status', class: 'muted ws-noprint' }, 'Loading the lessons…');
  const pickHost = h('div', { class: 'ws-noprint' });
  const sheetHost = h('div', {});
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1', class: 'ws-noprint' }, 'Printable Worksheet'),
    h('p', { class: 'ws-noprint' }, 'A practice sheet made from a lesson: copy its letters and words, then match each word to its meaning. Press Print; in the print dialog you can also choose Save as PDF.'),
    pickHost, status, sheetHost));
  let alive = true;
  const fetchFn = ctx?.readinessFetch || globalThis.fetch;
  Promise.all([loadJSON('../../data/curriculum/lessons.json', fetchFn), loadJSON('../../data/letters/letters.json', fetchFn)]).then(([L, letters]) => {
    if (!alive) return;
    const lessons = L.lessons || [], letterData = Array.isArray(letters) ? letters : letters.letters || [];
    let completed = {}; try { completed = ctx?.store?.get?.('curriculum.progress', {})?.completed || {}; } catch { /* none */ }
    const want = lessons.find((l) => l.id === ctx?.query?.lesson) || currentLesson(lessons, completed);
    const sel = h('select', { id: 'ws-lesson', onchange: (e) => draw(lessons.find((l) => l.id === e.target.value)) },
      ...lessons.map((l) => h('option', { value: l.id, selected: l === want ? '' : null }, `${l.id}: ${l.title}${completed[l.id] ? ' (done)' : ''}`)));
    pickHost.replaceChildren(h('p', {}, h('label', { for: 'ws-lesson' }, 'Lesson '), sel), h('p', {}, h('button', { type: 'button', class: 'btn', onclick: () => { try { globalThis.print?.(); } catch { status.textContent = 'This browser cannot print from here.'; } } }, 'Print')));
    status.textContent = '';
    function draw(lesson) {
      if (!lesson) return;
      const s = buildSheet(lesson, letterData);
      const parts = [h('h2', {}, `${s.title} (lesson ${s.id})`), h('p', {}, 'Name: ______________________   Date: ____________')];
      if (s.letters.length) parts.push(h('section', {}, h('h3', {}, 'Copy the Letters'),
        h('table', {}, h('caption', {}, 'Each letter, its name, and boxes to copy it'), h('tbody', {}, ...s.letters.map((l) => h('tr', {}, h('th', { scope: 'row' }, heSpan(l.he, 'he ws-he')), h('td', {}, l.name), ...[1, 2, 3, 4].map(() => h('td', { class: 'ws-box' }, ' '))))))));
      if (s.copy.length) parts.push(h('section', {}, h('h3', {}, 'Copy the Words'), ...s.copy.map((w) => h('div', {}, h('p', {}, heSpan(w.he, 'he ws-he'), `  ${w.en}`), h('div', { class: 'ws-line', 'aria-hidden': 'true' })))));
      if (s.match.words.length > 1) parts.push(h('section', {}, h('h3', {}, 'Match Each Word to Its Meaning'), h('p', {}, 'Write the letter of the meaning next to each word.'),
        h('table', {}, h('caption', {}, 'Words on the left, meanings on the right'), h('tbody', {}, ...s.match.words.map((w, i) => h('tr', {}, h('td', {}, `${w.n}. `, heSpan(w.he, 'he ws-he'), '  ____'), h('td', {}, s.match.meanings[i] ? `${s.match.meanings[i].key}. ${s.match.meanings[i].en}` : '')))))),
        h('section', { class: 'ws-key' }, h('h3', {}, 'Answer Key'), h('p', {}, s.match.answers.join(', '))));
      // R10 print-and-share: the sheet teaches on a fridge or a classroom wall; the code brings the sound.
      if (s.letters.length || s.copy.length) { try { const q = lessonQr(s.id); parts.splice(2, 0, h('section', { class: 'ws-qr' }, h('img', { src: q.src, alt: 'QR code that opens this lesson in Aleph', width: '112', height: '112' }), h('p', {}, 'Hear it: point a phone camera at this code to open the lesson in Aleph and listen to every letter and word. ', h('span', { class: 'ws-noprint muted' }, q.link)))); } catch { /* no code on this sheet: the sheet still prints */ } }
      if (!s.letters.length && !s.copy.length) parts.push(h('p', {}, 'This lesson has no letters or words to put on a sheet. Pick another lesson.'));
      sheetHost.replaceChildren(h('article', { class: 'ws-sheet' }, ...parts));
    }
    draw(want);
  }).catch(() => { if (alive) status.textContent = 'The lesson list did not load. Open this page again while online.'; });
  return () => { alive = false; try { style?.remove(); } catch { /* gone */ } };
}
