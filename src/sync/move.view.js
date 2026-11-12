// @ts-check
// #/move: Move to Another Device (lane 4, 12 Nov). Send: a link, a QR code (when the progress is small enough) or a file.
// Receive: open the link, paste it, or choose the file; the progress is merged, never overwritten. No server, no account.
import { h } from '../shell/ui.js';
import { pack, unpack, isLocked, moveLink, codeFromText, canLock } from './transfer.js';
import { encode, toSvg } from './qr.js';
import { movePackage, readIncoming, previewMerge, applyMerge, describeGains, MOVE_COPY, QR_MAX_BYTES } from './move.js';

const CSS = `
.mv{max-inline-size:40rem;margin-inline:auto;overflow-wrap:anywhere}
.mv .mv-card{border:1px solid var(--border,#999);border-radius:12px;padding:1rem;background:var(--card,#fff);margin-block:1rem}
.mv .mv-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-block:.6rem}
.mv .btn{min-block-size:var(--tap,48px)}
.mv input,.mv textarea{min-block-size:44px;inline-size:100%}
.mv .mv-qr{inline-size:min(100%,22rem);background:#fff;padding:.5rem;border-radius:8px}
.mv .mv-qr img{inline-size:100%;block-size:auto;display:block;image-rendering:pixelated}
`;
function style() { try { if (document.getElementById('mv-style')) return; const s = document.createElement('style'); s.id = 'mv-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ } }
const kb = (n) => (n < 1024 ? `${n} bytes` : `${(n / 1024).toFixed(1)} KB`);

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  style();
  const store = ctx.store;
  const wrap = h('section', { class: 'mv', 'aria-labelledby': 'view-title' });
  const status = h('p', { role: 'status', 'aria-live': 'polite', id: 'mv-status' });
  const say = (t) => { status.textContent = t; };
  const pageBase = () => { try { return globalThis.location.href; } catch { return 'https://alef-review.onrender.com/'; } };
  let alive = true;

  // ---------- send ----------
  const pass = h('input', { type: 'password', id: 'mv-pass', autocomplete: 'new-password', 'aria-describedby': 'mv-pass-help' });
  const sendOut = h('div', { id: 'mv-send-out' });
  const makeBtn = h('button', { type: 'button', class: 'btn', id: 'mv-make', onclick: async () => {
    makeBtn.disabled = true; say('Packing your progress...');
    try {
      const p = await pack(movePackage(store), { passphrase: pass.value || undefined });
      const link = moveLink(pageBase(), p.code);
      const linkBytes = new TextEncoder().encode(link).length;
      const kids = [h('p', {}, `Your progress packs into ${kb(p.bytes)}${p.compressed ? ` (from ${kb(p.jsonBytes)})` : ''}${p.locked ? ', locked with your passphrase' : ', not locked'}.`)];
      if (linkBytes <= QR_MAX_BYTES) {
        const qr = encode(link, { level: 'L' });
        const box = h('div', { class: 'mv-qr', id: 'mv-qr' }, h('img', { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(toSvg(qr)), alt: 'QR code that opens your progress on another device', width: '352', height: '352' }));
        kids.push(h('p', {}, 'On the other device, point the camera at this code and open the link it shows.'), box,
          qr.version > 25 ? h('p', { class: 'muted' }, 'This code is dense. If the camera cannot read it, make the screen brighter, or use the link or the file instead.') : null);
      } else kids.push(h('p', { id: 'mv-qr-too-big' }, `Too much progress for a QR code (${kb(linkBytes)}; a QR code holds at most ${kb(QR_MAX_BYTES)}). Use the link or the file.`));
      const a = h('a', { href: link, id: 'mv-link' }, 'Link to your progress');
      kids.push(h('div', { class: 'mv-row' }, a,
        h('button', { type: 'button', class: 'btn secondary', id: 'mv-copy', onclick: async () => {
          try { if (navigator.share) { await navigator.share({ title: 'My Aleph progress', url: link }); return; } await navigator.clipboard.writeText(link); say('Link copied. Send it to yourself, then open it on the other device.'); }
          catch { say('Copying is not available here. Press and hold the link to copy it.'); }
        } }, 'Copy or share the link')));
      if (link.length > 32000) kids.push(h('p', { class: 'muted' }, `The link is long (${link.length.toLocaleString('en')} characters). Some apps cut long links short; if it does not open, use the file.`));
      sendOut.replaceChildren(...kids.filter(Boolean)); say('Ready. Nothing has left this device.');
    } catch (e) { say(`Could not pack your progress: ${e?.message || e}`); }
    makeBtn.disabled = false;
  } }, 'Make a link and QR code');
  const fileBtn = h('button', { type: 'button', class: 'btn secondary', id: 'mv-file', onclick: () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(movePackage(store), null, 1)], { type: 'application/json' }));
    const a = h('a', { href: url, download: `aleph-progress-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('File downloaded. Copy it to the other device (by cable, cloud drive or email to yourself) and choose it there under Bring Progress Here. The file is not locked: keep it somewhere private.');
  } }, 'Download a file instead');

  // ---------- receive ----------
  const recvOut = h('div', { id: 'mv-recv-out' });
  const paste = h('textarea', { id: 'mv-paste', rows: '3', 'aria-describedby': 'mv-paste-help' });
  const fileIn = h('input', { type: 'file', id: 'mv-file-in', accept: 'application/json,.json', class: 'visually-hidden', tabindex: '-1', 'aria-label': 'Choose a progress file',
    onchange: async (e) => { const f = e.target.files?.[0]; if (!f) return; let text = ''; try { text = await f.text(); } catch { /* empty */ } e.target.value = ''; offer(text, 'the file'); } });

  function offer(input, from) {
    const r = readIncoming(store, input);
    if (!r.ok) { recvOut.replaceChildren(h('p', { role: 'alert' }, `Could not read ${from}: ${r.error}. Nothing on this device was changed.`)); return; }
    const pv = previewMerge(store, r.data);
    const written = Object.keys(pv.data).length;
    const go = h('button', { type: 'button', class: 'btn', id: 'mv-merge', onclick: () => {
      const res = applyMerge(store, r.data);
      if (!res.ok) { say(`Nothing was changed: ${res.error}`); return; }
      try { ctx.settings?.reload?.(); } catch { /* best effort */ }
      try { if (/[?&]p=/.test(globalThis.location.hash)) globalThis.history.replaceState(null, '', '#/move'); } catch { /* keep going */ } // keep the progress out of the address bar and history
      recvOut.replaceChildren(h('p', { id: 'mv-done' }, res.written ? `Done. ${res.written} saved item${res.written === 1 ? ' was' : 's were'} merged and nothing was removed. Reload the page to see everything refreshed.` : 'Nothing needed to change.'));
      say('Merged.');
    } }, 'Merge into this device');
    recvOut.replaceChildren(h('p', {}, `From ${from}${r.exportedAt ? `, packed on ${r.exportedAt.slice(0, 10)}` : ''}. Nothing has changed yet.`),
      ...describeGains(pv.gains, written).map((l) => h('p', {}, l)),
      written ? h('div', { class: 'mv-row' }, go) : null);
    if (written) go.focus?.();
  }
  async function fromCode(code, from) {
    let locked;
    try { locked = isLocked(code); } catch (e) { recvOut.replaceChildren(h('p', { role: 'alert' }, `${e.message} Nothing on this device was changed.`)); return; }
    const open = async (phrase) => {
      try { const obj = await unpack(code, { passphrase: phrase }); if (alive) offer(obj, from); }
      catch (e) { recvOut.querySelector?.('#mv-unlock-msg')?.remove?.(); recvOut.append(h('p', { role: 'alert', id: 'mv-unlock-msg' }, e.message)); }
    };
    if (!locked) return open(undefined);
    const ph = h('input', { type: 'password', id: 'mv-unlock', autocomplete: 'off' });
    recvOut.replaceChildren(h('p', {}, 'This progress is locked with a passphrase.'), h('label', { for: 'mv-unlock' }, 'Passphrase'), ph,
      h('div', { class: 'mv-row' }, h('button', { type: 'button', class: 'btn', id: 'mv-unlock-go', onclick: () => open(ph.value) }, 'Unlock')));
    ph.focus?.();
  }

  wrap.append(
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Move to Another Device'),
    h('p', { id: 'mv-no-account' }, MOVE_COPY.noAccount),
    h('p', { class: 'muted', id: 'mv-reconnect' }, MOVE_COPY.reconnect),
    h('div', { class: 'mv-card', id: 'mv-recv' }, h('h2', {}, 'Bring Progress Here'),
      h('p', { id: 'mv-paste-help' }, 'Open the link from your other device, scan its QR code, paste the link below, or choose the file.'),
      h('label', { for: 'mv-paste' }, 'Link or code'), paste,
      h('div', { class: 'mv-row' },
        h('button', { type: 'button', class: 'btn secondary', id: 'mv-paste-go', onclick: () => { const c = codeFromText(paste.value); if (!c) { say('That does not look like an Aleph progress link.'); return; } fromCode(c, 'the pasted link'); } }, 'Read the link'),
        h('button', { type: 'button', class: 'btn secondary', id: 'mv-file-pick', onclick: () => fileIn.click() }, 'Choose a file'), fileIn),
      recvOut),
    h('div', { class: 'mv-card', id: 'mv-send' }, h('h2', {}, 'Send Progress From This Device'),
      h('p', {}, MOVE_COPY.hash),
      canLock() ? h('div', {}, h('label', { for: 'mv-pass' }, 'Passphrase (optional)'), pass, h('p', { class: 'muted', id: 'mv-pass-help' }, MOVE_COPY.passphrase)) : h('p', { class: 'muted' }, 'This browser cannot lock the link with a passphrase, so anyone who has the link can read it.'),
      h('div', { class: 'mv-row' }, makeBtn, fileBtn), sendOut),
    status);
  root.append(wrap);
  if (ctx?.query?.p) fromCode(String(ctx.query.p), 'the link you opened');
  return () => { alive = false; };
}
