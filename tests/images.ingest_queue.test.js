// tools/images/ingest_queue.mjs: matching logic as pure functions, plus an end-to-end run on tiny generated PNGs
// in a temporary root (never the repo's own assets).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { specFor, normalName, matchName, loadTargets, plan, run, pickEngine, SHEETS } from '../tools/images/ingest_queue.mjs';
import { scanFile } from '../tools/meta/lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Minimal PNG writer: RGB or RGBA, optional tEXt chunk so the strip step has something to remove.
function png(w, h, { alpha = false, text = null, color = [40, 90, 60, 128] } = {}) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const bpp = alpha ? 4 : 3;
  const raw = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * bpp + 1)] = 0; for (let x = 0; x < w; x++) for (let c = 0; c < bpp; c++) raw[y * (w * bpp + 1) + 1 + x * bpp + c] = color[c]; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr)];
  if (text) parts.push(chunk('tEXt', Buffer.from(`Comment\0${text}`, 'latin1')));
  parts.push(chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

function tmpRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-queue-'));
  for (const s of SHEETS) { const dst = path.join(root, s.csv); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(path.join(REPO, s.csv), dst); }
  return root;
}

test('specFor pins the four specs and refuses anything else', () => {
  assert.deepEqual(specFor('assets/games/arcade/letterchomp/env.png'), { format: 'png', width: 1600, height: 600, alpha: false, kind: 'backdrop' });
  assert.equal(specFor('assets/img/calendar/header.png').width, 1600);
  assert.equal(specFor('assets/img/calendar/markers/candles.png').alpha, true);
  assert.equal(specFor('assets/img/rimon/frames/idle-01.png').width, 256);
  assert.deepEqual(specFor('assets/books/book17/BOOK17_p01.jpg'), { format: 'jpeg', width: 1659, height: 948, alpha: false, quality: 85, kind: 'book page' });
  assert.deepEqual(specFor('data/images/rimon/rimon-007.webp'), { format: 'webp', width: 512, height: 512, alpha: true, quality: 88, kind: 'still' });
  assert.equal(specFor('data/images/rimon/rimon-7.webp'), null);
  assert.equal(specFor('assets/img/other.png'), null);
  assert.equal(specFor('../etc/passwd'), null);
});

test('every path in every order sheet has a spec (loadTargets would throw otherwise)', () => {
  const t = loadTargets(REPO);
  assert.equal(t.size, 67 + 13 + 19 + 684 + 200, `${t.size} targets`); // arcade + calendar + rimon frames + books + rimon stills
  for (const p of t.keys()) assert.ok(specFor(p), p);
});

test('normalName drops extension, case and browser duplicate suffixes', () => {
  assert.equal(normalName('BOOK17_p01 (1).JPG'), 'book17_p01');
  assert.equal(normalName('letterchomp__env - Copy.png'), 'letterchomp__env');
  assert.equal(normalName('/x/y/candles.webp'), 'candles');
});

test('matchName: unique basenames match, shared ones need a folder prefix, unknown names return null', () => {
  const t = loadTargets(REPO);
  assert.equal(matchName('BOOK17_p01.png', t).path, 'assets/books/book17/BOOK17_p01.jpg');
  assert.equal(matchName('candles.png', t).path, 'assets/img/calendar/markers/candles.png');
  assert.equal(matchName('letterchomp__env.png', t).path, 'assets/games/arcade/letterchomp/env.png');
  assert.equal(matchName('rimon__idle-01.png', t).path, 'assets/img/rimon/frames/idle-01.png');
  assert.equal(matchName('frames__idle-01.png', t).path, 'assets/img/rimon/frames/idle-01.png');
  assert.match(matchName('env.png', t).error, /ambiguous: 30 targets/);
  assert.equal(matchName('holiday snap.png', t), null);
  assert.equal(matchName('nosuchgame__env.png', t), null);
});

