// Sample certificate. Landscape, warm ivory, deep-sea-blue geometric rings, a fine gold rule,
// and an original geometric seal. Temporary vectors only. Accepted artwork: 0.
// The sample is watermarked SAMPLE / NOT EARNED and is not a certificate.
// No accreditation, no signature, no verification URL, no copied crest or ribbon.

import { ART_ACCEPTED, ART_NOTE, renderSeal, svgNode } from './icons.js';
import { sanitizeName } from './record.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatPreviewDate(now) {
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) return 'undated';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} UTC`;
}

export const PDF_FILENAME = 'alef-beginner-certificate-SAMPLE.pdf';
/** A4 landscape, points. Margins stay at or beyond PRINT_MARGIN. */
export const PDF_PAGE = Object.freeze({ width: 841.89, height: 595.28, margin: 40 });
export const PRINT_MARGIN = 40;

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
    watermark: 'SAMPLE / NOT EARNED',
    displayName: name,
    nameEntered: !!name,
    dateLabel: `Preview date: ${formatPreviewDate(o.now ?? Date.now())}`,
    brand: 'ALEF',
    subtitle: 'Beginner reading',
    kicker: 'Proposed completion',
    artNote: 'Temporary layout.',
    artAccepted: ART_ACCEPTED,
    /** One sentence on the printable face. */
    disclaimer: 'ALEF is an independent Hebrew course. This sample is not a diploma and not an accredited credential.',
    statement: [],
    disclaimers: [],
  };
}

/** Long notes for the page and the docs. They are not drawn on the certificate face or the PDF. */
export const SAMPLE_PAGE_NOTES = Object.freeze([
  'Approved artwork: 0. No image file has been accepted. The border and seal are a temporary layout, not final art.',
  'This sample does not say the named person can read Hebrew, finished the white-belt lessons, or passed a checked assessment. Saving or printing it does not store an earned certificate.',
  'The name is a label you typed. It is not a signature and not an account.',
  'No teacher, rabbi, or examiner has signed this sample. The seal is a temporary geometric drawing, not a seal of office.',
  'There is no verification website, and this sample has no code that could prove it.',
  'A saved PDF stays in your files. ALEF does not keep a copy on a server. The file is not a secure or tamper-proof document.',
  ART_NOTE,
]);

/** Learner-facing share blurb. Always says the sheet is a sample. */
export function shareText(model) {
  return `${model.watermark}. Not an earned certificate. ALEF does not email this and does not upload it.`;
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
    else if (c >= 160 && c <= 255) out += '\\' + c.toString(8).padStart(3, '0');
    else out += '?';
  }
  return '(' + out + ')';
}

function wrap(text, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (next.length > width && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Watermark unless a caller has an issued, non-sample model. The page never builds one of those. */
export function modelNeedsWatermark(model) {
  return !(model && model.issuable === true && model.sample !== true);
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

const IVORY = '0.953 0.925 0.875';
const SEA = '0.047 0.227 0.302';
const GOLD = '0.655 0.518 0.247';

function circles(cmds, points, r) {
  cmds.push(`${SEA} RG`);
  cmds.push('0.6 w');
  for (const [x, y] of points) cmds.push(`${x} ${y} ${r} 0 360 arc S`);
}

/**
 * One-page landscape certificate PDF.
 * Sample and any non-issued model include SAMPLE / NOT EARNED as a solid band and as large page text.
 * @param {ReturnType<typeof sampleModel>} model
 * @returns {Uint8Array}
 */
export function renderCertificatePdf(model) {
  const { width, height, margin } = PDF_PAGE;
  const watermark = modelNeedsWatermark(model);
  const name = model.nameEntered ? model.displayName : '';
  const cmds = [];
  const place = (font, size, y, text) => {
    const x = Math.max(margin + 16, (width - String(text).length * size * 0.52) / 2);
    cmds.push(`BT /${font} ${size} Tf ${SEA} rg 1 0 0 1 ${x.toFixed(1)} ${y} Tm ${pdfLiteral(text)} Tj ET`);
  };
  cmds.push(`${IVORY} rg`);
  cmds.push(`0 0 ${width} ${height} re f`);
  const edge = [];
  for (let x = 90; x <= width - 90; x += 36) { edge.push([x, 28], [x, height - 28]); }
  for (let y = 80; y <= height - 80; y += 36) { edge.push([28, y], [width - 28, y]); }
  circles(cmds, edge, 10);
  cmds.push(`${IVORY} rg`);
  cmds.push(`${margin + 18} ${margin + 18} ${width - 2 * (margin + 18)} ${height - 2 * (margin + 18)} re f`);
  cmds.push(`${SEA} RG`);
  cmds.push('2 w');
  cmds.push(`${margin} ${margin} ${width - 2 * margin} ${height - 2 * margin} re S`);
  cmds.push(`${GOLD} RG`);
  cmds.push('0.7 w');
  cmds.push(`${margin + 8} ${margin + 8} ${width - 2 * (margin + 8)} ${height - 2 * (margin + 8)} re S`);
  if (watermark) {
    cmds.push('0.58 g');
    cmds.push('BT /F2 40 Tf');
    cmds.push('0.9659 -0.2588 0.2588 0.9659 250 390 Tm');
    cmds.push(`${pdfLiteral('SAMPLE')} Tj`);
    cmds.push('0 -1.15 Td');
    cmds.push(`${pdfLiteral('NOT EARNED')} Tj`);
    cmds.push('ET');
    cmds.push(`${SEA} rg`);
    cmds.push('168 512 506 26 re f');
    cmds.push('0.98 0.96 0.92 rg');
    cmds.push('BT /F2 13 Tf 1 0 0 1 336 520 Tm');
    cmds.push(`${pdfLiteral('SAMPLE / NOT EARNED')} Tj ET`);
  }
  cmds.push(`${SEA} RG 1.1 w`);
  cmds.push('421 455 16 0 360 arc S');
  cmds.push('421 455 10 0 360 arc S');
  cmds.push('413 447 16 16 re S');
  place('F2', 26, 408, model.brand || 'ALEF');
  place('F2', 16, 378, model.subtitle || 'Beginner reading');
  place('F1', 12, 354, model.kicker || 'Proposed completion');
  const shown = name || '';
  let namePt = 28;
  while (namePt > 14 && shown.length * namePt * 0.52 > width - 160) namePt -= 1;
  cmds.push(`${GOLD} RG 0.9 w`);
  cmds.push('230 292 m 612 292 l S');
  if (shown) place('F2', namePt, 306, shown);
  else place('F1', 12, 308, 'Name');
  place('F1', 11, 262, model.dateLabel || '');
  let y = 228;
  for (const line of wrap(model.disclaimer || '', 72)) {
    place('F1', 11, y, line);
    y -= 16;
  }
  place('F1', 10, y - 10, model.artNote || 'Temporary layout.');
  const stream = cmds.join('\n');
  return buildPdf(stream, width, height);
}

function buildPdf(stream, width, height) {
  const objects = [
    null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
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

/**
 * HTML certificate. The learner's name is a text node inside a blank panel.
 * @param {Function} h
 */
export function renderCertificate(h, model) {
  const watermark = modelNeedsWatermark(model);
  const name = h('p', { class: 'aw-name', 'data-cert-name': '1' });
  name.textContent = model.displayName || '';
  const panelKids = [name];
  if (!model.nameEntered) panelKids.push(h('p', { class: 'aw-name-empty' }, 'Name panel empty'));
  return h('article', {
    class: 'aw-cert',
    id: 'award-certificate',
    'data-sample': watermark ? 'true' : 'false',
    'data-earned': 'false',
    'data-layout': 'landscape',
    'aria-labelledby': 'aw-cert-title',
  },
  renderGuilloche(),
  watermark ? h('p', { class: 'aw-cert-banner', id: 'aw-cert-banner', tabindex: '-1' }, model.watermark) : null,
  h('div', { class: 'aw-cert-frame' },
    watermark ? h('p', { class: 'aw-watermark', 'aria-hidden': 'true', 'data-watermark': '1' }, 'SAMPLE NOT EARNED') : null,
    renderSeal(h),
    h('p', { class: 'aw-brand' }, model.brand),
    h('h2', { id: 'aw-cert-title' }, model.subtitle),
    h('p', { class: 'aw-kicker' }, model.kicker),
    h('p', { class: 'aw-name-label' }, 'Name'),
    h('div', { class: 'aw-name-panel', 'data-name-panel': '1' }, ...panelKids),
    h('p', { class: 'aw-date' }, model.dateLabel),
    h('p', { class: 'aw-disclaimer' }, model.disclaimer || ''),
    h('p', { class: 'aw-art-note' }, model.artNote || 'Temporary layout.')));
}
