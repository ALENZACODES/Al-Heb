// Temporary original medallions. Accepted artwork count is 0.
// These vectors are stand-ins, not ChatGPT image files and not cast art.
// Swap TEMP_GLYPHS or point ART_FILES at approved files later. Do not treat generation as approval.
//
// Activity medallions record a saved game session. They are not mastery.
// Matte, polished and foil are finish slots for a future reviewed checklist. This module
// does not mark those finishes earned. No sacred or ritual object is used as a token.

export const ART_STATUS = 'temporary';
export const ART_ACCEPTED = 0;
export const ART_NOTE = 'Temporary original vectors. Approved artwork: none yet. These are not final art files.';

/** Replacement seam. Leave the glyph geometry here until an approved file is named. */
export const ART_FILES = Object.freeze({
  medallion: null,
  certificateFrame: null,
  seal: null,
});

/** Center glyphs. Geometric only: no scroll, lamp, star, or other ritual token. */
export const TEMP_GLYPHS = {
  lock: [
    ['rect', { x: '22', y: '34', width: '20', height: '16', rx: '2', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' }],
    ['path', { d: 'M26 34 v-5 a6 6 0 0 1 12 0 v5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' }],
  ],
  check: [
    ['path', { d: 'M24 34 l6 6 12-14', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' }],
  ],
  activity: [
    ['circle', { cx: '32', cy: '32', r: '5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' }],
  ],
  return: [
    ['path', { d: 'M40 30 a8 8 0 1 1 -2-6', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' }],
    ['path', { d: 'M38 20 h7 v7', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' }],
  ],
};

/**
 * Game-coded rim marks for the five games that already save a play count.
 * Codes are original geometry. They are not badges for the other programme games.
 */
export const GAME_RIMS = {
  none: [],
  tug: [
    ['path', { d: 'M14 32 h36', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }],
  ],
  vowel: [
    ['path', { d: 'M20 26 a12 12 0 1 1 0 12', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }],
  ],
  pin: [
    ['circle', { cx: '32', cy: '12', r: '2', fill: 'currentColor' }],
    ['circle', { cx: '14', cy: '44', r: '2', fill: 'currentColor' }],
    ['circle', { cx: '50', cy: '44', r: '2', fill: 'currentColor' }],
  ],
  prefix: [
    ['rect', { x: '12', y: '12', width: '6', height: '6', fill: 'currentColor' }],
    ['rect', { x: '46', y: '12', width: '6', height: '6', fill: 'currentColor' }],
    ['rect', { x: '12', y: '46', width: '6', height: '6', fill: 'currentColor' }],
    ['rect', { x: '46', y: '46', width: '6', height: '6', fill: 'currentColor' }],
  ],
  palace: [
    ['rect', { x: '18', y: '18', width: '28', height: '28', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }],
  ],
};

const FINISH_CLASS = {
  activity: 'aw-finish-activity',
  matte: 'aw-finish-matte',
  polished: 'aw-finish-polished',
  foil: 'aw-finish-foil',
};

export function svgNode(tag, attrs, children = []) {
  const doc = globalThis.document;
  const NS = 'http://www.w3.org/2000/svg';
  const e = doc?.createElementNS ? doc.createElementNS(NS, tag) : doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    e.setAttribute(k, v === true ? '' : String(v));
  }
  if (attrs?.class && typeof e.className === 'string') e.className = attrs.class;
  for (const child of children) if (child) e.append(child);
  return e;
}

/**
 * Enamel medallion. State is also a word next to it in the page; the icon is not the only signal.
 * @param {{glyph?: string, state?: 'locked'|'earned', finish?: string, game?: string}} o
 */
export function renderMedallion(_h, o = {}) {
  const state = o.state === 'earned' ? 'earned' : 'locked';
  const finish = FINISH_CLASS[o.finish] ? o.finish : 'activity';
  const game = GAME_RIMS[o.game] ? o.game : 'none';
  const glyph = TEMP_GLYPHS[o.glyph] || (state === 'earned' ? TEMP_GLYPHS.check : TEMP_GLYPHS.lock);
  const shapes = [
    ['circle', { cx: '32', cy: '32', r: '28', class: 'aw-med-rim', fill: 'none', stroke: 'currentColor', 'stroke-width': state === 'locked' ? '2' : '3', 'stroke-dasharray': state === 'locked' ? '4 3' : 'none' }],
    ['circle', { cx: '32', cy: '32', r: '21', class: 'aw-med-disc', fill: 'currentColor', 'fill-opacity': finish === 'matte' ? '0.12' : '0.2', stroke: 'none' }],
    ...(finish === 'polished' || finish === 'foil' ? [['circle', { cx: '32', cy: '32', r: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }]] : []),
    ...(finish === 'foil' ? [['circle', { cx: '32', cy: '32', r: '12', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' }]] : []),
    ...GAME_RIMS[game],
    ...glyph,
  ];
  return svgNode('svg', {
    viewBox: '0 0 64 64', width: '64', height: '64', class: `aw-medallion ${FINISH_CLASS[finish]}`,
    'data-art': ART_STATUS, 'data-accepted': String(ART_ACCEPTED), 'data-state': state,
    'data-finish': finish, 'data-game': game, 'aria-hidden': 'true', focusable: 'false',
  }, shapes.map(([tag, attrs]) => svgNode(tag, attrs)));
}

function scallopD(cx, cy, radius, amp, lobes, steps) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (Math.PI * 2 * i) / steps;
    const r = radius + amp * Math.sin(lobes * t);
    const x = (cx + r * Math.cos(t)).toFixed(2);
    const y = (cy + r * Math.sin(t)).toFixed(2);
    d += i === 0 ? `M${x} ${y}` : ` L${x} ${y}`;
  }
  return d + ' Z';
}

/** Temporary antique-gold stamp. Original key-and-block geometry. Not approved artwork. */
export function renderSeal(_h) {
  const rays = [];
  for (let i = 0; i < 48; i++) {
    const a = (Math.PI * 2 * i) / 48;
    rays.push(svgNode('line', {
      x1: (60 + Math.cos(a) * 32).toFixed(2),
      y1: (60 + Math.sin(a) * 32).toFixed(2),
      x2: (60 + Math.cos(a) * 44).toFixed(2),
      y2: (60 + Math.sin(a) * 44).toFixed(2),
      stroke: '#4e3514', 'stroke-width': '0.45',
    }));
  }
  const key = (dx, dy, color, width) => [
    svgNode('rect', { x: String(53 + dx), y: String(82 + dy), width: '14', height: '2.6', fill: color }),
    svgNode('circle', { cx: String(60 + dx), cy: String(48 + dy), r: '5.4', fill: 'none', stroke: color, 'stroke-width': width }),
    svgNode('line', { x1: String(60 + dx), y1: String(53 + dy), x2: String(60 + dx), y2: String(80 + dy), stroke: color, 'stroke-width': width }),
    svgNode('line', { x1: String(60 + dx), y1: String(66 + dy), x2: String(68 + dx), y2: String(66 + dy), stroke: color, 'stroke-width': width }),
    svgNode('line', { x1: String(60 + dx), y1: String(74 + dy), x2: String(66 + dx), y2: String(74 + dy), stroke: color, 'stroke-width': width }),
  ];
  return svgNode('svg', {
    viewBox: '0 0 120 120', width: '132', height: '132', class: 'aw-seal',
    'data-art': ART_STATUS, 'data-accepted': String(ART_ACCEPTED), 'aria-hidden': 'true', focusable: 'false',
  }, [
    svgNode('circle', { cx: '60', cy: '60', r: '56', fill: '#e6d3ae' }),
    svgNode('path', { d: scallopD(61.6, 61.6, 48, 3.1, 18, 144), fill: '#4a3010' }),
    svgNode('path', { d: scallopD(60, 60, 48, 3.1, 18, 144), fill: '#c6a15a' }),
    svgNode('circle', { cx: '60', cy: '60', r: '36', fill: '#9a7430' }),
    svgNode('circle', { cx: '60.6', cy: '61', r: '30.5', fill: '#6b4a16' }),
    ...rays,
    svgNode('path', { d: scallopD(60, 60, 45.5, 2.7, 18, 144), fill: 'none', stroke: '#5c3e12', 'stroke-width': '1.5' }),
    svgNode('path', { d: scallopD(59.4, 59.3, 49, 2.9, 18, 144), fill: 'none', stroke: '#f0e2b0', 'stroke-width': '0.7' }),
    svgNode('circle', { cx: '60', cy: '60', r: '36', fill: 'none', stroke: '#5c3e12', 'stroke-width': '1.1' }),
    svgNode('circle', { cx: '59.5', cy: '59.4', r: '35.2', fill: 'none', stroke: '#f0e2b0', 'stroke-width': '0.55' }),
    svgNode('circle', { cx: '60', cy: '60', r: '16', fill: '#d7b56a' }),
    ...key(0.7, 0.7, '#3a2810', '1.7'),
    ...key(-0.45, -0.5, '#f3e6bc', '1.15'),
    ...key(0, 0, '#2c1c0c', '1.45'),
  ]);
}
