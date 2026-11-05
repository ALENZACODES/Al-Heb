// Badge art: small original SVGs drawn by code, nothing fetched and no raster images. Pure and deterministic: the same input
// gives the same text. Shapes are plain geometry in the page's own colour variables (so light, dark and high-contrast themes
// follow), every stroke is 6 units wide, and each picture has a <title> and <desc>.
// The level is never shown by colour alone: the frame changes shape (circle, rounded square, hexagon) and 1, 2 or 3 dots are
// drawn under the picture. A badge that is not earned yet is a dashed outline. The only text inside a picture is a plain
// letter, on the two badges that are about letters.
export const STROKE = 6;
const V = { accent: 'var(--accent,#1f3a5f)', card: 'var(--card,#fffaf0)', accentFg: 'var(--accent-fg,#fffaf0)', muted: 'var(--muted,#5a6275)' };

const GLYPHS = Object.freeze({
  wave: 'M28 50Q39 34 50 50T72 50',
  'wave-long': 'M26 42Q38 28 50 42T74 42M26 58Q38 44 50 58T74 58',
  lines: 'M32 38H68M32 50H68M32 62H56',
  'lines-many': 'M32 34H68M32 44H68M32 54H68M32 64H56',
  book: 'M50 36V64M50 36Q40 30 30 34V62Q40 58 50 64M50 36Q60 30 70 34V62Q60 58 50 64',
  'book-pages': 'M34 36H56V64H34ZM44 30H66V58',
  'book-line': 'M50 34V58M50 34Q40 28 30 32V56Q40 52 50 58M50 34Q60 28 70 32V56Q60 52 50 58M36 68H64',
  waves: 'M40 38Q48 50 40 62M54 32Q70 50 54 68',
  bubble: 'M32 36H68V58H50L40 68V58H32Z',
  trio: 'M50 29a7 7 0 1 0 .01 0ZM36 53a7 7 0 1 0 .01 0ZM64 53a7 7 0 1 0 .01 0Z',
  cycle: 'M34 50A16 16 0 0 1 62 40M62 32V42H52M66 50A16 16 0 0 1 38 60M38 68V58H48',
  clock: 'M50 30a20 20 0 1 0 .01 0ZM50 50V38M50 50L60 56',
  house: 'M32 54L50 36L68 54M38 50V66H62V50',
  moon: 'M58 32A19 19 0 1 0 68 62A16 16 0 0 1 58 32Z',
  target: 'M50 30a20 20 0 1 0 .01 0ZM50 42a8 8 0 1 0 .01 0Z',
  hourglass: 'M36 34H64L50 50L64 66H36L50 50Z',
});
const LETTERS = Object.freeze({ 'letter-alef': 'א', 'letter-final': 'ך' });
export const GLYPH_NAMES = Object.freeze([...Object.keys(GLYPHS), ...Object.keys(LETTERS)]);

const FRAMES = Object.freeze({
  1: '<circle cx="50" cy="50" r="40"',
  2: '<rect x="12" y="12" width="76" height="76" rx="14"',
  3: '<polygon points="50,8 86,29 86,71 50,92 14,71 14,29"',
});
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * @param {{glyph:string, level:number, title:string, desc:string, uid?:string, size?:number, decorative?:boolean}} o  level 0 = not earned yet.
 *  decorative = hidden from screen readers (use only where the text beside the picture already gives the name, level and number)
 * @returns {string} one <svg> element
 */
export function badgeSVG({ glyph, level, title, desc, uid = 'b', size = 72, decorative = false }) {
  const lv = [0, 1, 2, 3].includes(level) ? level : 0, earned = lv > 0, filled = lv === 3;
  const ink = !earned ? V.muted : filled ? V.accentFg : V.accent;
  const frameStyle = earned
    ? `fill:${filled ? V.accent : V.card};stroke:${V.accent};stroke-width:${STROKE}`
    : `fill:none;stroke:${V.muted};stroke-width:${STROKE};stroke-dasharray:6 8;stroke-linecap:butt`;
  const frame = `${FRAMES[lv || 1]} style="${frameStyle}"/>`;
  const sty = `fill:none;stroke:${ink};stroke-width:${STROKE};stroke-linecap:round;stroke-linejoin:round`;
  const picture = LETTERS[glyph]
    ? `<text x="50" y="${glyph === 'letter-final' ? 56 : 58}" text-anchor="middle" font-size="40" style="fill:${ink};font-family:var(--font-he,serif)">${LETTERS[glyph]}</text>`
    : `<path d="${GLYPHS[glyph] || GLYPHS.target}" style="${sty}"/>`;
  const pips = Array.from({ length: lv }, (_, i) => `<circle cx="${50 + (i - (lv - 1) / 2) * 12}" cy="79" r="4" style="fill:${ink};stroke:none"/>`).join('');
  const t = `${uid}-t`, d = `${uid}-d`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="bd-art" viewBox="0 0 100 100" width="${size}" height="${size}" ${decorative ? 'aria-hidden="true"' : `role="img" aria-labelledby="${t} ${d}"`} focusable="false" data-level="${lv}">`
    + `<title id="${t}">${esc(title)}</title><desc id="${d}">${esc(desc)}</desc>${frame}<g transform="translate(0,-5)">${picture}</g>${pips}</svg>`;
}

/** Title and desc for a catalogue badge at a level (0 = not earned yet). */
export function badgeLabel(bd, level, levelNames = ['First', 'Steady', 'Deep']) {
  if (!level) return { title: `${bd.name}, not earned yet`, desc: `An outline for the badge ${bd.name}. ${bd.hint ? 'It counts ' + bd.hint + '.' : ''}`.trim() };
  const shape = ['circle', 'rounded square', 'hexagon'][level - 1];
  return { title: `${bd.name}, ${levelNames[level - 1]}`, desc: `A ${shape} frame with ${level} ${level === 1 ? 'dot' : 'dots'} for level ${level}, ${levelNames[level - 1]}. ${bd.earn[level - 1]}` };
}

/** Convenience: the SVG for a catalogue badge. */
export function artFor(bd, level, opts = {}) {
  const { title, desc } = badgeLabel(bd, level, opts.levelNames);
  return badgeSVG({ glyph: bd.glyph, level, title, desc, uid: opts.uid || `bd-${bd.id}-${level}`, size: opts.size, decorative: opts.decorative === true });
}
