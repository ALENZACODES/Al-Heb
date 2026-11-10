// Blind and low-vision lane: unit tests for the text equivalents (strokes in words, letter shape labels, memory-card description) and,
// when Playwright is installed, the scenarios in tools/a11y/blind.mjs (--scenarios-only). No screen reader was used for any of this.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const SW = await import('../src/letters/strokewords.js');
const ST = await import('../src/letters/shapetext.js');

const line = (pts) => ({ median: pts });
const box = { x0: 0, y0: 0, x1: 1000, y1: 1000 };

test('strokes in words: places and directions are correct for plain lines (y points down)', () => {
  assert.equal(SW.placeOf([50, 50], box), 'top left');
  assert.equal(SW.placeOf([950, 950], box), 'bottom right');
  assert.equal(SW.placeOf([500, 500], box), 'centre');
  assert.equal(SW.placeOf([500, 50], box), 'top middle');
  assert.equal(SW.directionWords(10, 0), 'to the right');
  assert.equal(SW.directionWords(0, 10), 'down');
  assert.equal(SW.directionWords(-10, -10), 'up and to the left');
  assert.equal(SW.directionWords(10, 10), 'down and to the right');
  const d = SW.describeStroke([[50, 50], [300, 50], [600, 50], [950, 50]], box);
  assert.equal(d.start, 'top left'); assert.equal(d.kind, 'straight');
  assert.match(d.text, /Go to the right, in a straight line/);
  const v = SW.describeStroke([[500, 0], [500, 300], [500, 600], [500, 1000]], box);
  assert.match(v.text, /Go down, in a straight line/); assert.equal(v.length, 'long');
});

test('strokes in words: a bend is named, a dot is a dot, a very narrow letter drops left/right', () => {
  const bent = SW.describeStroke([[50, 50], [500, 50], [950, 50], [950, 400], [950, 950]], box);
  assert.equal(bent.kind, 'bent'); assert.match(bent.text, /Go to the right.*Turn sharply and go down/s);
  const dot = SW.describeStroke([[500, 500], [505, 503]], box);
  assert.equal(dot.kind, 'dot'); assert.match(dot.text, /small dot/);
  const narrow = { x0: 480, y0: 0, x1: 520, y1: 1000 };
  assert.equal(SW.placeOf([500, 20], narrow), 'top'); assert.equal(SW.placeOf([500, 980], narrow), 'bottom');
});

test('strokes in words: a second stroke that starts where the first ended says so, otherwise it says to lift', () => {
  const letter = { id: 'x', name: 'Ex', print: { strokes: [line([[100, 100], [500, 100], [900, 100]]), line([[900, 100], [900, 500], [900, 900]]), line([[100, 900], [500, 900]])] } };
  const d = SW.describeLetterStrokes(letter, 'print');
  assert.equal(d.total, 3);
  assert.match(d.strokes[0].sentence, /^Stroke 1 of 3: It starts at the top left/);
  assert.match(d.strokes[1].sentence, /Keep going from where the last stroke ended/);
  assert.match(d.strokes[2].sentence, /Lift your finger and move/);
  assert.equal(SW.describeLetterStrokes(letter, 'cursive').ok, false);
  assert.match(SW.describeLetterStrokes({ id: 'y' }, 'print').summary, /no stroke data/);
});

test('strokes in words: every letter, print and cursive, gets one sentence per stroke from data/letters (no stroke left undescribed)', () => {
  const letters = rd('data/letters/letters.json'); let n = 0;
  for (const l of letters) for (const script of ['print', 'cursive']) {
    if (!l[script]) continue;
    const d = SW.describeLetterStrokes(l, script);
    assert.ok(d.ok, l.id + ' ' + script);
    assert.equal(d.strokes.length, l[script].strokes.length, `${l.id} ${script} stroke count`);
    for (const s of d.strokes) { assert.match(s.sentence, /^Stroke \d+ of \d+: /); assert.match(s.sentence, /starts at|small dot/); assert.ok(s.sentence.length > 40 && !/undefined|NaN/.test(s.sentence), l.id + ' ' + s.sentence); n++; }
  }
  assert.ok(n > 60);
});

test('strokes in words: the note says tracing is a visual skill and that the text is an unchecked rough guide', () => {
  assert.match(SW.STROKE_WORDS_NOTE, /visual skill/); assert.match(SW.STROKE_WORDS_NOTE, /does not replace/); assert.match(SW.STROKE_WORDS_NOTE, /not checked/);
});

