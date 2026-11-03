// REAL but UNEXERCISED adapters. Nothing here has been run against a live service or a real photo in this build.
// Every network adapter takes an injectable `fetch`, has describe() and a `dry` option that returns the request
// it WOULD send without sending it. Run `node src/photo/engines/web.js --dry` to print all descriptions.
// See docs/photo/ENGINES.md for the verified/unverified matrix.

// ---------- Dicta Nakdan (vowelizer) ----------
// UNVERIFIED: endpoint URL, request fields and response shape below are from memory of the public Nakdan web client
// (the MIT client moshejs/dicta-nakdan was NOT readable in this session). Confirm against the client source and
// Dicta's terms before use. URL is configurable for that reason.
export const NAKDAN_DEFAULT_URL = 'https://nakdan-5-0.loadbalancer.dicta.org.il/api';

export function nakdanRequest(text, { url = NAKDAN_DEFAULT_URL, genre = 'modern' } = {}) {
  return {
    url, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: { task: 'nakdan', data: text, genre, addmorph: true, keepqq: false, nodageshdefmem: false, patachma: false, keepmetagim: false, matchpartial: true },
  };
}
/** Pick the first suggestion per word; Dicta marks morpheme boundaries with '|' which we drop. */
export function parseNakdanResponse(json) {
  const items = Array.isArray(json) ? json : (json?.data ?? []);
  return items.map((it) => {
    if (typeof it === 'string') return it;
    const opt = it?.options?.[0];
    const w = typeof opt === 'string' ? opt : (opt?.w ?? opt?.word);
    return String(w ?? it?.word ?? '').replace(/\|/g, '');
  }).join('');
}
export function createNakdanVowelizer({ fetch: f = globalThis.fetch, url = NAKDAN_DEFAULT_URL, dry = false, genre = 'modern' } = {}) {
  const a = {
    name: 'dicta-nakdan (unverified adapter)', unverified: true,
    describe: () => `POST ${url} JSON {task:"nakdan", data:<unpointed text>, genre:"${genre}", ...} -> pick first option per word. UNVERIFIED endpoint/shape.`,
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
