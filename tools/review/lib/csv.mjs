// Minimal RFC-4180 CSV reader/writer. Output has a UTF-8 BOM and CRLF so Excel / Numbers / Google Sheets
// open Hebrew correctly without an import wizard.

export const BOM = '﻿';

export function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns, rows) {
  const lines = [columns.map(csvEscape).join(',')];
  for (const r of rows) lines.push(columns.map((c) => csvEscape(r[c])).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

/** Parse CSV text into an array of arrays. Handles BOM, quotes, embedded newlines, CRLF/LF/CR. */
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [], field = '', i = 0, inQ = false, any = false;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; any = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; any = true; i++; continue; }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      i++;
      if (any || field !== '' || row.length) { row.push(field); rows.push(row); }
      row = []; field = ''; any = false;
      continue;
    }
    field += c; any = true; i++;
  }
  if (inQ) throw new Error('CSV: unterminated quoted field');
  if (any || field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Parse into objects keyed by lower-cased, trimmed header names. */
export function parseCsvObjects(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { header: [], records: [] };
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const records = rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')).map((r, idx) => {
    const o = { _line: idx + 2 };
    header.forEach((h, k) => { o[h] = (r[k] ?? ''); });
    return o;
  });
  return { header, records };
}
