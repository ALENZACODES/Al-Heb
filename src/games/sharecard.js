// @ts-check
// A shareable result made on this device (D3, D5, E8): the text (copy button) and a picture drawn on a canvas (save button).
// Nothing is uploaded or sent: Copy writes to the clipboard when the browser allows it, Save downloads a PNG made here.
// Where a browser has no clipboard or canvas, the text stays on screen to copy by hand and the page says so.

/** Lines for the picture: a title, the main lines, and a small footer. Pure. */
export function cardLines({ title, lines = [], footer = 'Aleph · made on this device' }) {
  return { title: String(title || ''), lines: lines.map((l) => String(l)), footer: String(footer) };
}

/** Draw the card on a canvas element. Returns false when the canvas cannot draw (no 2D context). */
export function drawCard(canvas, spec) {
  const c = cardLines(spec);
  const ctx2d = canvas?.getContext?.('2d');
  if (!ctx2d) return false;
  const W = 800, H = 200 + 56 * c.lines.length;
  canvas.width = W; canvas.height = H;
  ctx2d.fillStyle = '#fbf6ea'; ctx2d.fillRect(0, 0, W, H);
  ctx2d.strokeStyle = '#7a5c1e'; ctx2d.lineWidth = 8; ctx2d.strokeRect(12, 12, W - 24, H - 24);
  ctx2d.fillStyle = '#2b2416'; ctx2d.textAlign = 'center';
  ctx2d.font = 'bold 40px system-ui, sans-serif'; ctx2d.fillText(c.title, W / 2, 84);
  ctx2d.font = '32px system-ui, sans-serif';
  c.lines.forEach((l, i) => ctx2d.fillText(l, W / 2, 150 + 56 * i));
  ctx2d.font = '20px system-ui, sans-serif'; ctx2d.fillStyle = '#6b5a3a'; ctx2d.fillText(c.footer, W / 2, H - 36);
  return true;
}

/**
 * The share block: the text, Copy, Save picture, and a status line. h is the shell's element helper.
 * @param {Function} h @param {{title:string, lines:string[], text:string, file:string}} spec
 */
export function shareBlock(h, spec) {
  const status = h('p', { class: 'muted gb-share-status', role: 'status', 'aria-live': 'polite' }, '');
  const textBox = h('p', { class: 'gb-share-text' }, spec.text);
  const copy = h('button', { type: 'button', class: 'btn secondary', onclick: async () => {
    try { await globalThis.navigator.clipboard.writeText(spec.text); status.textContent = 'Copied. Paste it wherever you like.'; }
    catch { status.textContent = 'This browser did not allow copying. Select the text above and copy it.'; }
  } }, 'Copy the text');
  const save = h('button', { type: 'button', class: 'btn secondary', onclick: () => {
    try {
      const canvas = globalThis.document.createElement('canvas');
      if (!drawCard(canvas, spec)) throw new Error('no canvas');
      const a = globalThis.document.createElement('a');
      a.href = canvas.toDataURL('image/png'); a.download = spec.file; a.click();
      status.textContent = 'Picture saved to your downloads.';
    } catch { status.textContent = 'This browser cannot make the picture. The text above says the same.'; }
  } }, 'Save as a picture');
  return h('div', { class: 'gb-share' }, textBox, h('div', { class: 'row' }, copy, save), status, h('p', { class: 'muted small' }, 'Made on this device. Nothing is sent anywhere.'));
}
