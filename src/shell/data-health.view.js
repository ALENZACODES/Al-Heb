/**
 * Data health (#/about/data): a builder page, not on the learner's main path.
 * Lists every file under data/ with its status and record count, names any path the app
 * asks for that is not in the repo (a 404), and shows how the Dictionary counts fit together.
 * The inventory (data/dev/health.json) is loaded on first open and is not part of the first install.
 */
import { h } from './ui.js';
import { fmt } from '../lib/counts.js';

export const HEALTH_URL = 'data/dev/health.json';

export const folderOf = (p) => {
  const parts = String(p || '').split('/');
  return parts.length > 2 ? parts.slice(0, 2).join('/') : (parts[0] || '');
};

export const groupFiles = (files) => {
  const map = new Map();
  for (const f of files || []) {
    const key = folderOf(f.path);
    const g = map.get(key) || { folder: key, files: [], bytes: 0, records: 0, bad: 0 };
    g.files.push(f);
    g.bytes += Number(f.bytes) || 0;
    g.records += Number(f.records) || 0;
    if (f.status && f.status !== 'ok') g.bad++;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.folder.localeCompare(b.folder));
};

export function dictionaryLines(d = {}) {
  const lines = [
    `${fmt(d.sourceEntries)} entries in the dictionary data file (data/vocab/words.json).`,
    `${fmt(d.listed)} entries in the learner list this Dictionary page uses.`,
    `${fmt(d.hidden)} hidden while a meaning is checked, leaving ${fmt(d.entries)} visible entries.`,
    `${fmt(d.forms)} word forms and ${fmt(d.words)} words shown (${fmt(d.rareSense)} rare-sense words already in that word count are left out of Add all).`,
    `${fmt(d.beyondList)} entries stay in the data and are not on the Dictionary page: ${fmt(d.beyondRank)} with a frequency rank above 5,000 and ${fmt(d.unranked)} unranked lesson or phrase items.`,
  ];
  return lines;
}

const bytesText = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} bytes`);

export function mount(root, ctx) {
  const fetchFn = ctx?.fetch || ((url, opts) => fetch(url, opts));
  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Data health');
  const intro = h('p', {}, 'A list of every data file, its size and its record count, plus any path the app asks for that is not in the files. This page is for checking the data, not a lesson. Nothing here is downloaded until you open the page or tap Check now.');
  const nav = h('p', {}, h('a', { href: '#/' }, 'Home'), ' · ', h('a', { href: '#/about' }, 'About'), ' · ', h('a', { href: '#/vocab' }, 'Dictionary'));
  const status = h('p', { id: 'dh-status', role: 'status' }, 'Loading the file list…');
  const body = h('div', { id: 'dh-body' });
  root.replaceChildren(h('article', { class: 'stack dh-page' }, title, intro, nav, status, body));

  let doc = ctx?.health || null;
  const show = (d) => {
    doc = d;
    status.textContent = `${fmt(d.counts.files)} data files, ${fmt(d.counts.ok)} readable, ${fmt(d.counts.unreadable)} unreadable, ${fmt(d.counts.missing)} missing. ${fmt(d.counts.referenced)} paths are named in the app code.`;
    const dict = h('section', { class: 'card', 'aria-labelledby': 'dh-dict' },
      h('h2', { id: 'dh-dict' }, 'Dictionary counts'),
      h('ul', {}, ...dictionaryLines(d.dictionary).map((line) => h('li', {}, line))));
    const missing = h('section', { class: 'card', 'aria-labelledby': 'dh-miss' },
      h('h2', { id: 'dh-miss' }, 'Missing files the app still names'),
      d.missing.length
        ? h('ul', { id: 'dh-missing-list' }, ...d.missing.map((m) => h('li', { 'data-path': m.path },
          h('code', {}, m.path),
          ` — ${m.status}`,
          m.referencedFrom?.length ? ` (named in ${m.referencedFrom.join(', ')})` : '',
          m.note ? h('p', { class: 'muted' }, m.note) : null)))
        : h('p', {}, 'Every data path the app names is in the files.'),
      h('p', {}, h('button', { type: 'button', class: 'btn secondary', id: 'dh-check', onclick: () => checkNow() }, 'Check now')));
    const result = h('p', { id: 'dh-check-result', role: 'status' });
    const groups = groupFiles(d.files);
    const list = h('section', { class: 'card', 'aria-labelledby': 'dh-files' },
      h('h2', { id: 'dh-files' }, 'Every data file'),
      h('p', { class: 'muted' }, 'Grouped by folder. Tap a folder to see its files.'),
      h('div', { id: 'dh-groups' }, ...groups.map((g) => folderBlock(g))));
    body.replaceChildren(dict, missing, result, list);
  };

  const folderBlock = (g) => {
    const box = h('details', { class: 'dh-folder' },
      h('summary', {}, `${g.folder} — ${fmt(g.files.length)} files${g.records ? `, ${fmt(g.records)} records` : ''}, ${bytesText(g.bytes)}${g.bad ? `, ${fmt(g.bad)} not readable` : ''}`),
      h('ul', {}, ...g.files.map((f) => h('li', {},
        h('code', {}, f.path),
        ` — ${f.status}`,
        f.records != null ? `, ${fmt(f.records)} records` : '',
        `, ${bytesText(f.bytes)}`))));
    return box;
  };

  async function checkNow() {
    const btn = root.querySelector('#dh-check');
    const out = root.querySelector('#dh-check-result');
    if (!doc || !out) return;
    if (btn) btn.disabled = true;
    const targets = (doc.missing || []).map((m) => m.path);
    if (!targets.length) { out.textContent = 'There are no missing paths to check.'; if (btn) btn.disabled = false; return; }
    out.textContent = `Checking ${targets.length} path${targets.length === 1 ? '' : 's'}…`;
    const lines = [];
    for (const p of targets) {
      try {
        const res = await fetchFn(p, { method: 'GET', cache: 'no-store' });
        lines.push(`${p}: ${res.status === 404 ? '404 (not found)' : res.ok ? `${res.status} (found)` : `${res.status}`}`);
      } catch {
        lines.push(`${p}: could not be reached.`);
      }
    }
    out.textContent = lines.join(' ');
    if (btn) btn.disabled = false;
  }

  if (doc) { show(doc); return () => {}; }

  Promise.resolve(fetchFn(HEALTH_URL, { cache: 'no-store' }))
    .then((res) => { if (!res || !res.ok) throw new Error(res ? `HTTP ${res.status}` : 'no response'); return res.json(); })
    .then(show)
    .catch(() => { status.textContent = 'The file list could not be loaded. Open this page again when you are online, or rebuild it with the data-health tool.'; });

  return () => {};
}
