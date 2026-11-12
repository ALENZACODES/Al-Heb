// J7 Accessibility gate (static, in the unit tests): checks that need no browser and are exact on the source.
// Run: node tools/deploy/check-a11y.mjs   (exits 1 with file:line for each finding; tests/platform.a11y-gate.test.js runs it).
//   1. Every input, select and textarea the app creates has a name: aria-label / aria-labelledby / title, a <label for> naming its id
//      (a literal, a template id or `for: x.id`), or it sits inside a label(...) call; type hidden/submit/button need none.
//   2. Every img the app creates has an alt attribute (alt="" for decoration is allowed) or is aria-hidden.
//   3. Reduced motion: assets/css/app.css (loaded by index.html on every page) keeps the global prefers-reduced-motion: reduce rule
//      that stops every CSS animation and transition with !important, and no script calls Element.animate() with keyframes
//      (the Web Animations API is not stopped by CSS) unless the same file checks prefers-reduced-motion.
// The browser-tier axe run (tests/a11y.gate.test.js) covers contrast and computed names; this gate is what can never be skipped.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { objectAt } from './check-buttons.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const NOT_MAKERS = new Set(['querySelector', 'querySelectorAll', 'closest', 'createElement', 'addEventListener', 'removeEventListener', 'on', 'off', 'dispatchEvent', 'Event', 'CustomEvent', 'matches']);
const esc = (n) => n.replace(/[$]/g, '\\$');

/** True when `pre` (text just before a control) ends inside an unclosed label(...) call: depth counted, strings skipped. */
export function insideLabel(pre) {
  const re = /\b[\w$]+\(\s*['"]label['"]/g; let m, last = -1;
  while ((m = re.exec(pre))) last = m.index + m[0].indexOf('(');
  if (last < 0) return false;
  let d = 0, q = null;
  for (let k = last; k < pre.length; k++) {
    const c = pre[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c; else if (c === '(') d++; else if (c === ')') { d--; if (d === 0) return false; }
  }
  return d > 0;
}

/** Findings for one file's text: [{line, why}]. */
export function scanControls(s) {
  const out = []; const lineOf = (i) => s.slice(0, i).split('\n').length;
  const re = /\b([\w$]+)\(\s*['"](input|select|textarea|img)['"]\s*,\s*/g; let m;
  while ((m = re.exec(s))) {
    if (NOT_MAKERS.has(m[1])) continue;
    const at = m.index + m[0].length, a = s[at] === '{' ? objectAt(s, at) : null;
    if (m[2] === 'img') { if (!a || !/\balt\s*(?::|[,}])|['"]alt['"]\s*:|aria-hidden/.test(a)) out.push({ line: lineOf(m.index), why: 'img without alt (use alt="" for decoration)' }); continue; }
    if (!a) { out.push({ line: lineOf(m.index), why: `${m[2]} attributes not readable` }); continue; }
    if (/['"]?aria-label(?:ledby)?['"]?\s*:|\btitle\s*:/.test(a) || /type:\s*['"](?:hidden|submit|button)['"]/.test(a)) continue;
    const pre = s.slice(Math.max(0, m.index - 300), m.index);
    const lit = a.match(/\bid:\s*(['"`])([^'"`]+)\1/);
    if (lit && (s.includes(`for: '${lit[2]}'`) || s.includes(`for: "${lit[2]}"`) || s.includes(`for: \`${lit[2]}\``))) continue;
    const idVar = !lit && a.match(/\bid(?:\s*:\s*([\w$.]+))?\s*[,}]/);
    if (idVar && new RegExp(`for:\\s*${esc((idVar[1] || 'id')).replace(/\./g, '\\.')}\\b`).test(s)) continue;
    if (insideLabel(pre)) continue;
    const vn = (pre.match(/(?:const|let|var)\s+([\w$]+)\s*=\s*(?:[\w$]+\.)?$/) || [])[1];
    if (vn && (new RegExp(`['"]label['"]\\s*,\\s*\\{[^{}]*\\}\\s*,[^;]*?\\b${esc(vn)}\\b`).test(s) || new RegExp(`for:\\s*${esc(vn)}\\.id\\b`).test(s))) continue;
    out.push({ line: lineOf(m.index), why: `${m[2]} has no label, aria-label or aria-labelledby` });
  }
  if (/\.animate\(\s*[[{]/.test(s) && !/prefers-reduced-motion|reducedMotion|data-calm/.test(s)) out.push({ line: lineOf(s.search(/\.animate\(\s*[[{]/)), why: 'Element.animate() without a reduced-motion check' });
  return out;
}

/** The global reduced-motion rule is present and app.css is loaded on every page. */
export function motionRule(root = ROOT) {
  const css = readFileSync(join(root, 'assets/css/app.css'), 'utf8'), html = readFileSync(join(root, 'index.html'), 'utf8');
  const rule = /@media \(prefers-reduced-motion: reduce\) \{ \*, \*::before, \*::after \{ animation: none !important; transition: none !important;/.test(css);
  return { rule, loaded: /<link rel="stylesheet" href="assets\/css\/app\.css">/.test(html) };
}

const walk = (d, o = []) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, o); else if (p.endsWith('.js')) o.push(p); } return o; };
export function scanTree(root = ROOT) {
  const findings = []; let controls = 0;
  for (const f of walk(join(root, 'src'))) {
    const s = readFileSync(f, 'utf8');
    controls += [...s.matchAll(/\b([\w$]+)\(\s*['"](?:input|select|textarea|img)['"]\s*,/g)].filter((x) => !NOT_MAKERS.has(x[1])).length;
    for (const x of scanControls(s)) findings.push({ file: relative(root, f), ...x });
  }
  const mr = motionRule(root);
  if (!mr.rule) findings.push({ file: 'assets/css/app.css', line: 0, why: 'the global prefers-reduced-motion: reduce rule is missing' });
  if (!mr.loaded) findings.push({ file: 'index.html', line: 0, why: 'assets/css/app.css is not loaded' });
  return { controls, findings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = scanTree();
  for (const f of r.findings) console.error(`${f.file}:${f.line} ${f.why}`);
  console.log(`a11y gate: ${r.controls} fields and images scanned, ${r.findings.length} findings`);
  process.exit(r.findings.length ? 1 : 0);
}