test('shape labels: every letter with a shape text gets one, and none names the letter itself', () => {
  const letters = rd('data/letters/letters.json'), mn = rd('data/letters/mnemonics.json').letters; let n = 0;
  for (const l of letters) {
    const m = mn.find((x) => x.id === l.id); const lab = ST.shapeLabel(l, m);
    if (!m || !m.shape) continue;
    assert.match(lab, /^Hebrew letter\. Shape: /); n++;
    const own = l.name.replace(/^Final\s+/i, '');
    assert.doesNotMatch(lab, new RegExp('\\b' + own + '\\b', 'i'), l.id + ' label names itself: ' + lab);
  }
  assert.ok(n >= 25);
  assert.equal(ST.shapeLabel({ name: 'Qof' }, null), '');
  assert.equal(ST.maskName('Alef is a handstand', 'Alef'), 'this letter is a handstand');
  assert.match(ST.wordLabel('שָׁלוֹם', 'sephardi'), /^Hebrew word\. Sounds like: \S+/);
});

test('memory card text: description is the picture idea plus the picture file description; every picture file has a title and description', async () => {
  class El { constructor(t) { this.tag = t; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.nodeType = 1; this._text = ''; this.innerHTML = ''; }
    setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; } addEventListener(t, f) { (this.listeners[t] ||= []).push(f); } appendChild(c) { this.children.push(c); return c; }
    set textContent(v) { this.children = []; this._text = v; } get textContent() { return this.text; }
    get text() { return this._text + this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
    find(p, o = []) { if (p(this)) o.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(p, o); return o; } async click() { for (const f of this.listeners.click || []) await f({}); } }
  globalThis.document = { createElement: (t) => new El(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
  const M = await import('../src/letters/memorycard.js');
  const chain = rd('data/letters/memory-chain.json');
  let withDesc = 0;
  for (const e of chain.letters) {
    const f = join(root, e.picture.svg); if (!existsSync(f)) continue;
    const clean = M.sanitizeSvg(readFileSync(f, 'utf8')); assert.ok(clean, e.id + ' svg is safe');
    const d = M.svgDescription(clean); if (d.length > 20) withDesc++;
  }
  assert.ok(withDesc >= 25, 'picture files carrying a description: ' + withDesc);
  const e = chain.letters[0];
  const text = M.pictureDescription(e, 'israeli', 'A mime does a handstand.');
  assert.match(text, /handstand/); assert.doesNotMatch(text, /Sound hook/);
  assert.match(M.pictureDescription(e, 'israeli', '', true), /Sound hook: .uh-oh.*Example word: aba/s);
  // the card: nothing described before the press (the chain is revealed step by step), a description after it; picture and glyph decorative
  const c = M.buildMemoryCard({ entry: e, glyph: e.hebrew, tradition: 'israeli', svg: null });
  const sr = c.el.find((n) => n.className === 'mc-sr')[0];
  assert.equal(sr.text, ''); assert.equal(sr.attrs['aria-live'], 'polite');
  const art = c.el.find((n) => n.attrs['data-act'] === 'mc-art')[0];
  assert.equal(art.attrs['aria-describedby'], sr.attrs.id);
  await art.click();
  assert.match(sr.text, /handstand/);
  for (const cls of ['mc-svg', 'mc-glyph', 'mc-idea']) assert.equal(c.el.find((n) => n.className === cls)[0].attrs['aria-hidden'], 'true', cls);
});

const haveBrowser = (() => { try { return spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }).status === 0; } catch { return false; } })();
test('blind lane scenarios in Chromium: stroke stepper, picture description, labelled quiz glyphs, verdict reachable by a focus move', { skip: !haveBrowser, timeout: 240000 }, () => {
  const out = join(tmpdir(), 'alef-blind-scen.json');
  const r = spawnSync('node', ['tools/a11y/blind.mjs', '--scenarios-only', '--out', out], { cwd: root, encoding: 'utf8', timeout: 230000 });
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(-800));
  const run = JSON.parse(readFileSync(out, 'utf8'));
  const failed = Object.entries(run.scenarios).filter(([, v]) => !v.ok).map(([k, v]) => k + ' ' + v.detail);
  assert.deepEqual(failed, []);
  assert.ok(Object.keys(run.scenarios).length >= 15);
});
