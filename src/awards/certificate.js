// Sample certificate. Warm eggshell paper, centered serif, original wording.
// Temporary foil-style seal only. Accepted artwork: 0. Not a final art file.
// Every HTML and PDF drawing says Design proof. That label is not taken from the caller.
// Not a degree, not an accredited qualification, no signature, no verification URL.
// Cert # is last initial, then first initial, then the America/Toronto preview date.
// It is a sample internal reference. The same name and date can collide. It is not checked.
// HTML and the PDF both use Frank Ruhl Libre, SIL OFL 1.1, already in assets/fonts.
// The PDF embeds Latin static instances of that file. No new typeface and no paid font.

import { ART_ACCEPTED, ART_NOTE, renderSeal, svgNode } from './icons.js';
import { sanitizeName } from './record.js';
import { PROOF_BOLD, PROOF_REGULAR } from './proof-font.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatPreviewDate(now) {
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) return 'undated';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} UTC`;
}

export const PDF_FILENAME = 'alef-certificate-DESIGN-PROOF.pdf';
/** One face label. Callers cannot replace it with an earned claim. */
export const DESIGN_PROOF = 'Design proof';
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
  certNote: 'Sample internal reference',
  footer: 'Independent learning programme',
  temporary: 'Temporary layout',
});

/** Shown when the display name or the preview instant cannot form the sample reference. */
export const CERT_REF_INCOMPLETE = 'Cert # incomplete';

/**
 * America/Toronto calendar date for a preview instant, YYYYMMDD.
 * Only a finite number is accepted, so the day does not follow the machine timezone.
 * @param {number} now
 * @returns {string}
 */
export function torontoDateStamp(now) {
  if (typeof now !== 'number' || !Number.isFinite(now)) return '';
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const pick = (type) => parts.find((p) => p.type === type)?.value || '';
  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return '';
  return year + month + day;
}

/** First Unicode letter in a token, uppercased. Empty when the token has no letter. */
function tokenInitial(token) {
  const found = String(token).match(/\p{L}/u);
  return found ? found[0].toUpperCase() : '';
}

/**
 * Last-token initial, then first-token initial.
 * The first whitespace-separated token is the given-name token and the last is the family-name token.
 * Tokens between them are ignored. One token, or a token with no letter, is not a pair of initials.
 * @param {string} name
 * @returns {string}
 */
export function certificateInitials(name) {
  const tokens = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return '';
  const first = tokenInitial(tokens[0]);
  const last = tokenInitial(tokens[tokens.length - 1]);
  if (!first || !last) return '';
  return last + first;
}

/**
 * Sample internal reference. Callers cannot supply a different number.
 * @param {string} name
 * @param {number} now
 */
export function certificateReference(name, now) {
  const initials = certificateInitials(name);
  const stamp = torontoDateStamp(now);
  if (!initials || !stamp) return CERT_REF_INCOMPLETE;
  return `Cert # ${initials}-${stamp}`;
}

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
  const at = o.now === undefined ? Date.now() : o.now;
  return {
    sample: true,
    issuable: false,
    earned: false,
    watermark: DESIGN_PROOF,
    displayName: name,
    nameEntered: !!name,
    previewAt: typeof at === 'number' && Number.isFinite(at) ? at : null,
    dateLabel: `Preview date: ${formatPreviewDate(at)}`,
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
  'Approved artwork: 0. No image file has been accepted. The eggshell ground and the crimson seal are a temporary layout, not final art.',
  'The sheet is marked Design proof. That label does not mean a certificate was issued.',
  'Cert # is a sample internal reference built from the display name and the America/Toronto date of this preview. The same name and date share it. It is not unique, not checked, and not an accreditation number.',
  'This sample does not say the named person can read Hebrew, finished the white-belt lessons, or passed a checked assessment. Saving or printing it does not store an earned certificate.',
  'The name is a label you typed. It is not a signature and not an account.',
  'No teacher, rabbi, or examiner has signed this sample. The seal is a temporary geometric drawing, not a seal of office.',
  'There is no verification website, and this sample has no code that could prove it.',
  'A saved PDF stays in your files. ALEF does not keep a copy on a server. The file is not a secure or tamper-proof document.',
  ART_NOTE,
]);

