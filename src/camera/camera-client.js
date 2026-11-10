// Camera translator: the two network calls. Both are same-origin or to the configured service only.
import { normaliseResponse, decodeJpegDataUrl, resolveBackend } from './camera-model.js';

/** Read data/camera/config.json. A missing or broken file means "not set up". */
export async function loadConfig(fetchImpl = globalThis.fetch, pageHref = globalThis.location?.href) {
  try {
    const r = await fetchImpl(new URL('../../data/camera/config.json', import.meta.url));
    if (!r.ok) return resolveBackend('', pageHref);
    return resolveBackend((await r.json())?.backendUrl, pageHref);
  } catch { return resolveBackend('', pageHref); }
}

export async function loadGlossaryData(fetchImpl = globalThis.fetch) {
  const r = await fetchImpl(new URL('../../data/camera/sign-glossary.json', import.meta.url));
  if (!r.ok) throw new Error('word list missing');
  return r.json();
}

export class ServiceError extends Error {
  /** @param {'blocked'|'offline'|'busy'|'rejected'|'failed'} kind */
  constructor(kind, message) { super(message); this.kind = kind; }
}

/**
 * Send one metadata-free JPEG to the service and return its tidied answer plus the translated picture as a Blob.
 * @param {string} baseUrl from resolveBackend
 * @param {Blob} photo
 */
export async function translateViaService(baseUrl, photo, fetchImpl = globalThis.fetch) {
  let res;
  try {
    res = await fetchImpl(`${baseUrl}/translate-image`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: photo,
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
  } catch { throw new ServiceError('offline', 'The translation service could not be reached.'); }
  if (res.status === 429) throw new ServiceError('busy', 'Too many photos in a short time. Please wait a minute and try again.');
  if (res.status === 413 || res.status === 415 || res.status === 400) throw new ServiceError('rejected', 'The service could not accept this photo. Try a smaller or clearer one.');
  if (!res.ok) throw new ServiceError('failed', 'The translation service is not available right now.');
  let json; try { json = await res.json(); } catch { throw new ServiceError('failed', 'The translation service sent an answer that could not be read.'); }
  const tidy = normaliseResponse(json);
  const bytes = tidy.image ? decodeJpegDataUrl(tidy.image) : null;
  return { width: tidy.width, height: tidy.height, regions: tidy.regions, notices: tidy.notices,
    blob: bytes && tidy.regions.some((r) => r.drawn) ? new Blob([bytes], { type: 'image/jpeg' }) : null };
}
