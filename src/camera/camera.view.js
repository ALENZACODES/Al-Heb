// @ts-check
// Camera: photograph a Hebrew sign, see the English printed on the photo (Lens style).
// Lazy-loaded at #/camera. No backend URL => graceful message. No inline scripts.
import { h } from '../shell/ui.js';
import {
  URL_KEY, SETTINGS_KEY, allowShimmer, holdsDivineName, isImageMime, resolveBackendUrl, tooLarge,
} from './camera.model.js';

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
.cam-screen{display:flex;flex-direction:column;gap:.8rem;max-width:42rem;margin:0 auto;padding:0 0 5rem}
.cam-banner{background:#3b1f08;color:#fff8e8;border-radius:.75rem;padding:.75rem 1rem}
.cam-stage{position:relative;background:#111;border-radius:1rem;overflow:hidden;min-height:16rem;display:flex;align-items:center;justify-content:center}
.cam-stage img{width:100%;height:auto;display:block}
.cam-stage.is-shimmer img.cam-after{animation:cam-wipe .28s ease both}
@keyframes cam-wipe{from{clip-path:inset(0 100% 0 0);filter:brightness(1.15)}to{clip-path:inset(0 0 0 0);filter:brightness(1)}}
@media (prefers-reduced-motion: reduce){
  .cam-stage.is-shimmer img.cam-after{animation:none}
}
.cam-hot{position:absolute;inset:0}
.cam-hot button{position:absolute;border:2px solid transparent;background:transparent;cursor:pointer;border-radius:4px}
.cam-hot button:focus-visible,.cam-hot button:hover{border-color:#e8c547}
.cam-actions,.cam-toggles{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.cam-actions .btn-primary{background:#1a73e8;color:#fff;border:0;border-radius:.7rem;padding:.6rem 1rem;font:inherit;cursor:pointer}
.cam-actions button,.cam-toggles button{appearance:none;border:0;background:#f1f3f4;border-radius:.7rem;padding:.5rem .8rem;font:inherit;cursor:pointer}
.cam-toggles button.is-on{background:#1a73e8;color:#fff}
.cam-card{background:var(--card,#fff8e8);border-radius:.8rem;padding:.8rem 1rem}
.cam-card[dir=rtl]{text-align:right}
.cam-held{background:#3b1f08;color:#fff8e8;border-radius:.75rem;padding:.6rem .8rem}
.cam-err{color:#8b1a12}
.cam-file{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
`;

export function mount(root, ctx) {
  injectCss('camera-css', CSS);
  const backend = backendUrlFromPage();
  let gold = false, showOriginal = false, autoSpeak = true;
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    gold = !!s.gold; showOriginal = !!s.showOriginal;
    if (typeof s.autoSpeak === 'boolean') autoSpeak = s.autoSpeak;
  } catch { /* ignore */ }
  let last = null;
  let lastFile = null;
  let objectUrls = [];

  const title = h('h1', { id: 'view-title', tabindex: '-1' }, 'Camera');
  const lead = h('p', {}, 'Take a photo of a Hebrew sign. The English is written on the sign itself, in the shop’s own colours.');
  const banner = h('div', { class: 'cam-banner', hidden: !!backend, role: 'status' },
    'Camera translation needs a translator service. It is not connected on this device, so a photo cannot be translated yet. Nothing leaves this page until the service address is set.');
  const err = h('p', { class: 'cam-err', role: 'alert', hidden: true });
  const held = h('div', { class: 'cam-held', hidden: true, role: 'status' },
    'A sacred Name was on that sign. ALEF will not rewrite it on the photo. That line is held.');
  const stage = h('div', { class: 'cam-stage', 'aria-label': 'Photograph' }, h('p', { class: 'muted' }, 'No photo yet.'));
  const file = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'cam-file', id: 'cam-file' });
  const btnShot = h('button', { type: 'button', class: 'btn-primary' }, 'Take or upload a photo');
  const btnToggle = h('button', { type: 'button' }, 'Show original');
  const btnGold = h('button', { type: 'button' }, 'Gold accent');
  const actions = h('div', { class: 'cam-actions' }, btnShot, file, btnToggle, btnGold);
  const card = h('div', { class: 'cam-card', hidden: true });
  const wrap = h('section', { class: 'cam-screen', 'aria-labelledby': 'view-title' },
    title, lead, banner, err, held, stage, actions, card);
  root.replaceChildren(wrap);

  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function persist() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ gold, showOriginal, autoSpeak })); } catch { /* quota */ }
  }
  function setErr(msg) { err.hidden = !msg; err.textContent = msg || ''; }
  function revoke() { for (const u of objectUrls) URL.revokeObjectURL(u); objectUrls = []; }
  function b64url(b64, mime) {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const u = URL.createObjectURL(new Blob([bin], { type: mime || 'image/jpeg' }));
    objectUrls.push(u);
    return u;
  }
  function paint() {
    btnGold.classList.toggle('is-on', gold);
    btnToggle.classList.toggle('is-on', showOriginal);
    btnToggle.textContent = showOriginal ? 'Show translation' : 'Show original';
    if (!last) return;
    revoke();
    const src = showOriginal ? last.original_jpeg : last.translated_jpeg;
    const img = h('img', {
      class: showOriginal ? 'cam-before' : 'cam-after',
      alt: showOriginal ? 'Original photograph' : 'Photograph with English written on the sign',
      src: b64url(src, last.mime || 'image/jpeg'),
    });
    const hot = h('div', { class: 'cam-hot' });
    const w = last.width || 0, ht = last.height || 0;
    for (const r of last.regions || []) {
      const box = r.box || [];
      if (box.length !== 4 || !w) continue;
      const b = h('button', {
        type: 'button',
        'aria-label': (r.held ? 'Held line' : (r.translation || r.text || 'Region')),
        style: `left:${(box[0]/w)*100}%;top:${(box[1]/ht)*100}%;width:${(box[2]/w)*100}%;height:${(box[3]/ht)*100}%`,
      });
      b.addEventListener('click', () => selectRegion(r));
      hot.append(b);
    }
    stage.replaceChildren(img, hot);
    stage.classList.toggle('is-shimmer', !showOriginal && allowShimmer(reduced()));
    held.hidden = !last.held_any;
  }

  function selectRegion(r) {
    card.hidden = false;
    card.dir = 'rtl';
    card.lang = 'he';
    const he = r.text || '';
    const en = r.translation || '';
    const tr = r.transliteration || '';
    card.replaceChildren(
      h('p', { dir: 'rtl', lang: 'he' }, he),
      tr ? h('p', { dir: 'ltr', lang: 'en', class: 'muted' }, tr) : null,
      h('p', { dir: 'ltr', lang: 'en' }, r.held ? 'Held' : en),
    );
    if (autoSpeak && he && !r.held && !holdsDivineName(he) && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(he);
        u.lang = 'he-IL';
        window.speechSynthesis.speak(u);
      } catch { /* ignore */ }
    }
  }

  async function sendFile(fileObj) {
    setErr('');
    if (!backend) { setErr('No translator service is configured, so this photo cannot be translated yet.'); return; }
    if (!isImageMime(fileObj.type) && fileObj.type) { setErr('Please choose a photograph.'); return; }
    if (fileObj.size > 8 * 1024 * 1024) { setErr('That photo is too large.'); return; }
    stage.replaceChildren(h('p', {}, 'Reading the sign…'));
    const fd = new FormData();
    fd.append('image', fileObj, fileObj.name || 'sign.jpg');
    if (fileObj) lastFile = fileObj;
    fd.append('gold', String(gold));
    fd.append('direction', 'he-en');
    try {
      const res = await fetch(backend + '/v1/camera', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('The translator service returned ' + res.status + '.');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Translation failed.');
      last = data;
      showOriginal = false;
      persist();
      paint();
    } catch (e) {
      setErr((e && e.message) ? e.message : 'Translation failed.');
    }
  }

  btnShot.onclick = () => file.click();
  file.onchange = () => { if (file.files && file.files[0]) sendFile(file.files[0]); };
  btnToggle.onclick = () => { showOriginal = !showOriginal; persist(); paint(); };
  btnGold.onclick = async () => {
    gold = !gold; persist();
    btnGold.classList.toggle('is-on', gold);
    if (lastFile) sendFile(lastFile);
  };
  title.focus();
  return () => {
    revoke();
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* unmount */ }
  };
}