/** Learner-facing share blurb. Ignores any caller watermark. */
export function shareText(_model) {
  return `${DESIGN_PROOF}. Not an earned certificate. Completion has not been assessed or awarded. ALEF does not email this and does not upload it.`;
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
const WELL = '0.90 0.82 0.68';
const WAVE = '0.70 0.62 0.50';
const BOLD_FACE = Object.freeze({ ...PROOF_BOLD, psName: 'FrankRuhlLibre-Bold' });

function unitWidth(ch, bold) {
  const c = ch.codePointAt(0);
  const table = bold ? BOLD_FACE.widths : PROOF_REGULAR.widths;
  if (c >= 32 && c <= 255) return table[c - 32] || 500;
  if (c === 0x2014) return 1000;
  if (c === 0x2013) return 500;
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
  for (let i = 0; i < 220; i++) {
    const x = 24 + next() * (width - 48);
    const y = 24 + next() * (height - 48);
    const w = 0.28 + next() * 0.62;
    cmds.push(`${next() > 0.62 ? GRAIN_LIGHT : GRAIN_DARK} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${(w * (0.7 + next() * 0.5)).toFixed(2)} re f`);
  }
}

const CRIMSON = '0.62 0.08 0.12';
const CRIMSON_DEEP = '0.36 0.04 0.07';
const CRIMSON_INK = '0.24 0.03 0.05';
const CRIMSON_LIGHT = '0.78 0.28 0.30';

/** Letters stand on the upper arc with their tops outward. Original issuer wording only. */
function placeRingText(cmds, cx, cy, radius, text, size) {
  const chars = [...text];
  const gap = size * 0.14;
  const widths = chars.map((ch) => textWidth(ch, size, true));
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, chars.length - 1);
  let angle = Math.PI / 2 + total / (2 * radius);
  for (let i = 0; i < chars.length; i++) {
    const w = widths[i];
    const mid = angle - w / (2 * radius);
    const ox = cx + radius * Math.cos(mid);
    const oy = cy + radius * Math.sin(mid);
    const a = Math.sin(mid);
    const b = -Math.cos(mid);
    const c = Math.cos(mid);
    const d = Math.sin(mid);
    const leftX = ox - (w / 2) * a;
    const leftY = oy - (w / 2) * b;
    cmds.push(`BT /F2 ${size} Tf ${CRIMSON_INK} rg ${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${leftX.toFixed(2)} ${leftY.toFixed(2)} Tm ${pdfLiteral(chars[i])} Tj ET`);
    angle -= (w + gap) / radius;
  }
}

function inkRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Faint sweeping curves in the margins. Low contrast, kept off the name. */
function paperWaves(cmds, width, height) {
  const stroke = (pts) => {
    const n = (v) => v.toFixed(2);
    cmds.push(`${WAVE} RG 0.45 w`);
    cmds.push(`${n(pts[0][0])} ${n(pts[0][1])} m`);
    for (let i = 1; i < pts.length; i++) cmds.push(`${n(pts[i][0])} ${n(pts[i][1])} l`);
    cmds.push('S');
  };
  const band = (y, amp, cycles) => {
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      pts.push([48 + t * (width - 96), y + Math.sin(t * Math.PI * 2 * cycles) * amp]);
    }
    stroke(pts);
  };
  band(height - 28, 5.5, 1.5);
  band(height - 18, 3.5, 2.2);
  band(26, 5, 1.6);
  band(16, 3.2, 2.4);
  cmds.push(`${WAVE} RG 0.4 w`);
  for (const [ox, oy] of [[0, 0], [width, 0], [0, height], [width, height]]) {
    for (const r of [78, 108, 138]) strokeCircle(cmds, ox, oy, r);
  }
}

