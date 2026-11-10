// @ts-check
// Pure helpers for the Camera sign-translator screen.
import { holdsDivineName, resolveBackendUrl, stripNikkud } from '../talk/talk.model.js';

export { holdsDivineName, resolveBackendUrl, stripNikkud };
export const URL_KEY = 'alefTranslatorUrl';
export const SETTINGS_KEY = 'alef.camera.settings.v1';

/** @param {string} mime */
export function isImageMime(mime) {
  return /image\/(jpeg|jpg|png|webp|gif)/i.test(String(mime || ''));
}

/**
 * @param {ArrayBuffer|Uint8Array} bytes
 * JPEG EXIF starts after SOI; we never send metadata-stripping here (the server strips).
 * Client-side we only flag obviously huge files.
 */
export function tooLarge(bytes, max = 8 * 1024 * 1024) {
  const n = bytes && (bytes.byteLength || bytes.length) || 0;
  return n > max;
}

/** Honour reduced motion: shimmer only when the user has not asked for less motion. */
export function allowShimmer(prefersReduced) {
  return !prefersReduced;
}

export function regionLabel(region, translated) {
  if (!region) return '';
  if (region.held) return 'Held';
  return translated ? (region.translation || '') : (region.text || '');
}
