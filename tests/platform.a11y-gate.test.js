// J7 accessibility gate (static): named fields, alt on images, reduced motion (tools/deploy/check-a11y.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanControls, scanTree, insideLabel, motionRule } from '../tools/deploy/check-a11y.mjs';

test('rules: a field is named by aria, title, label for (literal, template or x.id), or by sitting inside a label', () => {
  const ok = [
    "h('input', { type: 'text', 'aria-label': 'Name' })",
    "h('input', { type: 'hidden', name: 'x' })",
    "h('select', { id: 'pick' }); h('label', { for: 'pick' }, 'Pick')",
    "const a = h('input', { id: `${M.id}-a` }); h('label', { for: a.id }, 'A')",
    "h('label', { class: 'opt' }, h('input', { type: 'checkbox' }), ' Remember')",
    "const r = h('input', { type: 'radio', name }); h('label', {}, r, ' One')",
    "h('img', { src: 'x.png', alt: '' })",
    "h('img', { class: c, alt, src })",
  ];
  for (const s of ok) assert.deepEqual(scanControls(s), [], s);
  const bad = [
    "h('input', { type: 'text', id: 'nm' })",
    "h('label', {}, 'Name'), h('input', { type: 'text' })",
    "el('textarea', { rows: 3 })",
    "h('img', { src: 'x.png' })",
    "node.animate([{ opacity: 0 }, { opacity: 1 }], 300)",
  ];
  for (const s of bad) assert.equal(scanControls(s).length, 1, s);
  assert.equal(insideLabel("h('label', {}, 'a', "), true);
  assert.equal(insideLabel("h('label', {}, 'a (b)'), "), false);
});

test('the global reduced-motion rule is in app.css and app.css is loaded on every page', () => {
  assert.deepEqual(motionRule(), { rule: true, loaded: true });
});

test('the current tree passes the gate', () => {
  const r = scanTree();
  assert.ok(r.controls > 100, `scanned ${r.controls}`);
  assert.deepEqual(r.findings, [], r.findings.map((f) => `${f.file}:${f.line} ${f.why}`).join('\n'));
});