/** Temporary crimson stamp with uneven ink. Lettering stays on top. Not approved artwork. */
function drawSeal(cmds, cx, cy) {
  const next = inkRand(0x51A9C);
  cmds.push(`${CRIMSON} rg`);
  fillCircle(cmds, cx, cy, 38);
  cmds.push('/GsSoft gs');
  cmds.push(`${CRIMSON_DEEP} rg`);
  fillCircle(cmds, cx + 1.5, cy - 1.2, 37.2);
  for (let i = 0; i < 16; i++) {
    const a = next() * Math.PI * 2;
    const rad = 8 + next() * 24;
    fillCircle(cmds, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 1.1 + next() * 2.4);
  }
  cmds.push('/GsBleed gs');
  for (let i = 0; i < 18; i++) {
    const a = next() * Math.PI * 2;
    const rad = 36 + next() * 6;
    fillCircle(cmds, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 0.5 + next() * 1.3);
  }
  cmds.push('/GsSolid gs');
  cmds.push(`${PAPER} rg`);
  for (let i = 0; i < 22; i++) {
    const a = next() * Math.PI * 2;
    const rad = 30 + next() * 8;
    fillCircle(cmds, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 0.35 + next() * 0.7);
  }
  cmds.push(`${CRIMSON_LIGHT} RG 0.5 w`);
  strokeCircle(cmds, cx - 0.7, cy + 0.6, 36.2);
  cmds.push(`${CRIMSON_DEEP} RG 1.35 w`);
  strokeCircle(cmds, cx + 0.3, cy - 0.2, 31.6);
  cmds.push(`${CRIMSON_DEEP} RG 0.65 w`);
  strokeCircle(cmds, cx, cy, 22);
  placeRingText(cmds, cx, cy, 26.2, 'KEY FOUNDATION', 5.6);
  place(cmds, 'F2', 9, cy - 3, 'ALEF', CRIMSON_INK);
}

/** Shrink a long name onto one line, or two lines if it still will not fit. */
export function fitName(name, maxWidth) {
  const raw = String(name || '').slice(0, 160);
  if (!raw) return { size: 22, lines: [] };
  let size = 30;
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
 * One-page landscape certificate PDF. Face copy is fixed. Design proof is drawn once.
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
  paperWaves(cmds, width, height);
  cmds.push(`${RULE} RG 0.45 w`);
  cmds.push(`${margin} ${margin} ${width - 2 * margin} ${height - 2 * margin} re S`);
  placeTracked(cmds, 'F1', 8, 526, FACE.wordmark, 0.46);
  place(cmds, 'F2', 26, 492, FACE.issuer);
  place(cmds, 'F1', 9, 466, FACE.subheading.toUpperCase());
  place(cmds, 'F1', 8, 444, FACE.presented.toUpperCase());
  const fitted = fitName(name, width - 120);
  if (fitted.lines.length === 1) place(cmds, 'F2', fitted.size, 416, fitted.lines[0]);
  else if (fitted.lines.length > 1) {
    place(cmds, 'F2', fitted.size, 426, fitted.lines[0]);
    place(cmds, 'F2', fitted.size, 410, fitted.lines[1]);
  }
  place(cmds, 'F1', 8, 384, FACE.forWord.toUpperCase());
  cmds.push(`${RULE} RG 0.4 w ${width / 2 - 220} 368 m ${width / 2 + 220} 368 l S`);
  place(cmds, 'F2', 16, 346, FACE.course);
  cmds.push(`${RULE} RG 0.4 w ${width / 2 - 220} 330 m ${width / 2 + 220} 330 l S`);
  drawSeal(cmds, width / 2, 258);
  place(cmds, 'F2', 11, 200, certificateReference(name, model && model.previewAt));
  place(cmds, 'F1', 9, 178, FACE.footer);
  if (date) place(cmds, 'F1', 10, 160, date);
  if (modelNeedsWatermark(model)) place(cmds, 'F1', 9, 138, DESIGN_PROOF);
  return buildPdf(cmds.join('\n'), width, height);
}

function latin1Bytes(s) {
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
  return u;
}

function fontProgram(info) {
  const bin = atob(info.base64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i) & 255;
  return u;
}

function fontDict(info, descriptorId) {
  return `<< /Type /Font /Subtype /TrueType /BaseFont /${info.psName} /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 255 /Widths [${info.widths.join(' ')}] /FontDescriptor ${descriptorId} 0 R >>`;
}

function fontDescriptor(info, fileId) {
  const [a, b, c, d] = info.bbox;
  return `<< /Type /FontDescriptor /FontName /${info.psName} /Flags 34 /FontBBox [${a} ${b} ${c} ${d}] /ItalicAngle 0 /Ascent ${info.ascent} /Descent ${info.descent} /CapHeight ${info.capHeight} /StemV 90 /FontFile2 ${fileId} 0 R >>`;
}

