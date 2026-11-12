// Lane 4 (12 Nov): Move to Another Device. Packing (compression, optional AES-GCM passphrase), the link, the QR code,
// reading every file kind the app writes, and the honest wording: no account, no server, import merges, never overwrites.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createStore, createMemoryStorage } from '../src/store.js';
import { pack, unpack, isLocked, moveLink, codeFromText, toBase64Url, fromBase64Url, PBKDF2_ROUNDS } from '../src/sync/transfer.js';
import { encode, toSvg, byteCapacity, alignmentPositions, rawModules } from '../src/sync/qr.js';
import { movePackage, readIncoming, applyMerge, describeGains, MOVE_COPY, QR_MAX_BYTES, previewMerge } from '../src/sync/move.js';
import { exportProgress } from '../src/progress/store.js';

const mk = () => createStore({ storage: createMemoryStorage(), window: null });
const T0 = Date.UTC(2026, 10, 2, 15);
function seeded() {
  const s = mk();
  s.set('curriculum.progress', { completed: { r01: T0, r02: T0 + 1000 } });
  s.set('srs.cards', Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`word:r01:${i}`, { id: `word:r01:${i}`, kind: 'word', state: 'review', stability: 3, difficulty: 5, reps: 1, lapses: 0, lastReview: T0, due: T0 + 3 * 864e5, firstReview: T0, days: ['2026-11-02'] }])));
  s.set('streak', { count: 1, best: 1, last: '2026-11-02' });
  s.set('install.v1', { dismissedAt: 5 });
  return s;
}

test('base64url round-trips every byte value', () => {
  const b = new Uint8Array(256).map((_, i) => i);
  assert.deepEqual([...fromBase64Url(toBase64Url(b))], [...b]);
  assert.match(toBase64Url(b), /^[A-Za-z0-9_-]+$/);
  assert.throws(() => fromBase64Url('not a code!'));
});

test('pack and unpack: compressed, unlocked; the package is a backup object without device keys', async () => {
  const s = seeded(), pkg = movePackage(s, T0);
  assert.ok(!('install.v1' in pkg.data), 'the install prompt state stays on its own device');
  assert.equal(pkg.app, 'alef'); assert.equal(typeof pkg.checksum, 'string');
  const p = await pack(pkg);
  assert.equal(p.compressed, true); assert.ok(p.bytes < p.jsonBytes / 3, `${p.bytes} of ${p.jsonBytes}`);
  assert.equal(isLocked(p.code), false);
  assert.deepEqual(await unpack(p.code), JSON.parse(JSON.stringify(pkg)));
});

test('passphrase: AES-GCM with a PBKDF2 key; the right phrase opens it, a wrong phrase or a changed byte does not', async () => {
  assert.ok(PBKDF2_ROUNDS >= 100000);
  const pkg = movePackage(seeded(), T0);
  const p = await pack(pkg, { passphrase: 'cedar tree 42' });
  assert.equal(p.locked, true); assert.equal(isLocked(p.code), true);
  await assert.rejects(() => unpack(p.code), /locked/);
  await assert.rejects(() => unpack(p.code, { passphrase: 'cedar tree 43' }), /does not open/);
  const bytes = fromBase64Url(p.code); bytes[bytes.length - 3] ^= 1;
  await assert.rejects(() => unpack(toBase64Url(bytes), { passphrase: 'cedar tree 42' }), /does not open/);
  assert.deepEqual(await unpack(p.code, { passphrase: 'cedar tree 42' }), JSON.parse(JSON.stringify(pkg)));
  // two packs of the same data differ (fresh salt and IV each time)
  assert.notEqual((await pack(pkg, { passphrase: 'x' })).code, (await pack(pkg, { passphrase: 'x' })).code);
});

test('the link keeps the progress after "#", and a pasted link or bare code is read back', async () => {
  const { code } = await pack({ app: 'alef', schema: 1, data: { a: 1 } });
  const link = moveLink('https://alef-review.onrender.com/?x=1#/settings', code);
  assert.equal(link, `https://alef-review.onrender.com/?x=1#/move?p=${code}`);
  assert.ok(new URL(link).hash.includes(code) && !new URL(link).search.includes(code), 'the code is in the fragment, which browsers do not send to a server');
  assert.equal(codeFromText(` ${link} `), code); assert.equal(codeFromText(code), code); assert.equal(codeFromText('hello there'), '');
});

test('receiving: a Settings backup, a Progress file and a move package are all merged; a changed file is refused with nothing written', async () => {
  const from = seeded();
  for (const file of [from.exportJSON(), JSON.stringify(exportProgress(from, T0)), JSON.stringify(movePackage(from, T0))]) {
    const to = mk(); to.set('curriculum.progress', { completed: { r09: 5 } });
    const inc = readIncoming(to, file); assert.ok(inc.ok, inc.error);
    const r = applyMerge(to, inc.data); assert.ok(r.ok);
    assert.deepEqual(Object.keys(to.get('curriculum.progress').completed).sort(), ['r01', 'r02', 'r09']);
    assert.equal(Object.keys(to.get('srs.cards')).length, 40);
  }
  const bad = JSON.parse(from.exportJSON()); bad.data['curriculum.progress'].completed.r77 = 1;
  const to = mk(); const r = readIncoming(to, JSON.stringify(bad));
  assert.equal(r.ok, false); assert.match(r.error, /checksum/i); assert.deepEqual(to.keys(), []);
  assert.equal(readIncoming(to, '{"app":"other"}').ok, false);
});

