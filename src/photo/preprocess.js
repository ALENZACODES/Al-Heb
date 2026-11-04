// Image pre-processing for OCR (pure functions on RGBA pixel arrays; no DOM). Lane 6.
// Why: on the SYNTHETIC benchmark Tesseract collapsed on low-contrast, unevenly lit images (see docs/photo/BENCHMARK.md).
// normalizeContrast() flattens uneven lighting (divide by a heavy box-blur background estimate) and stretches the
// 1st..99th percentile of the result to 0..255. Polarity is preserved (light-on-dark signs stay light-on-dark).
// It is deliberately simple. It does not deskew, binarise or de-warp, and its effect on REAL photos is unmeasured.

/** @param {Uint8ClampedArray|Uint8Array} rgba @param {number} w @param {number} h @returns {Float32Array} luma 0..255 */
export function toGray(rgba, w, h) {
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  return g;
}

/** Box blur with an integral image (O(n)); edges use the clipped window. */
export function boxBlur(src, w, h, radius) {
  const W = w + 1;
  const ii = new Float64Array(W * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) { row += src[(y - 1) * w + (x - 1)]; ii[y * W + x] = ii[(y - 1) * W + x] + row; }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(w, x + radius + 1);
      const sum = ii[y1 * W + x1] - ii[y0 * W + x1] - ii[y1 * W + x0] + ii[y0 * W + x0];
      out[y * w + x] = sum / ((x1 - x0) * (y1 - y0));
    }
  }
  return out;
}

function percentile(arr, p) {
  // histogram-based on 0..255 integers is enough here
  const hist = new Uint32Array(256);
  for (let i = 0; i < arr.length; i++) hist[Math.max(0, Math.min(255, Math.round(arr[i])))]++;
  const target = p * arr.length; let acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) return v; }
  return 255;
}

/** Spread between the 2nd and 98th luma percentile (0..255). Small = washed-out image. */
export function contrastSpan(img) {
  const g = toGray(img.data, img.width, img.height);
  return percentile(g, 0.98) - percentile(g, 0.02);
}
export const LOW_CONTRAST_SPAN = 110; // heuristic from the synthetic benchmark; UNTUNED on real photos

/** Normalise only when the image looks washed out (span < threshold): on good-contrast noisy images the stretch amplified noise. */
export function autoNormalize(img, { threshold = LOW_CONTRAST_SPAN, ...o } = {}) {
  const span = contrastSpan(img);
  if (span >= threshold) return { img, applied: false, span };
  normalizeContrast(img, o); return { img, applied: true, span };
}

/**
 * @param {{data:Uint8ClampedArray|Uint8Array,width:number,height:number}} img RGBA; modified in place and returned
 * @param {{radiusFrac?:number, minRadius?:number, lowP?:number, highP?:number, flatten?:boolean}} [o]
 */
export function normalizeContrast(img, { radiusFrac = 0.15, minRadius = 20, lowP = 0.01, highP = 0.99, flatten = true } = {}) {
  const { data, width: w, height: h } = img;
  const gray = toGray(data, w, h);
  let norm = gray;
  if (flatten) {
    const r = Math.max(minRadius, Math.round(radiusFrac * Math.max(w, h)));
    const bg = boxBlur(gray, w, h, r);
    norm = new Float32Array(gray.length);
    // ratio around 1.0 -> scaled to ~128 centre so the percentile stretch has headroom both ways
    for (let i = 0; i < gray.length; i++) norm[i] = (gray[i] / Math.max(1, bg[i])) * 128;
  }
  const lo = percentile(norm, lowP), hi = percentile(norm, highP);
  const span = Math.max(8, hi - lo);
  for (let i = 0, p = 0; i < norm.length; i++, p += 4) {
    const v = Math.max(0, Math.min(255, ((norm[i] - lo) / span) * 255));
    data[p] = data[p + 1] = data[p + 2] = v; data[p + 3] = 255;
  }
  return img;
}

/** Scale so the longest side is at most maxSide (never upscales unless minSide would be violated). Returns {width,height,scale}. */
export function targetSize(w, h, { maxSide = 2400, minShort = 0 } = {}) {
  let scale = Math.min(1, maxSide / Math.max(w, h));
  if (minShort && Math.min(w, h) * scale < minShort) scale = Math.min(maxSide / Math.max(w, h), minShort / Math.min(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)), scale };
}
