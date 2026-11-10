import { plain } from './plain-copy.js';
import { h } from './ui.js';
import { ENUMS, DEFAULTS } from './settings.js';
import { AUDIO_FREE_LABEL, AUDIO_FREE_HELP } from './audiofree.js';
import { requestPersistence, storageStatus } from './backup.js';
import { REMINDER_KEY, afterExport, completedCount } from './backup-reminder.js';
import { describePreview, storageNotice, wipeAllData, confirmMatches, CONFIRM_WORD, backupFileName } from './settings.data.js';

export function mount(root, ctx) {
  const { settings, store, t } = ctx;
  // Every change says it saved, in the one status line: a silent save reads
  // as a broken page to a beginner (usability review, U-20). `status` is
  // defined below, before any of these handlers can fire.
  const VOICE_SAY = { m: 'Ari (the man’s voice)', f: 'Noa (the woman’s voice)' };
  const STYLE_SAY = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };
  const savedAbout = (key, value) => {
    if (key === 'voice') status.textContent = `Saved ✓ You’ll hear ${VOICE_SAY[value] || 'your chosen voice'} where clips exist.`;
    else if (key === 'congregation') status.textContent = `Saved ✓ ${STYLE_SAY[value] || value} style, where clips exist.`;
    else if (key === 'veilOptOut') status.textContent = value ? 'Saved ✓ The opening prayer will not show again. You can turn it back on here any time.' : 'Saved ✓ The opening prayer will show again when you open ALEF.';
    else if (key === 'gender') status.textContent = 'Saved ✓ Hebrew forms will use your choice.';
    else status.textContent = 'Saved ✓';
  };
  const radioGroup = (key, legendKey) => {
    const fs = h('fieldset', { class: 'field' }, h('legend', {}, t(legendKey)));
    for (const v of ENUMS[key]) {
      const id = `s-${key}-${v}`;
      const input = h('input', { type: 'radio', name: key, id, value: v, checked: settings.get(key) === v ? true : null,
        onchange: () => { settings.set({ [key]: v }); savedAbout(key, v); } });
      fs.append(h('label', { class: 'opt', for: id }, input, h('span', {}, t(`${legendKey}.${v}`))));
    }
    return fs;
  };
  // Learner gender: one shared value for every page that shows first-person Hebrew forms. Not chosen is the default and is never read as masculine.
  const genderRow = () => {
    const fs = h('fieldset', { class: 'field', id: 's-gender-set' }, h('legend', {}, 'My gender, for Hebrew forms'));
    for (const [v, label] of [[null, 'Not chosen yet'], ['m', 'I am a man'], ['f', 'I am a woman'], ['both', 'Show me both forms']]) {
      const id = `s-gender-${v ?? 'unset'}`;
      fs.append(h('label', { class: 'opt', for: id }, h('input', { type: 'radio', name: 'gender', id, value: v ?? '', checked: settings.get('gender') === v ? true : null, onchange: () => { settings.set({ gender: v }); savedAbout('gender', v); } }), h('span', {}, label)));
    }
    fs.append(h('p', { class: 'muted', id: 's-gender-help' }, 'Hebrew words change with the speaker\'s gender. "I am a student" is different for a man and a woman. The gender drill and the "Sound like a local" pages use this choice, so you only say it once. Until you choose, pages show both forms or ask you. ALEF never assumes masculine. The choice stays on this device and is included in your backup.'));
    return fs;
  };
  // one checkbox row per boolean setting (plain English labels; the i18n table is owned by another lane)
  const boolRow = (key, label, help) => h('div', { class: 'field' },
    h('label', { class: 'opt', for: 's-' + key }, h('input', { type: 'checkbox', id: 's-' + key, checked: settings.get(key) ? true : null, onchange: (e) => { settings.set({ [key]: e.target.checked }); savedAbout(key, e.target.checked); } }), h('span', {}, label)),
    help ? h('p', { class: 'muted' }, help) : null);
  const toggle = h('input', { type: 'checkbox', id: 's-israel', checked: settings.get('israelTrack') ? true : null,
    onchange: (e) => { settings.set({ israelTrack: e.target.checked }); savedAbout('israelTrack', e.target.checked); } });
  const num = (key, label, min, max) => h('label', { class: 'field' }, label,
    h('input', { type: 'number', step: 'any', min, max, inputmode: 'decimal', value: settings.get(key) ?? '', id: 's-' + key,
      onchange: (e) => { const raw = e.target.value.trim(); const v = raw === '' ? null : Number(raw);
        if (settings.set({ [key]: v }).length) e.target.setAttribute('aria-invalid', 'true'); else { e.target.removeAttribute('aria-invalid'); savedAbout(key, v); } } }));
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted' });
  // Restore is a two-step action: choosing a file only inspects it (nothing changes), then the learner confirms the replacement.
  const restoreBox = h('div', { class: 'field', role: 'group', 'aria-label': 'Restore confirmation', hidden: true });
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', id: 's-import', class: 'visually-hidden', tabindex: '-1', 'aria-label': t('settings.import'),
    onchange: async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      let text = ''; try { text = await f.text(); } catch { text = ''; }
      e.target.value = '';
      const info = store.previewImport(text, { mode: 'replace' });
      if (!info.ok) { restoreBox.hidden = true; status.textContent = 'Could not restore: ' + info.error + '. Your progress on this device was not changed.'; return; }
      const go = h('button', { type: 'button', class: 'btn', onclick: () => {
        const res = store.importData(text, { mode: 'replace' });
        restoreBox.hidden = true; restoreBox.replaceChildren();
        if (res.ok) { settings.reload(); status.textContent = `Restored ${res.imported} saved items from the backup. Reload the page to see everything refreshed.`; } else status.textContent = restoreFailureMessage(res);
        root.querySelector('#s-import-label')?.focus();
      } }, 'Replace my progress with this backup');
      const cancel = h('button', { type: 'button', class: 'btn secondary', onclick: () => { restoreBox.hidden = true; restoreBox.replaceChildren(); status.textContent = 'Restore cancelled. Nothing was changed.'; root.querySelector('#s-import-label')?.focus(); } }, 'Cancel');
      restoreBox.replaceChildren(h('p', {}, 'Preview. Nothing has changed yet.'), ...describePreview(info).map((l) => h('p', {}, l)), h('p', {}, plain('restoreWarn')), h('div', { class: 'row' }, go, cancel));
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
    persistLine.textContent = !s.supported ? plain('persistNo')
      : s.persisted ? plain('persistYes')
      : plain('persistMaybe');
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
    const r = await wipeAllData({ store, caches: globalThis.caches, navigator: globalThis.navigator, storage: (() => { try { return globalThis.localStorage; } catch { return null; } })(), unregisterServiceWorker: wipeSw.checked });
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
  const clearBtn = h('button', { type: 'button', class: 'btn secondary', onclick: () => { settings.set({ lat: null, lon: null }); root.querySelector('#s-lat').value = ''; root.querySelector('#s-lon').value = ''; status.textContent = 'Saved ✓ Location cleared.'; } }, t('settings.clearLocation'));
  const exportBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
    const url = URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' }));
    const a = h('a', { href: url, download: backupFileName() }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `Backup file downloaded: ${a.getAttribute('download')}. This copy is only as safe as where you keep it; Restore reads it back. ALEF does not make backups by itself.`;
    // the Home reminder counts from here (backup.reminder.v1); only a downloaded file counts, never anything automatic
    try { store.set(REMINDER_KEY, afterExport(store.get(REMINDER_KEY), completedCount(store.get('curriculum.progress')))); } catch { /* best effort */ }
  } }, t('settings.export'));
  // Reset settings changes many choices at once, so it asks first (a slipped tap should not undo a person's set-up)
  const resetAsk = h('div', { class: 'row', role: 'group', 'aria-label': 'Confirm reset', hidden: true });
  const resetBtn = h('button', { type: 'button', class: 'btn secondary', 'aria-controls': 's-reset-ask', onclick: () => { resetAsk.hidden = false; resetBtn.hidden = true; resetAsk.querySelector('button.secondary')?.focus(); } }, t('settings.reset'));
  resetAsk.id = 's-reset-ask';
  resetAsk.append(h('p', { class: 'muted' }, 'This puts every setting back to how it started. Your progress is not deleted.'),
    h('button', { type: 'button', class: 'btn secondary', onclick: () => { resetAsk.hidden = true; resetBtn.hidden = false; resetBtn.focus(); } }, 'Keep my settings'),
    h('button', { type: 'button', class: 'btn', onclick: () => { settings.reset(); settings.set({ onboarded: true }); mount(root, ctx); } }, 'Yes, reset settings'));

  // Progressive disclosure: a closed group shows its name and one short line. Controls inside keep their ids whether or not the group is open.
  const group = (id, title, hint, kids) => h('details', { class: 'card s-group', id: 's-g-' + id },
    h('summary', {}, h('strong', {}, title), ' ', h('span', { class: 'muted' }, hint)), ...kids.filter(Boolean));
  const labelled = (key, legend, labels) => {
    const fs = h('fieldset', { class: 'field', id: 's-set-' + key }, h('legend', {}, legend));
    for (const v of ENUMS[key]) {
      const id = `s-${key}-${v}`;
      fs.append(h('label', { class: 'opt', for: id }, h('input', { type: 'radio', name: key, id, value: v, checked: settings.get(key) === v ? true : null, onchange: () => { settings.set({ [key]: v }); savedAbout(key, v); } }), h('span', {}, labels[v])));
    }
    return fs;
  };
  const calmRows = () => [
    boolRow('calmMode', 'Calm mode', 'Turns off movement, sound effects and vibration. Hides streaks, timers and countdowns. Shows one thing at a time. Your device\'s "reduce motion" choice is always followed, with or without this.'),
    boolRow('shortSession', 'Short sessions', 'Lessons come in small parts. Your place is saved after each part, so you can stop and come back to the same spot.'),
    boolRow('showStreak', 'Show my streak', 'Turn this off to hide streak lines. Missing a day never removes lessons or review cards.'),
    boolRow('haptics', 'Vibrate on answers', 'Only on devices that can vibrate. Always off in calm mode.'),
    boolRow('soundEffects', 'Sound effects on answers', 'Short sounds on answers and in games. Always off in calm mode.')];
  const readRows = () => [
    h('p', { class: 'muted' }, 'Changes apply at once. These use fonts already on your device. We have not tested them with groups of readers, so try them and keep what feels easy for you.'),
    labelled('readFont', 'Font', { default: 'Standard', clear: 'System font (Verdana or similar)' }),
    labelled('textSize', 'Text size', { normal: 'Normal', large: 'Large', larger: 'Larger', largest: 'Largest' }),
    labelled('lineSpacing', 'Space between lines', { normal: 'Normal', relaxed: 'More', wide: 'Most' }),
    labelled('letterSpacing', 'Space between letters (not used for Hebrew)', { normal: 'Normal', wide: 'More', wider: 'Most' }),
    labelled('lineLength', 'Line length', { normal: 'Normal', narrow: 'Short lines' })];
  root.replaceChildren(h('article', { class: 'card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, t('settings.title')),
    h('p', {}, h('a', { href: '#/accessibility', id: 's-a11y-link' }, 'Accessibility: text, sound, colour, touch and calm settings'), ' · ', h('a', { href: '#/shop' }, 'Streak, hearts and reminders'), ' · ', h('a', { href: '#/help', id: 's-help-link' }, 'Help: how ALEF works, in plain words')),
    h('p', { class: 'muted' }, plain('settingsIntro')),
    // The sound statement and the "what is ready" list live on About (one place for notes about the app), linked here.
    h('p', { class: 'small muted' }, 'About the voices and what is still being built: ', h('a', { href: '#/about' }, 'About ALEF'), '.'),
    h('p', { class: 'small muted' }, h('a', { href: '#/privacy', id: 's-privacy-link' }, 'Privacy'), ' · ', h('a', { href: '#/terms', id: 's-terms-link' }, 'Terms & sources'), '.'),
    status, // right under the backup buttons so a confirmation is visible without scrolling
    radioGroup('voice', 'settings.voice'),
    h('div', { class: 'teacher-row', id: 's-teachers' },
      h('figure', { class: 'teacher' }, ctx.img?.(h, { kind: 'id', id: 'CHAR_noa_listen', width: 300, class: 'teacher-pic' }) ?? null, h('figcaption', {}, 'Noa — the woman’s voice')),
      h('figure', { class: 'teacher' }, ctx.img?.(h, { kind: 'id', id: 'CHAR_ari_listen', width: 300, class: 'teacher-pic' }) ?? null, h('figcaption', {}, 'Ari — the man’s voice'))),
    h('p', { class: 'muted', id: 's-pron-help' }, 'Pronunciation style is the way Hebrew sounds are said. It changes the sounds you hear and read. Pick the one your synagogue or teacher uses.'),
    radioGroup('congregation', 'settings.congregation'),
    radioGroup('goal', 'settings.goal'),
    // Progressive disclosure: only the three basic choices are open. Each group below opens on its own, so no screen shows a long list at once.
    group('calm', 'Calm and quiet', 'Less movement, no sounds, no timers, one thing at a time', calmRows()),
    group('read', 'Reading comfort', 'Text size, spacing and font', readRows()),
    group('audio', 'Sound', 'For learners who do not use audio', [boolRow('audioFree', AUDIO_FREE_LABEL, AUDIO_FREE_HELP)]),
    group('listen', 'Listen and repeat', 'Slow speed and a pause to say it yourself', [
    h('p', { class: 'muted' }, 'Slow keeps the same voice at 0.7 of the speed, so you can hear each sound. Echo plays a letter, sound or word, plays it again slowly, then stays quiet for a moment so you can say it back before moving on.'),
    labelled('clipRate', 'Speed', { normal: 'Normal', slow: 'Slow (0.7×)' }),
    boolRow('echoMode', 'Echo: hear it, hear it slowly, say it', 'After a letter, vowel, syllable or word plays, it plays again slowly and then leaves a silent turn for you. Lines and prayers play once as usual.'),
    ]),
    group('look', 'Look and sound', 'Colours, Hebrew letter style and voice', [
    radioGroup('script', 'settings.script'),
    radioGroup('theme', 'settings.theme'),
    h('div', { class: 'field' }, h('label', { class: 'opt', for: 's-bva' }, h('input', { type: 'checkbox', id: 's-bva', checked: settings.get('browserVoiceAnyway') ? true : null, onchange: (e) => { settings.set({ browserVoiceAnyway: e.target.checked }); savedAbout('browserVoiceAnyway', e.target.checked); } }), h('span', {}, t('settings.browserVoiceAnyway')))),
    ]),
    group('opening', 'Opening prayer', 'The short blessing shown when ALEF opens', [
    boolRow('veilOptOut', 'Don’t show the opening prayer', 'The blessing screen has its own “Don’t show again” button; this is the same switch. Untick it to bring the blessing back.'),
    ]),
    group('forms', 'Hebrew forms and names', 'Your gender for Hebrew forms and the English divine name', [
    genderRow(),
    h('div', { class: 'field' }, h('label', { class: 'opt', for: 's-israel' }, toggle, h('span', {}, t('settings.israelTrack')))),
    boolRow('writeGodAsGd', 'Write "G-d" in English text', 'Writes the English word in that form in titles and translation lines. Hebrew text is never changed. Off by default: it is a personal and communal custom.'),
    ]),
    group('place', 'Place (for candle times)', 'Optional', [
    h('fieldset', { class: 'field' }, h('legend', {}, t('settings.location')),
      num('lat', t('settings.lat'), -90, 90), num('lon', t('settings.lon'), -180, 180), h('div', { class: 'row' }, geoBtn, clearBtn)),
    ]),
    group('data', 'Back up, restore or delete', 'Your progress stays on this device', [
    h('fieldset', { class: 'field' }, h('legend', {}, t('settings.backup')),
      h('div', { class: 'row' }, exportBtn, h('button', { type: 'button', class: 'btn secondary', id: 's-import-label', 'aria-controls': 's-import', onclick: () => fileInput.click() }, t('settings.import')), fileInput),
      notice, h('div', { class: 'row' }, retryBtn), restoreBox, persistLine, h('div', { class: 'row' }, persistBtn),
      store.persistent ? null : h('p', { class: 'muted' }, t('settings.persist.no'))),
    h('fieldset', { class: 'field' }, h('legend', {}, 'Delete all my data'),
      h('p', { id: 's-wipe-help' }, plain('wipeHelp', { word: CONFIRM_WORD })),
      h('label', { class: 'field' }, `Type ${CONFIRM_WORD}`, wipeInput),
      h('label', { class: 'opt', for: 's-wipe-sw' }, wipeSw, h('span', {}, 'Also remove the offline copy of the app (ALEF will need a connection to open next time)')),
      h('div', { class: 'row' }, wipeGo)),
    ]),
    group('adv', 'Advanced', 'More options', [
    h('fieldset', { class: 'field' }, h('legend', {}, 'Advanced'),
      boolRow('showUnapprovedImages', 'Show images that have not passed review', 'Pictures still waiting for a reviewer may be wrong or unsuitable. Leave this off unless you are reviewing them.')),
    ]),
    h('div', { class: 'row' }, resetBtn, resetAsk, h('a', { class: 'btn secondary', href: '#/welcome' }, t('settings.redo')))));
  return () => { try { offStatus?.(); } catch { /* ignore */ } };
}
void DEFAULTS;

/** What to tell the learner when a restore fails. When the stored copy could not be put back, do not claim nothing changed. */
export function restoreFailureMessage(result) {
  return result.recoveryRequired
    ? 'Could not restore or recover the saved copy on this device. Your previous progress is available only in this open app. Download a backup now, before closing or reloading; some saved data may have changed.'
    : 'Could not restore: ' + String(result.error || '').replace(/\.$/, '') + '. Your progress on this device was not changed.';
}
