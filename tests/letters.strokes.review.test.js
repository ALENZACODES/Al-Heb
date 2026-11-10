// Stroke-record review sheets and the in-app review notices.
// (1) every one of the 54 records (27 letters x print/cursive) renders to the review-sheet SVG without error and keeps
//     every median point inside the 0..1000 box; (2) the generated sheets exist, one PNG per letter, metadata-free;
// (3) trace.view.js shows the draft note for validated:false records and the stronger HIGH-doubt note for the two
//     cursive finals (pe-final, tsadi-final) listed in docs/letters/REVIEW-LIST.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { reviewNotice, HIGH_DOUBT } from '../src/letters/trace.view.js';

const root = new URL('../', import.meta.url);
const rd = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const letters = JSON.parse(rd('data/letters/letters.json'));
const by = Object.fromEntries(letters.map((l) => [l.id, l]));
const SCRIPTS = ['print', 'cursive'];
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'pHYs', 'bKGD']);

function pngChunkTypes(buf) {
  const out = []; let p = 8;
  while (p + 8 <= buf.length) { const len = buf.readUInt32BE(p); out.push(buf.toString('latin1', p + 4, p + 8)); p += 12 + len; }
  return out;
}

test('all 54 stroke records exist and every median point lies inside the 1000-unit box', () => {
  let n = 0;
  for (const l of letters) for (const s of SCRIPTS) {
    const b = l[s];
    assert.ok(b && Array.isArray(b.strokes) && b.strokes.length > 0, `${l.id}/${s} has strokes`);
    assert.equal(b.validated, false, `${l.id}/${s} is still a draft (flip this test when a teacher validates)`);
    for (const st of b.strokes) {
      assert.match(st.path, /^M/, `${l.id}/${s} path starts with M`);
      assert.ok(st.median.length >= 2);
      for (const [x, y] of st.median) assert.ok(x >= 0 && x <= 1000 && y >= 0 && y <= 1000, `${l.id}/${s} point ${x},${y} in box`);
    }
    n++;
  }
  assert.equal(n, 54);
});

test('review sheets: one metadata-free PNG per letter, the printable HTML has 54 tick rows, the coverage report lists no stroke under 90% inside its outline', () => {
  const dir = new URL('docs/letters/review-sheets/', root);
  for (const l of letters) {
    const f = new URL(l.id + '.png', dir);
    assert.ok(fs.existsSync(f), `review sheet for ${l.id}`);
    const buf = fs.readFileSync(f);
    assert.equal(buf.readUInt32BE(0), 0x89504e47, 'PNG signature');
    const extra = pngChunkTypes(buf).filter((t) => !PNG_KEEP.has(t));
    assert.deepEqual(extra, [], `${l.id}.png carries no text/time/XMP chunks`);
  }
  const html = rd('docs/letters/REVIEW-SHEET.html');
  assert.equal((html.match(/<tr class="/g) || []).length, 54, '54 tick rows');
  assert.equal((html.match(/<tr class="high"/g) || []).length, 2, 'two HIGH-doubt rows');
  for (const l of letters) assert.ok(html.includes('<b>' + l.id + '</b>'), 'row for ' + l.id);
  const cov = JSON.parse(rd('docs/letters/review-sheets/coverage.json'));
  assert.equal(cov.records, 54);
  assert.deepEqual(cov.belowNinetyPercent, []);
  for (const l of letters) for (const s of SCRIPTS) assert.equal(cov.coverage[l.id][s].length, l[s].strokes.length, `${l.id}/${s} coverage per stroke`);
});

test('review sheet generator: --check-only reports every record (slow: set LETTERS_REVIEW_FULL=1; needs rsvg-convert and Pillow)', { skip: !process.env.LETTERS_REVIEW_FULL || !spawnSync('rsvg-convert', ['--version']).stdout }, () => {
  const r = spawnSync('python3', ['-I', 'tools/letters/review_sheets.py', '--check-only'], { cwd: root, encoding: 'utf8', timeout: 240000 });
  if (/No module named/.test(r.stderr || '')) return; // Pillow missing: nothing to assert
  assert.equal(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout);
  assert.equal(rep.records, 54);
  assert.deepEqual(rep.belowNinetyPercent, []);
});

test('reviewNotice: draft note for validated:false, HIGH note only for the two cursive finals', () => {
  assert.deepEqual(HIGH_DOUBT, { 'pe-final': ['cursive'], 'tsadi-final': ['cursive'] });
  for (const l of letters) for (const s of SCRIPTS) {
    const n = reviewNotice(l, s);
    if ((l.id === 'pe-final' || l.id === 'tsadi-final') && s === 'cursive') {
      assert.equal(n.level, 'high', `${l.id}/${s}`);
      assert.match(n.text, /may not be the one Israeli schools teach/);
    } else {
      assert.equal(n.level, 'draft', `${l.id}/${s}`);
      assert.match(n.text, /^Follow the arrows/);
    }
  }
  assert.equal(reviewNotice({ id: 'x', print: { strokes: [], validated: true } }, 'print').level, 'none');
  assert.equal(reviewNotice(by.alef, 'cursive', (k, f) => (k === 'trace.draftStrokes' ? 'TR' : f)).text, 'TR');
});

test('trace view renders the HIGH-doubt notice for pe-final / tsadi-final cursive and the draft note elsewhere (fake DOM)', async () => {
  class Txt { constructor(d) { this.nodeType = 3; this.data = String(d); } get textContent() { return this.data; } }
  class El {
    constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.className = ''; this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; this.style = {}; this._text = ''; }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    addEventListener() {} removeEventListener() {}
    appendChild(c) { this.children.push(c); return c; }
    set textContent(v) { this.children = []; this._text = String(v); } get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    querySelectorAll(sel) { const m = /^\[data-review="(\w+)"\]$/.exec(sel); return this.find((n) => (m ? n.attrs['data-review'] === m[1] : n.tag === sel)); }
  }
  globalThis.document = { createElement: (t) => new El(t), createTextNode: (d) => new Txt(d) };
  globalThis.window = { requestAnimationFrame: (f) => setTimeout(f, 0) };
  const { mount } = await import('../src/letters/trace.view.js');
  const data = { letters, mnemonics: null, confusables: null, keyboard: null, interference: null, consonants: null };
  const store = { get: (k, d) => d, set() {} };
  const open = async (id, script) => {
    const rootEl = new El('div');
    const un = mount(rootEl, { ...data, settings: { script }, params: { id }, store });
    for (let i = 0; i < 50 && /Loading/.test(rootEl.textContent); i++) await new Promise((r) => setTimeout(r, 10));
    const high = rootEl.querySelectorAll('[data-review="high"]').map((n) => n.textContent);
    const draft = rootEl.querySelectorAll('[data-review="draft"]').map((n) => n.textContent);
    un(); return { high, draft };
  };
  for (const id of ['pe-final', 'tsadi-final']) {
    const c = await open(id, 'cursive');
    assert.equal(c.high.length, 1, id + ' cursive shows the HIGH notice');
    assert.match(c.high[0], /may not be the one Israeli schools teach/);
    assert.equal(c.draft.length, 0);
    const p = await open(id, 'print');
    assert.equal(p.high.length, 0, id + ' print has no HIGH notice');
    assert.equal(p.draft.length, 1);
  }
  const a = await open('alef', 'print');
  assert.equal(a.high.length, 0); assert.equal(a.draft.length, 1);
  assert.match(a.draft[0], /Follow the arrows/);
});
