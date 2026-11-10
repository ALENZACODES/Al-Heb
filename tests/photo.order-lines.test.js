import test from 'node:test';
import assert from 'node:assert/strict';
import { orderLines, orderedTextLines, boxClass } from '../src/photo/order-lines.js';

const B = (text, x, y, w = 60, h = 30) => ({ text, x, y, w, h });

test('single line: words ordered right-to-left by x-max', () => {
  const lines = orderedTextLines([B('עולם', 100, 100), B('שלום', 200, 100)]);
  assert.deepEqual(lines, ['שלום עולם']);
});
test('shuffled input gives the same output; lines top-down', () => {
  const boxes = [B('ג', 50, 200), B('ב', 200, 102), B('א', 300, 100), B('ד', 40, 202), B('ה', 150, 201)];
  assert.deepEqual(orderedTextLines(boxes), ['א ב', 'ה ג ד']);
  assert.deepEqual(orderedTextLines([...boxes].reverse()), ['א ב', 'ה ג ד']);
});
test('x-max (not x-min) decides order when widths differ', () => {
  // wide word starts further left but ends further right
  const lines = orderedTextLines([B('קצר', 120, 50, 30), B('ארוךארוך', 80, 50, 120)]);
  assert.deepEqual(lines, ['ארוךארוך קצר']);
});
test('mixed Hebrew + digits: digit run keeps LTR, Hebrew stays RTL', () => {
  // visual left->right: 4567 is at the right of 123 which is right of 050; Hebrew word is rightmost
  const boxes = [B('050', 20, 10, 50), B('123', 90, 10, 50), B('4567', 160, 10, 60), B('טלפון', 240, 10, 60)];
  assert.deepEqual(orderedTextLines(boxes), ['טלפון 050 123 4567']);
});
test('digits between Hebrew words: price at the left end of a menu line', () => {
  const boxes = [B('חלב', 300, 5), B('גדול', 220, 5), B('12.50', 100, 5), B('₪', 60, 5, 20)];
  const lines = orderedTextLines(boxes);
  assert.equal(lines[0].startsWith('חלב גדול'), true);
  assert.ok(lines[0].endsWith('12.50') || lines[0].includes('12.50'));
});
test('two separate LTR runs split by a Hebrew word are each reversed independently', () => {
  const boxes = [B('b', 10, 0, 20), B('a', 40, 0, 20), B('שם', 100, 0, 40), B('d', 170, 0, 20), B('c', 200, 0, 20)];
  // RTL visual order: c d | שם | a b?  right-to-left by x-max: c(220), d(190), שם(140), a(60), b(30)
  // runs: [c,d] -> [d,c]; [a,b] -> [b,a]
  assert.deepEqual(orderedTextLines(boxes), ['d c שם b a']);
});
test('slightly skewed lines (rotation) still cluster correctly', () => {
  // line 1 slopes down to the left by ~6px per word; line 2 is 50px below
  const l1 = [B('א1', 300, 100), B('א2', 230, 106), B('א3', 160, 112), B('א4', 90, 118)];
  const l2 = [B('ב1', 300, 160), B('ב2', 230, 166), B('ב3', 160, 172), B('ב4', 90, 178)];
  const out = orderedTextLines([...l2, ...l1]);
  assert.deepEqual(out, ['א1 א2 א3 א4', 'ב1 ב2 ב3 ב4']);
});
test('heavy skew where first-and-last word do not overlap vertically still joins via neighbours', () => {
  const l1 = [0, 1, 2, 3, 4, 5].map((i) => B(`א${i}`, 400 - i * 65, 100 + i * 14));
  const l2 = [0, 1, 2, 3, 4, 5].map((i) => B(`ב${i}`, 400 - i * 65, 240 + i * 14));
  const out = orderLines([...l2, ...l1]);
  assert.equal(out.length, 2);
  assert.equal(out[0].words.length, 6);
  assert.equal(out[0].words[0].text, 'א0');
});
test('different font sizes on one line (tall + short box) join by overlap', () => {
  const out = orderLines([B('גדול', 200, 90, 80, 60), B('קטן', 120, 105, 50, 20)]);
  assert.equal(out.length, 1);
});
test('empty / invalid input', () => {
  assert.deepEqual(orderLines([]), []);
  assert.deepEqual(orderLines(null), []);
  assert.deepEqual(orderLines([{ text: ' ', x: 0, y: 0, w: 1, h: 1 }, { text: 'א', x: NaN, y: 0, w: 1, h: 1 }]), []);
});
test('line bbox and boxClass', () => {
  const [l] = orderLines([B('א', 10, 20, 30, 10), B('ב', 50, 22, 30, 10)]);
  assert.deepEqual(l.bbox, { x: 10, y: 20, w: 70, h: 12 });
  assert.equal(boxClass('שלום'), 'he');
  assert.equal(boxClass('abc12'), 'ltr');
  assert.equal(boxClass('-'), 'neutral');
});
