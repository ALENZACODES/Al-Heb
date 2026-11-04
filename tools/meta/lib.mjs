// Shared metadata detection and stripping for tools/meta/scan.mjs and tools/meta/strip.mjs.
// Zero npm dependencies. Optional external tools (ffprobe, ffmpeg, pdfinfo, exiftool, python3 + pypdf) are detected at run time.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const DEFAULT_ROOTS = ['assets', 'data', 'book/out', 'docs/voices', 'docs/qa'];
export const SKIP_DIRS = new Set(['node_modules', '.git']);
export const TYPE_BY_EXT = {
  '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.webp': 'webp', '.svg': 'svg', '.pdf': 'pdf',
  '.mp3': 'mp3', '.wav': 'wav', '.flac': 'audio', '.ogg': 'audio', '.opus': 'audio', '.m4a': 'audio', '.aac': 'audio',
  '.json': 'json', '.csv': 'csv', '.tsv': 'csv', '.html': 'html',
};

// ---------- tool detection ----------
export function detectTools(disable = false) {
  const probe = (cmd, args) => {
    if (disable) return false;
    const r = spawnSync(cmd, args, { encoding: 'utf8' });
    return !r.error && r.status !== null;
  };
  const t = {
    ffprobe: probe('ffprobe', ['-version']),
    ffmpeg: probe('ffmpeg', ['-version']),
    pdfinfo: probe('pdfinfo', ['-v']),
    exiftool: probe('exiftool', ['-ver']),
    qpdf: probe('qpdf', ['--version']),
    python3: probe('python3', ['-V']),
  };
  t.pypdf = t.python3 && spawnSync('python3', ['-I', '-c', 'import pypdf'], { encoding: 'utf8' }).status === 0;
  return t;
}

// ---------- allowlist ----------
export function globToRe(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') { if (g[i + 1] === '*') { re += '.*'; i++; if (g[i + 1] === '/') i++; } else re += '[^/]*'; }
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}
export function loadAllowlist(file) {
  if (!file || !fs.existsSync(file)) return { entries: [] };
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { entries: (j.entries || []).map((e) => ({ ...e, re: globToRe(e.path) })) };
}
// An entry allows a finding when its path glob matches and (kinds absent or includes the finding kind).
export function allowedBy(allow, rel, finding) {
  for (const e of allow.entries) {
    if (!e.re.test(rel)) continue;
    if (!e.kinds || e.kinds.includes(finding.kind)) return e;
  }
  return null;
}

// ---------- walking ----------
export function walk(roots, cwd = process.cwd()) {
  const out = [];
  const visit = (p) => {
    let st;
    try { st = fs.lstatSync(p); } catch { return; }
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(p))) return;
      for (const n of fs.readdirSync(p).sort()) visit(path.join(p, n));
    } else if (st.isFile()) out.push(p);
  };
  for (const r of roots) visit(path.resolve(cwd, r));
  return out;
}
export const typeOf = (f) => TYPE_BY_EXT[path.extname(f).toLowerCase()] || null;

// ---------- finding helper ----------
const F = (kind, field, detail = '') => ({ kind, field, detail: String(detail).slice(0, 100) });

