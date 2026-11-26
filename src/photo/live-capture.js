// Live camera for the scanner (#/scan) and the Camera Translator (#/camera): a viewfinder that checks each frame and says
// what to fix (too dark, glare, hold still, not sharp yet), takes the photo by itself once the picture is steady and sharp,
// and offers the phone's light and zoom where the camera has them.
//
// Everything stays on the device: frames are measured in a small canvas and dropped; only the one photo taken is handed to
// the screen, which then treats it exactly like a picked photo. No library: the frame checks are a few lines of arithmetic
// (variance of the Laplacian for sharpness, mean and spread of brightness, mean frame-to-frame change for steadiness).
//
// openLiveCapture({ doc, onPhoto(blob), onClose?, announce?, mediaDevices?, auto? }) -> Promise<{ el, close }>
// The pure helpers (toGray, frameStats, frameMotion, createSteadyGate) are exported for tests.

export const LIVE_NOTICE = 'The camera picture stays on this device. Each frame is checked here and thrown away; only the photo you take is read.';
const SAMPLE_W = 160;            // frames are measured at this width (about 160 x 120)
const TICK_MS = 150;

/** RGBA bytes -> luma bytes (Rec. 601 weights, integer maths). */
export function toGray(rgba, w, h) {
  const n = w * h, g = new Uint8ClampedArray(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return g;
}

/**
 * { brightness 0..255, spread (std dev), sharpness (variance of the 4-neighbour Laplacian), glare (share of near-white pixels) }.
 * Sharpness is what tells a focused sign from a blurred one; it only compares frames of the same scene, so the gate below
 * judges it against the best frame seen recently, not against a fixed number alone.
 */
export function frameStats(gray, w, h) {
  let sum = 0, sum2 = 0, white = 0;
  const n = w * h;
  for (let i = 0; i < n; i++) { const v = gray[i]; sum += v; sum2 += v * v; if (v >= 250) white++; }
  const brightness = n ? sum / n : 0;
  const spread = n ? Math.sqrt(Math.max(0, sum2 / n - brightness * brightness)) : 0;
  let ls = 0, ls2 = 0, m = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      ls += lap; ls2 += lap * lap; m++;
    }
  }
  const mean = m ? ls / m : 0;
  return { brightness, spread, sharpness: m ? ls2 / m - mean * mean : 0, glare: n ? white / n : 0 };
}

/** Mean absolute change between two same-size gray frames (0..255). Hand shake shows up here. */
export function frameMotion(prev, cur) {
  if (!prev || !cur || prev.length !== cur.length || !cur.length) return Infinity;
  let d = 0; for (let i = 0; i < cur.length; i++) d += Math.abs(cur[i] - prev[i]);
  return d / cur.length;
}

export const HINTS = Object.freeze({
  dark: 'Too dark. Turn on the light or move somewhere brighter.',
  glare: 'Glare on the sign. Tilt the phone a little so the light does not shine back.',
  flat: 'Point the camera at the Hebrew writing.',
  moving: 'Hold still…',
  blurry: 'Not sharp yet. Move a little closer or tap the screen to focus.',
  ready: 'Sharp and steady. Taking the photo…',
  readyManual: 'Sharp and steady. Press Take Photo Now.',
});

/**
 * Decides, frame by frame, whether the picture is good enough to take. push(stats, motion) -> { hint, ready }.
 * ready is true once `need` frames in a row are bright enough, low glare, steady, and at least `rel` of the sharpest frame
 * seen in the last `window` frames (and above `minSharp`).
 */
export function createSteadyGate(o = {}) {
  const need = o.need ?? 4, rel = o.rel ?? 0.8, minSharp = o.minSharp ?? 60, maxMotion = o.maxMotion ?? 3.5;
  const minBright = o.minBright ?? 45, maxGlare = o.maxGlare ?? 0.12, minSpread = o.minSpread ?? 18, windowN = o.window ?? 14;
  const recent = []; let run = 0;
  return {
    push(s, motion) {
      // Only well-lit frames set the bar for "sharp": a glaring or dark frame's edges say nothing about focus.
      const lit = s.brightness >= minBright && s.glare <= maxGlare && s.spread >= minSpread;
      if (lit) { recent.push(s.sharpness); if (recent.length > windowN) recent.shift(); }
      const best = recent.length ? Math.max(...recent) : s.sharpness;
      let hint;
      if (s.brightness < minBright) hint = 'dark';
      else if (s.glare > maxGlare) hint = 'glare';
      else if (s.spread < minSpread) hint = 'flat';
      else if (!(motion <= maxMotion)) hint = 'moving';
      else if (s.sharpness < minSharp || s.sharpness < rel * best) hint = 'blurry';
      else hint = 'ready';
      run = hint === 'ready' ? run + 1 : 0;
      return { hint: run >= need ? 'ready' : hint === 'ready' ? 'moving' : hint, ready: run >= need };
    },
    reset() { recent.length = 0; run = 0; },
  };
}

