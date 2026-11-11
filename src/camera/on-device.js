// Camera translator: everything happens in the browser. Nothing is uploaded.
// Reading uses the app's existing in-browser Hebrew reader (src/photo/engines/tesseract-browser.js, vendored, about 5 MB on
// first use), its levelling code (src/photo/preprocess.js) and its reading-order code (src/photo/order-lines.js).
// Translation: the sign word list, then the app phrasebook, then (only if a line is still untranslated) the app dictionary
// word for word. The English is then drawn over the Hebrew on the levelled photo.
import { deskew } from '../photo/preprocess.js';
import { regionsFromBoxes, chooseAlignment, fitText, boxColours, readerImage, wordForWord, boxOnOriginal, findOccluders, besideBar, lineHadNoise, lineForPack, signCase, LINE_HEIGHT } from './camera-model.js';
import { isHebrew } from '../photo/hebrew.js';

const FONT_STACK = '"Alef", "Heebo", system-ui, -apple-system, "Segoe UI", sans-serif';
export const READER_TARGET_SIDE = 1200;   // first reading: the photo's long side is brought to this (never more than 3x)
export const READER_MARGIN = 0.04;        // white frame added around the picture for the reader, as a share of its longer side

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

/** Page modes tried at the first size: one block of text, then scattered text. The more confident reading is kept. */
export const PAGE_MODES = [6, 11];
export const LETTER_HEIGHT = 44;          // the reader does best when letters are about this many pixels tall

/**
 * Read the levelled photo. Returns one or two readings of the whole picture, each a list of word boxes in photo pixels:
 *   1. at a standard size (long side READER_TARGET_SIDE, never more than 3x), trying each page mode;
 *   2. again at the size that makes the letters about LETTER_HEIGHT pixels tall, when that is a clearly different size.
 * The reader makes different mistakes at different letter sizes; translateOnDevice keeps, line by line, the reading that
 * the word list recognises.
 */
export async function readSign(levelled, eng, { doc, readerMode = 'binary', pageModes = PAGE_MODES, targetSide = READER_TARGET_SIDE, secondSize = true } = {}) {
  const long = Math.max(levelled.width, levelled.height);
  const readAt = async (scale, psms) => {
    const pad = Math.round(long * scale * READER_MARGIN);   // the reader misses letters that touch the edge
    const big = Object.assign(doc.createElement('canvas'), { width: Math.max(8, Math.round(levelled.width * scale)), height: Math.max(8, Math.round(levelled.height * scale)) });
    const g = big.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(levelled, 0, 0, big.width, big.height);
    const id = g.getImageData(0, 0, big.width, big.height);
    readerImage(id, readerMode);
    g.putImageData(id, 0, 0);
    const framed = Object.assign(doc.createElement('canvas'), { width: big.width + 2 * pad, height: big.height + 2 * pad });
    const f = framed.getContext('2d');
    const corner = id.data[0];                       // after readerImage the background is the light side
    f.fillStyle = readerMode === 'binary' ? '#fff' : `rgb(${corner},${corner},${corner})`; f.fillRect(0, 0, framed.width, framed.height);
    f.drawImage(big, pad, pad);
    const png = await toBlob(framed, 'image/png');
    let best = null;
    for (const psm of psms) {
      const words = (await eng.ocr(png, { mode: 'sign', psm })).filter((w) => !(w.conf < 0));
      const heb = words.filter((w) => isHebrew(w.text));
      const letters = heb.reduce((a, w) => a + [...w.text].length, 0);
      const score = heb.reduce((a, w) => a + (w.conf ?? 0) * [...w.text].length, 0);
      if (!best || score > best.score) best = { words, score, psm, scale, pad };
      if (letters && heb.every((w) => (w.conf ?? 0) >= 88)) break;      // already a confident reading: skip the other page mode
    }
    best.letterHeight = median(best.words.filter((w) => isHebrew(w.text) && [...w.text].length > 1).map((w) => w.h));   // in enlarged pixels
    best.words = best.words.map((w) => ({ ...w, x: (w.x - pad) / scale, y: (w.y - pad) / scale, w: w.w / scale, h: w.h / scale }));
    return best;
  };
  const first = await readAt(Math.min(3, targetSide / long), pageModes);
  const out = [first];
  if (secondSize && first.letterHeight) {
    const scale = Math.min(4, Math.max(0.2, first.scale * (LETTER_HEIGHT / first.letterHeight)));
    if (Math.abs(scale / first.scale - 1) > 0.25 && long * scale >= 160) out.push(await readAt(scale, [first.psm]));
  }
  return out;
}
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

