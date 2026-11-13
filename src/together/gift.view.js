// @ts-check
// Gift A Lesson (#/gift): make a link, QR code or file that opens one lesson and a few games on another device with a note
// from you; or open a gift someone sent (R6). The gift is a guided first session, not a copy of anyone's progress.
import { h } from '../shell/ui.js';
import { frame, statusLine, qrImg, saveFile, copyButton, filePicker } from './ui.js';
import { ARCADE_GAMES } from '../games/arcade.catalog.js';
import { makeGift, giftLink, openGift, MAX_GAMES } from './gift.js';
import { lessonList } from './data.js';
import { cleanText, fromPasted, NOTE_MAX } from './share.js';
import { myName } from './household.js';

export const COPY = Object.freeze({
  lead: 'Send someone a first session: one lesson and up to three games, with a note from you. They open the link in their own Aleph and follow the steps. The gift holds only the lesson, the games, your name and your note.',
  opened: 'Follow the steps in order. Each one opens in this copy of Aleph; your progress is your own.',
});

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx = {}) {
  let alive = true;
  const status = statusLine('gf-status');
  const body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Loading the lessons…'));
  frame(root, 'Gift A Lesson', status, body);
  const fetchFn = ctx.readinessFetch || globalThis.fetch;

  function showGift(input, lessons) {
    const g = openGift(input, lessons);
    if (!g.ok) { status.textContent = g.error; return false; }
    body.replaceChildren(h('section', { id: 'gf-opened', 'aria-labelledby': 'gf-opened-h' },
      h('h2', { id: 'gf-opened-h' }, g.from ? `A Gift From ${g.from}` : 'A Gift For You'),
      g.note ? h('blockquote', { id: 'gf-note' }, g.note) : null, h('p', {}, COPY.opened),
      h('ol', { id: 'gf-steps' }, ...g.steps.map((s) => h('li', {}, h('a', { class: 'btn', href: s.href }, s.kind === 'lesson' ? `Lesson: ${s.title}` : `Game: ${s.title}`)))),
      h('p', {}, h('a', { href: '#/gift' }, 'Send a gift of your own'))));
    return true;
  }
  function form(lessons) {
    const lesson = /** @type {any} */ (h('select', { id: 'gf-lesson' }, ...lessons.map((l) => h('option', { value: l.id }, `${l.id}: ${l.title}`))));
    const games = Array.from({ length: MAX_GAMES }, (_, i) => /** @type {any} */ (h('select', { id: `gf-game-${i + 1}`, 'aria-label': `Game ${i + 1} (optional)` }, h('option', { value: '' }, 'No game'), ...ARCADE_GAMES.map((g) => h('option', { value: g.id }, g.title)))));
    const from = /** @type {any} */ (h('input', { type: 'text', id: 'gf-from', maxlength: '20', autocomplete: 'off', value: cleanText(ctx.store?.get?.('together.name') || myName(ctx.storage)) }));
    const note = /** @type {any} */ (h('textarea', { id: 'gf-note-in', rows: '3', maxlength: String(NOTE_MAX) }));
    const out = h('div', { id: 'gf-out' });
    const paste = /** @type {any} */ (h('input', { type: 'text', id: 'gf-paste', autocomplete: 'off' }));
    const make = () => {
      const r = makeGift({ lesson: lesson.value, games: games.map((g) => g.value).filter(Boolean), from: from.value, note: note.value });
      if (!r.ok) { status.textContent = r.error; return; }
      const link = giftLink(r.code, ctx.base);
      out.replaceChildren(h('p', {}, 'Your gift is ready. Send it any way you like:'), h('textarea', { id: 'gf-link', readonly: '', rows: '3', 'aria-label': 'Link to send' }, link),
        h('div', { class: 'row' }, copyButton('Copy Link', () => link, status), h('button', { type: 'button', class: 'btn secondary', id: 'gf-file', onclick: () => { status.textContent = saveFile('aleph-gift.json', JSON.stringify(r.gift)) ? 'Saved a file to send.' : 'This browser could not save a file. Use the link.'; } }, 'Save As A File')),
        qrImg(link, 'QR code that opens your gift on another device'));
      status.textContent = 'Made.';
    };
    body.replaceChildren(h('p', {}, COPY.lead),
      h('section', { 'aria-labelledby': 'gf-make-h' }, h('h2', { id: 'gf-make-h' }, 'Make A Gift'), h('label', { class: 'field', for: 'gf-lesson' }, 'Lesson', lesson),
        ...games.map((g, i) => h('label', { class: 'field', for: g.getAttribute('id') }, `Game ${i + 1} (optional)`, g)),
        h('label', { class: 'field', for: 'gf-from' }, 'From (your name)', from), h('label', { class: 'field', for: 'gf-note-in' }, 'A note (optional)', note),
        h('button', { type: 'button', class: 'btn', id: 'gf-make', onclick: make }, 'Make The Gift'), out),
      h('section', { 'aria-labelledby': 'gf-open-h' }, h('h2', { id: 'gf-open-h' }, 'Open A Gift'), h('label', { class: 'field', for: 'gf-paste' }, 'Paste the link you were sent', paste),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn secondary', id: 'gf-open', onclick: () => showGift(fromPasted(paste.value, 'g'), lessons) }, 'Open'),
          ...filePicker('gf-pick', 'Choose A File', (text) => { let o = null; try { o = JSON.parse(text || ''); } catch { o = null; } showGift(o || '', lessons); }))));
  }
  (ctx.lessons ? Promise.resolve(ctx.lessons) : lessonList(fetchFn)).then((lessons) => {
    if (!alive) return;
    if (ctx.query?.g && showGift(String(ctx.query.g), lessons)) return;
    form(lessons);
  }).catch(() => { if (alive) body.replaceChildren(h('p', {}, 'The lesson list did not load. Open this page again while online.')); });
  return () => { alive = false; };
}
