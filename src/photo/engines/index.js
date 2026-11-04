// Provider for the photo feature's real engines: `ctx.photoEngines` for src/photo/scan.view.js.
//   OCR        in-browser tesseract.js (vendored, on device)            [always]      or the local helper (opt-in via localServerUrl)
//   Vowelizer  Dicta Nakdan (online; sends the recognised text to Dicta) [only if online:true]
//   Translate  Argos Translate via the local helper                      [only if localServerUrl is set and the helper is running]
// Nothing is enabled implicitly that would send data off the device. No IPA engine is wired (Phonikud has no JS runtime here).
// Status: all three adapters were exercised on SYNTHETIC images / public test phrases only. See docs/photo/BENCHMARK.md.
import { composeEngines } from '../pipeline.js';
import { createBrowserTesseract } from './tesseract-browser.js';
import { createNakdanVowelizer } from './web.js';
import { createLocalServer } from './local-server.js';

let sharedBrowserOcr = null; // one WASM worker for the page's lifetime

/**
 * @param {{online?:boolean, localServerUrl?:string|null, useLocalOcr?:boolean, preprocess?:boolean, psm?:number, onProgress?:Function, fetch?:Function, tesseractLoader?:Function}} [o]
 * @returns engine bundle for runPipeline (+ `.disclosure`: plain-language list of what leaves the device)
 */
export function createPhotoEngines({ online = false, localServerUrl = null, useLocalOcr = false, preprocess = true, deskew = true, psm = 6, onProgress, fetch: f, tesseractLoader } = {}) {
  const local = localServerUrl ? createLocalServer({ url: localServerUrl, fetch: f }) : null;
  let ocrPart;
  if (local && useLocalOcr) ocrPart = local.ocr;
  else {
    if (!sharedBrowserOcr || tesseractLoader) sharedBrowserOcr = createBrowserTesseract({ preprocess, deskew, psm, onProgress, loader: tesseractLoader });
    ocrPart = sharedBrowserOcr;
  }
  const parts = { ocr: ocrPart };
  const disclosure = [];
  if (online) { parts.vowelize = createNakdanVowelizer(f ? { fetch: f } : {}); disclosure.push('The recognised Hebrew text (not the photo) is sent to Dicta (dicta.org.il) to add vowels.'); }
  if (local) { parts.translate = local.translate; disclosure.push(`Translation runs on your own helper at ${localServerUrl}.`); }
  if (local && useLocalOcr) disclosure.push(`The photo is sent to your own helper at ${localServerUrl}.`);
  const bundle = composeEngines(parts);
  bundle.disclosure = disclosure;
  bundle.names = { ...bundle.names, ocr: ocrPart.name, ...(parts.vowelize ? { vowelize: parts.vowelize.name } : {}), ...(parts.translate ? { translate: parts.translate.name } : {}) };
  bundle.name = Object.values(bundle.names).join(' + ');
  bundle.terminate = async () => { if (sharedBrowserOcr) { await sharedBrowserOcr.terminate(); sharedBrowserOcr = null; } };
  return bundle;
}