/**
 * Two readings of the same photo -> one list of lines. Lines are paired by where they sit. For each pair the reading the
 * word list recognises outright wins; then a closest match; then the more confident reading. Lines only one reading found
 * are kept from the first.
 */
export function mergeReadings(a, b) {
  const rank = (r) => (r.held ? 3 : !r.en ? 0 : r.translationSource === 'word-list-near' ? 1 : 2);
  const overlap = (p, q) => { const top = Math.max(p.y, q.y); const bot = Math.min(p.y + p.h, q.y + q.h); return Math.max(0, bot - top) / Math.max(1, Math.min(p.h, q.h)); };
  const used = new Set();
  const out = a.map((ra) => {
    let match = null; let bestOv = 0.5;
    b.forEach((rb, i) => { if (used.has(i)) return; const ov = overlap(ra.box, rb.box); if (ov > bestOv) { bestOv = ov; match = i; } });
    if (match === null) return ra;
    used.add(match); const rb = b[match];
    if (rank(rb) > rank(ra)) return rb;
    if (rank(rb) === rank(ra) && rank(ra) === 0 && (rb.conf ?? 0) > (ra.conf ?? 0)) return rb;
    return ra;
  });
  return out.map((r, i) => ({ ...r, id: `r${i + 1}` }));
}

/**
 * One more look at each line that is still untranslated: the line is cut out on its own, brought to the letter height the
 * reader likes, and read as a single line. The new reading replaces the old one only if the word list recognises it.
 */
export async function retryLines(levelled, eng, regions, glossary, doc) {
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    if (r.held || r.en) continue;
    const padX = r.box.h * 0.6; const padY = r.box.h * 0.35;
    const x = Math.max(0, r.box.x - padX); const y = Math.max(0, r.box.y - padY);
    const w = Math.min(levelled.width - x, r.box.w + 2 * padX); const h = Math.min(levelled.height - y, r.box.h + 2 * padY);
    if (w < 8 || h < 8) continue;
    const scale = Math.min(4, Math.max(0.2, LETTER_HEIGHT / Math.max(4, r.box.h)));
    const cut = Object.assign(doc.createElement('canvas'), { width: Math.max(8, Math.round(w * scale)), height: Math.max(8, Math.round(h * scale)) });
    const g = cut.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(levelled, x, y, w, h, 0, 0, cut.width, cut.height);
    const id = g.getImageData(0, 0, cut.width, cut.height); readerImage(id, 'binary'); g.putImageData(id, 0, 0);
    const pad = Math.round(cut.height * 0.5);
    const framed = Object.assign(doc.createElement('canvas'), { width: cut.width + 2 * pad, height: cut.height + 2 * pad });
    const f = framed.getContext('2d'); f.fillStyle = '#fff'; f.fillRect(0, 0, framed.width, framed.height); f.drawImage(cut, pad, pad);
    let words;
    try { words = (await eng.ocr(await toBlob(framed, 'image/png'), { mode: 'sign', psm: 7 })).filter((wd) => !(wd.conf < 0)); } catch { continue; }
    const again = regionsFromBoxes(words.map((wd) => ({ ...wd, x: (wd.x - pad) / scale + x, y: (wd.y - pad) / scale + y, w: wd.w / scale, h: wd.h / scale })), glossary);
    const better = again.find((a) => a.en && !a.held);
    if (better && again.length === 1) regions[i] = { ...better, id: r.id };
  }
}

/**
 * @param {Blob} photo a metadata-free JPEG (see cleanPhoto in camera.view.js)
 * @param {{glossary:object, dictionaryLoader?:()=>Promise<object>, onProgress?:Function, doc?:Document, engine?:{ocr:Function}, readerMode?:string}} o
 *   `engine` is injectable for tests; `dictionaryLoader` is called at most once, and only if a line is still untranslated.
 * @returns {Promise<{width:number,height:number,regions:object[],blob:Blob|null,notices:string[],engine:object,levelled:{applied:boolean,angle:number},dictionary:object|null}>}
 */
