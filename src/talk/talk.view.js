// @ts-check
// Talk: live English <-> Hebrew conversation, modelled on Google Translate Conversation.
// Lazy-loaded by the router at #/talk. No backend URL => graceful offline message.
import { h } from '../shell/ui.js';
import {
  detectDirection, hasHebrew, holdsDivineName, pushHistory, resolveBackendUrl,
  stripNikkud, swapDirection, uid, HISTORY_KEY, SETTINGS_KEY, URL_KEY, loadSettings,
} from './talk.model.js';

const LANG = { en: 'English', he: 'עברית' };

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / private mode */ }
}

function backendUrlFromPage() {
  const q = new URLSearchParams(location.hash.split('?')[1] || location.search || '');
  const meta = document.querySelector('meta[name="alef-translator-url"]');
  return resolveBackendUrl({
    queryUrl: q.get('translator') || q.get('backend') || '',
    storageUrl: (() => { try { return localStorage.getItem(URL_KEY) || ''; } catch { return ''; } })(),
    metaUrl: meta?.getAttribute('content') || '',
    envUrl: (typeof window !== 'undefined' && window.ALEF_TRANSLATOR_URL) || '',
  });
}

function injectCss(id, css) {
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.append(el);
}

const CSS = `
.talk-screen{display:flex;flex-direction:column;gap:.75rem;max-width:40rem;margin:0 auto;padding:0 0 6rem}
.talk-banner{background:#3b1f08;color:#fff8e8;border-radius:.75rem;padding:.75rem 1rem;font-size:.95rem}
.talk-banner a{color:#ffd978}
.talk-langs{display:flex;align-items:center;justify-content:space-between;gap:.5rem;background:var(--card,#fff8e8);border:1px solid color-mix(in srgb, currentColor 15%, transparent);border-radius:1.25rem;padding:.35rem .5rem}
.talk-langs button,.talk-langs .talk-lang{appearance:none;border:0;background:transparent;font:inherit;padding:.45rem .8rem;border-radius:999px;cursor:pointer}
.talk-langs .is-on{background:#1a73e8;color:#fff;font-weight:700}
.talk-swap{width:2.5rem;height:2.5rem;border-radius:50%;background:#eef3fc;font-size:1.1rem}
.talk-face{display:grid;grid-template-rows:1fr auto 1fr;min-height:22rem;gap:.5rem}
.talk-face.is-face .talk-pane-them{transform:rotate(180deg)}
.talk-pane{background:var(--card,#fff8e8);border-radius:1rem;padding:1rem 1.1rem;min-height:8rem;display:flex;flex-direction:column;gap:.4rem;position:relative}
.talk-pane-label{font-size:.8rem;letter-spacing:.04em;text-transform:uppercase;opacity:.7}
.talk-source{font-size:1.05rem;opacity:.85;min-height:1.3em}
.talk-source.is-partial{opacity:.55;font-style:italic}
.talk-translation{font-size:clamp(1.6rem,5vw,2.4rem);font-weight:700;line-height:1.25;min-height:1.4em}
.talk-translation[dir=rtl],.talk-source[dir=rtl]{text-align:right}
.talk-actions{display:flex;gap:.35rem;flex-wrap:wrap}
.talk-actions button{appearance:none;border:0;background:#f1f3f4;border-radius:999px;padding:.35rem .7rem;font:inherit;cursor:pointer}
.talk-micwrap{display:flex;flex-direction:column;align-items:center;gap:.35rem}
.talk-mic{width:5.5rem;height:5.5rem;border-radius:50%;border:0;background:#1a73e8;color:#fff;font-size:2rem;cursor:pointer;box-shadow:0 8px 24px rgba(26,115,232,.35)}
.talk-mic:focus-visible{outline:3px solid #ffd978;outline-offset:3px}
.talk-mic.is-rec{background:#c5221f;animation:talk-pulse 1.1s ease-in-out infinite}
@keyframes talk-pulse{50%{transform:scale(1.06)}}
.talk-hint{font-size:.9rem;opacity:.75}
.talk-input{display:flex;gap:.4rem}
.talk-input textarea{flex:1;min-height:2.6rem;max-height:8rem;resize:vertical;font:inherit;padding:.6rem .75rem;border-radius:.75rem;border:1px solid color-mix(in srgb, currentColor 20%, transparent);background:transparent}
.talk-input button{appearance:none;border:0;background:#1a73e8;color:#fff;border-radius:.75rem;padding:.6rem .9rem;font:inherit;cursor:pointer}
.talk-toggles{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.talk-toggles label{display:flex;align-items:center;gap:.3rem;font-size:.95rem}
.talk-held{background:#3b1f08;color:#fff8e8;border-radius:.75rem;padding:.6rem .8rem}
.talk-history{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.5rem}
.talk-history li{background:var(--card,#fff8e8);border-radius:.75rem;padding:.65rem .8rem}
.talk-history .h-src{opacity:.75;font-size:.9rem}
.talk-history .h-tr{font-weight:650}
.talk-err{color:#8b1a12}
`;

