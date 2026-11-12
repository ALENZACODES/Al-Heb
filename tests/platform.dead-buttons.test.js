// I4 dead-button gate: every button the app creates has a handler or an honest disabled state (tools/deploy/check-buttons.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanSource, scanTree, objectAt } from '../tools/deploy/check-buttons.mjs';

test('rules: inline handler, submit, disabled, wired by name (also optional chaining, helper and ternary), wired by id', () => {
  const ok = [
    "h('button', { type: 'button', onclick: () => go() }, 'Go')",
    "el('button', { type: 'submit' }, 'Send')",
    "h('button', { type: 'button', disabled: '' }, 'Coming soon')",
    "const b = A.h('button', { type: 'button' }, 'x'); b.addEventListener('click', f);",
    "const all = cfg.tell ? null : A.h('button', { class: 'btn' }, 'All'); all?.addEventListener('click', f);",
    "const b = h('button', { type: 'button' }, 'x'); on(b, 'click', f);",
    "h('button', { id: 'light-temp' }, 'Warm'); on('light-temp', f);",
    "const x = doc.createElement('button'); x.onclick = f;",
    "root.querySelectorAll('button').forEach(f)",
    "el('button', { class: 'a', // it's a comment with a quote\n onclick: f })",
  ];
  for (const s of ok) assert.deepEqual(scanSource(s), [], s);
  const bad = [
    "h('button', { type: 'button', class: 'btn' }, 'Does nothing')",
    "const b = h('button', { type: 'button' }, 'x'); render(b);",
    "list.map(() => h('button', { class: 'chip' }, 'x'))",
    "const x = doc.createElement('button'); host.append(x);",
    "h('button', opts, 'x')",
  ];
  for (const s of bad) assert.equal(scanSource(s).length, 1, s);
  assert.equal(objectAt("{ a: '}', b: `${1}` }", 0), "{ a: '}', b: `${1}` }");
});

test('the current tree has no dead buttons', () => {
  const r = scanTree();
  assert.ok(r.buttons > 500, `scanned ${r.buttons}`);
  assert.deepEqual(r.findings, [], r.findings.map((f) => `${f.file}:${f.line} ${f.why}`).join('\n'));
});
