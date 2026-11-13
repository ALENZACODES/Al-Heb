// @ts-check
// Small DOM pieces the "together" pages share: the page frame with its way home, a QR picture, a file to save, a copy button.
import { h } from '../shell/ui.js';
import { encode, toSvg } from '../sync/qr.js';

/** The page frame: title, body, and Home one tap away. */
export function frame(root, title, ...kids) {
  root.replaceChildren(h('section', { class: 'card stack', 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, title), ...kids,
    h('p', {}, h('a', { class: 'btn secondary', href: '#/' }, 'Home'))));
}
/** A QR code for a link, or null when the link is too long for one. */
export function qrImg(link, alt) {
  try { return h('img', { class: 'tg-qr', src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(toSvg(encode(link, { level: 'L' }))), alt, width: '264', height: '264' }); } catch { return null; }
}
/** Hands the learner a small text file. Returns false when this browser cannot. */
export function saveFile(name, text, type = 'application/json') {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}
/** A button that copies text and says so in `status`. */
export function copyButton(label, getText, status) {
  return h('button', { type: 'button', class: 'btn secondary', onclick: async () => { try { await navigator.clipboard.writeText(getText()); status.textContent = 'Copied.'; } catch { status.textContent = 'Could not copy. Select the text and copy it by hand.'; } } }, label);
}
/** A file picker that reads one small text file and hands its text to `onText`. */
export function filePicker(id, label, onText) {
  const input = h('input', { type: 'file', id, accept: 'application/json,.json', class: 'visually-hidden', tabindex: '-1', 'aria-label': label,
    onchange: async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f || f.size > 200000) { onText(null); return; } try { onText(await f.text()); } catch { onText(null); } } });
  return [h('button', { type: 'button', class: 'btn secondary', 'aria-controls': id, onclick: () => input.click() }, label), input];
}
export const statusLine = (id) => h('p', { id, role: 'status', 'aria-live': 'polite', class: 'muted' });
