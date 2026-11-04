import { h } from './ui.js';
import { ENUMS, DEFAULTS } from './settings.js';
import { inspectBackup, requestPersistence, storageStatus } from './backup.js';

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
  // Restore is a two-step action: choosing a file only inspects it (nothing changes), then the learner confirms the replacement.
  const restoreBox = h('div', { class: 'field', role: 'group', 'aria-label': 'Restore confirmation', hidden: true });
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', id: 's-import', class: 'visually-hidden',
    onchange: async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      let text = ''; try { text = await f.text(); } catch { text = ''; }
      e.target.value = '';
      const info = inspectBackup(text);
      if (!info.ok) { restoreBox.hidden = true; status.textContent = 'Could not restore: ' + info.error + ' Your progress on this device was not changed.'; return; }
      const when = info.exportedAt ? ` made on ${info.exportedAt.slice(0, 10)}` : '';
      const go = h('button', { type: 'button', class: 'btn', onclick: () => {
        const res = store.importData(text, { mode: 'replace' });
        restoreBox.hidden = true; restoreBox.replaceChildren();
        if (res.ok) { settings.reload(); status.textContent = `Restored ${res.imported} saved items from the backup${when}.`; }
        else status.textContent = restoreFailureMessage(res);
        root.querySelector('#s-import')?.focus();
      } }, 'Replace my progress with this backup');
      const cancel = h('button', { type: 'button', class: 'btn secondary', onclick: () => { restoreBox.hidden = true; restoreBox.replaceChildren(); status.textContent = 'Restore cancelled. Nothing was changed.'; root.querySelector('#s-import')?.focus(); } }, 'Cancel');
      restoreBox.replaceChildren(h('p', {}, `This backup${when} holds ${info.items} saved items. Restoring replaces the progress and settings that are on this device now.`), h('div', { class: 'row' }, go, cancel));
      restoreBox.hidden = false; go.focus();
    } });
  const persistLine = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite', id: 's-persist' }, 'Checking whether this browser keeps your progress...');
  const persistBtn = h('button', { type: 'button', class: 'btn secondary', onclick: async () => {
    const r = await requestPersistence(); await showPersist();
    if (!r.supported) status.textContent = 'This browser cannot be asked to protect storage. Download a backup instead.';
    else if (!r.granted) status.textContent = 'The browser did not agree. Your progress is still saved, but a browser clean-up could remove it, so download a backup now and then.';
  } }, 'Ask the browser to protect my progress');
  async function showPersist() {
    const s = await storageStatus();
    persistLine.textContent = !s.supported ? 'This browser does not offer protected storage. Progress is saved on this device only; download a backup now and then.'
      : s.persisted ? 'Your progress is protected from automatic browser clean-up. Clearing site data in browser settings still deletes it, so keep a backup file.'
      : 'Your progress is saved on this device but the browser may remove it when space is short or after a long time unused. Download a backup now and then.';
    persistBtn.hidden = !s.supported || !!s.persisted;
  }
  showPersist();
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
  const resetBtn = h('button', { type: 'button', class: 'btn secondary', onclick: () => { settings.reset(); settings.set({ onboarded: true }); mount(root, ctx); } }, t('settings.reset'));

  root.replaceChildren(h('article', { class: 'card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, t('settings.title')),
    h('p', { class: 'muted' }, 'No recorded voices exist yet: the Man/Woman choice is a saved preference. Sound currently comes from your browser\'s text-to-speech voice. See "How this works".'),
    radioGroup('voice', 'settings.voice'),
    radioGroup('congregation', 'settings.congregation'),
    radioGroup('goal', 'settings.goal'),
    h('div', { class: 'field' }, h('label', { class: 'opt', for: 's-bva' }, h('input', { type: 'checkbox', id: 's-bva', checked: settings.get('browserVoiceAnyway') ? true : null, onchange: (e) => settings.set({ browserVoiceAnyway: e.target.checked }) }), h('span', {}, t('settings.browserVoiceAnyway')))),
    h('div', { class: 'field' }, h('label', { class: 'opt', for: 's-israel' }, toggle, h('span', {}, t('settings.israelTrack')))),
    radioGroup('script', 'settings.script'),
    radioGroup('theme', 'settings.theme'),
    h('fieldset', { class: 'field' }, h('legend', {}, t('settings.location')),
      num('lat', t('settings.lat'), -90, 90), num('lon', t('settings.lon'), -180, 180), h('div', { class: 'row' }, geoBtn, clearBtn)),
    h('fieldset', { class: 'field' }, h('legend', {}, t('settings.backup')),
      h('div', { class: 'row' }, exportBtn, h('label', { class: 'btn secondary', id: 's-import-label', for: 's-import' }, t('settings.import')), fileInput),
      restoreBox, persistLine, h('div', { class: 'row' }, persistBtn),
      store.persistent ? null : h('p', { class: 'muted' }, t('settings.persist.no'))),
    h('div', { class: 'row' }, resetBtn, h('a', { class: 'btn secondary', href: '#/welcome' }, t('settings.redo'))), status));
  return () => {};
}
void DEFAULTS;

export function restoreFailureMessage(result) {
  return result.recoveryRequired
    ? 'Could not restore or recover the saved copy on this device. Your previous progress is available only in this open app. Download a backup now, before closing or reloading; some saved data may have changed.'
    : 'Could not restore: ' + result.error + ' Your progress on this device was not changed.';
}
