import { h } from './ui.js';
import { ENUMS, DEFAULTS } from './settings.js';
import { requestPersistence, storageStatus } from './backup.js';
import { describePreview, storageNotice, wipeAllData, confirmMatches, CONFIRM_WORD, backupFileName } from './settings.data.js';

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
  // one checkbox row per boolean setting (plain English labels; the i18n table is owned by another lane)
  const boolRow = (key, label, help) => h('div', { class: 'field' },
    h('label', { class: 'opt', for: 's-' + key }, h('input', { type: 'checkbox', id: 's-' + key, checked: settings.get(key) ? true : null, onchange: (e) => settings.set({ [key]: e.target.checked }) }), h('span', {}, label)),
    help ? h('p', { class: 'muted' }, help) : null);
  const toggle = h('input', { type: 'checkbox', id: 's-israel', checked: settings.get('israelTrack') ? true : null,
    onchange: (e) => settings.set({ israelTrack: e.target.checked }) });
  const num = (key, label, min, max) => h('label', { class: 'field' }, label,
    h('input', { type: 'number', step: 'any', min, max, inputmode: 'decimal', value: settings.get(key) ?? '', id: 's-' + key,
      onchange: (e) => { const raw = e.target.value.trim(); const v = raw === '' ? null : Number(raw);
        if (settings.set({ [key]: v }).length) e.target.setAttribute('aria-invalid', 'true'); else e.target.removeAttribute('aria-invalid'); } }));
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' });
  // Restore is a two-step action: choosing a file only inspects it (nothing changes), then the learner confirms the replacement.
  const restoreBox = h('div', { class: 'field', role: 'group', 'aria-label': 'Restore confirmation', hidden: true });
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', id: 's-import', class: 'visually-hidden', tabindex: '-1',
    onchange: async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      let text = ''; try { text = await f.text(); } catch { text = ''; }
      e.target.value = '';
      const info = store.previewImport(text, { mode: 'replace' });
      if (!info.ok) { restoreBox.hidden = true; status.textContent = 'Could not restore: ' + info.error + '. Your progress on this device was not changed.'; return; }
      const go = h('button', { type: 'button', class: 'btn', onclick: () => {
        const res = store.importData(text, { mode: 'replace' });
        restoreBox.hidden = true; restoreBox.replaceChildren();
        if (res.ok) { settings.reload(); status.textContent = `Restored ${res.imported} saved items from the backup. Reload the page to see everything refreshed.`; } else status.textContent = 'Could not restore: ' + res.error + '. Your progress on this device was not changed.';
        root.querySelector('#s-import-label')?.focus();
      } }, 'Replace my progress with this backup');
      const cancel = h('button', { type: 'button', class: 'btn secondary', onclick: () => { restoreBox.hidden = true; restoreBox.replaceChildren(); status.textContent = 'Restore cancelled. Nothing was changed.'; root.querySelector('#s-import-label')?.focus(); } }, 'Cancel');
      restoreBox.replaceChildren(h('p', {}, 'Preview. Nothing has changed yet.'), ...describePreview(info).map((l) => h('p', {}, l)), h('p', {}, 'Restoring replaces the progress and settings on this device. If you are unsure, press Cancel and download a backup of what is here now first.'), h('div', { class: 'row' }, go, cancel));
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
  const notice = h('p', { class: 'card', role: 'alert', id: 's-storage-notice', hidden: true });
  const retryBtn = h('button', { type: 'button', class: 'btn secondary', hidden: true, onclick: () => { status.textContent = store.retryPersistence?.() ? 'Saved to this device again.' : 'Still cannot save to this device. Download a backup instead.'; showNotice(); } }, 'Try saving again');
  function showNotice() { const m = storageNotice(store.status ? store.status() : { persistent: store.persistent, reason: null }); notice.textContent = m || ''; notice.hidden = !m; retryBtn.hidden = !m || store.persistent !== false; }
  showNotice(); const offStatus = store.onStatus?.(showNotice);
  const wipeInput = h('input', { type: 'text', id: 's-wipe-word', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-describedby': 's-wipe-help', 'data-no-busy': '' });
  const wipeSw = h('input', { type: 'checkbox', id: 's-wipe-sw' });
  const wipeGo = h('button', { type: 'button', class: 'btn secondary', id: 's-wipe-go', disabled: true, onclick: async () => {
    if (!confirmMatches(wipeInput.value)) return;
    wipeGo.disabled = true;
    const r = await wipeAllData({ store, caches: globalThis.caches, navigator: globalThis.navigator, storage: store.persistent ? globalThis.localStorage : null, unregisterServiceWorker: wipeSw.checked });
    wipeInput.value = ''; settings.reload();
    status.textContent = r.errors.length ? 'Some data could not be deleted (' + r.errors.join('; ') + '). Try again, or clear site data in your browser settings.' : `Deleted all saved progress and settings from this device${r.caches ? ', and ' + r.caches + ' offline cache' + (r.caches === 1 ? '' : 's') : ''}${r.serviceWorkers ? ', and removed the offline service worker' : ''}. Reload the page to start fresh.`;
  } }, 'Delete all my data');
  wipeInput.addEventListener('input', () => { wipeGo.disabled = !confirmMatches(wipeInput.value); });
  const geoBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
    if (!navigator.geolocation) { status.textContent = 'Location is not available on this device.'; return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { settings.set({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }); root.querySelector('#s-lat').value = settings.get('lat'); root.querySelector('#s-lon').value = settings.get('lon'); status.textContent = 'Location saved on this device only.'; },
      () => { status.textContent = 'Location permission was not granted.'; }, { timeout: 10000, maximumAge: 600000 });
  } }, t('settings.useLocation'));
  const clearBtn = h('button', { type: 'button', class: 'btn secondary', onclick: () => { settings.set({ lat: null, lon: null }); root.querySelector('#s-lat').value = ''; root.querySelector('#s-lon').value = ''; } }, t('settings.clearLocation'));
  const exportBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
    const url = URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' }));
    const a = h('a', { href: url, download: backupFileName() }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `Backup saved: ${a.getAttribute('download')} was downloaded. Keep the file somewhere safe; Restore reads it back.`;
  } }, t('settings.export'));
  const resetBtn = h('button', { type: 'button', class: 'btn secondary', onclick: () => { settings.reset(); settings.set({ onboarded: true }); mount(root, ctx); } }, t('settings.reset'));

  root.replaceChildren(h('article', { class: 'card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, t('settings.title')),
    h('p', { class: 'muted' }, 'No recorded voices exist yet: the Man/Woman choice is a saved preference. Sound currently comes from your browser\'s text-to-speech voice. See "How this works".'),
    h('fieldset', { class: 'field' }, h('legend', {}, t('settings.backup')),
      h('div', { class: 'row' }, exportBtn, h('label', { class: 'btn secondary', id: 's-import-label', for: 's-import', tabindex: '0', role: 'button',
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } } }, t('settings.import')), fileInput),
      notice, h('div', { class: 'row' }, retryBtn), restoreBox, persistLine, h('div', { class: 'row' }, persistBtn),
      store.persistent ? null : h('p', { class: 'muted' }, t('settings.persist.no'))),
    status, // right under the backup buttons so a confirmation is visible without scrolling
    radioGroup('voice', 'settings.voice'),
    radioGroup('congregation', 'settings.congregation'),
    radioGroup('goal', 'settings.goal'),
    h('div', { class: 'field' }, h('label', { class: 'opt', for: 's-bva' }, h('input', { type: 'checkbox', id: 's-bva', checked: settings.get('browserVoiceAnyway') ? true : null, onchange: (e) => settings.set({ browserVoiceAnyway: e.target.checked }) }), h('span', {}, t('settings.browserVoiceAnyway')))),
    h('div', { class: 'field' }, h('label', { class: 'opt', for: 's-israel' }, toggle, h('span', {}, t('settings.israelTrack')))),
    radioGroup('script', 'settings.script'),
    radioGroup('theme', 'settings.theme'),
    boolRow('writeGodAsGd', 'Write "G-d" in English text', 'Writes the English word in that form in titles and translation lines. Hebrew text is never changed. Off by default: it is a personal and communal custom.'),
    boolRow('haptics', 'Vibrate on exercise feedback', 'Only on devices that support it, and never when your system asks for reduced motion.'),
    boolRow('soundEffects', 'Sound effects on exercise feedback', 'No sound files ship yet; this only takes effect once the app has them.'),
    h('fieldset', { class: 'field' }, h('legend', {}, t('settings.location')),
      num('lat', t('settings.lat'), -90, 90), num('lon', t('settings.lon'), -180, 180), h('div', { class: 'row' }, geoBtn, clearBtn)),
    h('fieldset', { class: 'field' }, h('legend', {}, 'Delete all my data'),
      h('p', { id: 's-wipe-help' }, `This permanently deletes your progress, review cards, streaks and settings from this device, and the offline copies of the app. It cannot be undone, so download a backup first. Type ${CONFIRM_WORD} to enable the button.`),
      h('label', { class: 'field' }, `Type ${CONFIRM_WORD}`, wipeInput),
      h('label', { class: 'opt', for: 's-wipe-sw' }, wipeSw, h('span', {}, 'Also remove the offline service worker (the app will need a connection to load next time)')),
      h('div', { class: 'row' }, wipeGo)),
    h('fieldset', { class: 'field' }, h('legend', {}, 'Advanced'),
      boolRow('showUnapprovedImages', 'Show images that have not passed review', 'Pictures still waiting for a reviewer may be wrong or unsuitable. Leave this off unless you are reviewing them.')),
    h('div', { class: 'row' }, resetBtn, h('a', { class: 'btn secondary', href: '#/welcome' }, t('settings.redo')))));
  return () => { try { offStatus?.(); } catch { /* ignore */ } };
}
void DEFAULTS;
