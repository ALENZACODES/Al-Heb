// Camera translator: everything happens in the browser. Nothing is uploaded.
// Reading uses the app's existing in-browser Hebrew reader (src/photo/engines/tesseract-browser.js, vendored, about 5 MB on
// first use), its levelling code (src/photo/preprocess.js) and its reading-order code (src/photo/order-lines.js).
// Translation: the sign word list, then the app phrasebook, then (only if a line is still untranslated) the app dictionary
// word for word. The English is then drawn over the Hebrew on the levelled photo.
import { deskew } from '../photo/preprocess.js';
import { regionsFromBoxes, chooseAlignment, fitText, boxColours, readerImage, wordForWord, boxOnOriginal, LINE_HEIGHT } from './camera-model.js';
import { isHebrew } from '../photo/hebrew.js';

const FONT_STACK = '"Alef", "Heebo", system-ui, -apple-system, "Segoe UI", sans-serif';
export const READER_TARGET_SIDE = 1800;   // small photos are enlarged for the reader, up to 3x

const rgb = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;

/** Draw the English over each translated region. `canvas` already holds the (levelled) photo. Marks regions as drawn. */
export function drawOverlay(canvas, regions) {
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width; const H = canvas.height;
  const todo = regions.filter((r) => r.en && !r.held);
  if (!todo.length) return;
  const pixels = g.getImageData(0, 0, W, H).data;
  const place = chooseAlignment(todo, W);
  const measure = (text, size) => { g.font = `700 ${size}px ${FONT_STACK}`; return g.measureText(text).width; };
  const plans = todo.map((r) => {
    const b = r.box; const halfW = b.w / 2;
    return { r, colours: boxColours(pixels, W, H, b), where: place.get(r.id),
      left: boxColours(pixels, W, H, { x: b.x, y: b.y, w: halfW, h: b.h }).bg, right: boxColours(pixels, W, H, { x: b.x + halfW, y: b.y, w: halfW, h: b.h }).bg };
  });
  for (const { r, colours, left, right } of plans) {            // paint out every Hebrew box first
    const pad = Math.max(2, Math.round(r.box.h * 0.14));
    const x = Math.max(0, r.box.x - pad); const w = Math.min(W - x, r.box.w + 2 * pad);
    const uneven = Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]) > 14;
    if (uneven) {      // light falling across the sign: shade the patch from its left colour to its right colour
      const grad = g.createLinearGradient(x, 0, x + w, 0); grad.addColorStop(0, rgb(left)); grad.addColorStop(1, rgb(right)); g.fillStyle = grad;
    } else g.fillStyle = rgb(colours.bg);
    g.fillRect(x, Math.max(0, r.box.y - pad), w, Math.min(H, r.box.h + 2 * pad));
  }
  for (const { r, colours, where } of plans) {
    const fit = fitText(measure, r.en, where.box.w, where.box.h);
    g.font = `700 ${fit.size}px ${FONT_STACK}`;
    g.fillStyle = rgb(colours.fg);
    g.textBaseline = 'middle'; g.direction = 'ltr';
    const textH = fit.lines.length * fit.size * LINE_HEIGHT;
    const top = where.box.y + where.box.h / 2 - textH / 2;
    fit.lines.forEach((line, i) => {
      const lw = g.measureText(line).width;
      const x = where.align === 'left' ? where.box.x + 0.01 * where.box.w : where.box.x + (where.box.w - lw) / 2;
      g.fillText(line, x, top + i * fit.size * LINE_HEIGHT + (fit.size * LINE_HEIGHT) / 2);
    });
    r.drawn = true;
  }
}

const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));

/** The passes tried, in order, until one reading is confident: [picture preparation, page mode]. */
export const READING_PASSES = [['binary', 6], ['binary', 11]];   // a third, grey pass was measured and did not help (docs/photo/CAMERA-TRANSLATE.md)