// ---------- PNG ----------
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'pHYs', 'bKGD', 'hIST', 'sPLT', 'acTL', 'fcTL', 'fdAT', 'cICP', 'mDCV', 'cLLI']);
export function pngChunks(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  const chunks = [];
  let p = 8;
  while (p + 12 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    if (p + 12 + len > buf.length) { chunks.push({ type, start: p, end: buf.length, data: buf.subarray(p + 8), truncated: true }); break; }
    chunks.push({ type, start: p, end: p + 12 + len, data: buf.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
    if (type === 'IEND') break;
  }
  return chunks;
}
function scanPng(buf) {
  const ch = pngChunks(buf);
  if (!ch) return [F('bad-format', 'not-a-png')];
  const out = [];
  for (const c of ch) {
    if (PNG_KEEP.has(c.type)) continue;
    if (['tEXt', 'zTXt', 'iTXt'].includes(c.type)) {
      const nul = c.data.indexOf(0);
      const kw = c.data.toString('latin1', 0, nul < 0 ? c.data.length : nul);
      const xmp = kw === 'XML:com.adobe.xmp';
      let val = '';
      if (c.type === 'tEXt') val = c.data.toString('latin1', nul + 1);
      out.push(F(xmp ? 'xmp' : 'png-text', `${c.type}:${kw}`, val));
    } else if (c.type === 'eXIf') out.push(F('exif', 'eXIf', `${c.data.length} bytes`));
    else if (c.type === 'tIME') out.push(F('png-time', 'tIME'));
    else if (c.type === 'caBX' || c.type === 'jumb') out.push(F('c2pa', c.type, `${c.data.length} bytes (C2PA/JUMBF)`));
    else out.push(F('png-chunk', c.type, `unrecognised ancillary chunk, ${c.data.length} bytes`));
  }
  return out;
}
export function stripPng(buf) {
  const ch = pngChunks(buf);
  if (!ch) throw new Error('not a PNG');
  const parts = [buf.subarray(0, 8)];
  for (const c of ch) if (PNG_KEEP.has(c.type)) parts.push(buf.subarray(c.start, c.end));
  return Buffer.concat(parts);
}

// ---------- JPEG ----------
function jpegSegments(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const segs = [];
  let p = 2;
  while (p + 4 <= buf.length) {
    if (buf[p] !== 0xff) break;
    const m = buf[p + 1];
    if (m === 0xff) { p++; continue; }
    if (m === 0xda || m === 0xd9) { segs.push({ m, start: p, end: buf.length, scan: true }); return segs; }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { segs.push({ m, start: p, end: p + 2 }); p += 2; continue; }
    const len = buf.readUInt16BE(p + 2);
    segs.push({ m, start: p, end: Math.min(p + 2 + len, buf.length), data: buf.subarray(p + 4, p + 2 + len) });
    p += 2 + len;
  }
  return segs;
}
function classifyJpegSeg(s) {
  const d = s.data;
  const head = d ? d.toString('latin1', 0, 32) : '';
  if (s.m === 0xe0) return head.startsWith('JFIF') ? null : F('jpeg-segment', 'APP0', head.split('\0')[0]);
  if (s.m === 0xe1) {
    if (head.startsWith('Exif')) return F('exif', 'APP1:Exif', `${d.length} bytes`);
    if (head.startsWith('http://ns.adobe.com/xap/1.0/')) return F('xmp', 'APP1:XMP', `${d.length} bytes`);
    if (head.startsWith('http://ns.adobe.com/xmp/extension/')) return F('xmp', 'APP1:XMP-extension', `${d.length} bytes`);
    return F('jpeg-segment', 'APP1', head.split('\0')[0]);
  }
  if (s.m === 0xe2) return head.startsWith('ICC_PROFILE') ? null : F('jpeg-segment', 'APP2', head.split('\0')[0]);
  if (s.m === 0xed) return F('iptc', 'APP13', head.split('\0')[0]);
  if (s.m === 0xeb) return F('c2pa', 'APP11', 'JUMBF/C2PA');
  if (s.m === 0xee) return head.startsWith('Adobe') ? null : F('jpeg-segment', 'APP14', head.split('\0')[0]);
  if (s.m === 0xfe) return F('jpeg-comment', 'COM', d.toString('latin1', 0, 80));
  if (s.m > 0xe0 && s.m <= 0xef) return F('jpeg-segment', `APP${s.m - 0xe0}`, head.split('\0')[0]);
  return null;
}
function scanJpeg(buf) {
  const segs = jpegSegments(buf);
  if (!segs) return [F('bad-format', 'not-a-jpeg')];
  const out = [];
  for (const s of segs) { const f = s.scan ? null : classifyJpegSeg(s); if (f) out.push(f); }
  const eoi = buf.lastIndexOf(Buffer.from([0xff, 0xd9]));
  if (eoi >= 0 && buf.length - (eoi + 2) > 0) out.push(F('trailing-data', 'after-EOI', `${buf.length - eoi - 2} bytes`));
  return out;
}
export function stripJpeg(buf) {
  const segs = jpegSegments(buf);
  if (!segs) throw new Error('not a JPEG');
  const parts = [buf.subarray(0, 2)];
  for (const s of segs) {
    if (s.scan) {
      const eoi = buf.lastIndexOf(Buffer.from([0xff, 0xd9]));
      parts.push(buf.subarray(s.start, eoi >= 0 ? eoi + 2 : buf.length));
      break;
    }
    if (!classifyJpegSeg(s)) parts.push(buf.subarray(s.start, s.end));
  }
  return Buffer.concat(parts);
}

// ---------- WebP ----------
const WEBP_META = { EXIF: 'exif', 'XMP ': 'xmp', C2PA: 'c2pa' };
function webpChunks(buf) {
  if (buf.length < 12 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null;
  const out = [];
  let p = 12;
  while (p + 8 <= buf.length) {
    const type = buf.toString('latin1', p, p + 4);
    const len = buf.readUInt32LE(p + 4);
    const end = Math.min(p + 8 + len + (len & 1), buf.length);
    out.push({ type, start: p, end, len });
    p = end;
  }
  return out;
}
function scanWebp(buf) {
  const ch = webpChunks(buf);
  if (!ch) return [F('bad-format', 'not-a-webp')];
  return ch.filter((c) => WEBP_META[c.type]).map((c) => F(WEBP_META[c.type], c.type.trim(), `${c.len} bytes`));
}
export function stripWebp(buf) {
  const ch = webpChunks(buf);
  if (!ch) throw new Error('not a WebP');
  const keep = ch.filter((c) => !WEBP_META[c.type]).map((c) => Buffer.from(buf.subarray(c.start, c.end)));
  for (const k of keep) if (k.toString('latin1', 0, 4) === 'VP8X') k[8] &= ~(0x08 | 0x04); // clear EXIF (0x08) and XMP (0x04) flags
  const body = Buffer.concat(keep);
  const hdr = Buffer.alloc(12);
  hdr.write('RIFF', 0, 'latin1'); hdr.writeUInt32LE(body.length + 4, 4); hdr.write('WEBP', 8, 'latin1');
  return Buffer.concat([hdr, body]);
}

// ---------- SVG ----------
const SVG_NS = ['sodipodi', 'inkscape', 'rdf', 'dc', 'cc', 'xmp', 'illustrator', 'sketch', 'serif', 'i', 'x', 'ns1'];
export function scanSvgText(t) {
  const out = [];
  const comments = t.match(/<!--[\s\S]*?-->/g) || [];
  for (const c of comments) out.push(F('svg-comment', 'comment', c.replace(/\s+/g, ' ')));
  for (const m of t.match(/<metadata[\s>][\s\S]*?<\/metadata>|<metadata\s*\/>/gi) || []) out.push(F('svg-metadata', '<metadata>', m.replace(/\s+/g, ' ')));
  if (/<\?xpacket/i.test(t)) out.push(F('xmp', 'xpacket'));
  const found = new Set();
  for (const m of t.matchAll(/<(sodipodi|inkscape|rdf|dc|cc|xmp|sketch|serif):[\w-]+|\s(sodipodi|inkscape|sketch|serif):[\w-]+=/g)) found.add(m[1] || m[2]);
  for (const m of t.matchAll(/xmlns:(sodipodi|inkscape|rdf|dc|cc|xmp|illustrator|sketch|serif)=/g)) found.add(m[1] + '(xmlns)');
  for (const f of found) out.push(F('svg-editor', f, 'editor/RDF namespace usage'));
  return out;
}
export function stripSvgText(t) {
  let s = t;
  s = s.replace(/<\?xpacket[\s\S]*?\?>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<metadata[\s>][\s\S]*?<\/metadata>/gi, '').replace(/<metadata\s*\/>/gi, '');
  s = s.replace(/<(sodipodi|inkscape|sketch|serif):[\w-]+(?:[^>"']|"[^"]*"|'[^']*')*?(?:\/>|>[\s\S]*?<\/\1:[\w-]+>)/g, '');
  s = s.replace(/\s(sodipodi|inkscape|sketch|serif):[\w-]+=(?:"[^"]*"|'[^']*')/g, '');
  s = s.replace(/\sxmlns:(sodipodi|inkscape|rdf|dc|cc|xmp|illustrator|sketch|serif)=(?:"[^"]*"|'[^']*')/g, '');
  return s;
}

// ---------- text patterns & JSON keys ----------
// Mirrors the section M.3 grep (generator|created with|produced by|Claude|ChatGPT|AI-generated), plus 'generated by/with' and image-generator names.
// 'Codex' is deliberately NOT matched: it appears legitimately in manuscript names (Leningrad Codex).
const TOOL_RE = /generator|created with|produced by|generated (?:with|by)|\bClaude\b|ChatGPT|ai-generated|midjourney|dall-?e|stable diffusion/i;
const META_KEYS = new Set(['author', 'authors', 'generator', 'created_by', 'createdby', 'creator', 'tool', 'tools', 'source_note', 'provenance', 'provenance_note', 'comment', 'comments', '_comment', 'software', 'producer', 'generated_by', 'last_generated', 'generated_at']);
function walkJson(v, p, out) {
  if (Array.isArray(v)) { v.forEach((x, i) => walkJson(x, p + '[' + i + ']', out)); return; }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (META_KEYS.has(k.toLowerCase())) out.push(F('json-key', p ? p + '.' + k : k, typeof x === 'string' ? x : JSON.stringify(x)));
      walkJson(x, p ? p + '.' + k : k, out);
    }
  }
}
function patternHits(text, label) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length && out.length < 20; i++) {
    const m = lines[i].match(TOOL_RE);
    if (m) out.push(F('text-pattern', `${label}:L${i + 1}`, m[0]));
  }
  return out;
}
function scanJson(text) {
  const out = [];
  try { walkJson(JSON.parse(text), '', out); } catch (e) { out.push(F('bad-format', 'invalid-json', e.message)); }
  return out.concat(patternHits(text, 'json'));
}
function scanCsv(text) {
  const out = [];
  const head = (text.split('\n', 1)[0] || '').split(/[,\t]/).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
  for (const h of head) if (META_KEYS.has(h)) out.push(F('csv-column', h, 'metadata-style column header'));
  return out.concat(patternHits(text, 'csv'));
}
function scanHtml(text) {
  const out = [];
  for (const m of text.matchAll(/<meta\s+[^>]*name=["'](generator|author|creator|application-name)["'][^>]*>/gi)) out.push(F('html-meta', m[1], m[0]));
  for (const c of text.match(/<!--[\s\S]*?-->/g) || []) if (TOOL_RE.test(c)) out.push(F('html-comment', 'comment', c.replace(/\s+/g, ' ')));
  return out;
}

// ---------- PDF ----------
const PDF_INFO_KEYS = ['Title', 'Subject', 'Keywords', 'Author', 'Creator', 'Producer', 'CreationDate', 'ModDate'];
function scanPdf(file, buf, tools) {
  const out = [];
  if (buf.toString('latin1', 0, 5) !== '%PDF-') return [F('bad-format', 'not-a-pdf')];
  if (tools.pdfinfo) {
    const r = spawnSync('pdfinfo', [file], { encoding: 'utf8' });
    if (r.status === 0) {
      for (const k of PDF_INFO_KEYS) {
        const m = r.stdout.match(new RegExp('^' + k + ':\\s+(.+)$', 'm'));
        if (m && m[1].trim() && !(k === 'Author' && m[1].trim() === 'John Khan')) out.push(F('pdf-info', k, m[1].trim()));
      }
      if (/^Metadata Stream:\s+yes/m.test(r.stdout)) out.push(F('xmp', 'PDF XMP /Metadata stream'));
      if (/^Custom Metadata:\s+yes/m.test(r.stdout)) out.push(F('pdf-info', 'custom Info keys'));
      return out;
    }
  }
  // Fallback: raw byte scan. Cannot see inside compressed object streams, so it may under-report.
  const t = buf.toString('latin1');
  for (const k of PDF_INFO_KEYS) { const m = t.match(new RegExp('/' + k + '\\s*(\\((?:[^()\\\\]|\\\\.)*\\)|<[0-9A-Fa-f\\s]*>)')); if (m) out.push(F('pdf-info', k, m[1])); }
  if (/\/Type\s*\/Metadata/.test(t) || /<\?xpacket/.test(t)) out.push(F('xmp', 'PDF XMP /Metadata stream'));
  return out;
}

// ---------- audio ----------
function scanId3(buf) {
  const out = [];
  if (buf.length >= 10 && buf.toString('latin1', 0, 3) === 'ID3') out.push(F('id3', 'ID3v2 header', `v2.${buf[3]}, tag size ${((buf[6] & 127) << 21) | ((buf[7] & 127) << 14) | ((buf[8] & 127) << 7) | (buf[9] & 127)} bytes`));
  if (buf.length >= 128 && buf.toString('latin1', buf.length - 128, buf.length - 125) === 'TAG') out.push(F('id3', 'ID3v1 footer', 'last 128 bytes'));
  const tail = buf.subarray(Math.max(0, buf.length - 400)).toString('latin1');
  if (tail.includes('APETAGEX') || buf.toString('latin1', 0, 4096).includes('APETAGEX')) out.push(F('ape', 'APEv2 tag'));
  if (tail.includes('LYRICSBEGIN')) out.push(F('id3', 'Lyrics3 tag'));
  return out;
}
function riffChunks(buf) {
  if (buf.length < 12 || buf.toString('latin1', 0, 4) !== 'RIFF') return null;
  const out = [];
  let p = 12;
  while (p + 8 <= buf.length) {
    const type = buf.toString('latin1', p, p + 4);
    const len = buf.readUInt32LE(p + 4);
    out.push({ type, start: p, end: Math.min(p + 8 + len + (len & 1), buf.length), len, list: type === 'LIST' ? buf.toString('latin1', p + 8, p + 12) : null });
    p += 8 + len + (len & 1);
  }
  return out;
}
const WAV_META = new Set(['bext', 'iXML', 'id3 ', 'ID3 ', '_PMX', 'XMP_', 'cart', 'LIST', 'DISP', 'axml', 'minf', 'elm1']);
function scanWav(buf) {
  const ch = riffChunks(buf);
  if (!ch) return [F('bad-format', 'not-a-riff')];
  return ch.filter((c) => WAV_META.has(c.type)).map((c) => F(c.type === 'bext' ? 'bext' : c.type === 'iXML' ? 'ixml' : c.type === 'LIST' ? 'riff-list' : 'riff-meta', c.type.trim() + (c.list ? ':' + c.list : ''), `${c.len} bytes`));
}
function ffprobeTags(file, tools) {
  if (!tools.ffprobe) return [];
  const r = spawnSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file], { encoding: 'utf8' });
  if (r.status !== 0) return [];
  let j; try { j = JSON.parse(r.stdout); } catch { return []; }
  const out = [];
  for (const [k, v] of Object.entries(j.format?.tags || {})) out.push(F('ffprobe-tag', 'format:' + k, v));
  (j.streams || []).forEach((s, i) => { for (const [k, v] of Object.entries(s.tags || {})) if (!/^(language|handler_name|vendor_id)$/i.test(k) || s.codec_type !== 'audio') out.push(F('ffprobe-tag', `stream${i}:${k}`, v)); });
  return out;
}

// ---------- entry point ----------
export function scanFile(file, tools) {
  const type = typeOf(file);
  if (!type) return null;
  const buf = fs.readFileSync(file);
  let f = [];
  const text = () => buf.toString('utf8');
  switch (type) {
    case 'png': f = scanPng(buf); break;
    case 'jpg': f = scanJpeg(buf); break;
    case 'webp': f = scanWebp(buf); break;
    case 'svg': f = scanSvgText(text()).concat(patternHits(text().replace(/<!--[\s\S]*?-->/g, ''), 'svg')); break;
    case 'pdf': f = scanPdf(file, buf, tools); break;
    case 'mp3': f = scanId3(buf).concat(ffprobeTags(file, tools)); break;
    case 'wav': f = scanWav(buf).concat(ffprobeTags(file, tools)); break;
    case 'audio': f = scanId3(buf).concat(ffprobeTags(file, tools)); break;
    case 'json': f = scanJson(text()); break;
    case 'csv': f = scanCsv(text()); break;
    case 'html': f = scanHtml(text()); break;
  }
  // de-duplicate (ffprobe repeats what the byte parser saw under a different kind)
  const seen = new Set();
  return { type, findings: f.filter((x) => { const k = x.kind + '|' + x.field; if (seen.has(k)) return false; seen.add(k); return true; }) };
}

export function scanTree(roots, { tools, allow, cwd = process.cwd() }) {
  const files = walk(roots, cwd);
  const result = { files: [], byType: {}, tools, allowlistHits: new Set() };
  for (const file of files) {
    const rel = path.relative(cwd, file).split(path.sep).join('/');
    let r;
    try { r = scanFile(file, tools); } catch (e) {
      if (e.code === 'ENOENT') continue; // file vanished mid-scan (another process writing temp files)
      r = { type: typeOf(file), findings: [F('scan-error', 'exception', e.message)] }; }
    if (!r) continue;
    const findings = r.findings.map((x) => {
      const e = allowedBy(allow, rel, x);
      if (e) result.allowlistHits.add(e.path);
      return { ...x, allowed: e ? e.reason || true : false };
    });
    result.files.push({ file: rel, type: r.type, findings });
    const t = (result.byType[r.type] ||= { scanned: 0, withFindings: 0, findings: 0, allowedFindings: 0, kinds: {} });
    t.scanned++;
    const real = findings.filter((x) => !x.allowed);
    if (real.length) t.withFindings++;
    t.findings += real.length;
    t.allowedFindings += findings.length - real.length;
    for (const x of real) t.kinds[x.kind] = (t.kinds[x.kind] || 0) + 1;
  }
  return result;
}

// ---------- stripping ----------
export const COMMANDS = {
  png: (f) => `exiftool -all= -overwrite_original ${f}`,
  jpg: (f) => `exiftool -all= -overwrite_original ${f}`,
  webp: (f) => `exiftool -all= -overwrite_original ${f}`,
  pdf: (f) => `exiftool -all= -overwrite_original ${f}   # then optional: qpdf --linearize ${f} out.pdf`,
  mp3: (f, o = 'out.mp3', mode = 'copy') => mode === 'reencode'
    ? `ffmpeg -i ${f} -af loudnorm=I=-16:TP=-1.0:LRA=11 -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k -map_metadata -1 -fflags +bitexact -write_id3v1 0 -id3v2_version 0 ${o}`
    : `ffmpeg -i ${f} -map 0:a -c:a copy -map_metadata -1 -fflags +bitexact -write_id3v1 0 -id3v2_version 0 ${o}`,
  wav: (f, o = 'out.wav') => `ffmpeg -i ${f} -map 0:a -c:a copy -map_metadata -1 -fflags +bitexact ${o}`,
  svg: (f) => `(text step, built in) remove comments, <metadata>, sodipodi:*/inkscape:* nodes and RDF namespaces from ${f}`,
  json: (f) => `(manual) edit ${f}: remove or replace flagged keys with neutral licence/source fields`,
  csv: (f) => `(manual) edit ${f}`,
  html: (f) => `(manual) edit ${f}`,
  audio: (f, o = 'out.m4a') => `ffmpeg -i ${f} -map 0:a -c:a copy -map_metadata -1 -fflags +bitexact ${o}`,
};

// Returns { how, run(src, dst) -> void } or null when no automatic stripper is available. dst is a temp path; run() throws on failure.
export function stripper(type, tools, { audioMode = 'copy' } = {}) {
  const bytes = (fn) => ({ how: 'built-in', run: (src, dst) => fs.writeFileSync(dst, fn(fs.readFileSync(src))) });
  switch (type) {
    case 'png': return bytes(stripPng);
    case 'jpg': return bytes(stripJpeg);
    case 'webp': return bytes(stripWebp);
    case 'svg': return { how: 'built-in', run: (s, d) => fs.writeFileSync(d, stripSvgText(fs.readFileSync(s, 'utf8'))) };
    case 'mp3': case 'wav': case 'audio': {
      if (!tools.ffmpeg) return null;
      return { how: 'ffmpeg', run: (s, d) => {
        const args = ['-y', '-v', 'error', '-i', s, '-map', '0:a'];
        if (type === 'mp3' && audioMode === 'reencode') args.push('-af', 'loudnorm=I=-16:TP=-1.0:LRA=11', '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '96k');
        else args.push('-c:a', 'copy');
        args.push('-map_metadata', '-1', '-fflags', '+bitexact');
        if (type === 'mp3') args.push('-write_id3v1', '0', '-id3v2_version', '0');
        args.push('-f', type === 'mp3' ? 'mp3' : type === 'wav' ? 'wav' : path.extname(s).slice(1).replace('m4a', 'ipod'), d);
        const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
        if (r.status !== 0) throw new Error('ffmpeg failed: ' + r.stderr);
      } };
    }
    case 'pdf': {
      if (tools.exiftool) return { how: 'exiftool', run: (s, d) => {
        fs.copyFileSync(s, d);
        const r = spawnSync('exiftool', ['-all=', '-overwrite_original', d], { encoding: 'utf8' });
        if (r.status !== 0) throw new Error(r.stderr);
        if (tools.qpdf) { const t = d + '.q'; const q = spawnSync('qpdf', ['--linearize', d, t]); if (q.status === 0 || q.status === 3) fs.renameSync(t, d); }
      } };
      if (tools.pypdf) return { how: 'python3+pypdf (rewrites the file; page content streams are copied, not re-rendered)', run: (s, d) => {
        const py = 'import sys\nfrom pypdf import PdfReader, PdfWriter\nw=PdfWriter(clone_from=PdfReader(sys.argv[1]))\nw._root_object.pop("/Metadata",None)\nw._info=None\nw.write(sys.argv[2])\n';
        const r = spawnSync('python3', ['-I', '-c', py, s, d], { encoding: 'utf8' });
        if (r.status !== 0) throw new Error(r.stderr);
      } };
      return null;
    }
    default: return null;
  }
}
