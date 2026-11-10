// Camera Translator (#/camera): photograph a Hebrew sign or menu and see the English drawn over the Hebrew, on the photo.
// mount(root, ctx) -> unmount. Loaded lazily by the router; nothing here is in the first-install precache.
//
// Two ways to translate:
//   service     when data/camera/config.json names a translation service (tools/camera-translate): the photo is sent there
//               only after the learner presses the send button under a plain notice of where it goes.
//   on device   always available: the app's own in-browser Hebrew reader plus the built-in sign word list. Nothing is sent.
// Every photo is redrawn through a canvas first, which drops location and camera details (EXIF) before anything else happens.
// The four-letter name is never drawn, shown as text, sent for translation or spoken: such a region is left as photographed.
import { h, heSpan, deviceVoiceState } from '../shell/ui.js';
import { speechSafeText } from '../shell/names.js';
import { isPointed } from '../photo/hebrew.js';
import { createGlossary, percentBox, sourceLabel, MAX_UPLOAD_SIDE, HELD_NOTE } from './camera-model.js';
import { loadConfig, loadGlossaryData, translateViaService } from './camera-client.js';

export const NOT_SET_UP_NOTICE = 'The full translation service is not set up for this site yet. Until it is, your photo is read on this device and only words from the built-in list of common sign and menu words are translated. Nothing leaves your device.';
export const SEND_NOTICE = 'To translate everything on the sign, your photo is sent to the Aleph translation service, which may pass it to Google Cloud to read the Hebrew and translate it. Location and camera details are removed from the photo first. The photo is not kept after the answer is sent back.';
export const ACCURACY_NOTICE = 'This reader has only been measured on computer-made sign images, not on real photos. Expect mistakes with glare, angles, small or decorative lettering. Do not rely on it for anything important.';

const CSS = `
.camera-tr{max-inline-size:46rem;margin-inline:auto;display:grid;gap:1rem}
.camera-tr figure{margin:0}
.camera-tr .row{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}
.camera-tr .pick{position:relative;overflow:hidden;display:inline-flex;align-items:center;min-block-size:44px;cursor:pointer}
.camera-tr .pick input{position:absolute;inset:0;opacity:0;cursor:pointer;inline-size:100%;block-size:100%}
.camera-tr .pick:focus-within{outline:3px solid currentColor;outline-offset:2px}
.camera-tr .note{border-inline-start:4px solid var(--gold,#c9a227);padding:.4rem .8rem;margin:0}
.camera-tr .stage{position:relative;display:inline-block;max-inline-size:100%;line-height:0}
.camera-tr .stage img{display:block;max-inline-size:100%;block-size:auto;border-radius:6px}
.camera-tr .hit{position:absolute;background:transparent;border:2px solid transparent;border-radius:4px;padding:0;margin:0;cursor:pointer;min-block-size:0;min-inline-size:0}
.camera-tr .hit:hover,.camera-tr .hit:focus-visible,.camera-tr .hit[aria-pressed="true"]{border-color:var(--gold,#c9a227);box-shadow:0 0 0 2px rgba(0,0,0,.55)}
.camera-tr .detail{display:grid;gap:.4rem}
.camera-tr .detail .he{font-size:1.9rem}
.camera-tr .regions{display:flex;flex-wrap:wrap;gap:.5rem;padding:0;margin:0;list-style:none}
.camera-tr button,.camera-tr a.btn{min-block-size:44px}
`;

function styleOnce(doc) {
  if (doc.getElementById('camera-tr-style')) return;
  const s = doc.createElement('style'); s.id = 'camera-tr-style'; s.textContent = CSS; doc.head?.append(s);
}

/** Redraw a picked photo through a canvas: upright, at most 2000 px on the long side, JPEG, no metadata. */
export async function cleanPhoto(file, doc = document) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(file); }
  const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = Object.assign(doc.createElement('canvas'), { width: Math.max(1, Math.round(bmp.width * scale)), height: Math.max(1, Math.round(bmp.height * scale)) });
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
  if (!blob) throw new Error('could not prepare the photo');
  return { blob, width: canvas.width, height: canvas.height };
}

