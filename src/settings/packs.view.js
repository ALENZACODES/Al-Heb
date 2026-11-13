// @ts-check
// Language packs (#/packs): every pack in plain words, what it does, its size, whether it is on this device, a button to
// download or delete it, the "Only download on Wi-Fi" choice and how much space the packs use.
// Nothing here downloads by itself: a pack is fetched only when the learner presses Download.
import { h } from '../shell/ui.js';
import { loader } from './tools.js';
import { armShabbatCheck, isShabbatSafeMode } from './shabbat.js';
import { COPY, LIMIT_CHOICES, limitLabel, loadCatalog, createPacks, statusLine, storageLine } from './packs.model.js';

const CSS = `
.pk{display:flex;flex-direction:column;gap:1rem}
.pk-row{border:1px solid var(--border);border-radius:var(--radius,.75rem);padding:.8rem 1rem;display:flex;flex-direction:column;gap:.4rem}
.pk-row h2{margin:0;font-size:1.1rem}
.pk-row p{margin:0}
.pk-actions{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}
.pk-actions progress{flex:1 1 10rem;min-width:8rem;height:.8rem}
`;

/** @param {HTMLElement} root @param {any} ctx `ctx.packs` (a createPacks() result) and `ctx.now` are stand-ins for tests */
export function mount(root, ctx = {}) {
  let alive = true;
  /** @type {Record<string, {stop:AbortController|null, busy:boolean}>} */
  const running = {};
  const title = h('h1', { id: 'view-title', tabindex: '-1' }, COPY.title);
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted', id: 'pk-status' });
  const shabbat = h('p', { class: 'muted', id: 'pk-shabbat', hidden: true }, COPY.shabbat);
  const storage = h('p', { id: 'pk-storage', class: 'muted' });
  const list = h('div', { id: 'pk-list', class: 'pk' });
  const wifi = /** @type {HTMLInputElement} */ (h('input', { type: 'checkbox', id: 'pk-wifi' }));
  const limit = /** @type {HTMLSelectElement} */ (h('select', { id: 'pk-limit' }, ...LIMIT_CHOICES.map((b) => h('option', { value: String(b) }, limitLabel(b)))));
  const choices = h('section', { class: 'card', 'aria-labelledby': 'pk-choices-title', hidden: true },
    h('h2', { id: 'pk-choices-title' }, 'Downloads And Storage'),
    h('div', { class: 'field' }, h('label', { class: 'opt', for: 'pk-wifi' }, wifi, h('span', {}, COPY.wifi)), h('p', { class: 'muted' }, COPY.wifiHelp)),
    h('label', { class: 'field', for: 'pk-limit' }, COPY.limit, limit),
    storage);
  root.replaceChildren(h('style', {}, CSS), h('section', { class: 'card pk', 'aria-labelledby': 'view-title' },
    title, h('p', {}, COPY.lead), shabbat, status, list, choices,
    h('p', {}, h('a', { class: 'btn secondary', href: '#/' }, 'Home'), ' ', h('a', { class: 'btn secondary', href: '#/settings' }, 'Settings'))));

  /** @type {ReturnType<typeof createPacks>|null} */
  let packs = ctx.packs || null;

  async function paintStorage() {
    if (!packs) return;
    try { const r = await packs.storage(); if (alive) storage.textContent = storageLine(r); } catch { /* the line stays as it was */ }
  }

  function row(p) {
    const text = h('p', { class: 'pk-state' }, 'Checking…');
    const bar = /** @type {HTMLProgressElement} */ (h('progress', { max: 100, value: 0, hidden: true, 'aria-label': `${p.title} download` }));
    const get = /** @type {HTMLButtonElement} */ (h('button', { type: 'button', class: 'btn', 'data-pack-get': p.name, 'aria-label': `Download ${p.title}`, disabled: true, onclick: () => onGet() }, 'Download'));
    const del = /** @type {HTMLButtonElement} */ (h('button', { type: 'button', class: 'btn secondary', 'data-pack-delete': p.name, 'aria-label': `Delete ${p.title}`, hidden: true, onclick: () => onDelete() }, 'Delete'));
    const note = h('p', { class: 'muted pk-note', role: 'status', 'aria-live': 'polite' });
    running[p.name] = { stop: null, busy: false };
    const me = running[p.name];
    let askedDelete = false;

    async function paint() {
      if (!packs || me.busy) return;
      try {
        const st = await packs.state(p.name);
        if (!alive) return;
        text.textContent = statusLine(st);
        get.hidden = st.ready; get.disabled = false; get.textContent = st.have > 0 ? 'Carry On' : 'Download';
        get.setAttribute('aria-label', `${st.have > 0 ? 'Carry on downloading' : 'Download'} ${p.title}`);
        del.hidden = st.have === 0; del.textContent = 'Delete'; askedDelete = false;
      } catch { if (alive) { text.textContent = 'This pack’s size could not be read. Check your connection.'; get.hidden = false; get.disabled = false; } }
    }

    async function onGet() {
      if (!packs) return;
      if (me.busy) { me.stop?.abort(); return; }
      note.textContent = '';
      me.busy = true; me.stop = new AbortController();
      bar.hidden = false; bar.value = 0; get.textContent = 'Stop'; get.setAttribute('aria-label', `Stop downloading ${p.title}`); del.hidden = true;
      let shown = -1, failed = '';
      try {
        await packs.download(p.name, { signal: me.stop.signal, onProgress: (have, total) => {
          if (!alive) return;
          const pct = total ? Math.floor((100 * have) / total) : 0;
          if (pct === shown) return; shown = pct;
          bar.value = pct; text.textContent = `Downloading: ${loader.megabytes(have)} of ${loader.megabytes(total)} MB.`;
        } });
      } catch (e) { failed = packs.why(e); }
      me.busy = false; me.stop = null;
      if (!alive) return;
      bar.hidden = true;
      note.textContent = failed || `${p.title} is on this device. It works offline from now on.`;
      await paint(); paintStorage();
    }

    async function onDelete() {
      if (!packs || me.busy) return;
      // two presses: a pack is a large download to get back
      if (!askedDelete) { askedDelete = true; del.textContent = 'Delete Now'; note.textContent = `Press Delete Now to remove ${p.title} from this device. You can download it again later.`; return; }
      del.disabled = true;
      try { await packs.remove(p.name); note.textContent = `${p.title} was deleted from this device.`; } catch { note.textContent = 'The pack could not be deleted. Try again.'; }
      del.disabled = false;
      if (!alive) return;
      // deleting one translation pack can free the files it shared with the other, so every row is read again
      for (const r of rows) await r.paint();
      paintStorage();
    }

    const node = h('section', { class: 'pk-row', 'data-pack': p.name, 'aria-labelledby': `pk-h-${p.name}` },
      h('h2', { id: `pk-h-${p.name}` }, p.title), h('p', {}, p.what), p.device ? h('p', { class: 'muted' }, p.device) : null,
      text, h('div', { class: 'pk-actions' }, bar, get, del), note);
    return { node, paint };
  }

  /** @type {{node:HTMLElement, paint:()=>Promise<void>}[]} */
  let rows = [];

  (async () => {
    try { await armShabbatCheck(ctx); } catch { /* the fixed hours still apply */ }
    if (!alive) return;
    shabbat.hidden = !isShabbatSafeMode(ctx.now ?? Date.now());
    if (!packs) {
      if (typeof caches === 'undefined') { status.textContent = COPY.noStorage; return; }
      try {
        const catalog = await loadCatalog();
        /** @type {any} */ let talk = null;
        if (typeof Worker === 'function') { try { talk = (await import('../talk/nmt/client.js')).sharedPack(); } catch { talk = null; } }
        packs = createPacks({ catalog, talk });
      } catch { if (alive) status.textContent = COPY.offline; return; }
    }
    if (!alive) return;
    const offered = packs.list();
    if (!offered.length) { status.textContent = COPY.none; return; }
    rows = offered.map(row);
    list.replaceChildren(...rows.map((r) => r.node));
    wifi.checked = packs.getWifiOnly();
    wifi.addEventListener('change', () => { packs?.setWifiOnly(wifi.checked); status.textContent = wifi.checked ? 'Saved ✓ Packs will download on Wi-Fi only.' : 'Saved ✓ Packs may download on any connection.'; });
    limit.value = String(LIMIT_CHOICES.includes(packs.getLimit()) ? packs.getLimit() : 0);
    limit.addEventListener('change', () => { packs?.setLimit(Number(limit.value)); status.textContent = `Saved ✓ ${Number(limit.value) ? `Language packs may use up to ${limitLabel(Number(limit.value))}.` : 'No limit on language packs.'}`; });
    choices.hidden = false;
    for (const r of rows) await r.paint();
    paintStorage();
  })();

  return () => { alive = false; for (const r of Object.values(running)) r.stop?.abort(); };
}
