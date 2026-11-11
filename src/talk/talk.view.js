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
import { translateLine } from './hybrid.js';
import { maskName, showsName } from './nmt/postedit.js';
import { sharedPack } from './nmt/client.js';
import { DIRECTIONS, DIRECTION_LABEL, megabytes, connectionKind, tooFull } from './nmt/pack.js';
import { loadJSON } from '../curriculum/data.js';

export const METHOD_LABEL = Object.freeze({
  phrase: 'A stored line',
  pattern: 'Built from a sentence pattern',
  close: 'The closest stored line',
  word: 'A single word',
  words: 'Word by word',
  model: 'Translated on this device',
});
export const NO_LINE = 'Aleph does not have that line yet. Try fewer words, or one of the lines below.';
export const HELD_LINE = 'A sacred Name is in that line. Aleph shows it as ה׳, does not speak it and does not reword it, so the line is left as it is.';
export const NAME_NOT_READ = 'This line shows the Name as ה׳, so it is not read aloud.';
export const PACK_LEAD = 'For lines Aleph has not stored, add a language pack. It translates on this device and sends nothing anywhere. A pack is a large download, so use Wi-Fi.';
export const PACK_OFFER = 'Aleph has no stored line for that. A language pack can translate it on this device: press the button below.';
export const PACK_CELLULAR = 'You seem to be on mobile data. Wait for Wi-Fi if your plan is limited.';
export const PACK_SAVER = 'Data saving is on in this browser. Wait for Wi-Fi, or turn it off for this download.';
export const PACK_FULL = 'This device reports too little free space for the pack.';
export const PACK_FAILED = 'The download stopped. What arrived is kept; press the button again to carry on.';
export const PACK_CANNOT_RUN = 'This browser could not start the language pack. Stored lines still work.';
export const ENGINE_WORDS = Object.freeze({ webgpu: 'the graphics chip', wasm: 'the processor' });
export const PACK_NONE = 'Language packs are not available on this browser. Stored lines still work.';
export const LISTEN_NOTE = 'Listening uses your browser’s own speech service. Some browsers send the sound to the browser maker to turn it into text. Aleph sends nothing anywhere and keeps only the text of your last lines on this device.';
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
.talk-pack{border:1px solid var(--border);border-radius:var(--radius,.75rem);padding:.8rem 1rem;display:flex;flex-direction:column;gap:.5rem}
.talk-pack h2{margin:0;font-size:1.05rem}
.talk-pack-row{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}
.talk-pack-row progress{flex:1 1 10rem;min-width:8rem;height:.8rem}
.talk-pack-now{display:flex;flex-direction:column;align-items:flex-start;gap:.4rem;margin-block:.5rem}
.talk-pack-now .btn{white-space:normal;text-align:start;min-block-size:44px}
.talk-pack-now progress{inline-size:100%;height:.8rem}
.talk-pack-now p{margin:0}
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
  let runSeq = 0;
  const hearing = canListen();

  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Talk');
  const helper = rimonSays('Say a short line. I will help you find it in the other language.', { action: 'wave', size: 96 });
  const hero = h('div', { class: 'alef-feature-hero talk-hero' }, medal('home', 'talk', 54), helper.el);
  const lead = h('p', {}, 'Say or type a short everyday line in English or Hebrew. Aleph shows it in the other language and can read it aloud. Stored lines for travel, shop, table and synagogue talk answer at once. With a language pack on this device, other everyday lines are translated too.');
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
  // When a line needs a language pack that is not on this device, the button to get it sits right under the answer (it used to be
  // only in the Language Packs box further down the page, so a line with no stored answer looked like a dead end).
  const packNow = /** @type {HTMLButtonElement} */ (h('button', { type: 'button', class: 'btn', hidden: true, 'data-pack-now': '', onclick: () => { const d = packNow.dataset.packNow; if (d) getPack(d); } }, 'Translate It With a Language Pack'));
  const packNowBar = /** @type {HTMLProgressElement} */ (h('progress', { max: 100, value: 0, hidden: true, 'aria-label': 'Language pack download' }));
  const packNowNote = h('p', { class: 'muted talk-small', role: 'status', 'aria-live': 'polite' });
  const packNowBox = h('div', { class: 'talk-pack-now', hidden: true }, packNow, packNowBar, packNowNote);
  const paneMe = h('div', { class: 'talk-pane talk-pane-me' }, srcEl, trEl, badge, note, packNowBox, variants, h('div', { class: 'row' }, btnSay, btnCopy), said);
  const themTr = h('div', { class: 'talk-translation' });
  const paneThem = h('div', { class: 'talk-pane talk-pane-them', hidden: true, 'aria-hidden': 'true' }, themTr);
  const face = h('div', { class: 'talk-face' }, paneThem, paneMe);

  const micEn = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', onclick: () => toggleListen('en-he') }, 'Speak English');
  const micHe = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', lang: 'he', dir: 'rtl', onclick: () => toggleListen('he-en') }, 'דַּבְּרוּ עִבְרִית');
  micHe.setAttribute('aria-label', 'דַּבְּרוּ עִבְרִית (Speak Hebrew)'); // the spoken name starts with the words on the button
  const mics = h('div', { class: 'talk-mics', hidden: !hearing }, micEn, micHe);
  const listenNote = h('p', { class: 'muted talk-small' }, hearing ? LISTEN_NOTE : NO_LISTEN);
  const err = h('p', { role: 'alert', hidden: true });

  const ta = h('textarea', { rows: 2, 'aria-label': 'Type a line in English or Hebrew', placeholder: 'Type a line…', dir: 'auto' });
  const send = h('button', { type: 'button', class: 'btn', onclick: () => run(ta.value) }, 'Translate');
  const input = h('div', { class: 'talk-input' }, ta, send);

  // Language packs: one row per direction (size, a button, progress while it downloads).
  const pack = ctx.pack || (typeof Worker === 'function' && typeof caches !== 'undefined' ? sharedPack() : null);
  /** @type {any} */ let terms = null;
  /** @type {Record<string, {row:HTMLElement, text:HTMLElement, btn:HTMLButtonElement, bar:HTMLProgressElement, busy:boolean, stop:AbortController|null, missing?:number}>} */
  const packRows = {};
  const packNote = h('p', { class: 'muted talk-small', role: 'status', 'aria-live': 'polite' });
  const packRemove = h('button', { type: 'button', class: 'btn secondary', hidden: true, onclick: removePack }, 'Remove The Packs From This Device');
  const packBox = h('section', { class: 'talk-pack', 'aria-labelledby': 'talk-pack-title', hidden: !pack }, h('h2', { id: 'talk-pack-title' }, 'Language Packs'), h('p', { class: 'talk-small' }, PACK_LEAD));
  for (const d of DIRECTIONS) {
    const text = h('span', { class: 'talk-small' }, DIRECTION_LABEL[d]);
    const btn = /** @type {HTMLButtonElement} */ (h('button', { type: 'button', class: 'btn secondary', 'data-pack': d, onclick: () => getPack(d) }, `Get ${DIRECTION_LABEL[d]}`));
    const bar = /** @type {HTMLProgressElement} */ (h('progress', { max: 100, value: 0, hidden: true, 'aria-label': `${DIRECTION_LABEL[d]} pack download` }));
    const row = h('div', { class: 'talk-pack-row' }, text, bar, btn);
    packRows[d] = { row, text, btn, bar, busy: false, stop: null };
    packBox.append(row);
  }
  const packSpeed = h('button', { type: 'button', class: 'btn secondary', hidden: true, onclick: speedCheck }, 'Check Translation Speed');
  packBox.append(packNote, h('div', { class: 'talk-pack-row' }, packSpeed, packRemove));

  const suggestTitle = h('h2', { hidden: true }, 'Lines Aleph Knows');
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
    check('talk-nikkud', 'Show Hebrew vowel marks where Aleph has them', settings.nikkud, (v) => { settings = { ...settings, nikkud: v }; }),
    h('label', { for: 'talk-speaker' }, 'Hebrew “I” forms: ', who),
    h('p', { class: 'muted talk-small' }, VOICE_KEEP));

  const histTitle = h('h2', {}, 'Your Last Lines');
  const hist = h('ul', { class: 'talk-list' });
  const clear = h('button', { type: 'button', class: 'btn secondary', onclick: () => { history = []; write(HISTORY_KEY, history); paintHistory(); } }, 'Clear These Lines');

  const tryTitle = h('h2', {}, 'Try Saying');
  const tryPick = h('select', { 'aria-label': 'Kind of line' });
  const tryList = h('ul', { class: 'talk-list' });
  tryPick.addEventListener('change', paintExamples);

  // The box to type in comes first, right under the greeting, and the answer under it: on a phone the old order put the
  // box a full screen down, below the introduction, the direction buttons and the empty answer pane.
  root.replaceChildren(h('section', { class: 'talk-screen', 'aria-labelledby': 'view-title' },
    title, hero, status, input, err, mics, listenNote, face, suggestTitle, suggest, langs, lead, packBox, toggles, tryTitle, tryPick, tryList, histTitle, hist, clear));

  function save() { write(SETTINGS_KEY, settings); }

  function paintLangs() {
    for (const b of [btnAuto, btnEn, btnHe]) b.setAttribute('aria-pressed', String(b.getAttribute('data-dir') === settings.direction));
    face.classList.toggle('is-face', settings.faceToFace);
    paneThem.hidden = !settings.faceToFace;
  }

  // A lone dictionary word is always shown with its vowel marks: without them a short spelling can read as a different word
  // (vinegar came out looking like the word for leavened food). Other lines follow the learner's setting.
  const shownHebrew = (r) => ((settings.nikkud || r.method === 'word') && r.pointed ? r.pointed : stripNikkud(r.translation));
  const setText = (el, text) => { const he = hasHebrew(text); el.textContent = text; el.dir = he ? 'rtl' : 'ltr'; el.lang = he ? 'he' : 'en'; };

  function lineButton(item, label) {
    return h('li', {}, h('button', { type: 'button', class: 'btn secondary', onclick: () => { ta.value = item.en; run(item.en, 'en-he'); title.scrollIntoView?.({ block: 'start' }); } },
      h('span', { lang: 'en' }, item.en), h('span', { lang: 'he', dir: 'rtl' }, item.he), label ? h('span', { class: 'muted talk-small' }, label) : null));
  }

  async function paintPack() {
    if (!pack) return;
    let any = false;
    for (const d of DIRECTIONS) {
      const p = packRows[d];
      if (p.busy) continue;
      try {
        const st = await pack.state(d);
        if (!alive) return;
        if (st.ready) {
          any = true; p.bar.hidden = true;
          p.btn.hidden = true;
          p.text.textContent = pack.ready(d) ? `${DIRECTION_LABEL[d]}: on this device and ready.` : `${DIRECTION_LABEL[d]}: on this device.`;
          p.row.dataset.engine = pack.engine?.(d)?.engine || ''; p.row.dataset.gpu = pack.engine?.(d)?.gpu || '';
        } else {
          p.btn.hidden = false; p.btn.disabled = false;
          const part = st.have > 0 && st.missing > 0;
          p.btn.textContent = part ? `Carry On With ${DIRECTION_LABEL[d]}` : `Get ${DIRECTION_LABEL[d]}`;
          p.text.textContent = `${DIRECTION_LABEL[d]}: about ${megabytes(st.missing)} MB to download.`;
          p.missing = st.missing;
          if (st.have > 0) any = true;
        }
      } catch { p.text.textContent = `${DIRECTION_LABEL[d]}: the pack list could not be read. Check your connection.`; p.btn.disabled = false; }
    }
    packRemove.hidden = !any;
    packSpeed.hidden = !DIRECTIONS.some((d) => pack.ready(d));
    paintPackNow();
  }

  /** The button under the answer: shown only while the line on screen needs a pack this device does not have. */
  function paintPackNow() {
    const d = last && !last.held && last.needsPack && pack ? last.needsPack : '';
    const p = d ? packRows[d] : null;
    packNowBox.hidden = !d;
    packNow.hidden = !d;
    if (!d || !p) { packNow.dataset.packNow = ''; packNowBar.hidden = true; packNowNote.textContent = ''; return; }
    packNow.dataset.packNow = d;
    if (!p.busy) {
      packNowBar.hidden = true;
      packNow.textContent = `Translate It: Get the ${DIRECTION_LABEL[d]} Pack${p.missing ? ` (About ${megabytes(p.missing)} MB, One Time)` : ''}`;
    }
  }
  /** A pack message, said in the Language Packs box and, when the line on screen is waiting for this pack, under the answer too. */
  function sayPack(d, msg) {
    packNote.textContent = msg;
    if (packNow.dataset.packNow === d) packNowNote.textContent = msg;
  }

  /** Times a few lines each way the pack can run on this device and says which one is in use. */
  async function speedCheck() {
    if (!pack) return;
    packSpeed.disabled = true; packNote.textContent = 'Timing a few lines on this device…';
    const said2 = [];
    for (const d of DIRECTIONS) {
      if (!pack.ready(d)) continue;
      try {
        const b = await pack.bench(d); const e = pack.engine(d);
        const parts = [];
        if (typeof b.webgpu === 'number') parts.push(`${b.webgpu} ms a line on ${ENGINE_WORDS.webgpu}`);
        if (typeof b.wasm === 'number') parts.push(`${b.wasm} ms a line on ${ENGINE_WORDS.wasm}`);
        said2.push(`${DIRECTION_LABEL[d]}: ${parts.join(', ')}. In use: ${ENGINE_WORDS[e?.engine] || ENGINE_WORDS.wasm}.`);
      } catch { said2.push(`${DIRECTION_LABEL[d]}: the speed check did not finish.`); }
      if (!alive) return;
    }
    packNote.textContent = said2.join(' ');
    packSpeed.disabled = false;
  }

  /** Loads the packs that are already on this device, quietly. */
  async function warmPacks() {
    if (!pack) return;
    for (const d of DIRECTIONS) {
      try { if ((await pack.state(d)).ready) { const ok = await pack.load(d); if (!alive) return; if (!ok) packNote.textContent = PACK_CANNOT_RUN; } } catch { /* no pack list while offline and nothing kept */ }
    }
    paintPack();
  }

  async function getPack(d) {
    if (!pack) return;
    const p = packRows[d];
    if (p.busy) { p.stop?.abort(); return; }
    sayPack(d, '');
    const inline = () => packNow.dataset.packNow === d; // the line on screen is waiting for this pack
    try {
      const st = await pack.state(d);
      if (await tooFull(st.missing)) { sayPack(d, PACK_FULL); return; }
      const kind = connectionKind();
      if (kind && !p.btn.dataset.asked) { p.btn.dataset.asked = '1'; sayPack(d, `${kind === 'saver' ? PACK_SAVER : PACK_CELLULAR} Press the button again to download about ${megabytes(st.missing)} MB now.`); return; }
      p.busy = true; p.stop = new AbortController();
      p.bar.hidden = false; p.bar.value = 0; p.btn.textContent = 'Stop';
      if (inline()) { packNowBar.hidden = false; packNowBar.value = 0; packNow.textContent = 'Stop'; }
      let shown = -1;
      await pack.download(d, { signal: p.stop.signal, onProgress: (have, total) => {
        if (!alive) return;
        const pct = total ? Math.floor((100 * have) / total) : 0;
        if (pct === shown) return; shown = pct;
        p.bar.value = pct; p.text.textContent = `${DIRECTION_LABEL[d]}: ${megabytes(have)} of ${megabytes(total)} MB.`;
        if (inline()) { packNowBar.hidden = false; packNowBar.value = pct; packNow.textContent = 'Stop'; packNowNote.textContent = `Getting the pack: ${megabytes(have)} of ${megabytes(total)} MB. Your line is translated as soon as it is here.`; }
      } });
      if (!alive) return;
      p.text.textContent = `${DIRECTION_LABEL[d]}: getting it ready…`;
      if (inline()) packNowNote.textContent = 'Getting the pack ready…';
      const ok = await pack.load(d);
      if (!alive) return;
      p.busy = false; p.stop = null;
      sayPack(d, ok ? `${DIRECTION_LABEL[d]} is ready. It works offline from now on.` : PACK_CANNOT_RUN);
      await paintPack();
      if (ok && last && last.needsPack === d) run(last.source, last.direction);
    } catch (e) {
      p.busy = false; p.stop = null; p.bar.hidden = true;
      if (alive) { sayPack(d, /** @type {any} */ (e)?.message === 'no-storage' ? PACK_NONE : PACK_FAILED); paintPack(); }
    }
  }

  async function removePack() {
    if (!pack) return;
    for (const d of DIRECTIONS) packRows[d].stop?.abort();
    await pack.remove();
    if (!alive) return;
    packNote.textContent = 'The packs were removed from this device.';
    paintPack();
  }

  function show(r) {
    last = r;
    setText(srcEl, r.held ? maskName(r.source) : r.source);
    srcEl.classList.remove('is-partial');
    const toHe = r.direction === 'en-he';
    const text = r.ok ? (toHe ? shownHebrew(r) : r.translation) : '';
    setText(trEl, text);
    if (r.held) trEl.textContent = '';
    setText(themTr, text);
    badge.hidden = !r.ok; badge.textContent = r.ok ? METHOD_LABEL[r.method] || '' : '';
    const offer = !r.held && r.needsPack && pack ? PACK_OFFER : '';
    const msg = r.held ? HELD_LINE : (!r.ok ? (offer || NO_LINE) : [r.note || '', offer].filter(Boolean).join(' '));
    note.hidden = !msg; note.textContent = msg;
    packNowNote.textContent = '';
    paintPackNow();
    const vs = r.ok ? (r.variants || []) : [];
    variants.hidden = !vs.length;
    variants.replaceChildren(...vs.map((v) => { const he = hasHebrew(v.text); return h('li', {}, h('span', { class: 'muted talk-small' }, `${v.label}: `), h('span', { lang: he ? 'he' : 'en', dir: he ? 'rtl' : 'ltr' }, v.text)); }));
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
    const ticket = ++runSeq;
    paneMe.setAttribute('aria-busy', 'true');
    if (pack && DIRECTIONS.some((d) => pack.ready(d))) status.textContent = 'Translating…';
    let r;
    try { r = await translateLine(engine, pack, t, { ...opts, terms }); } finally { if (ticket === runSeq) { paneMe.removeAttribute('aria-busy'); if (alive && status.textContent === 'Translating…') status.textContent = ''; } }
    if (!alive || ticket !== runSeq) return;
    if (r.method === 'model' && pack?.engine) { const row = packRows[r.direction]?.row; const e = pack.engine(r.direction); if (row && e) { row.dataset.engine = e.engine || ''; row.dataset.gpu = e.gpu || ''; } }
    if (!r.held && r.method !== 'model' && (!r.ok || r.method === 'words') && !engine.hasDictionary) {
      // the dictionary index is only fetched when a line needs it
      status.textContent = 'Looking in the dictionary…';
      await engine.loadDictionary();
      if (!alive || ticket !== runSeq) return;
      status.textContent = '';
      r = await translateLine(engine, pack, t, { ...opts, terms });
      if (!alive || ticket !== runSeq) return;
    }
    show(r);
    // the answer is under the box: bring it into view when part of it is off the screen (it does nothing when it is all in view)
    try { paneMe.scrollIntoView?.({ block: 'nearest' }); } catch { /* an old browser: the learner scrolls */ }
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
    if (showsName(r.translation) || showsName(r.source)) { if (asked) said.textContent = NAME_NOT_READ; return; }
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
    paintPack().then(warmPacks);
    loadJSON('data/talk/terms.json').then((t) => { terms = t; }).catch(() => { /* optional */ });
  }).catch(() => {
    if (alive) status.textContent = 'The stored lines could not be loaded. Check your connection once and open this screen again; after that it works offline.';
  });

  return () => {
    alive = false;
    for (const d of DIRECTIONS) packRows[d].stop?.abort(); // parts that arrived are kept; the rest waits for the next visit
    stopListening();
    stopEnglish();
    try { ctx.audio?.stop?.(); } catch { /* nothing playing */ }
  };
}