function buildPdf(stream, width, height) {
  const regular = fontProgram(PROOF_REGULAR);
  const bold = fontProgram(BOLD_FACE);
  const textObjects = {
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    3: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /ExtGState 11 0 R >> >>`,
    5: fontDict(PROOF_REGULAR, 7),
    6: fontDict(BOLD_FACE, 9),
    7: fontDescriptor(PROOF_REGULAR, 8),
    9: fontDescriptor(BOLD_FACE, 10),
    11: '<< /GsSolid << /Type /ExtGState /ca 1 /CA 1 >> /GsSoft << /Type /ExtGState /ca 0.4 /CA 0.4 >> /GsBleed << /Type /ExtGState /ca 0.62 /CA 0.62 >> >>',
  };
  const parts = [];
  let size = 0;
  const push = (u) => { parts.push(u); const at = size; size += u.length; return at; };
  push(latin1Bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
  const offsets = [];
  const beginObj = (i) => { offsets[i] = push(latin1Bytes(`${i} 0 obj\n`)); };
  const endObj = () => { push(latin1Bytes('\nendobj\n')); };
  for (let i = 1; i <= 11; i++) {
    beginObj(i);
    if (i === 4) {
      const streamBytes = latin1Bytes(stream);
      push(latin1Bytes(`<< /Length ${streamBytes.length} >>\nstream\n`));
      push(streamBytes);
      push(latin1Bytes('\nendstream'));
    } else if (i === 8) {
      push(latin1Bytes(`<< /Length ${regular.length} /Length1 ${regular.length} >>\nstream\n`));
      push(regular);
      push(latin1Bytes('\nendstream'));
    } else if (i === 10) {
      push(latin1Bytes(`<< /Length ${bold.length} /Length1 ${bold.length} >>\nstream\n`));
      push(bold);
      push(latin1Bytes('\nendstream'));
    } else {
      push(latin1Bytes(textObjects[i]));
    }
    endObj();
  }
  const xref = size;
  let xrefText = `xref\n0 12\n0000000000 65535 f \n`;
  for (let i = 1; i <= 11; i++) xrefText += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  xrefText += `trailer\n<< /Size 12 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  push(latin1Bytes(xrefText));
  const out = new Uint8Array(size);
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
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

/** Faint eggshell curves. Temporary vector ground, not an image file. */
function renderWaves() {
  const wave = (y, amp, cycles) => {
    let d = '';
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = 2 + t * 96;
      const yy = y + Math.sin(t * Math.PI * 2 * cycles) * amp;
      d += i === 0 ? `M${x.toFixed(1)} ${yy.toFixed(1)}` : ` L${x.toFixed(1)} ${yy.toFixed(1)}`;
    }
    return svgNode('path', { d, fill: 'none', stroke: '#8a7860', 'stroke-width': '0.28' });
  };
  const arcs = [];
  for (const [cx, cy] of [[0, 0], [100, 0], [0, 70], [100, 70]]) {
    for (const r of [6, 9, 12]) {
      arcs.push(svgNode('circle', { cx: String(cx), cy: String(cy), r: String(r), fill: 'none', stroke: '#8a7860', 'stroke-width': '0.25' }));
    }
  }
  return svgNode('svg', {
    class: 'aw-waves', viewBox: '0 0 100 70', preserveAspectRatio: 'none',
    'aria-hidden': 'true', focusable: 'false',
  }, [wave(1.6, 0.7, 1.5), wave(3.4, 0.45, 2.2), wave(66.2, 0.7, 1.6), wave(68, 0.45, 2.3), ...arcs]);
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
  renderWaves(),
  h('div', { class: 'aw-cert-frame' },
    h('p', { class: 'aw-wordmark' }, FACE.wordmark),
    h('p', { class: 'aw-issuer' }, FACE.issuer),
    h('h2', { id: 'aw-cert-title' }, FACE.subheading),
    h('p', { class: 'aw-presented' }, FACE.presented),
    h('div', { class: 'aw-name-panel', 'data-name-panel': '1' }, ...panelKids),
    h('p', { class: 'aw-for' }, FACE.forWord),
    h('p', { class: 'aw-course' }, FACE.course),
    h('div', { class: 'aw-seal-wrap' }, renderSeal(h)),
    h('p', { class: 'aw-cert-no' }, certificateReference(model.nameEntered ? model.displayName : '', model.previewAt)),
    h('p', { class: 'aw-footer' }, FACE.footer),
    h('p', { class: 'aw-date' }, model.dateLabel || ''),
    h('p', { class: 'aw-design-proof', id: 'aw-design-proof', tabindex: '-1', 'data-watermark': '1' }, DESIGN_PROOF)));
}
