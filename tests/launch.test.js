// Launch lane: the launch docs exist and stay honest, the screenshots are real PNGs of the stated size with no metadata chunks,
// and the manifest points at files that exist. Does not launch a browser (tools/launch/shots.mjs does that).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const NAMES = ['home', 'lesson', 'letters', 'torah-line', 'speak', 'traditions', 'progress', 'vocab'];
const SIZE = { narrow: [390, 844], wide: [1280, 800] };

function chunks(buf) {
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'not a PNG');
  const out = []; let p = 8;
  while (p < buf.length) { const len = buf.readUInt32BE(p); out.push({ type: buf.subarray(p + 4, p + 8).toString('latin1'), data: buf.subarray(p + 8, p + 8 + len) }); p += 12 + len; }
  return out;
}

test('launch: 8 screens at 390x844 and 1280x800, valid PNG, dimensions match, only render chunks, under 150 KB', () => {
  for (const [prefix, [w, h]] of Object.entries(SIZE)) for (const n of NAMES) {
    const f = `assets/screens/${prefix}-${n}.png`; assert.ok(existsSync(join(root, f)), `${f} missing (run node tools/launch/shots.mjs)`);
    const buf = readFileSync(join(root, f)); const cs = chunks(buf); const ihdr = cs[0];
    assert.equal(ihdr.type, 'IHDR'); assert.equal(ihdr.data.readUInt32BE(0), w, f); assert.equal(ihdr.data.readUInt32BE(4), h, f);
    const extra = cs.map((c) => c.type).filter((t) => !['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND', 'sRGB', 'gAMA', 'cHRM', 'pHYs'].includes(t));
    assert.deepEqual(extra, [], `${f} carries metadata chunks`);
    assert.ok(buf.length < 150 * 1024, `${f} is ${buf.length} bytes`);
  }
});

test('launch: manifest screenshots, shortcuts and description are valid and point at existing files', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.ok(m.description && m.description.length <= 200);
  assert.match(m.description, /draft|unreviewed/i, 'description must say the content is a draft');
  assert.ok(m.categories.includes('education'));
  const narrow = m.screenshots.filter((s) => s.form_factor === 'narrow'); const wide = m.screenshots.filter((s) => s.form_factor === 'wide');
  assert.ok(narrow.length >= 1 && wide.length >= 1);
  for (const s of m.screenshots) { assert.ok(existsSync(join(root, s.src)), s.src); assert.equal(s.type, 'image/png'); assert.ok(s.label); }
  for (const s of m.screenshots) { const [w, h] = SIZE[s.form_factor]; assert.equal(s.sizes, `${w}x${h}`); }
  for (const s of m.shortcuts) assert.match(s.url, /^\.\/#\//);
});

test('launch: copy, limitations and checklist exist and keep the honest statements', () => {
  const copy = read('docs/launch/COPY.md'); const lim = read('docs/launch/LIMITATIONS.md'); const chk = read('docs/launch/CHECKLIST.md');
  for (const t of [copy, lim]) { assert.match(t, /no recorded|no recordings/i); assert.match(t, /not (yet )?(been )?reviewed|unreviewed/i); }
  assert.match(copy, /## Who it is for/); assert.match(copy, /## What it is not yet/); assert.equal((copy.match(/^- \*\*/gm) || []).length >= 5, true);
  assert.match(chk, /\| Owner \|/); assert.doesNotMatch(chk, /\[x\]/i, 'nothing may be ticked without a run');
  assert.ok((chk.match(/^\| \d+ \|/gm) || []).length >= 20);
});

test('launch: shots script lists the same 8 screens', () => {
  const src = read('tools/launch/shots.mjs');
  for (const n of NAMES) assert.ok(src.includes(`name: '${n}'`), n);
  assert.match(src, /390/); assert.match(src, /1280/);
});