export function mount(root, ctx = {}) {
  const doc = root.ownerDocument; const win = doc.defaultView;
  styleOnce(doc);
  const urls = new Set();
  const urlOf = new WeakMap();   // one object URL per picture, revoked when a new photo is taken or the view closes
  const objectUrl = (blob) => { let u = urlOf.get(blob); if (!u) { u = URL.createObjectURL(blob); urlOf.set(blob, u); urls.add(u); } return u; };
  const dropUrls = () => { for (const u of urls) URL.revokeObjectURL(u); urls.clear(); };
  let backend = { mode: 'none', url: null, origin: null };
  let glossary = null; let engine = null; let photo = null; let result = null; let showing = 'english'; let selected = null; let alive = true;
  let blocked = false;

  const status = h('p', { class: 'camera-status', role: 'status', 'aria-live': 'polite' });
  const modeNote = h('p', { class: 'note camera-mode', role: 'note' }, 'Checking what is available…');
  const takeInput = h('input', { type: 'file', accept: 'image/*', capture: 'environment', 'aria-label': 'Take a photo' });
  const chooseInput = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': 'Choose a photo' });
  const sampleBtn = h('button', { type: 'button', class: 'btn secondary', id: 'camera-sample' }, 'Try A Sample Sign');
  const actions = h('div', { class: 'row camera-actions' });
  const out = h('div', { class: 'camera-out' });
  const wrap = h('section', { class: 'card camera-tr', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Camera Translator'),
    h('p', {}, 'Take a photo of a Hebrew sign or menu. The English is drawn over the Hebrew, right on your photo. Tap any line to hear the Hebrew and see how to say it.'),
    modeNote,
    h('div', { class: 'row' },
      h('label', { class: 'btn pick' }, 'Take A Photo', takeInput),
      h('label', { class: 'btn secondary pick' }, 'Choose A Photo', chooseInput),
      sampleBtn),
    status, actions, out,
    h('p', { class: 'muted camera-accuracy', role: 'note' }, ACCURACY_NOTICE));
  root.replaceChildren(wrap);

  const onCspBlock = (e) => { if (backend.origin && String(e.blockedURI || '').startsWith(backend.origin)) blocked = true; };
  doc.addEventListener('securitypolicyviolation', onCspBlock);

  /** Speak Hebrew with the device voice. Returns 'yes' | 'unknown' (tried; the device may have no Hebrew voice) | 'no'. */
  const speak = (text) => {
    const synth = win?.speechSynthesis; const Utter = win?.SpeechSynthesisUtterance;
    const state = deviceVoiceState(synth, Utter);
    if (state === 'no') return 'no';
    const safe = speechSafeText(text);
    if (!safe.ok) return 'no';
    const u = new Utter(safe.text); u.lang = 'he-IL'; synth.cancel(); synth.speak(u); return state;
  };
  const VOICE_NOTE = { yes: 'Playing with this device\u2019s own voice. It is not a recorded voice.',
    unknown: 'Trying this device\u2019s own voice. If you hear nothing, this device has no Hebrew voice.',
    no: 'This device has no Hebrew voice, so it cannot play this.' };

  let translitFn; // loaded on first need: the app's own transliteration for text that carries vowel points
  const sayIt = async (r) => {
    if (r.translit) return r.translit;
    if (r.he && isPointed(r.he)) {
      if (translitFn === undefined) { try { translitFn = (await import('../pronunciation/transliterate.js')).transliterate || null; } catch { translitFn = null; } }
      try { if (translitFn) return translitFn(r.he, { scheme: 'siddur', tradition: 'israeli' }); } catch { /* fall through */ }
    }
    return null;
  };

  const detail = h('div', { class: 'card detail camera-detail', role: 'region', 'aria-live': 'polite', 'aria-label': 'Selected line' });
  const showDetail = async (r, autoplay) => {
    selected = r.id;
    for (const b of out.querySelectorAll('.hit, .camera-region-btn')) b.setAttribute('aria-pressed', String(b.dataset.region === r.id));
    if (r.held) { detail.replaceChildren(h('p', {}, HELD_NOTE)); return; }
    const audioNote = h('p', { class: 'muted', role: 'status' });
    const hear = () => { audioNote.textContent = VOICE_NOTE[speak(r.pointed || r.he)]; };
    const say = await sayIt(r);
    if (!alive || selected !== r.id) return;
    detail.replaceChildren(
      h('p', {}, heSpan(r.pointed || r.he)),
      say ? h('p', {}, h('strong', {}, 'Sounds like: '), say) : h('p', { class: 'muted' }, 'This line has no vowel points and is not in the built-in word list, so a reliable way to say it cannot be shown.'),
      r.en ? h('p', {}, h('strong', {}, 'English: '), r.en) : h('p', {}, 'No English is available for this line here.'),
      r.en ? h('p', { class: 'muted' }, sourceLabel(r.translationSource)) : null,
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: hear }, 'Hear The Hebrew')),
      audioNote);
    if (autoplay) hear();
  };

  const render = () => {
    out.replaceChildren();
    if (!result) return;
    const english = result.blob && showing === 'english';
    const img = h('img', { src: objectUrl(english ? result.blob : photo.blob), width: String(result.width), height: String(result.height),
      alt: english ? 'Your photo with the Hebrew replaced by English' : 'Your photo as taken' });
    const stage = h('div', { class: 'stage' }, img);
    result.regions.forEach((r, i) => {
      const p = percentBox(r.box, result.width, result.height);
      const label = r.held ? `Line ${i + 1}: sacred text` : `Line ${i + 1}: ${r.en || 'not translated'}. Hear the Hebrew.`;
      const b = h('button', { type: 'button', class: 'hit', 'data-region': r.id, 'aria-label': label, 'aria-pressed': 'false', onclick: () => showDetail(r, !r.held) });
      b.style.left = p.left; b.style.top = p.top; b.style.width = p.width; b.style.height = p.height;
      stage.append(b);
    });
    for (const n of result.notices) out.append(h('p', { class: 'note' }, n));
    out.append(h('figure', { class: 'camera-figure' }, stage,
      h('figcaption', { class: 'muted' }, result.source === 'service' ? 'Read and translated by the translation service.' : 'Read on this device. Only words from the built-in list are translated.')));
    const controls = h('div', { class: 'row' });
    if (result.blob) {
      controls.append(h('button', { type: 'button', class: 'btn secondary', id: 'camera-toggle', 'aria-pressed': String(showing === 'original'),
        onclick: () => { showing = showing === 'english' ? 'original' : 'english'; const keep = selected; render(); if (keep) { const r = result.regions.find((x) => x.id === keep); if (r) showDetail(r, false); } out.querySelector('#camera-toggle')?.focus(); } },
      showing === 'english' ? 'Show The Original' : 'Show The English'));
      controls.append(h('a', { class: 'btn secondary', href: objectUrl(result.blob), download: 'aleph-translated-photo.jpg' }, 'Save The Translated Photo'));
    }
    out.append(controls);
    if (result.regions.length) {
      out.append(h('h2', {}, 'Lines Found'),
        h('ul', { class: 'regions' }, ...result.regions.map((r, i) => h('li', {},
          h('button', { type: 'button', class: 'btn secondary camera-region-btn', 'data-region': r.id, 'aria-pressed': 'false', onclick: () => showDetail(r, !r.held) },
            r.held ? `${i + 1}. Sacred text` : `${i + 1}. ${r.en || 'Not translated'}`)))),
        detail);
      detail.replaceChildren(h('p', { class: 'muted' }, 'Tap a line on the photo, or a button above, to hear the Hebrew and see how to say it.'));
    }
    out.dataset.done = '1';
  };

  const fail = (message) => { status.textContent = message; out.dataset.done = '1'; };

  const runOnDevice = async () => {
    if (!photo) return;
    actions.replaceChildren(); out.dataset.done = ''; status.textContent = 'Reading the photo on this device… The first time, this downloads about 5 MB.';
    try {
      const { translateOnDevice } = await import('./on-device.js');
      const r = await translateOnDevice(photo.blob, { glossary, engine: ctx.cameraEngine || engine || undefined, doc,
        onProgress: (m) => { if (alive && m?.status) status.textContent = `Reading on this device: ${m.status}${typeof m.progress === 'number' ? ` ${Math.round(m.progress * 100)}%` : ''}`; } });
      engine = r.engine;
      if (!alive) return;
      result = { ...r, source: 'device' }; showing = 'english'; selected = null; status.textContent = ''; render();
    } catch { if (alive) fail('This photo could not be read on this device. Try a clearer, closer photo.'); }
  };

  const runService = async () => {
    if (!photo) return;
    actions.replaceChildren(); out.dataset.done = ''; status.textContent = 'Sending the photo and waiting for the translation…';
    try {
      const r = await (ctx.cameraService || translateViaService)(backend.url, photo.blob);
      if (!alive) return;
      result = { ...r, source: 'service' }; showing = 'english'; selected = null; status.textContent = ''; render();
    } catch (e) {
      if (!alive) return;
      const why = blocked ? 'This site is not yet allowed to reach the translation service.' : (e?.kind ? e.message : 'The translation service could not be reached.');
      status.textContent = `${why} You can still translate on this device.`;
      actions.replaceChildren(h('button', { type: 'button', class: 'btn', onclick: runOnDevice }, 'Translate On This Device'));
      out.dataset.done = '1';
    }
  };

  const offerChoices = () => {
    out.replaceChildren(h('figure', {}, h('img', { src: objectUrl(photo.blob), width: String(photo.width), height: String(photo.height), alt: 'Your photo as taken', style: 'max-inline-size:100%;block-size:auto;border-radius:6px' })));
    if (backend.url) {
      status.textContent = '';
      actions.replaceChildren(
        h('p', { class: 'note', role: 'note', style: 'flex-basis:100%' }, SEND_NOTICE),
        h('button', { type: 'button', class: 'btn', id: 'camera-send', onclick: runService }, 'Send Photo And Translate'),
        h('button', { type: 'button', class: 'btn secondary', id: 'camera-local', onclick: runOnDevice }, 'Translate On This Device Instead'));
    } else runOnDevice();
  };

  const take = async (file) => {
    if (!file) return;
    dropUrls(); result = null; selected = null; out.dataset.done = ''; actions.replaceChildren(); out.replaceChildren();
    status.textContent = 'Preparing the photo…';
    try { photo = await cleanPhoto(file, doc); } catch { photo = null; fail('That file could not be opened as a photo. Please choose a JPEG or PNG picture.'); return; }
    if (!alive) return;
    if (!glossary) { try { glossary = createGlossary(await loadGlossaryData()); } catch { glossary = createGlossary({ entries: [] }); } }
    offerChoices();
  };
  const onTake = () => { take(takeInput.files?.[0]); takeInput.value = ''; };
  const onChoose = () => { take(chooseInput.files?.[0]); chooseInput.value = ''; };
  takeInput.addEventListener('change', onTake); chooseInput.addEventListener('change', onChoose);
  sampleBtn.addEventListener('click', async () => {
    sampleBtn.setAttribute('disabled', '');
    try {
      const r = await fetch(new URL('../../data/camera/sample-sign.jpg', import.meta.url));
      if (!r.ok) throw new Error('missing');
      await take(await r.blob());
    } catch { status.textContent = 'The sample sign could not be loaded. You can still take or choose a photo.'; }
    sampleBtn.removeAttribute('disabled');
  });

  (ctx.cameraConfig ? Promise.resolve(ctx.cameraConfig) : loadConfig()).then((b) => {
    if (!alive) return;
    backend = b;
    if (b.url) modeNote.textContent = 'Photos stay on your device until you choose to send one. You can always translate on this device instead, with the built-in word list.';
    else modeNote.textContent = NOT_SET_UP_NOTICE;
    wrap.dataset.mode = b.url ? 'service' : 'device';
  });

  return () => {
    alive = false;
    takeInput.removeEventListener('change', onTake); chooseInput.removeEventListener('change', onChoose);
    doc.removeEventListener('securitypolicyviolation', onCspBlock);
    try { win?.speechSynthesis?.cancel(); } catch { /* ignore */ }
    try { engine?.terminate?.(); } catch { /* ignore */ }
    dropUrls(); photo = null; result = null; root.textContent = '';
  };
}
