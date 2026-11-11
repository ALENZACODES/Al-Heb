// @ts-check
// Star of David light (#/light): a full-screen gold Magen David, an optional phone-flash sparkle,
// and a printable stencil. Torch permission is requested only on a tap. No inline handlers.
import { h, heSpan, medal } from '../shell/ui.js';
import { rimonSays } from '../shell/rimon-inline.js';
import { quietNow } from '../shell/comfort.js';
import { resolveQuietLocation } from '../shell/notify.js';
import {
  hexagramPath, magenDavidTriangles, trianglePath,
  isTorchQuiet, allowPulse, clampStrobePeriod, torchConstraint,
  trackSupportsTorch, canRequestCamera, isLikelyTorchless, createWakeLock,
  DEFAULT_PULSE_PERIOD_MS, STENCIL_PDF, STENCIL_SVG,
} from './light.js';

const CSS_HREF = new URL('../../assets/css/light.css', import.meta.url).href;

function ensureCss() {
  const doc = globalThis.document;
  if (!doc || doc.getElementById('alef-light-css')) return;
  const link = doc.createElement('link');
  link.id = 'alef-light-css';
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  doc.head.append(link);
}

function reducedMotion(win = globalThis) {
  try { return !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch { return false; }
}

/** SVG element helper (HTML createElement would not draw the star). */
function s(tag, attrs = {}, ...kids) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.setAttribute('class', v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}

/**
 * @param {HTMLElement} root
 * @param {any} ctx
 */
export async function mount(root, ctx) {
  ensureCss();
  const win = globalThis;
  const doc = win.document;
  const calm = quietNow(ctx?.settings, win);
  const motionOff = calm || reducedMotion(win);
  let loc = null;
  try { loc = await resolveQuietLocation(ctx); } catch { loc = null; }

  let brightness = 100; // opens at full brightness (owner, 2026-11-11: the light needs to be brighter)
  let warm = true;
  let pulseOn = !motionOff;
  let sparkleOn = false;
  let sparkleArmed = false; // the learner confirmed the flashing-light warning
  let torchTrack = null;
  let torchStream = null;
  let torchSupported = false;
  let torchUnavailable = isLikelyTorchless(win) || !canRequestCamera(win);
  let torchError = '';
  let torchWant = false;
  let quiet = isTorchQuiet(new Date(), loc);
  const wake = createWakeLock(win.navigator);
  let pulseTimer = 0;
  let pulsePhase = true;
  let unmounted = false;
  let videoEl = null;

  const period = () => clampStrobePeriod(DEFAULT_PULSE_PERIOD_MS);

  const applyStar = () => {
    const stage = root.querySelector('.alef-light-stage');
    if (!stage) return;
    stage.style.setProperty('--light-brightness', String(brightness / 100));
    stage.setAttribute('data-temp', warm ? 'warm' : 'white');
    stage.setAttribute('data-pulse', pulseOn && allowPulse({ reducedMotion: motionOff, calm, kind: 'glow' }) ? 'on' : 'off');
    stage.setAttribute('data-sparkle', sparkleOn ? 'on' : 'off');
  };

  async function setTorch(on) {
    if (!torchTrack || !torchSupported) return;
    try { await torchTrack.applyConstraints(torchConstraint(on)); } catch { /* some devices reject a mid-stream change */ }
  }

  function stopPulseClock() {
    if (pulseTimer) { win.clearInterval(pulseTimer); pulseTimer = 0; }
  }

  function startPulseClock() {
    stopPulseClock();
    const glow = pulseOn && allowPulse({ reducedMotion: motionOff, calm, kind: 'glow' });
    const flash = sparkleOn && allowPulse({ reducedMotion: motionOff, calm, torchQuiet: quiet, kind: 'flash' });
    if (!glow && !flash) { setTorch(sparkleOn && !quiet && torchWant); return; }
    pulsePhase = true;
    const half = Math.max(Math.floor(period() / 2), Math.ceil(334 / 2));
    const tick = () => {
      pulsePhase = !pulsePhase;
      if (flash) setTorch(pulsePhase);
    };
    if (flash) setTorch(true);
    pulseTimer = win.setInterval(tick, half);
  }

  async function releaseCamera() {
    stopPulseClock();
    try { await setTorch(false); } catch { /* ignore */ }
    try { torchTrack?.stop?.(); } catch { /* ignore */ }
    try { torchStream?.getTracks?.().forEach((t) => { try { t.stop(); } catch { /* ignore */ } }); } catch { /* ignore */ }
    torchTrack = null; torchStream = null; torchSupported = false;
    if (videoEl) { try { videoEl.srcObject = null; } catch { /* ignore */ } }
  }

  async function startSparkle() {
    if (quiet) { sparkleOn = false; torchWant = false; render(); return; }
    if (!canRequestCamera(win)) { torchUnavailable = true; sparkleOn = false; render(); return; }
    torchWant = true;
    torchError = '';
    try {
      const stream = await win.navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (unmounted) { stream.getTracks().forEach((t) => t.stop()); return; }
      torchStream = stream;
      torchTrack = stream.getVideoTracks()[0] || null;
      torchSupported = trackSupportsTorch(torchTrack);
      if (!torchSupported) {
        torchUnavailable = true;
        await releaseCamera();
        sparkleOn = false;
        torchWant = false;
        torchError = 'The phone flash is not available on this device.';
        render();
        return;
      }
      if (!videoEl) {
        videoEl = h('video', { class: 'alef-light-torch-video', autoplay: true, muted: true, playsinline: true, 'aria-hidden': 'true' });
        root.querySelector('.alef-light-root')?.append(videoEl);
      }
      videoEl.srcObject = stream;
      try { await videoEl.play?.(); } catch { /* autoplay can fail; the track is still live */ }
      sparkleOn = true;
      startPulseClock();
      render();
    } catch (e) {
      torchError = /notallowed|permission|denied/i.test(String(e?.name || e?.message || e))
        ? 'Camera permission is needed only for the phone flash. The star on this screen still shines.'
        : 'The phone flash could not be started. The star on this screen still shines.';
      sparkleOn = false;
      torchWant = false;
      await releaseCamera();
      render();
    }
  }

  function shabbatNote() {
    if (!quiet) return null;
    const withCity = loc && loc.name
      ? `The phone flash stays off from candle lighting until havdalah in ${loc.name}, so this light can rest with Shabbat. The star on this screen remains if you want it.`
      : 'The phone flash stays off from Friday 6:00 in the evening until Saturday 9:00 in the evening, local time, so this light can rest with Shabbat. Set a city on the Calendar for exact candle-lighting and havdalah times. The star on this screen remains if you want it.';
    return h('p', { class: 'alef-light-note', role: 'status' }, withCity);
  }

  function sparkleControls() {
    if (quiet) return shabbatNote();
    if (torchUnavailable) {
      return h('p', { class: 'alef-light-note', role: 'status' },
        'The phone flash is not available in this browser. The star on this screen still shines, and you can print the stencil to project it on a wall.');
    }
    if (!sparkleArmed && !sparkleOn) {
      return h('div', { class: 'alef-light-warn' },
        h('p', {}, 'The phone flash, where this phone supports it, can pulse gently with the glow. If you are sensitive to flashing lights, leave this off. It never flashes faster than three times a second.'),
        h('button', { type: 'button', class: 'btn secondary', id: 'light-sparkle-arm' }, 'I understand — show the flash option'));
    }
    const label = sparkleOn ? 'Turn off phone flash' : 'Pulse the phone flash with the glow';
    return h('div', { class: 'alef-light-sparkle-row' },
      h('button', { type: 'button', class: 'btn', id: 'light-sparkle', 'aria-pressed': sparkleOn ? 'true' : 'false' }, label),
      torchError ? h('p', { class: 'alef-light-note', role: 'status' }, torchError) : null);
  }

  const starSvg = () => {
    const cx = 100, cy = 100, r = 58;
    const star = hexagramPath(cx, cy, r);
    const tri = magenDavidTriangles(cx, cy, r);
    return s('svg', {
      class: 'alef-light-star', viewBox: '0 0 200 200', role: 'img',
      'aria-labelledby': 'light-star-title',
    },
      s('title', { id: 'light-star-title' }, 'A radiant gold Star of David'),
      s('defs', {},
        s('radialGradient', { id: 'alef-light-glow', cx: '50%', cy: '50%', r: '50%' },
          s('stop', { offset: '0%', 'stop-color': 'var(--light-core)', 'stop-opacity': '1' }),
          s('stop', { offset: '45%', 'stop-color': 'var(--light-mid)', 'stop-opacity': '0.92' }),
          s('stop', { offset: '100%', 'stop-color': 'var(--light-edge)', 'stop-opacity': '0' })),
        s('linearGradient', { id: 'alef-light-gold', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
          s('stop', { offset: '0%', 'stop-color': 'var(--light-hi)' }),
          s('stop', { offset: '45%', 'stop-color': 'var(--light-gold)' }),
          s('stop', { offset: '100%', 'stop-color': 'var(--light-lo)' }))),
      s('circle', { class: 'alef-light-halo', cx: '100', cy: '100', r: '96', fill: 'url(#alef-light-glow)' }),
      s('path', { class: 'alef-light-tri alef-light-tri-up', d: trianglePath(tri.up), fill: 'none', stroke: 'url(#alef-light-gold)', 'stroke-width': '5.5', 'stroke-linejoin': 'round' }),
      s('path', { class: 'alef-light-tri alef-light-tri-down', d: trianglePath(tri.down), fill: 'none', stroke: 'url(#alef-light-gold)', 'stroke-width': '5.5', 'stroke-linejoin': 'round' }),
      s('path', { class: 'alef-light-hex', d: star.d, fill: 'url(#alef-light-gold)', 'fill-opacity': '0.96' }));
  };

  function render() {
    quiet = isTorchQuiet(new Date(), loc);
    if (quiet && sparkleOn) { sparkleOn = false; torchWant = false; releaseCamera(); }
    const glowOk = allowPulse({ reducedMotion: motionOff, calm, kind: 'glow' });
    root.replaceChildren(h('div', { class: 'alef-light-root', 'data-temp': warm ? 'warm' : 'white' },
      h('div', { class: 'alef-light-stage', 'data-temp': warm ? 'warm' : 'white', 'data-pulse': pulseOn && glowOk ? 'on' : 'off' },
        starSvg(),
        h('p', { class: 'alef-light-caption' }, heSpan('מגן דוד'), ' ', h('span', {}, 'Star of David'))),
      h('div', { class: 'alef-light-panel' },
        h('header', { class: 'alef-light-head' },
          h('div', { class: 'alef-feature-hero' }, medal('home', 'light', 48), rimonSays('A quiet gold light, when you want it.', { action: 'wave', size: 80 }).el),
          h('h1', { id: 'view-title', tabindex: '-1' }, 'Star of David light'),
          h('a', { class: 'alef-light-close', href: '#/', 'aria-label': 'Close the light and go home' }, 'Close')),
        h('label', { class: 'alef-light-slider' },
          h('span', {}, 'Brightness'),
          h('input', { type: 'range', id: 'light-brightness', min: '20', max: '100', step: '1', value: String(brightness), 'aria-valuemin': '20', 'aria-valuemax': '100', 'aria-valuenow': String(brightness) })),
        h('div', { class: 'alef-light-toggles' },
          h('button', { type: 'button', class: 'btn secondary', id: 'light-temp', 'aria-pressed': warm ? 'true' : 'false' }, warm ? 'Warm gold' : 'Cool white'),
          glowOk
            ? h('button', { type: 'button', class: 'btn secondary', id: 'light-pulse', 'aria-pressed': pulseOn ? 'true' : 'false' }, pulseOn ? 'Pulse on' : 'Pulse off')
            : h('p', { class: 'alef-light-note' }, 'The glow stays still because reduced motion is on.')),
        sparkleControls(),
        h('p', { class: 'alef-light-stencil' },
          'Print a small Star of David cutout, tape it over your phone flash, and project the star on a wall.',
          h('span', { class: 'alef-light-downloads' },
            h('a', { class: 'btn', href: STENCIL_PDF, download: 'alef-star-of-david-stencil.pdf' }, 'Download PDF'),
            h('a', { class: 'btn secondary', href: STENCIL_SVG, download: 'alef-star-of-david-stencil.svg' }, 'Download SVG'))))));
    applyStar();
    bind();
  }

  function bind() {
    const on = (id, fn) => root.querySelector('#' + id)?.addEventListener('click', fn);
    root.querySelector('#light-brightness')?.addEventListener('input', (e) => {
      brightness = Number(e.target.value) || 100;
      applyStar();
    });
    on('light-temp', () => { warm = !warm; render(); });
    on('light-pulse', () => { pulseOn = !pulseOn; startPulseClock(); render(); });
    on('light-sparkle-arm', () => { sparkleArmed = true; render(); });
    on('light-sparkle', () => {
      if (sparkleOn) { sparkleOn = false; torchWant = false; releaseCamera().then(() => { if (!unmounted) render(); }); }
      else startSparkle();
    });
  }

  const onVis = () => {
    if (doc.visibilityState === 'hidden') {
      stopPulseClock();
      setTorch(false);
      wake.release();
    } else if (!unmounted) {
      wake.request();
      if (sparkleOn && !quiet) startPulseClock();
    }
  };
  doc?.addEventListener?.('visibilitychange', onVis);

  const quietWatch = win.setInterval(() => {
    const nowQuiet = isTorchQuiet(new Date(), loc);
    if (nowQuiet !== quiet) { quiet = nowQuiet; if (quiet && sparkleOn) { sparkleOn = false; torchWant = false; releaseCamera(); } render(); }
  }, 30_000);

  render();
  wake.request();
  if (pulseOn) startPulseClock();

  return async () => {
    unmounted = true;
    win.clearInterval(quietWatch);
    stopPulseClock();
    doc?.removeEventListener?.('visibilitychange', onVis);
    await releaseCamera();
    await wake.release();
  };
}
