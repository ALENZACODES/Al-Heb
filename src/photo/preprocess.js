// Image pre-processing for OCR (pure functions on RGBA pixel arrays; no DOM). Lane 6.
// Why: on the SYNTHETIC benchmark Tesseract collapsed on low-contrast, unevenly lit images (see docs/photo/BENCHMARK.md).
// normalizeContrast() flattens uneven lighting (divide by a heavy box-blur background estimate) and stretches the
// 1st..99th percentile of the result to 0..255. Polarity is preserved (light-on-dark signs stay light-on-dark).
// deskew() (round 3) estimates a small page rotation by projection profile and rotates it back; adaptiveBinarize() is an optional local-threshold step.
// All are deliberately simple. None de-warps (curved pages, perspective) and their effect on REAL photos is unmeasured (synthetic benchmark only).

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

// ---------------------------------------------------------------------------------------------------------------------
// Deskew (round 3). Projection-profile method: rotate the ink pixels by a trial angle and score how "peaky" the row histogram is
// (text lines give sharp peaks when level). Handles roughly +-10 degrees of in-plane tilt of a printed page. Not for handwriting,
// not for perspective, not for curved pages. Angle sign: positive = the text baseline descends to the right in image coordinates
// (clockwise tilt on screen); rotateImage(img, -angle) levels it.

function otsu(gray) {
  const hist = new Uint32Array(256); for (let i = 0; i < gray.length; i++) hist[Math.max(0, Math.min(255, gray[i] | 0))]++;
  const total = gray.length; let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let wB = 0, sB = 0, best = 0, thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break;
    sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF; const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; thr = t; }
  }
  return thr;
}

/** Ink points (minority polarity after Otsu) on a downscaled copy: {xs, ys} in a w'*h' frame centred on the image centre. */
function inkPoints(img, maxSide = 700) {
  const { data, width: w, height: h } = img;
  const step = Math.max(1, Math.round(Math.max(w, h) / maxSide));
  const sw = Math.floor(w / step), sh = Math.floor(h / step);
  const g = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    let acc = 0, n = 0;
    for (let dy = 0; dy < step; dy++) for (let dx = 0; dx < step; dx++) { const p = ((y * step + dy) * w + (x * step + dx)) * 4; acc += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]; n++; }
    g[y * sw + x] = acc / n;
  }
  const thr = otsu(g); let dark = 0; for (let i = 0; i < g.length; i++) if (g[i] <= thr) dark++;
  const inkIsDark = dark <= g.length / 2;
  const xs = [], ys = [];
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const isDark = g[y * sw + x] <= thr; if (isDark === inkIsDark) { xs.push(x - sw / 2); ys.push(y - sh / 2); } }
  return { xs, ys, sw, sh, step };
}

function profileScore(xs, ys, angleDeg, bins) {
  const a = (angleDeg * Math.PI) / 180, sin = Math.sin(a), cos = Math.cos(a);
  const hist = new Float64Array(bins); const off = bins / 2;
  for (let i = 0; i < xs.length; i++) { const r = Math.round(ys[i] * cos - xs[i] * sin + off); if (r >= 0 && r < bins) hist[r]++; }
  let s = 0; for (let i = 0; i < bins; i++) s += hist[i] * hist[i];
  return s;
}

/**
 * @param {{data:Uint8ClampedArray|Uint8Array,width:number,height:number}} img
 * @returns {{angle:number, confidence:number, points:number}} angle in degrees (rotate the image by -angle to level it); confidence = score(angle)/score(0), 1 = no evidence
 */
