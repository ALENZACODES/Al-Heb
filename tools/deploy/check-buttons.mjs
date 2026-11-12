// I4 Dead-button gate. Static check that every button the app creates has a handler or an honest disabled state.
// Run: node tools/deploy/check-buttons.mjs   (exits 1 and lists file:line for each button that fails; tests/platform.dead-buttons.test.js
// runs it in the unit tier, so CI's test job fails on a new dead button).
//
// What is scanned: every src/**/*.js call `x('button', {...})` / `x.y('button', {...})` (the shell's h(), lane el(), games' A.h()),
// every `createElement('button')`, and every <button> in index.html. Deterministic rules, no guessing from names or layout:
//   1. the attribute object (read with a small tokenizer that skips strings, template literals and comments) has an on* handler key
//      (onclick, onpointerdown, onkeydown, ...), or type: 'submit' (its form's onsubmit handles it), or disabled / aria-disabled;
//   2. or the button is assigned to a name (const b = h('button', ...), also through `cond ? h('button', ...) : null`) and the same
//      file wires that name: b.addEventListener(...), b?.addEventListener(...), b.onclick = ..., or a helper call fn(b, 'click', ...);
//   3. or the button has an id that the same file uses again (the on('light-temp', ...) / getElementById pattern);
//   4. index.html buttons: the id or first class appears in some src/**/*.js file.
// A button the scanner cannot read (attribute object not literal and not assigned) fails, so the gate never passes by default.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/** The balanced {...} starting at s[i], skipping strings, template literals and comments; null when unbalanced. */
export function objectAt(s, i) {
  let d = 0, q = null;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && s[k + 1] === '/') { k = s.indexOf('\n', k); if (k < 0) return null; continue; }
    if (c === '/' && s[k + 1] === '*') { k = s.indexOf('*/', k) + 1; if (k <= 0) return null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (!d) return s.slice(i, k + 1); }
  }
  return null;
}
const esc = (n) => n.replace(/[$]/g, '\\$');
const NOT_MAKERS = new Set(['querySelector', 'querySelectorAll', 'closest', 'matches', 'createElement', 'getElementsByTagName']);
const HANDLER = /\bon(?:click|Click|pointerdown|pointerup|mousedown|touchstart|keydown|input|change)\b/;
const wires = (src, name) => new RegExp(`\\b${esc(name)}\\s*\\??\\.\\s*(?:addEventListener|on[a-z]+\\s*=)`).test(src)
  || new RegExp(`\\(\\s*${esc(name)}\\s*,\\s*['"](?:click|pointerdown|pointerup|keydown)['"]`).test(src);
const assignedName = (pre) => {
  const p = pre.replace(/[\w$]+\.$/, '');
  const m = p.match(/(?:const|let|var)\s+([\w$]+)\s*=\s*(?:[^;=]*[?:]\s*)?$/) || p.match(/([\w$.]+)\s*=\s*(?:[^;=]*[?:]\s*)?$/);
  return m ? m[1].split('.').pop() : null;
};

/** Findings for one source text: [{line, why}]. */
export function scanSource(src) {
  const out = [];
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  const call = /\b([\w$]+)\(\s*['"]button['"]\s*(,\s*)?/g;
  let m;
  while ((m = call.exec(src))) {
    if (NOT_MAKERS.has(m[1])) continue; // look-ups such as querySelectorAll('button'); createElement is handled below
    const at = m.index + m[0].length;
    const attrs = m[2] && src[at] === '{' ? objectAt(src, at) : null;
    if (attrs && (HANDLER.test(attrs) || /type:\s*['"]submit['"]/.test(attrs) || /\bdisabled\b|aria-disabled/.test(attrs))) continue;
    const name = assignedName(src.slice(Math.max(0, m.index - 120), m.index));
    if (name && wires(src, name)) continue;
    const id = attrs && attrs.match(/\bid:\s*['"]([\w-]+)['"]/);
    if (id && src.split(id[1]).length > 2) continue;
    out.push({ line: lineOf(m.index), why: attrs ? 'no handler, no disabled state, not wired by name or id' : 'attributes not readable and the button is not wired by name' });
  }
  const ce = /(?:const|let|var)\s+([\w$]+)\s*=\s*[\w$.]*createElement\(\s*['"]button['"]\s*\)/g;
  while ((m = ce.exec(src))) if (!wires(src, m[1]) && !/disabled\s*=\s*true/.test(src)) out.push({ line: lineOf(m.index), why: 'createElement button never wired' });
  return out;
}

const walk = (d, o = []) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, o); else if (p.endsWith('.js')) o.push(p); } return o; };

/** Scan the tree: {buttons, findings:[{file, line, why}]}. */
export function scanTree(root = ROOT) {
  const files = walk(join(root, 'src'));
  const findings = []; let buttons = 0; let all = '';
  for (const f of files) {
    const src = readFileSync(f, 'utf8'); all += src;
    buttons += [...src.matchAll(/\b([\w$]+)\(\s*['"]button['"]/g)].filter((x) => !NOT_MAKERS.has(x[1]) || x[1] === 'createElement').length;
    for (const x of scanSource(src)) findings.push({ file: relative(root, f), ...x });
  }
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  for (const tag of html.match(/<button\b[^>]*>/g) || []) {
    buttons++;
    const id = tag.match(/\bid="([^"]+)"/)?.[1], cls = tag.match(/\bclass="([^" ]+)/)?.[1];
    if ((id && all.includes(id)) || (cls && all.includes(cls))) continue;
    findings.push({ file: 'index.html', line: html.slice(0, html.indexOf(tag)).split('\n').length, why: 'no script refers to this button' });
  }
  return { buttons, findings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = scanTree();
  for (const f of r.findings) console.error(`${f.file}:${f.line} ${f.why}`);
  console.log(`dead-button check: ${r.buttons} buttons scanned, ${r.findings.length} without a handler or an honest disabled state`);
  process.exit(r.findings.length ? 1 : 0);
}