export async function translateOnDevice(photo, { glossary, dictionaryLoader, translator, onProgress, doc = globalThis.document, engine, readerMode, targetSide, secondSize, lineRetry = true, occluders = true } = {}) {
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
  // A pole or post in front of the sign: the reader is given a copy with the bar painted in the sign's own background, so the bar
  // is not read as ink. The photo shown to the learner keeps the bar.
  const hidden = occluders ? findOccluders(sk.applied ? g.getImageData(0, 0, canvas.width, canvas.height) : id) : { bars: [], background: null };
  let reading = canvas;
  if (hidden.bars.length && hidden.background) {
    reading = Object.assign(doc.createElement('canvas'), { width: canvas.width, height: canvas.height });
    const rg = reading.getContext('2d', { willReadFrequently: true });
    rg.drawImage(canvas, 0, 0);
    rg.fillStyle = rgb(hidden.background);
    for (const b of hidden.bars) rg.fillRect(b.x, 0, b.w, canvas.height);
  }
  const readings = await readSign(reading, eng, { doc, readerMode, targetSide, secondSize });
  const perReading = readings.map((r) => regionsFromBoxes(r.words, glossary));
  const regions = perReading.length > 1 ? mergeReadings(perReading[0], perReading[1]) : perReading[0];
  if (lineRetry) await retryLines(reading, eng, regions, glossary, doc);
  // A line that runs into a bar has letters nobody can see. It keeps a translation only when the word list recognised the whole
  // line (every piece a listed word, or the closest listed phrase). A clean-looking piece of it is never translated as if it were the line.
  for (const r of regions) {
    if (r.held || !besideBar(r.box, hidden.bars)) continue;
    r.occluded = true;
    if (r.en && r.translationSource !== 'word-list-near' && lineHadNoise(r.he)) { r.en = null; r.translationSource = null; r.translit = null; }
    if (!r.en && glossary.completeAcrossGap) {
      // the pieces on each side of the bar, in reading order (Hebrew starts on the right), completed from the word list
      const bar = hidden.bars.find((b) => besideBar(r.box, [b]));
      const mid = bar.x + bar.w / 2;
      const pieces = (r.pieces || []).filter((p) => isHebrew(p.text) || /[0-9]/.test(p.text));
      const across = pieces.some((p) => p.x < bar.x - 2 && p.x + p.w > bar.x + bar.w + 2);
      const letters = pieces.reduce((a, p) => a + [...p.text.replace(/[^א-ת]/g, '')].length, 0);
      if (!across && letters) {
        const letterW = pieces.reduce((a, p) => a + p.w, 0) / letters;
        const side = (right) => pieces.filter((p) => (p.x + p.w / 2 > mid) === right).sort((p, q) => q.x - p.x).map((p) => p.text).join(' ');
        const done = glossary.completeAcrossGap(side(true), side(false), Math.ceil(bar.w / Math.max(1, letterW)) + 1);
        if (done) Object.assign(r, { en: done.en, translationSource: 'word-list-near', translit: done.translit, pointed: done.pointed, partial: false });
      }
    }
    if (!r.en) r.partial = true;
  }
  // Lines the word list does not hold go to the Hebrew to English language pack when it is on this device (the same pack the
  // Talk screen uses). Only a line that was read cleanly and with confidence is sent: a guess built on a misread line would look
  // just as fluent as a right one. A held line, a partly read line and a line behind a bar are never sent.
  let packUsed = 0;
  if (translator) for (const r of regions) {
    if (r.held || r.en || r.partial || r.occluded) continue;
    const line = lineForPack(r.he, r.conf);
    if (!line) continue;
    try {
      const en = signCase(await translator(line));
      if (en) { Object.assign(r, { en, translationSource: 'language-pack' }); packUsed++; }
    } catch { /* the pack could not answer: the dictionary below still may */ }
  }
  let dictionary = null;
  if (dictionaryLoader && regions.some((r) => !r.held && !r.en)) {
    try { dictionary = await dictionaryLoader(); } catch { dictionary = null; }
    if (dictionary) for (const r of regions) {
      if (r.held || r.en || r.partial) continue;      // a partly read line is never translated word for word
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
  return { width: canvas.width, height: canvas.height, regions, blob, notices, engine: eng, levelled, dictionary, bars: hidden.bars, packUsed };
}