/** Read the levelled photo: enlarged if small, letters made dark on light, several passes tried, the most confident reading kept. */
export async function readSign(levelled, eng, { doc, readerMode, passes = READING_PASSES } = {}) {
  const scale = Math.min(3, Math.max(1, READER_TARGET_SIDE / Math.max(levelled.width, levelled.height)));
  const prepared = new Map();
  const prepare = async (mode) => {
    if (prepared.has(mode)) return prepared.get(mode);
    const big = Object.assign(doc.createElement('canvas'), { width: Math.round(levelled.width * scale), height: Math.round(levelled.height * scale) });
    const g = big.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(levelled, 0, 0, big.width, big.height);
    const id = g.getImageData(0, 0, big.width, big.height);
    readerImage(id, mode);
    g.putImageData(id, 0, 0);
    const png = await toBlob(big, 'image/png'); prepared.set(mode, png); return png;
  };
  let best = []; let bestScore = -1;
  for (const [mode, psm] of (readerMode ? passes.filter((p) => p[0] === readerMode) : passes)) {
    const words = (await eng.ocr(await prepare(mode), { mode: 'sign', psm })).filter((w) => !(w.conf < 0));
    const heb = words.filter((w) => isHebrew(w.text));
    const letters = heb.reduce((a, w) => a + [...w.text].length, 0);
    const score = heb.reduce((a, w) => a + (w.conf ?? 0) * [...w.text].length, 0);
    if (score > bestScore) { best = words; bestScore = score; }
    if (letters && heb.every((w) => (w.conf ?? 0) >= 88)) break;      // already a confident reading: skip the remaining passes
  }
  return best.map((w) => ({ ...w, x: w.x / scale, y: w.y / scale, w: w.w / scale, h: w.h / scale }));
}

/**
 * @param {Blob} photo a metadata-free JPEG (see cleanPhoto in camera.view.js)
 * @param {{glossary:object, dictionaryLoader?:()=>Promise<object>, onProgress?:Function, doc?:Document, engine?:{ocr:Function}, readerMode?:string}} o
 *   `engine` is injectable for tests; `dictionaryLoader` is called at most once, and only if a line is still untranslated.
 * @returns {Promise<{width:number,height:number,regions:object[],blob:Blob|null,notices:string[],engine:object,levelled:{applied:boolean,angle:number},dictionary:object|null}>}
 */
export async function translateOnDevice(photo, { glossary, dictionaryLoader, onProgress, doc = globalThis.document, engine, readerMode } = {}) {
  let eng = engine;
  if (!eng) {
    const { createBrowserTesseract } = await import('../photo/engines/tesseract-browser.js');
    eng = createBrowserTesseract({ preprocess: false, deskew: false, psm: 6, onProgress });   // this file prepares the picture itself
  }
  const bmp = await createImageBitmap(photo);
  const canvas = Object.assign(doc.createElement('canvas'), { width: bmp.width, height: bmp.height });
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(bmp, 0, 0);
  bmp.close?.();
  const id = g.getImageData(0, 0, canvas.width, canvas.height);
  const sk = deskew(id);                                   // level a tilted sign before reading it
  if (sk.applied) g.putImageData(id, 0, 0);
  const levelled = { applied: !!sk.applied, angle: sk.applied ? sk.angle : 0 };
  const boxes = await readSign(canvas, eng, { doc, readerMode });
  const regions = regionsFromBoxes(boxes, glossary);
  let dictionary = null;
  if (dictionaryLoader && regions.some((r) => !r.held && !r.en)) {
    try { dictionary = await dictionaryLoader(); } catch { dictionary = null; }
    if (dictionary) for (const r of regions) {
      if (r.held || r.en) continue;
      const w = wordForWord(r.he, glossary, dictionary);
      if (w) Object.assign(r, { en: w.en, translationSource: 'word-for-word', translit: r.translit || w.translit, pointed: r.pointed || w.pointed });
    }
  }
  for (const r of regions) r.boxOriginal = boxOnOriginal(r.box, canvas.width, canvas.height, levelled.angle);
  drawOverlay(canvas, regions);
  const notices = [];
  if (!regions.length) notices.push('No Hebrew text was found in this photo.');
  else if (!regions.some((r) => r.drawn)) notices.push('Hebrew was found, but none of it could be translated on this device.');
  if (levelled.applied && regions.some((r) => r.drawn)) notices.push('The sign was tilted, so the translated photo has been straightened.');
  const blob = regions.some((r) => r.drawn) ? await toBlob(canvas, 'image/jpeg', 0.9) : null;
  return { width: canvas.width, height: canvas.height, regions, blob, notices, engine: eng, levelled, dictionary };
}
