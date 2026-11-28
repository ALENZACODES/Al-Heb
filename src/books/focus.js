// Book picture framing. Some pictures put the drawing at one side of a wide blank sheet; on a page that read as an empty beige
// wall (25 Nov 2026 audit). data/books/focus.json (tools/books/focus.py) stores the drawn box of each such picture as fractions;
// the picture is then shown as a frame cut to that box (aspect-ratio + object-position with object-fit: cover). Pure apart from loadFocus.

/** @type {Promise<Record<string, number[]>>|null} */
let focusP = null;
/** The focus boxes, fetched once; {} when the file is missing. */
export function loadFocus(fetchFn = globalThis.fetch) {
  if (!focusP) focusP = Promise.resolve().then(() => fetchFn(new URL('../../data/books/focus.json', import.meta.url))).then((r) => (r && r.ok ? r.json() : {})).catch(() => ({}));
  return focusP;
}

/** "assets/books/book62/BOOK62_p01.jpg" -> "BOOK62_p01" */
export const focusKey = (src) => String(src || '').split(/[?#]/)[0].split('/').pop().replace(/\.[a-z0-9]+$/i, '');

/**
 * Frame for a picture of iw x ih whose drawing is box [x0,y0,x1,y1]: { aspect, x, y } (object-position percentages), or null when
 * there is nothing to cut. The frame is never narrower than `min` (1.1) or wider than the picture itself.
 */
export function frameFor(box, iw, ih, { min = 1.1 } = {}) {
  if (!Array.isArray(box) || box.length !== 4 || !(iw > 0 && ih > 0)) return null;
  const [x0, y0, x1, y1] = box, imgA = iw / ih, boxA = ((x1 - x0) * iw) / ((y1 - y0) * ih);
  const aspect = Math.max(min, Math.min(imgA, boxA));
  if (Math.abs(aspect - imgA) < 0.02) return null;
  const pos = (lo, hi, vis) => { if (vis >= 1) return 50; const c = (lo + hi) / 2; const start = Math.min(1 - vis, Math.max(0, c - vis / 2)); return Math.round((start / (1 - vis)) * 1000) / 10; };
  return aspect < imgA ? { aspect, x: pos(x0, x1, aspect / imgA), y: 50 } : { aspect, x: 50, y: pos(y0, y1, imgA / aspect) };
}

/** Cut an <img> to its focus box once its size is known. Never throws. */
export function applyFocus(img, focus) {
  try {
    const box = focus && focus[focusKey(img.getAttribute('src'))]; if (!box) return;
    const go = () => { const f = frameFor(box, img.naturalWidth, img.naturalHeight); if (!f) return; img.style.aspectRatio = String(Math.round(f.aspect * 1000) / 1000); img.style.objectPosition = `${f.x}% ${f.y}%`; img.dataset.focus = '1'; };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  } catch { /* framing is decoration */ }
}
