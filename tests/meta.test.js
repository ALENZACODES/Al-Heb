// Metadata scan/strip tests on synthetic fixtures written to a temp dir (no repo assets touched).
// Tests needing ffmpeg, pdfinfo or python3+pypdf are skipped when those tools are absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { detectTools, globToRe, scanFile, stripPng, stripJpeg, stripWebp, stripSvgText, scanSvgText } from '../tools/meta/lib.mjs';
import { runScan } from '../tools/meta/scan.mjs';
import { runStrip, parseArgs as stripArgs } from '../tools/meta/strip.mjs';

const tools = detectTools();
const none = detectTools(true);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(extra = []) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), ...extra, chunk('IDAT', zlib.deflateSync(Buffer.from([0, 255, 0, 0]))), chunk('IEND', Buffer.alloc(0))]);
}
const seg = (m, data) => { const h = Buffer.alloc(4); h[0] = 0xff; h[1] = m; h.writeUInt16BE(data.length + 2, 2); return Buffer.concat([h, data]); };
function jpeg(withMeta) {
  const parts = [Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1'))];
  if (withMeta) parts.push(seg(0xe1, Buffer.from('Exif\0\0MM\0*', 'latin1')), seg(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>', 'latin1')), seg(0xed, Buffer.from('Photoshop 3.0\0', 'latin1')), seg(0xfe, Buffer.from('made by a tool')), seg(0xeb, Buffer.from('JP\0\0jumb', 'latin1')));
  parts.push(seg(0xdb, Buffer.alloc(65, 1)), Buffer.from([0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]));
  return Buffer.concat(parts);
}
function webp(withMeta) {
  const c = (t, d) => { const h = Buffer.alloc(8); h.write(t, 0, 'latin1'); h.writeUInt32LE(d.length, 4); return Buffer.concat([h, d, d.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
  const vp8x = Buffer.alloc(10); if (withMeta) vp8x[0] = 0x08 | 0x04;
  const body = Buffer.concat([Buffer.from('WEBP'), c('VP8X', vp8x), c('VP8 ', Buffer.alloc(10, 7)), ...(withMeta ? [c('EXIF', Buffer.from('Exif\0\0')), c('XMP ', Buffer.from('<x/>'))] : [])]);
  const h = Buffer.alloc(8); h.write('RIFF', 0); h.writeUInt32LE(body.length, 4);
  return Buffer.concat([h, body]);
}
const kinds = (file, t = none) => scanFile(file, t).findings.map((f) => f.kind);
const write = (dir, name, data) => { const p = path.join(dir, name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); return p; };

test('PNG: text, exif, time and C2PA chunks are found and stripped losslessly', () => {
  const d = tmp();
  const dirty = png([chunk('tEXt', Buffer.from('Software\0SomeGenerator')), chunk('iTXt', Buffer.from('XML:com.adobe.xmp\0\0\0\0\0<x/>')), chunk('eXIf', Buffer.from('MM')), chunk('tIME', Buffer.alloc(7)), chunk('caBX', Buffer.from('jumb')), chunk('pHYs', Buffer.alloc(9))]);
  const f = write(d, 'a.png', dirty);
  assert.deepEqual(new Set(kinds(f)), new Set(['png-text', 'xmp', 'exif', 'png-time', 'c2pa']));
  const clean = write(d, 'b.png', stripPng(dirty));
  assert.deepEqual(kinds(clean), []);
  assert.ok(stripPng(dirty).includes(chunk('pHYs', Buffer.alloc(9))), 'pHYs kept');
  assert.ok(stripPng(dirty).includes(chunk('IDAT', zlib.deflateSync(Buffer.from([0, 255, 0, 0])))), 'pixel data untouched');
});

test('JPEG: EXIF, XMP, IPTC, COM and JUMBF segments are found and stripped; JFIF and scan data stay', () => {
  const d = tmp();
  const f = write(d, 'a.jpg', jpeg(true));
  assert.deepEqual(new Set(kinds(f)), new Set(['exif', 'xmp', 'iptc', 'jpeg-comment', 'c2pa']));
  const s = stripJpeg(jpeg(true));
  assert.ok(s.equals(jpeg(false)));
  assert.deepEqual(kinds(write(d, 'b.jpg', s)), []);
});

test('WebP: EXIF and XMP chunks are found, stripped, RIFF size and VP8X flags fixed', () => {
  const d = tmp();
  assert.deepEqual(new Set(kinds(write(d, 'a.webp', webp(true)))), new Set(['exif', 'xmp']));
  const s = stripWebp(webp(true));
  assert.equal(s.readUInt32LE(4), s.length - 8);
  assert.equal(s[20] & 0x0c, 0);
  assert.deepEqual(kinds(write(d, 'b.webp', s)), []);
});

test('SVG: comments, <metadata>, editor namespaces found; strip removes them and keeps the drawing', () => {
  const svg = '<?xml version="1.0"?>\n<!-- Generator: Adobe Illustrator -->\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="x" inkscape:version="1.2" ><sodipodi:namedview id="nv" inkscape:zoom="2"/><metadata><rdf:RDF><dc:creator>me</dc:creator></rdf:RDF></metadata><title>Alef</title><path d="M0 0h1"/></svg>';
  const k = new Set(scanSvgText(svg).map((f) => f.kind));
  assert.ok(k.has('svg-comment') && k.has('svg-metadata') && k.has('svg-editor'));
  const out = stripSvgText(svg);
  assert.deepEqual(scanSvgText(out), []);
  assert.ok(out.includes('<path d="M0 0h1"/>') && out.includes('<title>Alef</title>'));
});

test('JSON: metadata keys and tool-name text are findings; plain content is not', () => {
  const d = tmp();
  const bad = write(d, 'bad.json', JSON.stringify({ a: { author: 'x', generator: 'tool' }, list: [{ comment: 'c' }], note: 'Created with Foo' }));
  const k = scanFile(bad, none).findings;
  assert.equal(k.filter((f) => f.kind === 'json-key').length, 3);
  assert.ok(k.some((f) => f.kind === 'text-pattern'));
  assert.deepEqual(kinds(write(d, 'ok.json', JSON.stringify({ id: 'a', hebrew: 'אב', source_ref: 'Gen 1:1', licence: 'CC0' }))), []);
  assert.deepEqual(kinds(write(d, 'cod.json', JSON.stringify({ source: 'Leningrad Codex' }))), [], 'Codex is manuscript content');
  assert.ok(kinds(write(d, 'h.csv', 'id,author\n1,x\n')).includes('csv-column'));
});

test('MP3/WAV: ID3v2, ID3v1, RIFF LIST/bext are detected by the byte parsers', () => {
  const d = tmp();
  const id3 = Buffer.concat([Buffer.from('ID3\x03\0\0\0\0\0\x0a'), Buffer.alloc(10), Buffer.alloc(64, 0xff)]);
  assert.deepEqual(kinds(write(d, 'a.mp3', id3)), ['id3']);
  const v1 = Buffer.concat([Buffer.alloc(64, 0xff), Buffer.from('TAG'), Buffer.alloc(125)]);
  assert.deepEqual(kinds(write(d, 'b.mp3', v1)), ['id3']);
  assert.deepEqual(kinds(write(d, 'c.mp3', Buffer.alloc(64, 0xff))), []);
  const c = (t, n) => { const h = Buffer.alloc(8); h.write(t, 0); h.writeUInt32LE(n, 4); return Buffer.concat([h, Buffer.alloc(n)]); };
  const body = Buffer.concat([Buffer.from('WAVE'), c('fmt ', 16), c('LIST', 8), c('bext', 4), c('data', 4)]);
  const h = Buffer.alloc(8); h.write('RIFF', 0); h.writeUInt32LE(body.length, 4);
  assert.deepEqual(new Set(kinds(write(d, 'a.wav', Buffer.concat([h, body])))), new Set(['riff-list', 'bext']));
});

test('audio: ffmpeg-tagged mp3 is flagged and the M.1-style strip yields a clean file', { skip: !(tools.ffmpeg && tools.ffprobe) }, () => {
  const d = tmp();
  const src = path.join(d, 'src.mp3');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=d=0.3', '-metadata', 'title=T', '-metadata', 'artist=A', '-metadata', 'comment=C', src]);
  assert.equal(r.status, 0);
  assert.ok(kinds(src, tools).includes('id3'));
  for (const mode of ['copy', 'reencode']) {
    const dd = tmp(); fs.copyFileSync(src, path.join(dd, 'x.mp3'));
    const s = runStrip({ ...stripArgs(['--apply', '--in-place', '--audio-mode', mode, '--allowlist', '/nonexistent']), paths: ['.'], cwd: dd }, () => {});
    assert.equal(s.changed, 1, mode);
    assert.deepEqual(kinds(path.join(dd, 'x.mp3'), tools), [], mode);
  }
});

test('PDF: Info keys and XMP detected; strip clears them', { skip: !(tools.pdfinfo && tools.pypdf) }, () => {
  const d = tmp();
  const f = path.join(d, 'a.pdf');
  const mk = 'from pypdf import PdfWriter\nw=PdfWriter()\nw.add_blank_page(100,100)\nw.add_metadata({"/Title":"T","/Author":"Someone","/Producer":"Tool 1"})\nw.write(__import__("sys").argv[1])\n';
  assert.equal(spawnSync('python3', ['-I', '-c', mk, f]).status, 0);
  const found = scanFile(f, tools).findings.map((x) => x.field);
  assert.ok(['Title', 'Author', 'Producer'].every((k) => found.includes(k)), found.join());
  const s = runStrip({ ...stripArgs(['--apply', '--in-place', '--allowlist', '/nonexistent']), paths: ['.'], cwd: d }, () => {});
  assert.equal(s.changed, 1);
  assert.deepEqual(scanFile(f, tools).findings, []);
});

test('allowlist: matching path+kind is reported as allowed and does not fail; other kinds still fail', () => {
  const d = tmp();
  write(d, 'data/images/provenance.json', JSON.stringify({ author: 'repo', generator: 'x' }));
  write(d, 'data/other.json', JSON.stringify({ author: 'repo' }));
  const al = write(d, 'allow.json', JSON.stringify({ entries: [{ path: 'data/images/provenance.json', reason: 'intentional', kinds: ['json-key', 'text-pattern'] }] }));
  const r = runScan({ paths: ['data'], cwd: d, allowlist: al, noTools: true });
  assert.equal(r.allowed, 3);
  assert.equal(r.total, 1);
  assert.deepEqual(r.res.files.filter((f) => f.findings.some((x) => !x.allowed)).map((f) => f.file), ['data/other.json']);
  assert.ok(globToRe('a/**/*.png').test('a/b/c/x.png') && !globToRe('a/*.png').test('a/b/x.png'));
});

test('strip: dry-run changes nothing; --out leaves originals; incoming refused in place; allowlisted file skipped', () => {
  const d = tmp();
  const dirty = png([chunk('tEXt', Buffer.from('Software\0X'))]);
  write(d, 'assets/images/incoming/a.png', dirty);
  write(d, 'assets/other/b.png', dirty);
  write(d, 'data/images/provenance.json', '{"author":"repo"}');
  const al = path.join(d, 'al.json');
  fs.writeFileSync(al, JSON.stringify({ entries: [{ path: 'data/images/provenance.json', kinds: ['json-key'] }] }));
  const base = { cwd: d, paths: ['assets', 'data'], noTools: true, allowlist: al, audioMode: 'copy', allowIncoming: false };
  const dry = runStrip({ ...base, apply: false, out: null, inPlace: false }, () => {});
  assert.equal(dry.dryRun, true); assert.equal(dry.changed, 0); assert.equal(dry.candidates, 2);
  assert.ok(fs.readFileSync(path.join(d, 'assets/other/b.png')).equals(dirty));
  const out = path.join(d, 'OUT');
  const o = runStrip({ ...base, apply: true, out, inPlace: false }, () => {});
  assert.equal(o.changed, 2);
  assert.deepEqual(kinds(path.join(out, 'assets/other/b.png')), []);
  assert.ok(fs.readFileSync(path.join(d, 'assets/other/b.png')).equals(dirty), 'original untouched with --out');
  const ip = runStrip({ ...base, apply: true, out: null, inPlace: true }, () => {});
  assert.equal(ip.refused, 1); assert.equal(ip.changed, 1);
  assert.ok(fs.readFileSync(path.join(d, 'assets/images/incoming/a.png')).equals(dirty), 'incoming not modified');
  assert.deepEqual(kinds(path.join(d, 'assets/other/b.png')), []);
  assert.throws(() => stripArgs(['--apply']), /--out DIR or --in-place/);
});

test('CLI exit codes: 0 clean, 1 findings', () => {
  const d = tmp();
  write(d, 'a.png', png());
  const run = () => spawnSync('node', [new URL('../tools/meta/scan.mjs', import.meta.url).pathname, '.', '--cwd', d, '--no-tools', '--allowlist', '/nonexistent'], { encoding: 'utf8' });
  assert.equal(run().status, 0);
  write(d, 'b.png', png([chunk('tEXt', Buffer.from('k\0v'))]));
  const r = run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL: 1 finding/);
});