test('plan: conflicts, unmatched, existing targets and --map are reported without writing anything', () => {
  const root = tmpRoot();
  const drop = path.join(root, 'drop'); fs.mkdirSync(drop);
  fs.writeFileSync(path.join(drop, 'lettertwins__env.png'), png(16, 6));
  fs.writeFileSync(path.join(drop, 'lettertwins__env (1).png'), png(16, 6));
  fs.writeFileSync(path.join(drop, 'IMG_0001.png'), png(16, 6));
  fs.writeFileSync(path.join(drop, 'IMG_0002.png'), png(16, 6));
  fs.writeFileSync(path.join(drop, 'notes.txt'), 'not an image');
  fs.mkdirSync(path.join(root, 'assets/img/calendar/markers'), { recursive: true });
  fs.writeFileSync(path.join(root, 'assets/img/calendar/markers/candles.png'), png(4, 4, { alpha: true }));
  fs.writeFileSync(path.join(drop, 'candles.png'), png(8, 8, { alpha: true }));
  const map = path.join(root, 'map.csv');
  fs.writeFileSync(map, 'file,path\nIMG_0001.png,assets/games/arcade/soundsnap/env.png\nIMG_0002.png,assets/not/in/sheet.png\n');
  const p = plan({ inputs: [drop], map, root, replace: false });
  const by = Object.fromEntries(p.rows.map((r) => [r.name, r]));
  assert.equal(by['lettertwins__env.png'].status, 'CONFLICT');
  assert.equal(by['lettertwins__env (1).png'].status, 'CONFLICT');
  assert.equal(by['IMG_0001.png'].status, 'MATCHED');
  assert.equal(by['IMG_0001.png'].target, 'assets/games/arcade/soundsnap/env.png');
  assert.equal(by['IMG_0002.png'].status, 'UNMATCHED');
  assert.equal(by['candles.png'].status, 'EXISTS');
  assert.equal(p.rows.length, 5); // notes.txt is not an image and is not listed
  assert.ok(!fs.existsSync(path.join(root, 'assets/games/arcade/soundsnap/env.png')));
  fs.rmSync(root, { recursive: true, force: true });
});

let engine = null;
try { engine = pickEngine('auto'); } catch { engine = null; }