export function estimateSkew(img, { maxAngle = 10, maxSide = 700 } = {}) {
  const { xs, ys, sw, sh } = inkPoints(img, maxSide);
  if (xs.length < 200 || xs.length > 0.6 * sw * sh) return { angle: 0, confidence: 1, points: xs.length }; // blank, or ink fills the frame
  const bins = Math.ceil(Math.hypot(sw, sh)) + 4;
  const base = profileScore(xs, ys, 0, bins);
  let best = 0, bestScore = base;
  for (let a = -maxAngle; a <= maxAngle + 1e-9; a += 0.5) { const s = profileScore(xs, ys, a, bins); if (s > bestScore) { bestScore = s; best = a; } }
  for (let a = best - 0.4; a <= best + 0.4 + 1e-9; a += 0.1) { const s = profileScore(xs, ys, a, bins); if (s > bestScore) { bestScore = s; best = a; } }
  return { angle: Math.round(best * 10) / 10, confidence: bestScore / base, points: xs.length };
}

/** Rotate by `deg` degrees about the centre (bilinear, same size, edges filled with the median border colour). In place; returns img. */
export function rotateImage(img, deg) {
  const { data, width: w, height: h } = img;
  if (Math.abs(deg) < 0.05) return img;
  const border = [[], [], []];
  const take = (x, y) => { const p = (y * w + x) * 4; for (let c = 0; c < 3; c++) border[c].push(data[p + c]); };
  for (let x = 0; x < w; x += 3) { take(x, 0); take(x, h - 1); }
  for (let y = 0; y < h; y += 3) { take(0, y); take(w - 1, y); }
  const fill = border.map((b) => { b.sort((p, q) => p - q); return b[b.length >> 1]; });
  const src = new Uint8ClampedArray(data);
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a), cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // inverse map: destination (x,y) <- source rotated by -deg
    const dx = x - cx, dy = y - cy;
    const sx = dx * cos + dy * sin + cx, sy = -dx * sin + dy * cos + cy;
    const o = (y * w + x) * 4;
    if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) { data[o] = fill[0]; data[o + 1] = fill[1]; data[o + 2] = fill[2]; data[o + 3] = 255; continue; }
    const x0 = sx | 0, y0 = sy | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = sx - x0, fy = sy - y0;
    for (let c = 0; c < 3; c++) {
      const top = src[(y0 * w + x0) * 4 + c] * (1 - fx) + src[(y0 * w + x1) * 4 + c] * fx;
      const bot = src[(y1 * w + x0) * 4 + c] * (1 - fx) + src[(y1 * w + x1) * 4 + c] * fx;
      data[o + c] = top * (1 - fy) + bot * fy;
    }
    data[o + 3] = 255;
  }
  return img;
}

export const MIN_SKEW_DEG = 0.8, MIN_SKEW_CONFIDENCE = 1.02; // heuristics from the synthetic benchmark; UNTUNED on real photos
/** Estimate and, if the evidence is clear enough, level the image in place. Returns {applied, angle, confidence}. */
export function deskew(img, { minAngle = MIN_SKEW_DEG, minConfidence = MIN_SKEW_CONFIDENCE, ...o } = {}) {
  const e = estimateSkew(img, o);
  if (Math.abs(e.angle) < minAngle || e.confidence < minConfidence) return { applied: false, angle: e.angle, confidence: e.confidence };
  rotateImage(img, -e.angle);
  return { applied: true, angle: e.angle, confidence: e.confidence };
}

/** Local-mean threshold (Sauvola-lite via box blur): pixel -> black if below (1-k)*local mean, else white. Optional, benchmarked (see BENCHMARK.md). */
export function adaptiveBinarize(img, { radiusFrac = 0.04, minRadius = 12, k = 0.18 } = {}) {
  const { data, width: w, height: h } = img;
  const g = toGray(data, w, h);
  const mean = boxBlur(g, w, h, Math.max(minRadius, Math.round(radiusFrac * Math.max(w, h))));
  for (let i = 0, p = 0; i < g.length; i++, p += 4) { const v = g[i] < mean[i] * (1 - k) ? 0 : 255; data[p] = data[p + 1] = data[p + 2] = v; data[p + 3] = 255; }
  return img;
}
