// Pure logic for the Aleph record kit. No Node-only APIs: this file is inlined verbatim (minus the `export` keywords) into
// recorder.html by build.mjs, and imported as a module by ingest.mjs and the tests.

export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const VOICES = ['m', 'f'];
export const KINDS = ['letter', 'vowel', 'syllable', 'line', 'prayer', 'word'];
export const CONSENT_VERSION = '2026-11-draft-1';

/** Plain-language grant shown on the first screen and written into every export. Mirrors docs/voices/donor-rights-grant.md. */
export const CONSENT_TEXT = [
  'DRAFT: have a lawyer review before relying on this. Plain-language summary, not legal advice.',
  'What you are doing: you will read aloud words, letters, syllables and prayer lines from a list, and the page will record your voice on this device. Nothing is sent anywhere by the page. You choose when to send the exported file, and to whom.',
  'What you give: a permanent, worldwide, royalty-free right for Aleph to copy, edit (trim, adjust volume, clean up noise, join pieces together), distribute and play your recordings in the Aleph Hebrew-learning app and website (free or paid), in the audio that goes with the Aleph book, and in marketing and demos for Aleph.',
  'Sale: Aleph may be sold, or its rights transferred to a buyer or successor, and your recordings may go with it, including in a product that is sold or subscribed to. You will not be paid royalties or a share of income.',
  'Voice cloning and AI: your recordings will NOT be used to clone your voice, or to train or adjust any voice model, unless you tick the separate optional box below. Leaving it unticked has no effect on whether your recordings are accepted.',
  'Changing your mind: you may withdraw in writing at any time. This stops future use in new releases and new marketing as soon as reasonably practical. It does not reach copies already shipped, downloaded, printed or published.',
  'Privacy: your name is kept private and used only for this agreement and legal records. Your recordings are not published with your name unless you ask for credit.',
];

export const CONSENT_REQUIRED = [
  ['age18', 'I am 18 or older (if I am not, a parent or guardian is helping me and agrees to all of this).'],
  ['grant', 'I have read the summary above and I agree to the use of my recordings described in it, including that Aleph may be sold and that I will not be paid royalties.'],
  ['own_voice', 'The voice is mine, I am free to give these rights, and I will read only what is on the screen.'],
];
export const CONSENT_OPTIONAL_CLONE = ['ai_clone', 'OPTIONAL. I also agree that my recordings may be used as a reference for, or to train or adjust, a computer-generated voice that sounds like me, used inside Aleph, its book audio and its marketing. (Leave unticked for NO.)'];

export const consentComplete = (c) => !!c && CONSENT_REQUIRED.every(([k]) => c.required && c.required[k] === true) && !!String(c.volunteer_name || '').trim();

export function consentRecord({ volunteerName, required, aiClone, creditName, acceptedAt, donorRef, tradition, voice }) {
  return {
    version: CONSENT_VERSION, donor_ref: donorRef, accepted_at: acceptedAt, volunteer_name: String(volunteerName || '').trim(),
    tradition, voice, required: Object.fromEntries(CONSENT_REQUIRED.map(([k]) => [k, !!(required && required[k])])),
    ai_clone_consent: aiClone === true, credit_name: String(creditName || '').trim(),
    note: 'Ticked on screen. A signed form (docs/voices/donor-rights-grant.md) is still the legal record until a lawyer says otherwise.',
    text: CONSENT_TEXT, required_boxes: Object.fromEntries(CONSENT_REQUIRED), optional_box: CONSENT_OPTIONAL_CLONE[1],
  };
}

