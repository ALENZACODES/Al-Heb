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

function sealWord(tag, attrs, text) {
  const node = svgNode(tag, attrs);
  node.append(globalThis.document.createTextNode(text));
  return node;
}

function ringWord(text) {
  return sealWord('textPath', { href: '#aw-seal-arc', startOffset: '50%', 'text-anchor': 'middle' }, text);
}

function centerWord(text) {
  return sealWord('text', {
    x: '60', y: '66', 'text-anchor': 'middle', fill: '#3d0a10', 'font-size': '14', 'font-weight': '700',
    'font-family': 'Times New Roman, Times, serif',
  }, text);
}

/** Temporary crimson stamp. Original ring lettering and center word. Not approved artwork. */
export function renderSeal(_h) {
  return svgNode('svg', {
    viewBox: '0 0 120 120', width: '148', height: '148', class: 'aw-seal',
    'data-art': ART_STATUS, 'data-accepted': String(ART_ACCEPTED), 'aria-hidden': 'true', focusable: 'false',
  }, [
    svgNode('circle', { cx: '61.2', cy: '61.4', r: '52', fill: '#5c1018' }),
    svgNode('circle', { cx: '60', cy: '60', r: '52', fill: '#9e1a28' }),
    svgNode('circle', { cx: '59.2', cy: '58.6', r: '49.5', fill: 'none', stroke: '#d07076', 'stroke-width': '0.8' }),
    svgNode('circle', { cx: '60', cy: '60', r: '44', fill: 'none', stroke: '#4a0c12', 'stroke-width': '2.2' }),
    svgNode('circle', { cx: '60', cy: '60', r: '30', fill: 'none', stroke: '#4a0c12', 'stroke-width': '1.1' }),
    svgNode('path', { id: 'aw-seal-arc', d: 'M16 62 A44 44 0 0 1 104 62', fill: 'none' }),
    svgNode('text', {
      fill: '#3d0a10', 'font-size': '8.5', 'font-family': 'Times New Roman, Times, serif', 'letter-spacing': '1.4',
    }, [ringWord('KEY FOUNDATION')]),
    centerWord('ALEF'),
  ]);
}
