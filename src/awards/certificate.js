// Sample certificate. Warm eggshell paper, centered serif, original wording.
// Temporary foil-style seal only. Accepted artwork: 0. Not a final art file.
// Every HTML and PDF drawing says SAMPLE / NOT EARNED. That mark is not taken from the caller.
// Not a degree, not an accredited qualification, no signature, no verification URL.
// Certificate No. SAMPLE-0001 is a sample internal reference, not an accreditation number.
// PDF text uses the standard PDF serif Times (supplied by the viewer). HTML uses Frank Ruhl Libre,
// SIL OFL 1.1, already shipped in assets/fonts. No new font file is added.

import { ART_ACCEPTED, ART_NOTE, renderSeal, svgNode } from './icons.js';
import { sanitizeName } from './record.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatPreviewDate(now) {
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) return 'undated';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} UTC`;
}

export const PDF_FILENAME = 'alef-beginner-certificate-SAMPLE.pdf';
/** Fixed sample mark. Callers cannot replace it with an earned claim. */
export const SAMPLE_MARK = 'SAMPLE / NOT EARNED';
/** A4 landscape, points. Margins stay at or beyond PRINT_MARGIN. */
export const PDF_PAGE = Object.freeze({ width: 841.89, height: 595.28, margin: 40 });
export const PRINT_MARGIN = 40;

/** Face copy. Fixed so a caller cannot swap in a degree title or another institution. */
export const FACE = Object.freeze({
  wordmark: 'ALEF',
  heading: 'ALEF',
  issuer: 'ALEF is Key Foundation',
  subheading: 'Certificate of Completion',
  presented: 'Presented to',
  forWord: 'for',
  course: 'Beginner Hebrew Foundations',
  sampleLine: 'Sample design \u2014 completion has not been assessed or awarded.',
  certNo: 'Certificate No. SAMPLE-0001',
  certNote: 'Sample internal reference',
  footer: 'Independent learning programme \u00b7 Not an accredited qualification',
  temporary: 'Temporary layout',
});

export const MAIL_OFFER = Object.freeze({
  available: false,
  reason: 'no-mail-backend',
  text: 'Email is not offered. This app has no mail service, and Awards does not open a mail program.',
});

/**
 * @param {{displayName?: string, now?: number}} o
 */
export function sampleModel(o = {}) {
  const name = sanitizeName(o.displayName);
  return {
    sample: true,
    issuable: false,
    earned: false,
    watermark: SAMPLE_MARK,
    displayName: name,
    nameEntered: !!name,
    dateLabel: `Preview date: ${formatPreviewDate(o.now ?? Date.now())}`,
    brand: FACE.issuer,
    subtitle: FACE.subheading,
    kicker: FACE.course,
    artNote: FACE.temporary,
    artAccepted: ART_ACCEPTED,
    disclaimer: FACE.footer,
    sampleLine: FACE.sampleLine,
    statement: [],
    disclaimers: [],
  };
}

/** Long notes for the page and the docs. They are not drawn on the certificate face or the PDF. */
export const SAMPLE_PAGE_NOTES = Object.freeze([
  'Approved artwork: 0. No image file has been accepted. The eggshell ground and seal are a temporary layout, not final art.',
  'Certificate No. SAMPLE-0001 is a sample internal reference on this layout. It is not an accreditation number.',
  'This sample does not say the named person can read Hebrew, finished the white-belt lessons, or passed a checked assessment. Saving or printing it does not store an earned certificate.',
  'The name is a label you typed. It is not a signature and not an account.',
  'No teacher, rabbi, or examiner has signed this sample. The seal is a temporary geometric drawing, not a seal of office.',
  'There is no verification website, and this sample has no code that could prove it.',
  'A saved PDF stays in your files. ALEF does not keep a copy on a server. The file is not a secure or tamper-proof document.',
  ART_NOTE,
]);

/** Learner-facing share blurb. Ignores any caller watermark. */
export function shareText(_model) {
  return `${SAMPLE_MARK}. Not an earned certificate. ALEF does not email this and does not upload it.`;
}

export function shareAvailability(nav) {
  const share = !!(nav && typeof nav.share === 'function');
  const files = !!(share && typeof nav.canShare === 'function');
  return { shareSheet: share, files };
}

function latin1(s) {
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
  return u;
}

/** WinAnsi-ish string for a PDF literal. Characters outside Latin-1 become "?". */
export function pdfLiteral(text) {
  let out = '';
  for (const ch of String(text ?? '')) {
    const c = ch.codePointAt(0);
    if (ch === '\\' || ch === '(' || ch === ')') out += '\\' + ch;
    else if (c >= 32 && c <= 126) out += ch;
    else if (c === 0x2014) out += '\\227';
    else if (c === 0x2013) out += '\\226';
    else if (c >= 160 && c <= 255) out += '\\' + c.toString(8).padStart(3, '0');
    else out += '?';
  }
  return '(' + out + ')';
}

/** Every PDF from this helper is a sample. There is no non-sample export until a reviewed issuance design exists. */
export function modelNeedsWatermark(_model) {
  return true;
}

/** Note when the PDF cannot draw the typed name. The HTML certificate still shows it. */
export function pdfNameNote(name) {
  const text = String(name ?? '');
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c < 32 || c > 255) return 'Some characters in the name cannot be drawn in the PDF file. The name on this page is the one you typed.';
  }
  return '';
}

const PAPER = '0.953 0.918 0.835';
const GRAIN_DARK = '0.86 0.78 0.64';
const GRAIN_LIGHT = '0.99 0.96 0.90';
const INK = '0.14 0.11 0.09';
const RULE = '0.55 0.48 0.40';
const RED = '0.48 0.14 0.16';
const GOLD = '0.62 0.48 0.25';
const BRONZE = '0.42 0.30 0.16';
const WELL = '0.90 0.82 0.68';
/** Liberation Serif advances, which match Times. Index 0 is U+0020. Units are thousandths of the size. */
const ROMAN = [250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541];
const BOLD = [250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520];

function unitWidth(ch, bold) {
  const c = ch.codePointAt(0);
  if (c >= 32 && c <= 126) return (bold ? BOLD : ROMAN)[c - 32];
  if (c === 0x2014) return 1000;
  if (c === 0x2013) return 500;
  if (c === 0x00B7) return 333;
  return 500;
}

function textWidth(text, size, bold = false) {
  let w = 0;
  for (const ch of String(text)) w += unitWidth(ch, bold) / 1000 * size;
  return w;
}

function placeTracked(cmds, font, size, y, text, trackingEm) {
  const bold = font === 'F2';
  const tracking = size * trackingEm;
  const chars = [...String(text)];
  const width = chars.reduce((sum, ch) => sum + textWidth(ch, size, bold), 0) + tracking * Math.max(0, chars.length - 1);
  let x = (PDF_PAGE.width - width) / 2;
  if (x < PDF_PAGE.margin) x = PDF_PAGE.margin;
  for (const ch of chars) {
    place(cmds, font, size, y, ch, INK, x);
    x += textWidth(ch, size, bold) + tracking;
  }
}

function place(cmds, font, size, y, text, color = INK, x) {
  const left = x == null ? (PDF_PAGE.width - textWidth(text, size, font === 'F2')) / 2 : x;
  cmds.push(`BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${left.toFixed(1)} ${y} Tm ${pdfLiteral(text)} Tj ET`);
}

function circleOps(cx, cy, r) {
  const k = 0.5522847498 * r;
  const n = (v) => v.toFixed(2);
  return [
    `${n(cx + r)} ${n(cy)} m`,
    `${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c`,
    `${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)} c`,
    `${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c`,
    `${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)} c`,
  ];
}

function strokeCircle(cmds, cx, cy, r) {
  cmds.push(...circleOps(cx, cy, r), 'S');
}

function fillCircle(cmds, cx, cy, r) {
  cmds.push(...circleOps(cx, cy, r), 'f');
}

/** Deterministic fine grain so the PDF stock is not a flat fill. */
function paperGrain(cmds, width, height) {
  let s = 0xA5E11;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 720; i++) {
    const x = 24 + next() * (width - 48);
    const y = 24 + next() * (height - 48);
    const w = 0.28 + next() * 0.62;
    cmds.push(`${next() > 0.62 ? GRAIN_LIGHT : GRAIN_DARK} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${(w * (0.7 + next() * 0.5)).toFixed(2)} re f`);
  }
}

/** Temporary foil-style stamp. Original geometry. No letters, no office claim. */
function drawSeal(cmds, cx, cy) {
  cmds.push(`${WELL} rg`);
  fillCircle(cmds, cx, cy, 40);
  cmds.push(`${BRONZE} RG 1.15 w`);
  strokeCircle(cmds, cx + 0.9, cy - 0.8, 36);
  strokeCircle(cmds, cx + 0.9, cy - 0.8, 31);
  cmds.push(`${RED} RG 1.7 w`);
  strokeCircle(cmds, cx, cy, 36);
  cmds.push(`${GOLD} RG 0.9 w`);
  strokeCircle(cmds, cx, cy, 33);
  cmds.push(`${GOLD} rg`);
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    fillCircle(cmds, cx + Math.cos(a) * 29.2, cy + Math.sin(a) * 29.2, 1.15);
  }
  cmds.push(`${RED} RG 1.05 w`);
  strokeCircle(cmds, cx, cy, 24);
  cmds.push(`${GOLD} RG 1.25 w`);
  cmds.push(`${cx} ${cy + 16} m ${cx + 16} ${cy} l ${cx} ${cy - 16} l ${cx - 16} ${cy} l h S`);
  cmds.push(`${RED} RG 1.05 w`);
  cmds.push(`${cx - 7} ${cy - 7} 14 14 re S`);
  cmds.push(`${RED} rg`);
  fillCircle(cmds, cx, cy, 2.5);
  cmds.push(`${GOLD} RG 0.45 w`);
  strokeCircle(cmds, cx - 0.4, cy + 0.5, 33.4);
}

/** Shrink a long name onto one line, or two lines if it still will not fit. */
export function fitName(name, maxWidth) {
  const raw = String(name || '').slice(0, 160);
  if (!raw) return { size: 22, lines: [] };
  let size = 26;
  while (size > 11 && textWidth(raw, size, true) > maxWidth) size -= 1;
  if (textWidth(raw, size, true) <= maxWidth) return { size, lines: [raw] };
  const lines = [];
  let line = '';
  for (const ch of raw) {
    const next = line + ch;
    if (line && textWidth(next, 11, true) > maxWidth) {
      lines.push(line);
      line = ch;
      if (lines.length === 2) return { size: 11, lines };
    } else line = next;
  }
  if (line) lines.push(line);
  return { size: 11, lines };
}

/**
 * One-page landscape certificate PDF. Face copy is fixed. SAMPLE / NOT EARNED is drawn once
 * at the top and once near the bottom, never rotated and never on top of another line.
 * @param {object} model
 * @returns {Uint8Array}
 */
export function renderCertificatePdf(model) {
  const { width, height, margin } = PDF_PAGE;
  const name = model && model.nameEntered ? String(model.displayName || '') : '';
  const date = model && model.dateLabel ? String(model.dateLabel) : '';
  const cmds = [];
  cmds.push(`${PAPER} rg 0 0 ${width} ${height} re f`);
  paperGrain(cmds, width, height);
  cmds.push(`${RULE} RG 0.6 w`);
  cmds.push(`${margin} ${margin} ${width - 2 * margin} ${height - 2 * margin} re S`);
  if (modelNeedsWatermark(model)) place(cmds, 'F2', 10, 540, SAMPLE_MARK);
  placeTracked(cmds, 'F1', 9, 526, FACE.wordmark, 0.42);
  place(cmds, 'F2', 22, 496, FACE.issuer);
  place(cmds, 'F1', 13, 468, FACE.subheading);
  place(cmds, 'F1', 11, 444, FACE.presented);
  const fitted = fitName(name, width - 120);
  if (fitted.lines.length === 1) place(cmds, 'F2', fitted.size, 416, fitted.lines[0]);
  else if (fitted.lines.length > 1) {
    place(cmds, 'F2', fitted.size, 426, fitted.lines[0]);
    place(cmds, 'F2', fitted.size, 410, fitted.lines[1]);
  }
  place(cmds, 'F1', 11, 384, FACE.forWord);
  cmds.push(`${RULE} RG 0.6 w ${width / 2 - 220} 368 m ${width / 2 + 220} 368 l S`);
  place(cmds, 'F2', 15, 346, FACE.course);
  cmds.push(`${RULE} RG 0.6 w ${width / 2 - 220} 330 m ${width / 2 + 220} 330 l S`);
  place(cmds, 'F1', 10, 318, FACE.sampleLine);
  drawSeal(cmds, width / 2, 262);
  place(cmds, 'F2', 11, 200, FACE.certNo);
  place(cmds, 'F1', 8, 186, FACE.certNote);
  place(cmds, 'F1', 9, 168, FACE.footer);
  if (date) place(cmds, 'F1', 10, 152, date);
  place(cmds, 'F1', 8, 136, FACE.temporary);
  if (modelNeedsWatermark(model)) place(cmds, 'F2', 10, 112, SAMPLE_MARK);
  return buildPdf(cmds.join('\n'), width, height);
}

function buildPdf(stream, width, height) {
  const objects = [
    null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>',
  ];
  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n`;
  out += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i++) out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return latin1(out);
}

