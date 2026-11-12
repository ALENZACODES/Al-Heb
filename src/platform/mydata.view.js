// H10 My Data (#/my-data): everything Aleph stores on this device, downloadable as the JSON backup (the same file Settings makes,
// which Settings > Restore and #/move read back) and as two CSV files for a spreadsheet (review cards, lessons completed).
import { h } from '../shell/ui.js';
import { cardsCSV, lessonsCSV, inventory } from './export.js';
import { DECKS } from './sched-state.js';

const day = () => new Date().toISOString().slice(0, 10);
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mount(root, ctx) {
  const store = ctx?.store;
  const status = h('p', { role: 'status', class: 'muted' });
  const backup = () => { try { return store?.exportData?.() || { data: {} }; } catch { return { data: {} }; } };
  const data = backup().data || {};
  const decks = Object.fromEntries(DECKS.map(([k]) => [k, data[k]]));
  const inv = inventory(data);
  const btn = (label, onclick) => h('button', { type: 'button', class: 'btn', onclick }, label);
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'My Data'),
    h('p', {}, `Everything Aleph knows about your learning is stored here on this device, in ${inv.length} ${inv.length === 1 ? 'item' : 'items'}. Nothing is sent anywhere. Download it to keep a copy or to read it yourself.`),
    h('h2', {}, 'Download'),
    h('p', {}, btn('Everything as a backup file (JSON)', () => {
      try { download(store.exportJSON(), `aleph-backup-${day()}.json`, 'application/json'); status.textContent = 'Backup file downloaded. Settings > Restore, or Move to Another Device, reads it back.'; }
      catch { status.textContent = 'The backup could not be made on this device.'; }
    })),
    h('p', {}, btn('Review cards as a spreadsheet (CSV)', () => { download(cardsCSV(decks), `aleph-review-cards-${day()}.csv`, 'text/csv'); status.textContent = 'Review cards downloaded as CSV.'; }), ' ',
      btn('Lessons completed as a spreadsheet (CSV)', () => { download(lessonsCSV(data['curriculum.progress']), `aleph-lessons-${day()}.csv`, 'text/csv'); status.textContent = 'Lessons completed downloaded as CSV.'; })),
    h('p', { class: 'muted' }, 'CSV files are for reading in a spreadsheet. To bring your progress back or onto another device, use the JSON backup file.'),
    h('h2', {}, 'Bring It Back'),
    h('p', {}, h('a', { class: 'btn secondary', href: '#/settings' }, 'Restore a backup file (Settings)'), ' ', h('a', { class: 'btn secondary', href: '#/move' }, 'Move to another device (link, QR code or file)')),
    status,
    h('h2', {}, 'What Is Stored'),
    inv.length ? h('div', { role: 'region', 'aria-label': 'Stored items, scrolls sideways on narrow screens', tabindex: '0', style: 'overflow-x:auto;max-width:100%' },
      h('table', {}, h('caption', {}, 'Each stored item and its size in characters'),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Item'), h('th', { scope: 'col' }, 'Characters'))),
        h('tbody', {}, ...inv.map((x) => h('tr', {}, h('th', { scope: 'row' }, x.key), h('td', {}, String(x.chars)))))))
      : h('p', {}, 'Nothing is stored yet.')));
  return () => {};
}
