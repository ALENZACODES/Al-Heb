// Network adapters. STATUS (2026-11-07, fix #16): the online vowelizer (Dicta Nakdan) and the Google Cloud Vision
// adapters were REMOVED from this file. Both named hosts the site CSP blocks (connect-src in _headers lists only
// 'self' plus loopback), so the fetches could never run on the hosted site; Dicta also publishes no terms and the
// project does not ship a third-party vowel service. The in-browser Tesseract adapter below is still UNEXERCISED
// (for in-browser Tesseract use tesseract-browser.js instead), and the LibreTranslate adapter is unused by the app.
// Nothing here has been run on a real photo.
// Every network adapter takes an injectable `fetch`, has describe() and a `dry` option that returns the request
// it WOULD send without sending it. Run `node src/photo/engines/web.js --dry` to print all descriptions.
// See docs/photo/ENGINES.md for the verified/unverified matrix.

// ---------- Tesseract.js (OCR, in-browser WASM) ----------
// UNVERIFIED: not installed here. Caller supplies the Tesseract module (`import Tesseract from 'tesseract.js'`).
// Language data 'heb' downloads at runtime unless self-hosted. Niqqud is often dropped or misread (unmeasured).
export function tesseractWordsToBoxes(data) {
  const words = data?.words ?? [];
  return words.filter((w) => w && String(w.text ?? '').trim() && w.bbox)
    .map((w) => ({ text: w.text.trim(), x: w.bbox.x0, y: w.bbox.y0, w: w.bbox.x1 - w.bbox.x0, h: w.bbox.y1 - w.bbox.y0, conf: w.confidence }));
}
export function createTesseractOcr({ Tesseract, lang = 'heb', dry = false } = {}) {
  return {
    name: 'tesseract.js heb (unverified adapter)', unverified: true,
    describe: () => `Tesseract.recognize(image, "${lang}") -> data.words[].bbox -> boxes. Needs tesseract.js + heb.traineddata (not installed here).`,
    async ocr(image) {
      if (dry) return { dry: true, call: `Tesseract.recognize(<image>, "${lang}")` };
      if (!Tesseract?.recognize) throw new Error('Tesseract module not provided');
      const { data } = await Tesseract.recognize(image, lang);
      return tesseractWordsToBoxes(data);
    },
  };
}

// ---------- LibreTranslate-compatible translator (he -> en) ----------
// UNVERIFIED: request shape is LibreTranslate's documented /translate form as remembered; the he model quality is
// unmeasured. LibreTranslate server is AGPL: run it as a separate service, point `url` at it.
export function createLibreTranslate({ fetch: f = globalThis.fetch, url = 'http://localhost:5000/translate', apiKey, dry = false } = {}) {
  return {
    name: 'libretranslate-compatible (unverified adapter)', unverified: true,
    describe: () => `POST ${url} {q:<text>, source:"he", target:"en", format:"text"} -> {translatedText}. Output is machine translation.`,
    async translate(text) {
      const body = { q: text, source: 'he', target: 'en', format: 'text', ...(apiKey ? { api_key: apiKey } : {}) };
      if (dry) return { dry: true, request: { url, method: 'POST', body: { ...body, api_key: apiKey ? '<redacted>' : undefined } } };
      if (typeof f !== 'function') throw new Error('no fetch available');
      const res = await f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
      const j = await res.json();
      return { text: j.translatedText, engine: 'libretranslate-compatible' };
    },
  };
}

// ---------- Phonikud (IPA) placeholder ----------
// Phonikud runs as an ONNX model + Python packages; no JS runtime is wired. This placeholder is deliberately inert:
// the pipeline skips the IPA step when engines.ipa is absent.
export function createPhonikudPlaceholder() {
  return { name: 'phonikud (placeholder, not wired)', installed: false, describe: () => 'No-op. Real wiring needs phonikud-onnx (Python) behind a service, or an ONNX runtime in the browser; not done.', ipa: undefined };
}

export function describeAdapters() {
  const adapters = [createTesseractOcr({}), createLibreTranslate({}), createPhonikudPlaceholder()];
  return adapters.map((a) => `${a.name}: ${a.describe()}`);
}

if (typeof process !== 'undefined' && process.argv?.includes('--dry') && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(describeAdapters().join('\n'));
}
