import { h } from './ui.js';
import { ENUMS, DEFAULTS } from './settings.js';

export function mount(root, ctx) {
  const { settings, store, t } = ctx;
  const radioGroup = (key, legendKey) => {
    const fs = h('fieldset', { class: 'field' }, h('legend', {}, t(legendKey)));
    for (const v of ENUMS[key]) {
      const id = `s-${key}-${v}`;
      const input = h('input', { type: 'radio', name: key, id, value: v, checked: settings.get(key) === v ? true : null,
        onchange: () => settings.set({ [key]: v }) });
      fs.append(h('label', { class: 'opt', for: id }, input, h('span', {}, t(`${legendKey}.${v}`))));
    }
    return fs;
  };
  const toggle = h('input', { type: 'checkbox', id: 's-israel', checked: settings.get('israelTrack') ? true : null,
    onchange: (e) => settings.set({ israelTrack: e.target.checked }) });
  const num = (key, label, min, max) => h('label', { class: 'field' }, label,
    h('input', { type: 'number', step: 'any', min, max, inputmode: 'decimal', value: settings.get(key) ?? '', id: 's-' + key,
      onchange: (e) => { const raw = e.target.value.trim(); const v = raw === '' ? null : Number(raw);
        if (settings.set({ [key]: v }).length) e.target.setAttribute('aria-invalid', 'true'); else e.target.removeAttribute('aria-invalid'); } }));
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' });
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', id: 's-import', class: 'visually-hidden',
    onchange: async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const res = store.importData(await f.text(), { mode: 'replace' });
      if (res.ok) { settings.reload(); status.textContent = `Restored ${res.imported} items.`; } else status.textContent = 'Could not restore: ' + res.error;
      e.target.value = '';
    } });
  const geoBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
    if (!navigator.geolocation) { status.textContent = 'Location is not available on this device.'; return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { settings.set({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }); root.querySelector('#s-lat').value = settings.get('lat'); root.querySelector('#s-lon').value = settings.get('lon'); status.textContent = 'Location saved on this device only.'; },
      () => { status.textContent = 'Location permission was not granted.'; }, { timeout: 10000, maximumAge: 600000 });
  } }, t('settings.useLocation'));
  const clearBtn = h('button', { type: 'button', class: 'btn secondary', onclick: () => { settings.set({ lat: null, lon: null }); root.querySelector('#s-lat').value = ''; root.querySelector('#s-lon').value = ''; } }, t('settings.clearLocation'));
  const exportBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
    const url = URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' }));
    const a = h('a', { href: url, download: `alef-backup-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } }, t('settings.export'));
  const resetBtn = h('button', { type: 'button', class: 'btn secondary', onclick: () => { settings.reset(); mount(root, ctx); } }, t('settings.reset'));

  root.replaceChildren(h('article', { class: 'card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, t('settings.title')),
    radioGroup('voice', 'settings.voice'),
    radioGroup('congregation', 'settings.congregation'),
    h('div', { class: 'field' }, h('label', { class: 'opt', for: 's-israel' }, toggle, h('span', {}, t('settings.israelTrack')))),
    radioGroup('script', 'settings.script'),
    radioGroup('theme', 'settings.theme'),
    h('fieldset', { class: 'field' }, h('legend', {}, t('settings.location')),
      num('lat', t('settings.lat'), -90, 90), num('lon', t('settings.lon'), -180, 180), h('div', { class: 'row' }, geoBtn, clearBtn)),
    h('fieldset', { class: 'field' }, h('legend', {}, t('settings.backup')),
      h('div', { class: 'row' }, exportBtn, h('label', { class: 'btn secondary', for: 's-import' }, t('settings.import')), fileInput),
      store.persistent ? null : h('p', { class: 'muted' }, t('settings.persist.no'))),
    h('div', { class: 'row' }, resetBtn), status));
  return () => {};
}
void DEFAULTS;