/**
 * @param {HTMLElement} root
 * @param {any} ctx
 */
export function mount(root, ctx) {
  injectCss('talk-css', CSS);
  let alive = true;
  let direction = 'auto'; // auto | en-he | he-en
  let faceToFace = false;
  let nikkud = false;
  let voiceKeep = false;
  let autoSpeak = true;
  const saved = storageGet(SETTINGS_KEY, {});
  if (saved && typeof saved === 'object') {
    if (saved.direction) direction = saved.direction;
    faceToFace = !!saved.faceToFace;
    nikkud = !!saved.nikkud;
    voiceKeep = saved.voiceKeep === true;
    if (typeof saved.autoSpeak === 'boolean') autoSpeak = saved.autoSpeak;
  }
  /** @type {any[]} */
  let history = storageGet(HISTORY_KEY, []) || [];
  let recording = false;
  /** @type {MediaRecorder | null} */
  let rec = null;
  /** @type {Blob[]} */
  let chunks = [];
  /** @type {MediaStream | null} */
  let stream = null;
  /** @type {any} */
  let recognition = null;
  let partial = '';
  let lastAudioUrl = '';
  let inFlight = false;

  const backend = backendUrlFromPage();
  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Talk');
  const lead = h('p', { class: 'muted' }, 'Speak English or Hebrew. The other language appears large and is read aloud, like a conversation translator.');
  const banner = h('div', { class: 'talk-banner', hidden: !!backend, role: 'status' },
    'Talk needs a translator service. It is not connected on this device, so speech and photo translation cannot run yet. You can still open the screen and type a note, but nothing will be translated until the service address is set.');
  const err = h('p', { class: 'talk-err', role: 'alert', hidden: true });
  const held = h('div', { class: 'talk-held', hidden: true, role: 'status' },
    'A sacred Name was in that text. ALEF will not speak or rewrite it. That line is held.');

  const btnEn = h('button', { type: 'button', class: 'talk-lang' }, LANG.en);
  const btnAuto = h('button', { type: 'button', class: 'talk-lang' }, 'Auto');
  const btnHe = h('button', { type: 'button', class: 'talk-lang' }, LANG.he);
  const btnSwap = h('button', { type: 'button', class: 'talk-swap', 'aria-label': 'Swap languages' }, '⇄');
  const langs = h('div', { class: 'talk-langs', role: 'toolbar', 'aria-label': 'Languages' }, btnEn, btnAuto, btnSwap, btnHe);

  const srcEl = h('div', { class: 'talk-source', 'aria-live': 'polite' });
  const trEl = h('div', { class: 'talk-translation', 'aria-live': 'assertive' });
  const srcThem = h('div', { class: 'talk-source' });
  const trThem = h('div', { class: 'talk-translation' });
  const paneMe = h('div', { class: 'talk-pane talk-pane-me' },
    h('div', { class: 'talk-pane-label', id: 'talk-me-label' }, 'You'),
    srcEl, trEl,
    h('div', { class: 'talk-actions' },
      h('button', { type: 'button', 'data-act': 'copy' }, 'Copy'),
      h('button', { type: 'button', 'data-act': 'replay' }, 'Replay')));
  const paneThem = h('div', { class: 'talk-pane talk-pane-them' },
    h('div', { class: 'talk-pane-label' }, 'Across the table'),
    srcThem, trThem);
  const mic = h('button', { type: 'button', class: 'talk-mic', 'aria-pressed': 'false', 'aria-label': 'Hold to talk' }, '🎤');
  const hint = h('div', { class: 'talk-hint' }, backend ? 'Tap the microphone, speak, then tap again to translate.' : 'The microphone waits until a translator service is connected.');
  const micwrap = h('div', { class: 'talk-micwrap' }, mic, hint);
  const face = h('div', { class: 'talk-face' }, paneMe, micwrap, paneThem);

  const ta = h('textarea', { rows: 1, placeholder: 'Or type here…', 'aria-label': 'Text to translate' });
  const send = h('button', { type: 'button' }, 'Translate');
  const input = h('div', { class: 'talk-input' }, ta, send);

  const togFace = h('input', { type: 'checkbox', id: 'talk-face' });
  const togNikkud = h('input', { type: 'checkbox', id: 'talk-nikkud' });
  const togSpeak = h('input', { type: 'checkbox', id: 'talk-speak' });
  const togVoice = h('input', { type: 'checkbox', id: 'talk-voice-keep' });
  togFace.checked = faceToFace;
  togNikkud.checked = nikkud;
  togSpeak.checked = autoSpeak;
  togVoice.checked = voiceKeep;
  const toggles = h('div', { class: 'talk-toggles' },
    h('label', {}, togFace, ' Face-to-face (other side upside down)'),
    h('label', {}, togNikkud, ' Show Hebrew with vowels (nikkud) when available'),
    h('label', {}, togSpeak, ' Speak the translation automatically'),
    h('label', {}, togVoice, ' Keep my intonation (experimental, not a voice clone)'));

  const histTitle = h('h2', {}, 'History');
  const hist = h('ul', { class: 'talk-history' });

  const wrap = h('section', { class: 'talk-screen', 'aria-labelledby': 'view-title' },
    title, lead, banner, err, held, langs, face, input, toggles, histTitle, hist);

  root.replaceChildren(wrap);

  function persist() {
    storageSet(SETTINGS_KEY, { direction, faceToFace, nikkud, autoSpeak, voiceKeep });
    storageSet(HISTORY_KEY, history);
  }

  function setErr(msg) {
    err.hidden = !msg;
    err.textContent = msg || '';
  }

  function paintLangs() {
    btnEn.classList.toggle('is-on', direction === 'en-he');
    btnHe.classList.toggle('is-on', direction === 'he-en');
    btnAuto.classList.toggle('is-on', direction === 'auto');
    btnEn.setAttribute('aria-pressed', String(direction === 'en-he'));
    btnHe.setAttribute('aria-pressed', String(direction === 'he-en'));
    btnAuto.setAttribute('aria-pressed', String(direction === 'auto'));
    face.classList.toggle('is-face', faceToFace);
    paneThem.hidden = !faceToFace;
  }

  function dirForText(text) {
    if (direction !== 'auto') return direction;
    return detectDirection(text) || 'en-he';
  }

  function applyText(source, translation, dir, isPartial) {
    const srcIsHe = dir === 'he-en' || hasHebrew(source);
    const trIsHe = dir === 'en-he' || hasHebrew(translation);
    const shownTr = (!nikkud && trIsHe) ? stripNikkud(translation) : translation;
    const shownSrc = (!nikkud && srcIsHe) ? stripNikkud(source) : source;
    srcEl.textContent = shownSrc || (isPartial ? 'Listening…' : '');
    srcEl.classList.toggle('is-partial', !!isPartial);
    srcEl.dir = srcIsHe ? 'rtl' : 'ltr';
    srcEl.lang = srcIsHe ? 'he' : 'en';
    trEl.textContent = shownTr;
    trEl.dir = trIsHe ? 'rtl' : 'ltr';
    trEl.lang = trIsHe ? 'he' : 'en';
    if (faceToFace) {
      srcThem.textContent = shownTr;
      srcThem.dir = trIsHe ? 'rtl' : 'ltr';
      trThem.textContent = shownSrc;
      trThem.dir = srcIsHe ? 'rtl' : 'ltr';
    }
  }

  function paintHistory() {
    hist.replaceChildren(...history.slice(0, 30).map((item) => {
      const srcIsHe = hasHebrew(item.source);
      const trIsHe = hasHebrew(item.translation);
      return h('li', {},
        h('div', { class: 'h-src', dir: srcIsHe ? 'rtl' : 'ltr', lang: srcIsHe ? 'he' : 'en' }, item.source),
        h('div', { class: 'h-tr', dir: trIsHe ? 'rtl' : 'ltr', lang: trIsHe ? 'he' : 'en' }, item.translation || (item.held ? '(held)' : '')));
    }));
  }

  async function playAudio(b64, mime) {
    if (!autoSpeak || !b64) return;
    try {
      if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: mime || 'audio/mpeg' });
      lastAudioUrl = URL.createObjectURL(blob);
      const audio = new Audio(lastAudioUrl);
      await audio.play();
    } catch { /* autoplay or decode; user can press Replay */ }
  }

  async function translatePayload(payload) {
    if (!backend) {
      setErr('No translator service is configured, so this cannot be translated yet.');
      return;
    }
    if (inFlight) return;
    inFlight = true;
    setErr('');
    held.hidden = true;
    try {
      const res = await fetch(backend + '/v1/talk', {
        method: 'POST',
        headers: payload instanceof FormData ? undefined : { 'content-type': 'application/json' },
        body: payload instanceof FormData ? payload : JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('The translator service returned ' + res.status + '.');
      const data = await res.json();
      if (data.held) {
        held.hidden = false;
        applyText(data.source || payload.text || '', data.translation || '', data.direction || direction, false);
        return;
      }
      const src = data.source || '';
      const tr = data.translation || '';
      const dir = data.direction || dirForText(src);
      applyText(src, tr, dir, false);
      history = pushHistory(history, {
        id: data.id || uid(), ts: Date.now(), direction: dir,
        source: src, translation: tr, detected: data.detected, held: !!data.held,
      });
      persist();
      paintHistory();
      if (data.audio) {
        lastB64 = data.audio;
        lastMime = data.audio_mime || 'audio/mpeg';
        await playAudio(data.audio, lastMime);
      }
    } catch (e) {
      setErr((e && e.message) ? e.message : 'Translation failed.');
    } finally {
      inFlight = false;
    }
  }

  let lastB64 = '';
  let lastMime = 'audio/mpeg';

  async function translateText(text) {
    const t = String(text || '').trim();
    if (!t) return;
    if (holdsDivineName(t)) {
      held.hidden = false;
      applyText(t, '', dirForText(t), false);
      return;
    }
    applyText(t, '', dirForText(t), false);
    await translatePayload({ text: t, direction, nikkud, speak: autoSpeak });
  }

  function startBrowserPartials(lang) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    try {
      recognition = new SR();
      recognition.lang = lang === 'he-en' ? 'he-IL' : (lang === 'en-he' ? 'en-US' : 'en-US');
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (ev) => {
        let text = '';
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) text += r[0].transcript;
          else interim += r[0].transcript;
        }
        partial = (text + ' ' + interim).trim();
        if (partial) applyText(partial, '', dirForText(partial), true);
      };
      recognition.start();
    } catch { recognition = null; }
  }

  function stopBrowserPartials() {
    try { recognition && recognition.stop(); } catch { /* already ended */ }
    recognition = null;
  }

  async function startRec() {
    if (!backend) { setErr('No translator service is configured.'); return; }
    setErr('');
    partial = '';
    chunks = [];
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErr('The microphone was not available. You can type instead.');
      return;
    }
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
      : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
    rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.start(200);
    recording = true;
    mic.classList.add('is-rec');
    mic.setAttribute('aria-pressed', 'true');
    hint.textContent = 'Listening… tap again when you finish.';
    const guess = direction === 'auto' ? 'en-he' : direction;
    startBrowserPartials(guess);
  }

  async function stopRec() {
    stopBrowserPartials();
    const done = new Promise((resolve) => {
      if (!rec) { resolve(null); return; }
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      try { rec.stop(); } catch { resolve(null); }
    });
    recording = false;
    mic.classList.remove('is-rec');
    mic.setAttribute('aria-pressed', 'false');
    hint.textContent = 'Working…';
    const blob = await done;
    if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
    rec = null;
    if (!blob || blob.size < 200) {
      hint.textContent = 'Tap the microphone, speak, then tap again to translate.';
      if (partial) await translateText(partial);
      return;
    }
    const fd = new FormData();
    fd.append('audio', blob, 'speech.webm');
    fd.append('direction', direction);
    fd.append('nikkud', String(nikkud));
    fd.append('speak', String(autoSpeak));
    fd.append('voice_keep', String(voiceKeep));
    if (partial) fd.append('partial', partial);
    await translatePayload(fd);
    hint.textContent = 'Tap the microphone, speak, then tap again to translate.';
  }

  btnEn.onclick = () => { direction = 'en-he'; persist(); paintLangs(); };
  btnHe.onclick = () => { direction = 'he-en'; persist(); paintLangs(); };
  btnAuto.onclick = () => { direction = 'auto'; persist(); paintLangs(); };
  btnSwap.onclick = () => {
    direction = swapDirection(direction);
    persist();
    paintLangs();
    const s = srcEl.textContent, t = trEl.textContent;
    if (t) applyText(t, s, direction === 'auto' ? dirForText(t) : direction, false);
  };
  togFace.onchange = () => { faceToFace = togFace.checked; persist(); paintLangs(); };
  togNikkud.onchange = () => { nikkud = togNikkud.checked; persist(); };
  togVoice.onchange = () => { voiceKeep = togVoice.checked; persist(); };
  togSpeak.onchange = () => { autoSpeak = togSpeak.checked; persist(); };
  mic.onclick = () => { recording ? stopRec() : startRec(); };
  send.onclick = () => translateText(ta.value);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); translateText(ta.value); }
  });
  paneMe.addEventListener('click', async (e) => {
    const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
    if (act === 'copy') {
      const text = trEl.textContent || srcEl.textContent || '';
      try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    }
    if (act === 'replay' && lastB64) await playAudio(lastB64, lastMime);
  });

  paintLangs();
  paintHistory();
  title.focus();

  return () => {
    alive = false;
    stopBrowserPartials();
    try { rec && rec.state !== 'inactive' && rec.stop(); } catch { /* unmount */ }
    if (stream) { for (const t of stream.getTracks()) t.stop(); }
    if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
  };
}