/** Edge rings for the HTML frame. Original geometry, not a copied security pattern. */
export function renderGuilloche() {
  const circles = [];
  for (let x = 36; x <= 964; x += 70) {
    circles.push(svgNode('circle', { cx: String(x), cy: '22', r: '12', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' }));
    circles.push(svgNode('circle', { cx: String(x), cy: '678', r: '12', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' }));
  }
  for (let y = 50; y <= 650; y += 70) {
    circles.push(svgNode('circle', { cx: '22', cy: String(y), r: '12', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' }));
    circles.push(svgNode('circle', { cx: '978', cy: String(y), r: '12', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' }));
  }
  return svgNode('svg', {
    class: 'aw-guilloche', viewBox: '0 0 1000 700', 'aria-hidden': 'true', focusable: 'false',
    'data-art': 'temporary', 'data-accepted': String(ART_ACCEPTED),
  }, circles);
}

/** Fine grain over the eggshell ground. Temporary layout, not an image file. */
function renderPaperGrain() {
  return svgNode('svg', {
    class: 'aw-paper', viewBox: '0 0 100 100', preserveAspectRatio: 'none',
    'aria-hidden': 'true', focusable: 'false',
  }, [
    svgNode('filter', { id: 'aw-paper-grain' }, [
      svgNode('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '4', stitchTiles: 'stitch' }),
    ]),
    svgNode('rect', { width: '100%', height: '100%', filter: 'url(#aw-paper-grain)' }),
  ]);
}

/**
 * HTML certificate. The learner's name is a text node inside a blank panel.
 * @param {Function} h
 */
export function renderCertificate(h, _model) {
  const model = _model || {};
  const name = h('p', { class: 'aw-name', 'data-cert-name': '1' });
  name.textContent = model.displayName || '';
  const panelKids = [name];
  if (!model.nameEntered) panelKids.push(h('p', { class: 'aw-name-empty' }, 'Name panel empty'));
  return h('article', {
    class: 'aw-cert',
    id: 'award-certificate',
    'data-sample': 'true',
    'data-earned': 'false',
    'data-layout': 'landscape',
    'aria-labelledby': 'aw-cert-title',
  },
  renderPaperGrain(),
  h('p', { class: 'aw-cert-banner', id: 'aw-cert-banner', tabindex: '-1' }, SAMPLE_MARK),
  h('div', { class: 'aw-cert-frame' },
    h('p', { class: 'aw-wordmark' }, FACE.wordmark),
    h('p', { class: 'aw-issuer' }, FACE.issuer),
    h('h2', { id: 'aw-cert-title' }, FACE.subheading),
    h('p', { class: 'aw-presented' }, FACE.presented),
    h('div', { class: 'aw-name-panel', 'data-name-panel': '1' }, ...panelKids),
    h('p', { class: 'aw-for' }, FACE.forWord),
    h('p', { class: 'aw-course' }, FACE.course),
    h('p', { class: 'aw-sample-line' }, FACE.sampleLine),
    h('div', { class: 'aw-seal-wrap' }, renderSeal(h)),
    h('p', { class: 'aw-cert-no' }, FACE.certNo),
    h('p', { class: 'aw-cert-note' }, FACE.certNote),
    h('p', { class: 'aw-footer' }, FACE.footer),
    h('p', { class: 'aw-date' }, model.dateLabel || ''),
    h('p', { class: 'aw-art-note' }, FACE.temporary),
    h('p', { class: 'aw-watermark', 'aria-hidden': 'true', 'data-watermark': '1' }, SAMPLE_MARK)));
}
