// @ts-check
// Talk: an English <-> Hebrew conversation helper that runs entirely on this device.
// Lazy-loaded by the router at #/talk. There is no server: the sentence pairs are files of the site itself
// (src/talk/data.js), listening is the browser's own speech recognition (src/talk/speech.js) and the voice is the
// device voice. Where the browser cannot listen, typing still works, online or offline.
import { h, medal } from '../shell/ui.js';
import { rimonSays } from '../shell/rimon-inline.js';
import { speakEnglish, stopEnglish } from '../shell/speak-english.js';
import {
  hasHebrew, pushHistory, stripNikkud, uid, HISTORY_KEY, SETTINGS_KEY, loadSettings, loadHistory,
} from './talk.model.js';
import { loadEngine } from './data.js';
import { canListen, listenOnce } from './speech.js';

export const METHOD_LABEL = Object.freeze({
  phrase: 'A stored line',
  pattern: 'Built from a sentence pattern',
  close: 'The closest stored line',
  word: 'A single word',
  words: 'Word by word',
});
export const NO_LINE = 'ALEF does not have that line yet. Try fewer words, or one of the lines below.';
export const HELD_LINE = 'A sacred Name is in that line. ALEF does not speak it or reword it, so the line is left as it is.';
export const LISTEN_NOTE = 'Listening uses your browser’s own speech service. Some browsers send the sound to the browser maker to turn it into text. ALEF sends nothing anywhere and keeps only the text of your last lines on this device.';
export const NO_LISTEN = 'This browser cannot listen. Type your line instead; on most phones the keyboard has its own microphone key.';
export const DEVICE_VOICE = 'Read aloud by your device voice, not by a recorded teacher.';
export const VOICE_KEEP = 'Speaking the translation in your own voice is a future feature.';
const CAT_LABEL = { greetings: 'Greetings', politeness: 'Polite Words', language: 'Language Help', directions: 'Directions', ordering: 'Food and Drink', shopping: 'Shopping', emergencies: 'Emergencies', shul: 'Synagogue', numbers: 'Time and Questions', hotel: 'Hotel', smalltalk: 'Small Talk' };

const CSS = `
.talk-screen{display:flex;flex-direction:column;gap:.9rem;max-width:40rem;margin:0 auto}
.talk-langs{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}
.talk-langs .btn[aria-pressed="true"]{background:var(--accent);color:var(--accent-fg);font-weight:700}
.talk-face{display:flex;flex-direction:column;gap:.6rem}
.talk-pane{border:1px solid var(--border);border-radius:var(--radius,.75rem);background:var(--card);padding:1rem;display:flex;flex-direction:column;gap:.45rem;min-height:7rem}
.talk-face.is-face .talk-pane-them{transform:rotate(180deg)}
.talk-source{font-size:1.05rem;min-height:1.3em}
.talk-source.is-partial{font-style:italic}
.talk-translation{font-size:clamp(1.6rem,5vw,2.3rem);font-weight:700;line-height:1.3;min-height:1.4em}
.talk-translation[dir=rtl],.talk-source[dir=rtl]{text-align:right}
.talk-badge{font-size:.85rem;border:1px solid var(--border);border-radius:999px;padding:.1rem .6rem;align-self:flex-start}
.talk-variants{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.2rem}
.talk-mics{display:flex;gap:.6rem;flex-wrap:wrap}
.talk-mics .btn{flex:1 1 12rem;min-height:var(--tap,3rem);font-size:1.05rem}
.talk-mics .btn[aria-pressed="true"]{outline:3px solid var(--focus,currentColor);outline-offset:2px;font-weight:700}
.talk-input{display:flex;gap:.4rem;align-items:flex-end}
.talk-input textarea{flex:1;min-height:3rem;max-height:8rem;resize:vertical;font:inherit;padding:.6rem .75rem;border-radius:var(--radius,.75rem);border:1px solid var(--border);background:var(--bg);color:var(--fg)}
.talk-toggles{display:flex;flex-direction:column;gap:.4rem}
.talk-toggles label{display:flex;align-items:center;gap:.4rem}
.talk-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.4rem}
.talk-list button{width:100%;text-align:start;display:flex;flex-direction:column;gap:.15rem}
.talk-small{font-size:.85rem}
.talk-hero{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap}
.talk-hero .alef-medal{margin:0}
`;
function injectCss() {
  try {
    if (!document.head || document.getElementById('alef-talk-style')) return;
    const s = document.createElement('style'); s.id = 'alef-talk-style'; s.textContent = CSS; document.head.append(s);
  } catch { /* optional */ }
}