test('run: resizes to spec, strips metadata, flags, rejects bad aspect, dry-run writes nothing', { skip: engine ? false : 'no Pillow and no ffmpeg on this machine' }, async () => {
  const root = tmpRoot();
  const drop = path.join(root, 'drop'); fs.mkdirSync(drop);
  fs.writeFileSync(path.join(drop, 'letterchomp__env.png'), png(320, 120, { text: 'drop me' }));       // backdrop, has a text chunk
  fs.writeFileSync(path.join(drop, 'rimon__idle-01.png'), png(64, 64, { alpha: true }));               // sprite with alpha (partly transparent)
  fs.writeFileSync(path.join(drop, 'festival.png'), png(64, 64));                                       // sprite without alpha -> flag
  fs.writeFileSync(path.join(drop, 'BOOK17_p01.png'), png(332, 190));                                   // book page source (1659x948 aspect, under 1%)
  fs.writeFileSync(path.join(drop, 'BOOK17_p02.png'), png(100, 100));                                   // wrong aspect -> rejected
  fs.writeFileSync(path.join(drop, 'header.png'), png(1600, 600));

  const dry = await run({ inputs: [drop], root, dryRun: true, replace: false, crop: false, engine: 'auto', quiet: true });
  assert.equal(dry.summary.written, 0);
  assert.ok(!fs.existsSync(path.join(root, 'assets')));
  assert.equal(dry.rows.find((r) => r.name === 'BOOK17_p02.png').status, 'REJECTED');
  assert.equal(dry.rows.find((r) => r.name === 'header.png').status, 'WOULD-WRITE');

  const rep = await run({ inputs: [drop], root, dryRun: false, replace: false, crop: false, engine: 'auto', quiet: true, report: path.join(root, 'rep.json') });
  assert.equal(rep.summary.failed, 0);
  assert.equal(rep.summary.written, 5);
  assert.equal(rep.summary.rejected, 1);
  const by = Object.fromEntries(rep.rows.map((r) => [r.name, r]));
  assert.deepEqual(by['festival.png'].flags, ['upscaled', 'not_transparent']);
  assert.deepEqual(by['letterchomp__env.png'].flags, ['upscaled']);
  assert.deepEqual(by['header.png'].flags, []);
  assert.ok(fs.existsSync(path.join(root, 'rep.json')));

  // written files: exact dimensions, right container, no metadata findings
  const dims = (f) => {
    const b = fs.readFileSync(f);
    if (b[0] === 0x89) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), fmt: 'png', alpha: b[25] === 6 };
    let p = 2; while (p < b.length) { if (b[p] !== 0xff) break; const m = b[p + 1]; const len = b.readUInt16BE(p + 2); if (m >= 0xc0 && m <= 0xc2) return { h: b.readUInt16BE(p + 5), w: b.readUInt16BE(p + 7), fmt: 'jpeg' }; p += 2 + len; }
    return null;
  };
  const env = dims(path.join(root, 'assets/games/arcade/letterchomp/env.png'));
  assert.deepEqual([env.w, env.h, env.fmt], [1600, 600, 'png']);
  const idle = dims(path.join(root, 'assets/img/rimon/frames/idle-01.png'));
  assert.deepEqual([idle.w, idle.h, idle.fmt, idle.alpha], [256, 256, 'png', true]);
  const book = dims(path.join(root, 'assets/books/book17/BOOK17_p01.jpg'));
  assert.deepEqual([book.w, book.h, book.fmt], [1659, 948, 'jpeg']);
  for (const f of ['assets/games/arcade/letterchomp/env.png', 'assets/img/rimon/frames/idle-01.png', 'assets/books/book17/BOOK17_p01.jpg', 'assets/img/calendar/header.png', 'assets/img/calendar/markers/festival.png']) {
    assert.deepEqual(scanFile(path.join(root, f), {}).findings, [], f);
  }

  // second run: targets exist, nothing is overwritten without --replace; --crop accepts the square one
  const again = await run({ inputs: [drop], root, dryRun: false, replace: false, crop: true, engine: 'auto', quiet: true });
  assert.equal(again.summary.exists, 5);
  assert.equal(again.summary.written, 1);
  assert.deepEqual(again.rows.find((r) => r.name === 'BOOK17_p02.png').flags, ['cropped', 'upscaled']);
  assert.equal(again.stillMissing.includes('assets/books/book17/BOOK17_p02.jpg'), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('Rimon stills: rimon-007.png becomes a 512 x 512 WebP with transparency, and present.json lists it', { skip: engine ? false : 'no Pillow and no ffmpeg on this machine' }, async () => {
  const root = tmpRoot();
  const drop = path.join(root, 'drop'); fs.mkdirSync(drop);
  fs.writeFileSync(path.join(drop, 'rimon-007.png'), png(96, 96, { alpha: true, text: 'made somewhere' }));
  fs.writeFileSync(path.join(drop, 'Rimon-012 (1).png'), png(64, 64, { alpha: true }));
  const t = loadTargets(root);
  assert.equal(matchName('rimon-007.png', t).path, 'data/images/rimon/rimon-007.webp');
  const rep = await run({ inputs: [drop], root, dryRun: false, replace: false, crop: false, engine: 'auto', quiet: true });
  assert.equal(rep.summary.failed, 0, JSON.stringify(rep.rows.map((r) => r.note)));
  assert.equal(rep.summary.written, 2);
  const out = path.join(root, 'data/images/rimon/rimon-007.webp');
  const b = fs.readFileSync(out);
  assert.equal(b.toString('latin1', 0, 4), 'RIFF'); assert.equal(b.toString('latin1', 8, 12), 'WEBP');
  assert.deepEqual(scanFile(out, {}).findings, []);
  const present = JSON.parse(fs.readFileSync(path.join(root, 'data/images/rimon/present.json'), 'utf8'));
  assert.deepEqual(present.ids, [7, 12]);
  assert.equal(rep.summary.rimonPresent, 2);
  fs.rmSync(root, { recursive: true, force: true });
});
