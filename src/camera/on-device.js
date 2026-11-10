// Camera translator, on-device path: nothing leaves the browser.
// Reading uses the app's existing in-browser Hebrew reader (src/photo/engines/tesseract-browser.js, vendored, lazy ~5 MB on first use)
// and its reading-order code (src/photo/order-lines.js). Translation is the small built-in sign word list only.
// The overlay is simpler than the service's: each box is painted with the sign's own colour, then the English is drawn.
import { regionsFromBoxes, chooseAlignment, fitText, boxColours, LINE_HEIGHT } from './camera-model.js';

const FONT_STACK = '"Alef", "Heebo", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Draw the English over each translated region. `canvas` already holds the photo. Marks regions as drawn. */
export function drawOverlay(canvas, regions) {
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width; const H = canvas.height;
  const todo = regions.filter((r) => r.en && !r.held);
  if (!todo.length) return;
  const pixels = g.getImageData(0, 0, W, H).data;
  const place = chooseAlignment(todo, W);
  const measure = (text, size) => { g.font = `700 ${size}px ${FONT_STACK}`; return g.measureText(text).width; };
  const plans = todo.map((r) => ({ r, colours: boxColours(pixels, W, H, r.box), where: place.get(r.id) }));
  for (const { r, colours } of plans) {            // paint out every Hebrew box first
    const pad = Math.max(2, Math.round(r.box.h * 0.14));
    g.fillStyle = `rgb(${colours.bg.join(',')})`;
    g.fillRect(Math.max(0, r.box.x - pad), Math.max(0, r.box.y - pad), Math.min(W, r.box.w + 2 * pad), Math.min(H, r.box.h + 2 * pad));
  }
  for (const { r, colours, where } of plans) {
    const fit = fitText(measure, r.en, where.box.w, where.box.h);
    g.font = `700 ${fit.size}px ${FONT_STACK}`;
    g.fillStyle = `rgb(${colours.fg.join(',')})`;
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

/**
 * @param {Blob} photo a metadata-free JPEG (see cleanPhoto in camera.view.js)
 * @param {{glossary:object, onProgress?:Function, doc?:Document, engine?:{ocr:Function}}} o `engine` is injectable for tests
 * @returns {Promise<{width:number,height:number,regions:object[],blob:Blob|null,notices:string[],engine:object}>}
 */
export async function translateOnDevice(photo, { glossary, onProgress, doc = globalThis.document, engine } = {}) {
  let eng = engine;
  if (!eng) {
    const { createBrowserTesseract } = await import('../photo/engines/tesseract-browser.js');
    eng = createBrowserTesseract({ preprocess: true, deskew: false, psm: 11, onProgress });
  }
  const bmp = await createImageBitmap(photo);
  const canvas = Object.assign(doc.createElement('canvas'), { width: bmp.width, height: bmp.height });
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0);
  const boxes = await eng.ocr(photo, { mode: 'sign' });
  const regions = regionsFromBoxes(boxes, glossary);
  drawOverlay(canvas, regions);
  const notices = [];
  if (!regions.length) notices.push('No Hebrew text was found in this photo.');
  else if (!regions.some((r) => r.drawn)) notices.push('Hebrew was found, but none of it is in the built-in word list.');
  const blob = regions.some((r) => r.drawn) ? await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9)) : null;
  return { width: canvas.width, height: canvas.height, regions, blob, notices, engine: eng };
}