const CSS = `
.live-cap{display:grid;gap:.6rem;border:2px solid var(--border,#767676);border-radius:10px;padding:.6rem;background:var(--card,#fff)}
.live-cap .live-stage{position:relative;line-height:0;background:#000;border-radius:8px;overflow:hidden}
.live-cap video{inline-size:100%;block-size:auto;max-block-size:70vh;object-fit:contain;touch-action:manipulation}
.live-cap .live-frame{position:absolute;inset:12% 8%;border:3px dashed rgba(255,255,255,.85);border-radius:8px;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,.18)}
.live-cap .live-frame[data-ready="true"]{border-style:solid;border-color:#7CFC9A}
.live-cap .live-hint{margin:0;font-weight:600}
.live-cap .live-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.live-cap button{min-block-size:44px}
.live-cap input[type=range]{inline-size:10rem}
`;

/** True when this browser can open a live camera here (secure page, getUserMedia present). */
export function liveCameraAvailable(win = globalThis) {
  return !!(win?.navigator?.mediaDevices?.getUserMedia) && win?.isSecureContext !== false;
}

export async function openLiveCapture({ doc = document, onPhoto, onClose = () => {}, announce = () => {}, mediaDevices, auto = true, setTimer, clearTimer } = {}) {
  const win = doc.defaultView || globalThis;
  const md = mediaDevices || win.navigator?.mediaDevices;
  const every = setTimer || ((f, ms) => win.setInterval(f, ms));
  const stopEvery = clearTimer || ((id) => win.clearInterval(id));
  if (!doc.getElementById('live-cap-style')) { const s = doc.createElement('style'); s.id = 'live-cap-style'; s.textContent = CSS; doc.head?.append(s); }
  const mk = (tag, attrs = {}, ...kids) => { const n = doc.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : String(v)); } n.append(...kids); return n; };

  let stream;
  try {
    stream = await md.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
  } catch (e) {
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    throw new Error(denied ? 'Camera permission was not given. You can still take or choose a photo.' : 'The camera could not be opened. You can still take or choose a photo.');
  }
  const track = stream.getVideoTracks?.()[0];
  const video = mk('video', { playsinline: true, muted: true, autoplay: true, 'aria-label': 'Camera picture' });
  video.muted = true; video.srcObject = stream;
  const frame = mk('div', { class: 'live-frame', 'aria-hidden': 'true', 'data-ready': 'false' });
  const hint = mk('p', { class: 'live-hint', role: 'status', 'aria-live': 'polite' }, 'Starting the camera…');
  const shutter = mk('button', { type: 'button', class: 'btn live-shutter' }, 'Take Photo Now');
  const autoBtn = mk('button', { type: 'button', class: 'btn secondary live-auto', 'aria-pressed': String(auto) }, auto ? 'Auto photo: on' : 'Auto photo: off');
  const close = mk('button', { type: 'button', class: 'btn secondary live-close' }, 'Close Camera');
  const row = mk('div', { class: 'live-row' }, shutter, autoBtn);
  const el = mk('section', { class: 'live-cap', 'aria-label': 'Live camera' },
    mk('div', { class: 'live-stage' }, video, frame), hint, row, mk('p', { class: 'muted live-note' }, LIVE_NOTICE), mk('div', { class: 'live-row' }, close));

  // Light and zoom, only where the camera reports them (Android Chrome mostly; iOS Safari exposes neither through the web).
  let caps = {}; try { caps = track?.getCapabilities?.() || {}; } catch { caps = {}; }
  let torchOn = false;
  if (caps.torch) {
    const torchBtn = mk('button', { type: 'button', class: 'btn secondary live-torch', 'aria-pressed': 'false' }, 'Light: off');
    torchBtn.addEventListener('click', async () => {
      try { await track.applyConstraints({ advanced: [{ torch: !torchOn }] }); torchOn = !torchOn; } catch { announce('This camera would not turn its light on.'); }
      torchBtn.textContent = torchOn ? 'Light: on' : 'Light: off'; torchBtn.setAttribute('aria-pressed', String(torchOn));
    });
    row.append(torchBtn);
  }
  if (caps.zoom && Number.isFinite(caps.zoom.max) && caps.zoom.max > (caps.zoom.min ?? 1)) {
    const zoom = mk('input', { type: 'range', class: 'live-zoom', min: caps.zoom.min ?? 1, max: Math.min(caps.zoom.max, 8), step: caps.zoom.step || 0.1, value: caps.zoom.min ?? 1, 'aria-label': 'Zoom' });
    zoom.addEventListener('input', () => { track.applyConstraints({ advanced: [{ zoom: Number(zoom.value) }] }).catch(() => {}); gate.reset(); });
    row.append(mk('label', {}, 'Zoom ', zoom));
  }
  // Tap to focus, where the camera supports a point of interest.
  video.addEventListener('click', (ev) => {
    if (!caps.focusMode || !Array.isArray(caps.focusMode)) return;
    const r = video.getBoundingClientRect?.(); if (!r || !r.width) return;
    const pointsOfInterest = [{ x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }];
    const mode = caps.focusMode.includes('single-shot') ? 'single-shot' : caps.focusMode.includes('continuous') ? 'continuous' : null;
    track.applyConstraints({ advanced: [{ pointsOfInterest, ...(mode ? { focusMode: mode } : {}) }] }).catch(() => {});
    gate.reset();
  });

  const gate = createSteadyGate();
  const sample = doc.createElement('canvas');
  const sctx = sample.getContext('2d', { willReadFrequently: true });
  let prev = null, lastHint = '', timer = null, taking = false, closed = false;

  async function grab() {
    // ImageCapture gives the camera's full-resolution still where it exists; otherwise the current video frame is drawn.
    try {
      if (typeof win.ImageCapture === 'function' && track) {
        const blob = await new win.ImageCapture(track).takePhoto();
        if (blob && blob.size) return blob;
      }
    } catch { /* fall back to the video frame */ }
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) throw new Error('no frame');
    const c = doc.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(video, 0, 0, w, h);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
    if (!blob) throw new Error('no frame');
    return blob;
  }
  async function take(how) {
    if (taking || closed) return;
    taking = true;
    hint.textContent = how === 'auto' ? HINTS.ready : 'Taking the photo…';
    try {
      const blob = await grab();
      finish();
      announce('Photo taken. Reading it now.');
      onPhoto?.(blob);
    } catch { taking = false; hint.textContent = 'The photo could not be taken. Try again.'; }
  }
  function tick() {
    if (closed || taking) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh || !sctx) return;
    const w = SAMPLE_W, h = Math.max(1, Math.round((vh / vw) * SAMPLE_W));
    // Measure only the framed middle (the dashed box), where the learner is asked to put the writing.
    const sx = vw * 0.08, sy = vh * 0.12, sw = vw * 0.84, sh = vh * 0.76;
    sample.width = w; sample.height = h;
    try { sctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h); } catch { return; }
    let gray; try { gray = toGray(sctx.getImageData(0, 0, w, h).data, w, h); } catch { return; }
    const r = gate.push(frameStats(gray, w, h), frameMotion(prev, gray));
    prev = gray;
    frame.setAttribute('data-ready', String(r.ready || r.hint === 'ready'));
    const key = r.hint === 'ready' && !auto ? 'readyManual' : r.hint;
    if (key !== lastHint) { lastHint = key; hint.textContent = HINTS[key]; }
    if (r.ready && auto) take('auto');
  }
  function finish() {
    if (closed) return; closed = true;
    if (timer != null) stopEvery(timer); timer = null;
    try { for (const t of stream.getTracks?.() || []) t.stop(); } catch { /* ignore */ }
    try { video.srcObject = null; } catch { /* ignore */ }
    el.remove?.();
  }

  shutter.addEventListener('click', () => take('manual'));
  autoBtn.addEventListener('click', () => { auto = !auto; autoBtn.textContent = auto ? 'Auto photo: on' : 'Auto photo: off'; autoBtn.setAttribute('aria-pressed', String(auto)); gate.reset(); });
  close.addEventListener('click', () => { finish(); onClose(); });
  try { const p = video.play?.(); if (p?.catch) p.catch(() => {}); } catch { /* autoplay attribute covers it */ }
  timer = every(tick, TICK_MS);
  hint.textContent = 'Fit the Hebrew inside the box and hold the phone still.';
  return { el, close: () => { finish(); }, take: () => take('manual'), tick };
}