/**
 * @param {HTMLElement} root
 * @param {any} ctx
 */
export function mount(root, ctx = {}) {
  injectCss();
  let alive = true;
  const store = ctx.store && typeof ctx.store.get === 'function' ? ctx.store : null;
  const read = (key, fallback) => { try { return store ? store.get(key, fallback) : fallback; } catch { return fallback; } };
  const write = (key, value) => { try { store?.set(key, value); } catch { /* storage full or off: the screen still works */ } };
  let settings = loadSettings(read(SETTINGS_KEY, {}));
  let history = loadHistory(read(HISTORY_KEY, []));
  /** @type {Awaited<ReturnType<typeof loadEngine>>|null} */
  let engine = null;
  /** @type {{stop:()=>void}|null} */
  let listening = null;
  /** @type {any} */
  let last = null;
  const hearing = canListen();

  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Talk');
  const helper = rimonSays('Say a short line. I will help you find it in the other language.', { action: 'wave', size: 96 });
  const hero = h('div', { class: 'alef-feature-hero talk-hero' }, medal('home', 'talk', 54), helper.el);
  const lead = h('p', {}, 'Say or type a short everyday line in English or Hebrew. ALEF shows it in the other language and can read it aloud. It works from stored lines, so it knows travel, shop, table and synagogue talk, not every sentence.');
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' }, 'Getting the lines ready…');

  const dirBtn = (value, label, lang) => h('button', { type: 'button', class: 'btn secondary', 'data-dir': value, lang, onclick: () => { settings = { ...settings, direction: value }; save(); paintLangs(); } }, label);
  const btnAuto = dirBtn('auto', 'Either way', 'en');
  const btnEn = dirBtn('en-he', 'English to Hebrew', 'en');
  const btnHe = dirBtn('he-en', 'Hebrew to English', 'en');
  const langs = h('div', { class: 'talk-langs', role: 'group', 'aria-label': 'Which way to translate' }, btnAuto, btnEn, btnHe);

  const srcEl = h('div', { class: 'talk-source' });
  const trEl = h('div', { class: 'talk-translation', 'aria-live': 'polite' });
  const badge = h('span', { class: 'talk-badge', hidden: true });
  const note = h('p', { class: 'muted talk-small', hidden: true });
  const variants = h('ul', { class: 'talk-variants', hidden: true });
  const btnSay = h('button', { type: 'button', class: 'btn secondary', disabled: true, onclick: () => speak(true) }, 'Say It');
  const btnCopy = h('button', { type: 'button', class: 'btn secondary', disabled: true, onclick: copy }, 'Copy');
  const said = h('span', { class: 'muted talk-small', role: 'status' });
  const paneMe = h('div', { class: 'talk-pane talk-pane-me' }, srcEl, trEl, badge, note, variants, h('div', { class: 'row' }, btnSay, btnCopy), said);
  const themTr = h('div', { class: 'talk-translation' });
  const paneThem = h('div', { class: 'talk-pane talk-pane-them', hidden: true, 'aria-hidden': 'true' }, themTr);
  const face = h('div', { class: 'talk-face' }, paneThem, paneMe);

  const micEn = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', onclick: () => toggleListen('en-he') }, 'Speak English');
  const micHe = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', lang: 'he', dir: 'rtl', onclick: () => toggleListen('he-en') }, 'דַּבְּרוּ עִבְרִית');
  micHe.setAttribute('aria-label', 'Speak Hebrew');
  const mics = h('div', { class: 'talk-mics', hidden: !hearing }, micEn, micHe);
  const listenNote = h('p', { class: 'muted talk-small' }, hearing ? LISTEN_NOTE : NO_LISTEN);
  const err = h('p', { role: 'alert', hidden: true });

  const ta = h('textarea', { rows: 2, 'aria-label': 'Type a line in English or Hebrew', placeholder: 'Type a line…', dir: 'auto' });
  const send = h('button', { type: 'button', class: 'btn', onclick: () => run(ta.value) }, 'Translate');
  const input = h('div', { class: 'talk-input' }, ta, send);

  const suggestTitle = h('h2', { hidden: true }, 'Lines ALEF Knows');
  const suggest = h('ul', { class: 'talk-list', hidden: true });

  const check = (id, label, on, set) => {
    const box = h('input', { type: 'checkbox', id });
    box.checked = on;
    box.addEventListener('change', () => { set(box.checked); save(); paintLangs(); if (last) show(last); });
    return h('label', { for: id }, box, label);
  };
  const who = h('select', { id: 'talk-speaker', 'aria-label': 'Who is speaking Hebrew' },
    h('option', { value: '' }, 'Show both forms'), h('option', { value: 'm' }, 'A man is speaking'), h('option', { value: 'f' }, 'A woman is speaking'));
  who.value = settings.speaker;
  who.addEventListener('change', () => { settings = { ...settings, speaker: /** @type {any} */ (who.value) }; save(); if (last) run(last.source, last.direction); });
  const toggles = h('div', { class: 'talk-toggles' },
    check('talk-speak', 'Read each translation aloud', settings.autoSpeak, (v) => { settings = { ...settings, autoSpeak: v }; }),
    check('talk-face', 'Show it upside down for the person facing me', settings.faceToFace, (v) => { settings = { ...settings, faceToFace: v }; }),
    check('talk-nikkud', 'Show Hebrew vowel marks where ALEF has them', settings.nikkud, (v) => { settings = { ...settings, nikkud: v }; }),
    h('label', { for: 'talk-speaker' }, 'Hebrew “I” forms: ', who),
    h('p', { class: 'muted talk-small' }, VOICE_KEEP));

  const histTitle = h('h2', {}, 'Your Last Lines');
  const hist = h('ul', { class: 'talk-list' });
  const clear = h('button', { type: 'button', class: 'btn secondary', onclick: () => { history = []; write(HISTORY_KEY, history); paintHistory(); } }, 'Clear These Lines');

  const tryTitle = h('h2', {}, 'Try Saying');
  const tryPick = h('select', { 'aria-label': 'Kind of line' });
  const tryList = h('ul', { class: 'talk-list' });
  tryPick.addEventListener('change', paintExamples);

  root.replaceChildren(h('section', { class: 'talk-screen', 'aria-labelledby': 'view-title' },
    title, hero, lead, status, langs, face, mics, err, input, listenNote, suggestTitle, suggest, toggles, tryTitle, tryPick, tryList, histTitle, hist, clear));

  function save() { write(SETTINGS_KEY, settings); }

  function paintLangs() {
    for (const b of [btnAuto, btnEn, btnHe]) b.setAttribute('aria-pressed', String(b.getAttribute('data-dir') === settings.direction));
    face.classList.toggle('is-face', settings.faceToFace);
    paneThem.hidden = !settings.faceToFace;
  }

  const shownHebrew = (r) => (settings.nikkud && r.pointed ? r.pointed : stripNikkud(r.translation));
  const setText = (el, text) => { const he = hasHebrew(text); el.textContent = text; el.dir = he ? 'rtl' : 'ltr'; el.lang = he ? 'he' : 'en'; };

  function lineButton(item, label) {
    return h('li', {}, h('button', { type: 'button', class: 'btn secondary', onclick: () => { ta.value = item.en; run(item.en, 'en-he'); title.scrollIntoView?.({ block: 'start' }); } },
      h('span', { lang: 'en' }, item.en), h('span', { lang: 'he', dir: 'rtl' }, item.he), label ? h('span', { class: 'muted talk-small' }, label) : null));
  }

  function show(r) {
    last = r;
    setText(srcEl, r.source);
    srcEl.classList.remove('is-partial');
    const toHe = r.direction === 'en-he';
    const text = r.ok ? (toHe ? shownHebrew(r) : r.translation) : '';
    setText(trEl, text);
    if (r.held) trEl.textContent = '';
    setText(themTr, text);
    badge.hidden = !r.ok; badge.textContent = r.ok ? METHOD_LABEL[r.method] || '' : '';
    const msg = r.held ? HELD_LINE : (!r.ok ? NO_LINE : (r.note || ''));
    note.hidden = !msg; note.textContent = msg;
    const vs = r.ok ? (r.variants || []) : [];
    variants.hidden = !vs.length;
    variants.replaceChildren(...vs.map((v) => h('li', {}, h('span', { class: 'muted talk-small' }, `${v.label}: `), h('span', { lang: 'he', dir: 'rtl' }, v.text))));
    btnSay.disabled = !r.ok; btnCopy.disabled = !r.ok;
    said.textContent = '';
    const sug = !r.ok && !r.held ? (r.suggestions || []) : [];
    suggestTitle.hidden = !sug.length; suggest.hidden = !sug.length;
    suggest.replaceChildren(...sug.map((s) => lineButton(s)));
  }

  async function run(text, forced) {
    const t = String(text || '').trim();
    if (!t || !engine) return;
    err.hidden = true;
    const opts = { direction: forced || settings.direction, speaker: settings.speaker };
    let r = engine.translate(t, opts);
    if (!r.held && (!r.ok || r.method === 'words') && !engine.hasDictionary) {
      // the dictionary index is only fetched when a line needs it
      status.textContent = 'Looking in the dictionary…';
      await engine.loadDictionary();
      if (!alive) return;
      status.textContent = '';
      r = engine.translate(t, opts);
    }
    show(r);
    if (r.ok) {
      history = pushHistory(history, { id: uid(), ts: Date.now(), direction: r.direction, source: r.source, translation: r.translation });
      write(HISTORY_KEY, history);
      paintHistory();
      if (settings.autoSpeak) speak(false);
    }
  }

  async function speak(asked) {
    const r = last;
    if (!r || !r.ok) return;
    said.textContent = '';
    try {
      if (r.direction === 'en-he') {
        stopEnglish();
        if (!ctx.audio || typeof ctx.audio.play !== 'function') { if (asked) said.textContent = 'No Hebrew voice is available on this device.'; return; }
        const voice = ctx.settings?.get?.('voice');
        const res = await ctx.audio.play('line', 'talk-device-voice', { text: stripNikkud(r.translation), tradition: 'israeli', voice, allowMismatchedTts: true });
        if (!alive) return;
        said.textContent = res && res.source === 'tts-fallback' ? DEVICE_VOICE : (asked ? 'No Hebrew voice is available on this device.' : '');
      } else {
        const ok = await speakEnglish(r.translation);
        if (!alive) return;
        said.textContent = ok ? DEVICE_VOICE : (asked ? 'No English voice is available on this device.' : '');
      }
    } catch { if (alive && asked) said.textContent = 'The device voice did not start.'; }
  }

  async function copy() {
    const text = trEl.textContent || '';
    try { await navigator.clipboard.writeText(text); said.textContent = 'Copied.'; } catch { said.textContent = 'Copying is not available here. Select the text instead.'; }
  }

  function stopListening() {
    try { listening?.stop(); } catch { /* ended */ }
    listening = null;
    micEn.setAttribute('aria-pressed', 'false'); micHe.setAttribute('aria-pressed', 'false');
    micEn.textContent = 'Speak English'; micHe.textContent = 'דַּבְּרוּ עִבְרִית';
  }

  function toggleListen(direction) {
    if (listening) { stopListening(); return; }
    if (!engine) return;
    err.hidden = true;
    stopEnglish();
    try { ctx.audio?.stop?.(); } catch { /* nothing playing */ }
    const btn = direction === 'en-he' ? micEn : micHe;
    const got = listenOnce({
      direction,
      onPartial: (t) => { if (!alive) return; setText(srcEl, t); srcEl.classList.add('is-partial'); trEl.textContent = ''; },
      onFinal: (t) => { if (alive) { ta.value = t; run(t, direction); } },
      onError: (message) => { if (alive) { err.hidden = false; err.textContent = message; } },
      onEnd: () => { if (alive) stopListening(); },
    });
    if (!got) { err.hidden = false; err.textContent = NO_LISTEN; return; }
    listening = got;
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = direction === 'en-he' ? 'Listening… Tap to Stop' : 'מַקְשִׁיבִים…';
  }

  function paintHistory() {
    histTitle.hidden = clear.hidden = hist.hidden = !history.length;
    hist.replaceChildren(...history.slice(0, 20).map((item) => {
      const s = h('span', {}, item.source); const t = h('span', {}, item.translation);
      for (const el of [s, t]) { const he = hasHebrew(el.textContent || ''); el.dir = he ? 'rtl' : 'ltr'; el.lang = he ? 'he' : 'en'; }
      return h('li', {}, h('button', { type: 'button', class: 'btn secondary', onclick: () => { ta.value = item.source; run(item.source, item.direction); } }, s, t));
    }));
  }

  function paintExamples() {
    if (!engine) return;
    tryList.replaceChildren(...engine.examples(tryPick.value, 8).map((x) => lineButton(x)));
  }

  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(ta.value); } });
  paintLangs();
  paintHistory();
  try { title.focus(); } catch { /* not focusable in a test double */ }

  loadEngine().then((e) => {
    if (!alive) return;
    engine = e;
    status.textContent = '';
    tryPick.replaceChildren(...e.categories().map((c) => h('option', { value: c }, CAT_LABEL[c] || c)));
    paintExamples();
  }).catch(() => {
    if (alive) status.textContent = 'The stored lines could not be loaded. Check your connection once and open this screen again; after that it works offline.';
  });

  return () => {
    alive = false;
    stopListening();
    stopEnglish();
    try { ctx.audio?.stop?.(); } catch { /* nothing playing */ }
  };
}