// ---------- CSV ----------
export const csvCell = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (cols, rows) => [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';
export function parseCsv(text) {
  text = String(text).replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [h = [], ...body] = rows;
  return body.filter((r) => r.length > 1 || (r[0] || '') !== '').map((r) => Object.fromEntries(h.map((k, i) => [k.trim(), r[i] ?? ''])));
}

// ---------- items and filenames ----------
/** Ids become path segments: keep [A-Za-z0-9._-], collapse anything else to '-'. Returns '' if nothing usable is left. */
export const safeId = (s) => String(s ?? '').trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');

/** Repo audio path convention (tools/audio/hebrew_data.mjs audioPath): audio/<voice>/<tradition>/<kind>/<id>.<ext>; the shipped ext is mp3, the recorder writes wav. */
export function clipPath(voice, tradition, kind, id, ext = 'wav') {
  if (!VOICES.includes(voice)) throw new Error(`voice must be m or f, got "${voice}"`);
  if (!TRADITIONS.includes(tradition)) throw new Error(`unknown tradition "${tradition}"`);
  if (!KINDS.includes(kind)) throw new Error(`unknown kind "${kind}"`);
  const sid = safeId(id);
  if (!sid) throw new Error(`unusable id "${id}"`);
  return `audio/${voice}/${tradition}/${kind}/${sid}.${ext}`;
}
export function parseClipPath(p) {
  const m = /^audio\/([mf])\/(israeli|sephardi|ashkenazi)\/(letter|vowel|syllable|line|prayer|word)\/([A-Za-z0-9._-]+)\.([A-Za-z0-9]+)$/.exec(String(p).replace(/\\/g, '/'));
  return m ? { voice: m[1], tradition: m[2], kind: m[3], id: m[4], ext: m[5].toLowerCase() } : null;
}

const pick = (r, ...ks) => { for (const k of ks) if (r[k] != null && String(r[k]).trim() !== '') return String(r[k]).trim(); return ''; };
/** Rows from any of the repo's script CSVs (recording-script-<tradition>.csv, recording-script.csv, recordings_needed.csv) -> items. */
export function normalizeItems(rows, { tradition = '', voice = '', kind = 'word' } = {}) {
  const out = []; const seen = new Set();
  for (const r of rows) {
    const id = safeId(pick(r, 'id', 'item_id'));
    const he = pick(r, 'pointed_hebrew', 'text_niqqud', 'text', 'text_he');
    if (!id || !he) continue;
    const t = pick(r, 'tradition') || tradition; const v = pick(r, 'voice') || voice; const k = pick(r, 'kind') || kind;
    if (voice && pick(r, 'voice') && pick(r, 'voice') !== voice) continue; // master slate has one row per voice
    if (tradition && pick(r, 'tradition') && pick(r, 'tradition') !== tradition) continue;
    const key = `${t}/${v}/${k}/${id}`; if (seen.has(key)) continue; seen.add(key);
    out.push({ id, kind: k, tradition: t, he, translit: pick(r, 'read_aloud', 'transliteration', 'translit'), english: pick(r, 'gloss', 'english', 'meaning'), note: pick(r, 'check', 'direction', 'donor_note', 'notes') });
  }
  return out;
}
export function itemsFromJson(text) {
  const j = JSON.parse(text);
  const list = Array.isArray(j) ? j : j.items;
  if (!Array.isArray(list)) throw new Error('JSON must be an array of items or {items:[...]}');
  return { items: list.map((x) => ({ id: safeId(x.id), kind: x.kind || 'word', tradition: x.tradition || '', he: x.he || '', translit: x.translit || '', english: x.english || '', note: x.note || '' })).filter((x) => x.id && x.he), tradition: j.tradition || '' };
}
/** Guess the tradition from a file name such as recording-script-sephardi.csv. */
export const traditionFromName = (n) => (TRADITIONS.find((t) => String(n).toLowerCase().includes(t)) || '');

// ---------- audio analysis ----------
export const dbfs = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
export const THRESH = { clipPeak: 0.989, clipRun: 3, silentPeakDb: -40, quietPeakDb: -24, minSeconds: 0.25 };
export function analyze(samples, sampleRate) {
  let peak = 0, sum = 0, run = 0, runs = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]); if (a > peak) peak = a; sum += a * a;
    if (a >= THRESH.clipPeak) { run++; if (run === THRESH.clipRun) runs++; } else run = 0;
  }
  const rms = samples.length ? Math.sqrt(sum / samples.length) : 0;
  return { duration: samples.length / sampleRate, sampleRate, peak, peakDb: dbfs(peak), rmsDb: dbfs(rms), clipRuns: runs };
}
export function warningsFor(a) {
  const w = [];
  if (a.peak >= THRESH.clipPeak || a.clipRuns > 0) w.push('clipping');
  if (a.peakDb < THRESH.silentPeakDb) w.push('silent');
  else if (a.peakDb < THRESH.quietPeakDb) w.push('quiet');
  if (a.duration < THRESH.minSeconds) w.push('too-short');
  return w;
}
export const WARNING_TEXT = {
  clipping: 'Too loud: the recording distorts. Move the phone a little further away or speak softer, then re-record.',
  silent: 'Nothing was heard. Check the microphone is not muted, then re-record.',
  quiet: 'Rather quiet. Move a little closer to the microphone, then re-record.',
  'too-short': 'Very short. Make sure you started speaking after pressing Record, then re-record.',
};

