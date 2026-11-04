// Network adapters. STATUS: the Dicta Nakdan adapter below was run against the live service (see its comment); the Tesseract, Vision and
// LibreTranslate adapters here are STILL UNEXERCISED (Vision needs a key; LibreTranslate public instance needs a paid key; for in-browser
// Tesseract use tesseract-browser.js instead). Nothing here has been run on a real photo.
// Every network adapter takes an injectable `fetch`, has describe() and a `dry` option that returns the request
// it WOULD send without sending it. Run `node src/photo/engines/web.js --dry` to print all descriptions.
// See docs/photo/ENGINES.md for the verified/unverified matrix.

// ---------- Dicta Nakdan (vowelizer) ----------
// VERIFIED 2026-11-04 by calling it (9 public test inputs, ~0.2 s each, HTTP 200, CORS `Access-Control-Allow-Origin: *`).
// Request/response shape was read from the production web client bundle (nakdan.dicta.org.il/assets/index-*.js) and confirmed with
// live calls; recorded responses are in data/photo/_fixtures/nakdan-recorded.json (options trimmed to 3).
// CAVEATS: (1) this is the endpoint the Nakdan WEBSITE uses; Dicta does not publish it as a documented public API here, so the host
// name (nakdan-u2-1a ...) may change without notice. (2) No terms of use, rate limit or SLA could be read (dicta.org.il/developers is a JS
// page with no readable text). Get Dicta's permission/terms before shipping this in a product. (3) The text being vowelized is
// sent to Dicta. Never send private data; the app UI must disclose it. The old guess `nakdan-5-0.loadbalancer...` returns HTTP 302.
export const NAKDAN_DEFAULT_URL = 'https://nakdan-u2-1a.loadbalancer.dicta.org.il/api';

export function nakdanRequest(text, { url = NAKDAN_DEFAULT_URL, genre = 'modern' } = {}) {
  return {
    url, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: { task: 'nakdan', data: text, genre, addmorph: true, keepmetagim: true, keepqq: false, nodageshdefmem: false, patachma: false, useTokenization: true },
  };
}
/**
 * Real shape: {data:[ {str, sep:false, nakdan:{word, options:[{w, lex, morph, levelChoice, prefix_len, ...}, ...]}}, {str:' ', sep:true, ...}, ... ]}
 * Options are ranked; we take options[0].w. `|` marks the prefix/stem boundary and is dropped. Meteg (U+05BD) is dropped too because the
 * syllabifier does not use it. Separator tokens (spaces/punctuation) are copied through from `str`.
 */
export function parseNakdanResponse(json) {
  const items = json?.data;
  if (!Array.isArray(items)) throw new Error('Nakdan: response has no data array');
  return items.map((it) => {
    if (it?.sep) return String(it.str ?? it.nakdan?.word ?? '');
    const w = it?.nakdan?.options?.[0]?.w;
    return String(w ?? it?.str ?? '').replace(/[|\u05BD]/g, '');
  }).join('').normalize('NFC'); // Nakdan's mark order is not canonical (e.g. shin dot after the vowel); NFC makes strings comparable
}
export function createNakdanVowelizer({ fetch: f = globalThis.fetch, url = NAKDAN_DEFAULT_URL, dry = false, genre = 'modern' } = {}) {
  const a = {
    name: 'dicta-nakdan', unverified: false, sendsTextOffDevice: true,
    describe: () => `POST ${url} JSON {task:"nakdan", data:<unpointed text>, genre:"${genre}", addmorph, keepmetagim, useTokenization...} -> data[].nakdan.options[0].w. Sends the text to Dicta. No published terms/rate limit found.`,
    async vowelize(text) {
      const req = nakdanRequest(text, { url, genre });
      if (dry) return { dry: true, request: req };
      if (typeof f !== 'function') throw new Error('no fetch available');
      const res = await f(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) });
      if (!res.ok) throw new Error(`Nakdan HTTP ${res.status}`);
      return parseNakdanResponse(await res.json());
    },
  };
  return a;
}

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

// ---------- Google Cloud Vision DOCUMENT_TEXT_DETECTION (cloud OCR) ----------
// UNVERIFIED: Hebrew support/price from prior knowledge only (research notes, "Unverified"). Requires an API key; sends the
// user's photo to Google, so the app must disclose that.
export const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
export function visionRequest(base64Image, apiKey = '<API_KEY>') {
  return {
    url: `${VISION_URL}?key=${apiKey}`, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: { requests: [{ image: { content: base64Image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], imageContext: { languageHints: ['he'] } }] },
  };
}
export function visionResponseToBoxes(json) {
  const out = [];
  const pages = json?.responses?.[0]?.fullTextAnnotation?.pages ?? [];
  for (const p of pages) for (const b of p.blocks ?? []) for (const para of b.paragraphs ?? []) for (const w of para.words ?? []) {
    const text = (w.symbols ?? []).map((s) => s.text).join('');
    const v = w.boundingBox?.vertices ?? [];
    if (!text || v.length < 4) continue;
    const xs = v.map((q) => q.x ?? 0); const ys = v.map((q) => q.y ?? 0);
    out.push({ text, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
  }
  return out;
}
export function createVisionOcr({ fetch: f = globalThis.fetch, apiKey, toBase64, dry = false } = {}) {
  return {
    name: 'google-cloud-vision (unverified adapter)', unverified: true, sendsImageOffDevice: true,
    describe: () => `POST ${VISION_URL}?key=<KEY> {requests:[{image:{content:<base64>}, features:[DOCUMENT_TEXT_DETECTION], imageContext:{languageHints:["he"]}}]}`,
    async ocr(image) {
      const b64 = toBase64 ? await toBase64(image) : '<base64>';
      const req = visionRequest(b64, apiKey ? '<redacted>' : '<API_KEY>');
      if (dry) return { dry: true, request: req };
      if (!apiKey || typeof f !== 'function') throw new Error('apiKey and fetch required');
      const res = await f(`${VISION_URL}?key=${apiKey}`, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) });
      if (!res.ok) throw new Error(`Vision HTTP ${res.status}`);
      return visionResponseToBoxes(await res.json());
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
  const adapters = [createTesseractOcr({}), createVisionOcr({}), createNakdanVowelizer({}), createLibreTranslate({}), createPhonikudPlaceholder()];
  return adapters.map((a) => `${a.name}: ${a.describe()}`);
}

if (typeof process !== 'undefined' && process.argv?.includes('--dry') && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(describeAdapters().join('\n'));
}
