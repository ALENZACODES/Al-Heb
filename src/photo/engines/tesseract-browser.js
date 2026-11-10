// In-browser Hebrew OCR using a VENDORED tesseract.js 7.0.0 (Apache-2.0) + tessdata_fast `heb` (Apache-2.0).
// Files live in assets/vendor/_tesseract/ (see its README.md for sizes, versions and the caching plan). Nothing is fetched from a CDN.
// The module is lazy: importing this file costs nothing; the ~5 MB of WASM/model is only requested on the first ocr() call.
// Measured only on SYNTHETIC rendered images (docs/photo/BENCHMARK.md). Real-photo accuracy is UNKNOWN.
import { autoNormalize, targetSize, deskew, adaptiveBinarize } from '../preprocess.js';

export const DEFAULT_BASE = new URL('../../../assets/vendor/_tesseract/', import.meta.url).href;

/** tesseract.js (v7, `blocks` output) -> [{text,x,y,w,h,conf}] (image pixels, top-left origin). */
export function wordsFromData(data) {
  const out = [];
  const push = (wd) => { const t = String(wd?.text ?? '').trim(); if (t && wd.bbox) out.push({ text: t, x: wd.bbox.x0, y: wd.bbox.y0, w: wd.bbox.x1 - wd.bbox.x0, h: wd.bbox.y1 - wd.bbox.y0, conf: wd.confidence }); };
  if (Array.isArray(data?.words) && data.words.length) data.words.forEach(push);
  else for (const b of data?.blocks ?? []) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) for (const wd of l.words ?? []) push(wd);
  return out;
}

/** Draw any browser image source to a canvas, capped to maxSide, optionally contrast-normalised; returns a PNG Blob + scale. */
export async function prepareImage(image, { preprocess = true, deskew: doDeskew = false, binarize = false, maxSide = 2400, doc = globalThis.document } = {}) {
  let bmp = image;
  if (typeof Blob !== 'undefined' && image instanceof Blob && typeof createImageBitmap === 'function') bmp = await createImageBitmap(image);
  const sw = bmp.width ?? bmp.naturalWidth, sh = bmp.height ?? bmp.naturalHeight;
  if (!sw || !sh) throw new Error('cannot read image size');
  const { width, height, scale } = targetSize(sw, sh, { maxSide });
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : Object.assign(doc.createElement('canvas'), { width, height });
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(bmp, 0, 0, width, height);
  const info = { deskew: null };
  if (preprocess || doDeskew || binarize) {
    const id = g.getImageData(0, 0, width, height);
    if (doDeskew) info.deskew = deskew(id); // first: the ink/background split is cleanest on the untouched pixels
    if (preprocess) autoNormalize(id);
    if (binarize) adaptiveBinarize(id);
    g.putImageData(id, 0, 0);
  }
  const blob = canvas.convertToBlob ? await canvas.convertToBlob({ type: 'image/png' }) : await new Promise((res) => canvas.toBlob(res, 'image/png'));
  return { blob, scale, width, height, ...info };
}

/**
 * @param {{baseUrl?:string, lang?:string, psm?:number|string, preprocess?:boolean, onProgress?:(m:object)=>void, loader?:()=>Promise<any>}} [o]
 * `loader` is injectable for tests; it must resolve to the tesseract.js module (or its default export).
 */
export function createBrowserTesseract({ baseUrl = DEFAULT_BASE, lang = 'heb', psm = 6, preprocess = true, deskew: doDeskew = false, binarize = false, onProgress, loader } = {}) {
  let worker = null; let loading = null;
  const load = loader || (async () => (await import(new URL('tesseract.esm.min.js', baseUrl).href)).default);
  async function getWorker() {
    if (worker) return worker;
    if (!loading) loading = (async () => {
      const T = await load();
      const w = await T.createWorker(lang, 1 /* LSTM only */, {
        workerPath: new URL('worker.min.js', baseUrl).href,
        corePath: new URL('tesseract-core-simd-lstm.wasm.js', baseUrl).href, // a full .js path is used as-is (no CDN lookup)
        langPath: baseUrl, gzip: false, workerBlobURL: false,
        logger: onProgress || (() => {}),
      });
      worker = w; return w;
    })();
    return loading;
  }
  return {
    name: 'tesseract.js-7 heb (tessdata_fast, in-browser WASM)',
    sendsImageOffDevice: false,
    describe: () => `vendored tesseract.js 7.0.0 + heb tessdata_fast from ${baseUrl}; psm ${psm}; contrast normalisation ${preprocess ? 'on' : 'off'}; deskew ${doDeskew ? 'on' : 'off'}; binarize ${binarize ? 'on' : 'off'}`,
    /** @returns {Promise<Array<{text:string,x:number,y:number,w:number,h:number,conf?:number}>>} */
    async ocr(image, { mode, psm: callPsm } = {}) {
      const w = await getWorker();
      const prepared = await prepareImage(image, { preprocess, deskew: doDeskew, binarize });
      await w.setParameters({ tessedit_pageseg_mode: String(callPsm ?? psm) });
      const { data } = await w.recognize(prepared.blob, {}, { blocks: true });
      return wordsFromData(data).map((b) => ({ ...b, x: b.x / prepared.scale, y: b.y / prepared.scale, w: b.w / prepared.scale, h: b.h / prepared.scale }));
    },
    async terminate() { if (worker) { await worker.terminate(); worker = null; loading = null; } },
  };
}
