// @ts-check
// Print-and-share (R10): a QR code on the printed lesson sheet that opens that lesson in Aleph, where its letters and
// words can be heard. The sheet teaches on a fridge or a classroom wall; the code brings the sound. No DOM beyond a string.
import { encode, toSvg } from '../sync/qr.js';
import { appBase } from './share.js';

/** The address the code opens: this lesson, in this copy of Aleph. */
export const lessonLink = (lessonId, base = appBase()) => `${base}#/learn?lesson=${encodeURIComponent(lessonId)}`;
/** The QR code as an image address, with the link it holds. Medium error correction: a printed sheet gets creased and smudged. */
export function lessonQr(lessonId, base = appBase()) {
  const link = lessonLink(lessonId, base);
  return { link, src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(toSvg(encode(link, { level: 'M' }))) };
}