test('preview wording counts what is added and promises no removal', () => {
  const to = mk(), from = seeded();
  const pv = previewMerge(to, readIncoming(to, movePackage(from)).data);
  const lines = describeGains(pv.gains, Object.keys(pv.data).length).join(' ');
  assert.match(lines, /2 more completed lessons/); assert.match(lines, /40 more review cards/); assert.match(lines, /Nothing is removed/);
  assert.match(describeGains(pv.gains, 0)[0], /already on this device/);
});

test('honest copy: no account, own devices only, nothing to a server; reconnect means import merges, never overwrites', () => {
  assert.match(MOVE_COPY.noAccount, /no accounts/i); assert.match(MOVE_COPY.noAccount, /your own devices/); assert.match(MOVE_COPY.noAccount, /Nothing goes to a server/);
  assert.match(MOVE_COPY.reconnect, /import merges, never overwrites/);
  assert.match(MOVE_COPY.hash, /never send that part/);
  assert.match(MOVE_COPY.passphrase, /unless you set a passphrase/);
  const view = readFileSync(new URL('../src/sync/move.view.js', import.meta.url), 'utf8');
  for (const word of ['sync your account', 'cloud backup', 'signed in', 'automatically synced']) assert.ok(!view.toLowerCase().includes(word), word);
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(view + readFileSync(new URL('../src/sync/transfer.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/sync/move.js', import.meta.url), 'utf8')), 'the move code makes no network request');
});

// ---------- QR ----------
test('QR: capacities, alignment positions and module counts match the standard tables', () => {
  assert.equal(byteCapacity(1, 'L'), 17); assert.equal(byteCapacity(1, 'M'), 14); assert.equal(byteCapacity(10, 'L'), 271); assert.equal(byteCapacity(40, 'L'), 2953); assert.equal(byteCapacity(40, 'M'), 2331);
  assert.deepEqual(alignmentPositions(7), [6, 22, 38]); assert.deepEqual(alignmentPositions(32), [6, 34, 60, 86, 112, 138]); assert.deepEqual(alignmentPositions(40), [6, 30, 58, 86, 114, 142, 170]);
  assert.equal(rawModules(1), 208); assert.equal(rawModules(40), 29648);
  assert.equal(QR_MAX_BYTES, 2953);
  assert.throws(() => encode(new Uint8Array(2954)), /Too much data/);
});

test('QR: finder, timing and dark module are where the standard puts them; the SVG has a quiet zone', () => {
  const q = encode('https://alef-review.onrender.com/#/move?p=AQE', { level: 'M' });
  const m = q.modules, n = q.size;
  for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) { for (let i = 0; i < 7; i++) { assert.ok(m[y][x + i] && m[y + 6][x + i] && m[y + i][x] && m[y + i][x + 6]); } assert.ok(m[y + 3][x + 3]); assert.ok(!m[y + 1][x + 1]); }
  for (let i = 8; i < n - 8; i++) { assert.equal(m[6][i], i % 2 === 0); assert.equal(m[i][6], i % 2 === 0); }
  assert.equal(m[n - 8][8], true, 'dark module');
  const svg = toSvg(q); assert.match(svg, new RegExp(`viewBox="0 0 ${n + 8} ${n + 8}"`)); assert.ok(!svg.includes('<script'));
});

const py = spawnSync('python3', ['-I', '-c', 'import cv2, numpy'], { encoding: 'utf8' });
test('QR: an independent reader (OpenCV) decodes codes from version 1 to 40 at both levels', { skip: py.status !== 0 ? 'OpenCV for Python is not installed' : false }, () => {
  const texts = [['L', 10], ['M', 40], ['L', 200], ['M', 700], ['L', 1400], ['L', 2900]].map(([lvl, n]) => {
    let s = 'https://alef-review.onrender.com/#/move?p='; let x = n; while (s.length < n) { x = (x * 1103515245 + 12345) & 0x7fffffff; s += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[x % 64]; }
    const q = encode(s, { level: lvl }); return { text: s, version: q.version, m: q.modules.map((r) => r.map((c) => (c ? 1 : 0)).join('')) };
  });
  const script = `
import json, sys, numpy as np, cv2
cases = json.load(sys.stdin); dets = [cv2.QRCodeDetector()] + ([cv2.QRCodeDetectorAruco()] if hasattr(cv2, 'QRCodeDetectorAruco') else [])
out = []
for c in cases:
    m = np.array([[0 if ch == '1' else 255 for ch in r] for r in c['m']], dtype=np.uint8); got = ''
    for k in (6, 8, 10, 4, 5, 3):
        img = cv2.copyMakeBorder(cv2.resize(m, (m.shape[1]*k, m.shape[0]*k), interpolation=cv2.INTER_NEAREST), 8*k, 8*k, 8*k, 8*k, cv2.BORDER_CONSTANT, value=255)
        got = next((t for t in (d.detectAndDecode(img)[0] for d in dets) if t), '')
        if got: break
    out.append(got == c['text'])
print(json.dumps(out))`;
  const r = spawnSync('python3', ['-I', '-c', script], { input: JSON.stringify(texts), encoding: 'utf8', maxBuffer: 64 << 20 });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), texts.map(() => true), texts.map((t) => 'v' + t.version).join(' '));
  assert.equal(Math.max(...texts.map((t) => t.version)), 40);
});