/** Mono 16-bit PCM WAV. samples: Float32Array in [-1,1]. */
export function encodeWav(samples, sampleRate) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, x < 0 ? Math.round(x * 32768) : Math.round(x * 32767), true); }
  return new Uint8Array(buf);
}

// ---------- manifest.csv ----------
export const MANIFEST_COLS = ['item_id', 'kind', 'voice', 'tradition', 'path', 'duration_s', 'peak_dbfs', 'rms_dbfs', 'sample_rate', 'warnings', 'volunteer_name', 'donor_ref', 'ai_clone_consent', 'recorded_at'];
export const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : '');
export function manifestRow(clip, ctx) {
  return { item_id: clip.id, kind: clip.kind, voice: ctx.voice, tradition: clip.tradition || ctx.tradition, path: clip.path, duration_s: r3(clip.duration), peak_dbfs: Number.isFinite(clip.peakDb) ? Math.round(clip.peakDb * 100) / 100 : '-inf', rms_dbfs: Number.isFinite(clip.rmsDb) ? Math.round(clip.rmsDb * 100) / 100 : '-inf', sample_rate: clip.sampleRate, warnings: (clip.warnings || []).join(' '), volunteer_name: ctx.volunteerName, donor_ref: ctx.donorRef, ai_clone_consent: ctx.aiClone ? 'yes' : 'no', recorded_at: clip.recordedAt };
}

// ---------- zip (store only) ----------
let CRC_T = null;
export function crc32(u8) {
  if (!CRC_T) { CRC_T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; } }
  let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const utf8 = (s) => new TextEncoder().encode(s);
/** files: [{name, data: Uint8Array|string}] -> Uint8Array of a ZIP (method 0, UTF-8 names). */
export function zipStore(files, date = new Date()) {
  const dt = Math.max(0, date.getFullYear() - 1980) << 9 | (date.getMonth() + 1) << 5 | date.getDate(), tm = date.getHours() << 11 | date.getMinutes() << 5 | (date.getSeconds() >> 1);
  const parts = [], central = []; let off = 0;
  for (const f of files) {
    const name = utf8(f.name), data = typeof f.data === 'string' ? utf8(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    parts.push(new Uint8Array(h.buffer), name, data); central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)], out = new Uint8Array(off + cdSize + 22); let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}
/** Minimal reader. inflate(u8)->u8 is needed only for deflated entries (zips made by an OS tool). Returns [{name, data}]. */
export function zipRead(u8, inflate) {
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let e = u8.length - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip file (no end-of-central-directory record)');
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true); const out = [];
  for (let i = 0; i < n; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('corrupt zip central directory');
    const method = v.getUint16(p + 10, true), crc = v.getUint32(p + 16, true), csize = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    const ln = v.getUint16(lo + 26, true), lx = v.getUint16(lo + 28, true), ds = lo + 30 + ln + lx;
    let data = u8.subarray(ds, ds + csize);
    if (method === 8) { if (!inflate) throw new Error('deflated entry needs an inflate function'); data = inflate(data); } else if (method !== 0) throw new Error(`unsupported zip method ${method}`);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}`);
    if (!name.endsWith('/')) out.push({ name, data: new Uint8Array(data) });
    p += 46 + nl + xl + cl;
  }
  return out;
}

export const slug = (s) => String(s || 'volunteer').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'volunteer';
export const exportName = (name, date) => `alef-recordings-${slug(name)}-${String(date).slice(0, 10)}.zip`;
