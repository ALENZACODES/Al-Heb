// Adapter for the optional local helper (tools/ocr-server.mjs): Tesseract CLI OCR and Argos he->en translation over HTTP on localhost.
// Image bytes and text go to YOUR OWN machine (default http://127.0.0.1:8787), not a third party. Needs the server running.
export const LOCAL_SERVER_DEFAULT = 'http://127.0.0.1:8787';

/** Only loopback http(s) URLs are accepted as a "local helper", so a typo cannot send text or photos to a third party. */
export function isLocalHelperUrl(u) {
  try { const x = new URL(u); return (x.protocol === 'http:' || x.protocol === 'https:') && ['localhost', '127.0.0.1', '[::1]'].includes(x.hostname); } catch { return false; }
}

export function createLocalServer({ url = LOCAL_SERVER_DEFAULT, fetch: f = globalThis.fetch } = {}) {
  const post = async (path, init) => {
    if (typeof f !== 'function') throw new Error('no fetch available');
    const res = await f(url.replace(/\/$/, '') + path, { method: 'POST', ...init });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `local server HTTP ${res.status}`);
    return j;
  };
  return {
    ocr: {
      name: 'tesseract-cli via local helper', sendsImageOffDevice: false,
      describe: () => `POST ${url}/ocr (image bytes) -> {boxes}`,
      async ocr(image) {
        if (!(typeof Blob !== 'undefined' && image instanceof Blob)) throw new Error('local OCR needs a File/Blob');
        return (await post('/ocr', { headers: { 'Content-Type': image.type || 'application/octet-stream' }, body: image })).boxes;
      },
    },
    translate: {
      name: 'argos-translate he-en (local helper)', sendsTextOffDevice: false,
      describe: () => `POST ${url}/translate {text} -> {text}`,
      async translate(text) {
        const j = await post('/translate', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
        return { text: j.text, engine: j.engine || 'argos-translate (local)' };
      },
    },
    async health() { const res = await f(url.replace(/\/$/, '') + '/health'); return res.json(); },
  };
}
