// SVG overlay templates: mnemonic image layer + real Hebrew glyph as a VECTOR TEXT layer, in three states.
//   outline    mnemonic at full strength + glyph drawn as a thin outline with faint fill at ~40% opacity
//              (the "see the letter hide in the picture" match overlay)
//   solid      mnemonic dimmed to 25% + glyph solid deep-blue
//   silhouette no picture; bold charcoal glyph (pairs with the *_silhouette.png object image)
// Glyph source: data/letters/letters.json (lane 2) when present, else the built-in map below.
// Pure functions + a small CLI (node tools/images/overlay.mjs <letterId> [state] > out.svg).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const GLYPHS = {
  alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד', he: 'ה', vav: 'ו', zayin: 'ז', chet: 'ח', tet: 'ט', yod: 'י',
  kaf: 'כ', lamed: 'ל', mem: 'מ', nun: 'נ', samekh: 'ס', ayin: 'ע', pe: 'פ', tsadi: 'צ', qof: 'ק', resh: 'ר',
  shin: 'ש', tav: 'ת', 'kaf-final': 'ך', 'mem-final': 'ם', 'nun-final': 'ן', 'pe-final': 'ף', 'tsadi-final': 'ץ',
};
export const LETTER_IDS = Object.keys(GLYPHS);
export const STATES = ['outline', 'solid', 'silhouette'];
export const FONT_STACK = "'Noto Serif Hebrew','Frank Ruhl Libre','Ezra SIL','SBL Hebrew','Noto Serif Hebrew','FreeSerif','DejaVu Serif',serif";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Glyph for a letter id: letters.json record `.he` if available (and a single Hebrew letter), else built-in. */
export function glyphFor(id, lettersJson) {
  if (!(id in GLYPHS)) throw new Error(`unknown letter id: ${id}`);
  const recs = Array.isArray(lettersJson) ? lettersJson : lettersJson?.letters;
  const rec = recs?.find?.((r) => r.id === id);
  const he = rec?.he;
  if (typeof he === 'string' && /^[א-ת][֐-׏]*$/.test(he)) return he;
  return GLYPHS[id];
}

export function loadLettersJson() {
  const p = join(ROOT, 'data/letters/letters.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

/**
 * @param {{ id: string, state?: 'outline'|'solid'|'silhouette', imageHref?: string, size?: number,
 *           glyph?: string, lettersJson?: any, fontFamily?: string, glyphScale?: number, title?: string }} o
 * imageHref: URL of the mnemonic (real or placeholder; use book/img.js). Omit for no picture layer.
 */
export function overlaySvg(o) {
  const state = o.state ?? 'outline';
  if (!STATES.includes(state)) throw new Error(`unknown state: ${state}`);
  const S = o.size ?? 1024;
  const glyph = o.glyph ?? glyphFor(o.id, o.lettersJson === undefined ? loadLettersJson() : o.lettersJson);
  const fs = Math.round(S * (o.glyphScale ?? 0.78));
  const x = S / 2, y = Math.round(S * 0.5 + fs * 0.34);
  const ff = esc(o.fontFamily ?? FONT_STACK);
  const imgOpacity = state === 'solid' ? 0.25 : 1;
  const image = o.imageHref && state !== 'silhouette'
    ? `<image id="mnemonic" href="${esc(o.imageHref)}" x="0" y="0" width="${S}" height="${S}" preserveAspectRatio="xMidYMid meet" opacity="${imgOpacity}"/>` : '';
  const style = {
    outline: 'fill="#F6F1E7" fill-opacity="0.25" stroke="#1F3A5F" stroke-width="' + Math.round(S * 0.006) + '" stroke-opacity="0.4" opacity="0.4"',
    solid: 'fill="#1F3A5F"',
    silhouette: 'fill="#2B2B2B" stroke="#2B2B2B" stroke-width="' + Math.round(S * 0.01) + '" stroke-linejoin="round"',
  }[state];
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="${esc(o.title ?? `${o.id} ${state}`)}" data-letter="${esc(o.id)}" data-state="${state}">
<rect id="paper" width="${S}" height="${S}" fill="#F6F1E7"/>
${image}
<text id="glyph" x="${x}" y="${y}" text-anchor="middle" direction="rtl" xml:lang="he" lang="he" font-family="${ff}" font-size="${fs}" ${style}>${glyph}</text>
</svg>
`;
}

export function overlayAllStates(o) {
  return Object.fromEntries(STATES.map((s) => [s, overlaySvg({ ...o, state: s })]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [id, state = 'outline', href] = process.argv.slice(2);
  if (!id) { console.error('usage: node tools/images/overlay.mjs <letterId> [outline|solid|silhouette] [imageHref]'); process.exit(1); }
  process.stdout.write(overlaySvg({ id, state, imageHref: href }));
}
