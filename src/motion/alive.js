// Motion that already exists in the repo: mouth frames in assets/img/gen, the celebrate fade,
// and a small speaking pulse. Cast faces are only displayed, never replaced.
// Reduced motion and calm mode leave the picture still.

const MOUTHS = ['MOUTH_ah', 'MOUTH_eh', 'MOUTH_ee', 'MOUTH_oh', 'MOUTH_oo'];

const CSS = `
.alef-speaking .alef-img{animation:alef-bob .6s ease-in-out infinite}
.alef-mouth{display:block;inline-size:4.5rem;block-size:4.5rem;margin-inline:auto;border-radius:999px}
@keyframes alef-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@media (prefers-reduced-motion:reduce){.alef-speaking .alef-img{animation:none!important}}
[data-calm] .alef-speaking .alef-img{animation:none!important}
`;

export function motionOk(ctx, doc = globalThis.document) {
  try {
    if (ctx?.settings?.get?.('calmMode') === true) return false;
    if (doc?.documentElement?.hasAttribute?.('data-calm')) return false;
    const mq = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq?.matches) return false;
  } catch { /* still pictures */ }
  return true;
}

export function ensureMotionStyle(doc = globalThis.document) {
  try {
    if (!doc?.head || doc.getElementById?.('alef-motion-style')) return;
    const s = doc.createElement('style');
    s.id = 'alef-motion-style';
    s.textContent = CSS;
    doc.head.append(s);
  } catch { /* optional */ }
}

/**
 * Cycle the existing mouth pictures while a word or letter is playing.
 * Returns a stop function. No-op when motion is off or no mouth image resolves.
 */
export function startSpeaking(ctx, host) {
  if (!host || !motionOk(ctx)) return () => {};
  ensureMotionStyle(host.ownerDocument);
  host.classList?.add?.('alef-speaking');
  const frames = MOUTHS.map((id) => ctx?.images?.resolve?.('id', id)).filter(Boolean);
  let img = null;
  let timer = null;
  if (frames.length && typeof host.appendChild === 'function' && host.ownerDocument?.createElement) {
    img = host.querySelector?.('.alef-mouth') || host.ownerDocument.createElement('img');
    img.className = 'alef-mouth';
    img.alt = '';
    img.width = 72;
    img.height = 72;
    if (!img.parentNode) host.appendChild(img);
    let i = 0;
    const tick = () => { const f = frames[i % frames.length]; img.src = f.src; i += 1; };
    tick();
    timer = setInterval(tick, 180);
  }
  return () => {
    if (timer) clearInterval(timer);
    host.classList?.remove?.('alef-speaking');
    if (img?.remove) img.remove();
  };
}

/** Lesson-finished fade (preview/loops/celebrate.js) plus the existing celebrate portrait, when approved. */
export function celebrateWin(ctx, host, h, lessonId) {
  if (!host || typeof host.append !== 'function') return;
  ensureMotionStyle(host.ownerDocument);
  const face = pictureSafe(ctx, h, 'CHAR_ari_celebrate');
  if (face) host.append(face);
  import('../../preview/loops/hook.js').then((m) => {
    const n = m.lessonFinished?.(ctx, { lessonId });
    if (n && host.isConnected !== false) host.append(n);
  }).catch(() => {});
}

function pictureSafe(ctx, h, id) {
  try { return ctx?.img?.(h, { kind: 'id', id, width: 280, class: 'scene-art', decorative: true }) || null; } catch { return null; }
}
