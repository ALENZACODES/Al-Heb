// @ts-check
// Buddy Pairing (#/buddy): send your progress summary to a buddy by link, QR code or file, and open theirs (R4).
import { h } from '../shell/ui.js';
import { frame, statusLine, qrImg, saveFile, copyButton, filePicker } from './ui.js';
import { BUDDIES_KEY, withMyId, mySummary, buddyLink, receive, removeBuddy, buddies } from './buddy.js';
import { summaryOf, myName } from './household.js';
import { cleanText, fromPasted } from './share.js';
import { ago } from './hall.js';

export const COPY = Object.freeze({
  lead: 'Two learners on two devices can keep each other going. Send your buddy an update whenever you like; open theirs here. An update holds a name, a streak, lesson counts and nothing else. It goes by link, QR code or file, never through a server.',
});
const NAME_KEY = 'together.name';

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx = {}) {
  const store = ctx.store; const now = ctx.now ?? Date.now();
  const status = statusLine('bd-status');
  const out = h('div', { id: 'bd-out' });
  const listHost = h('div', { id: 'bd-list' });
  let state = withMyId(store?.get?.(BUDDIES_KEY));
  const save = () => { try { store?.set?.(BUDDIES_KEY, state); } catch { /* storage blocked: this session only */ } };
  const name = /** @type {any} */ (h('input', { type: 'text', id: 'bd-name', maxlength: '20', autocomplete: 'off', value: cleanText(store?.get?.(NAME_KEY) || myName(ctx.storage)) }));

  function take(input) {
    const r = receive(state, input, now);
    if (!r.ok) { status.textContent = r.error; return; }
    state = r.state; save(); paintList();
    status.textContent = r.isNew ? `${r.buddy.name} is now your buddy. ${r.news.join(' ')} Send them your update too.` : r.news.length ? r.news.join(' ') : `${r.buddy.name}'s latest update is in.`;
  }
  function send() {
    save();
    const who = cleanText(name.value);
    try { store?.set?.(NAME_KEY, who); } catch { /* not kept */ }
    const sum = mySummary(state, who, summaryOf(store, now), now);
    const link = buddyLink(sum, ctx.base);
    const linkBox = h('textarea', { id: 'bd-link', readonly: '', rows: '3', 'aria-label': 'Link to send to your buddy' }, link);
    out.replaceChildren(h('p', {}, `Your update: ${sum.s}-day streak, ${sum.l} lessons, ${sum.w} this week. Send it any way you like:`),
      linkBox, h('div', { class: 'row' }, copyButton('Copy Link', () => link, status),
        h('button', { type: 'button', class: 'btn secondary', id: 'bd-file', onclick: () => { status.textContent = saveFile('aleph-buddy-update.json', JSON.stringify(sum)) ? 'Saved a file to send.' : 'This browser could not save a file. Use the link.'; } }, 'Save As A File')),
      qrImg(link, 'QR code your buddy can scan to open your update'));
  }
  function paintList() {
    const list = buddies(state);
    listHost.replaceChildren(list.length ? h('ul', {}, ...list.map((b) => h('li', { 'data-buddy': b.id }, `${b.name}: ${b.latest.streak}-day streak, ${b.latest.lessons} lessons, ${b.latest.lessonsWeek} this week. Sent ${ago(b.latest.at, now)}. `,
      h('button', { type: 'button', class: 'btn secondary', 'aria-label': `Remove ${b.name}`, onclick: () => { state = removeBuddy(state, b.id); save(); paintList(); status.textContent = `${b.name} was removed.`; } }, 'Remove')))) : h('p', { class: 'muted' }, 'No buddies yet. Send your update, and ask your buddy to send theirs.'));
  }
  const paste = /** @type {any} */ (h('input', { type: 'text', id: 'bd-paste', autocomplete: 'off' }));
  frame(root, 'Buddy Pairing', h('p', {}, COPY.lead), status,
    h('section', { 'aria-labelledby': 'bd-send-h' }, h('h2', { id: 'bd-send-h' }, 'Send My Update'), h('label', { class: 'field', for: 'bd-name' }, 'Your name, as your buddy will see it', name),
      h('button', { type: 'button', class: 'btn', id: 'bd-make', onclick: send }, 'Make My Update'), out),
    h('section', { 'aria-labelledby': 'bd-get-h' }, h('h2', { id: 'bd-get-h' }, 'Open My Buddy’s Update'), h('label', { class: 'field', for: 'bd-paste' }, 'Paste the link your buddy sent', paste),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', id: 'bd-open', onclick: () => take(fromPasted(paste.value, 'b')) }, 'Open'),
        ...filePicker('bd-pick', 'Choose A File', (text) => { let o = null; try { o = JSON.parse(text || ''); } catch { o = null; } take(o || ''); }))),
    h('section', { 'aria-labelledby': 'bd-list-h' }, h('h2', { id: 'bd-list-h' }, 'My Buddies'), listHost),
    h('p', {}, h('a', { href: '#/study-hall' }, 'Study Hall')));
  paintList();
  if (ctx.query?.b) take(String(ctx.query.b));
  return () => {};
}
