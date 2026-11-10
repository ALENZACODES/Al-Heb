#!/usr/bin/env node
// Letter-picture contact sheet + contract check. See docs/letters/MORPH-USAGE.md (the one shared contract).
//   node tools/letters/build_morph_sheet.mjs           writes tools/letters/morph-sheet.html (A | B at 160px for every file, with a PASS/FAIL badge)
//   node tools/letters/build_morph_sheet.mjs --check   prints every contract problem and exits 1 if there is any (no file written)
// Open the sheet with #dark for the dark palette. The files do not move on the sheet: motion needs the class morph-play.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MORPH_DIR = path.join(root, 'assets/letters/morph');

/** The shared part of every file's <style>: identical text in all files (so inlining several on one page cannot conflict). */
export const CORE_CSS = [
  '/*morph-contract 1*/',
  'svg.morph{--m-ink:var(--morph-ink,currentColor);--m-1:var(--morph-1,#d9480f);--m-2:var(--morph-2,#1b3a6b);--m-3:var(--morph-3,#ffd966);--m-4:var(--morph-4,#2f9e44)}',
  '@media (prefers-color-scheme:dark){svg.morph{--m-ink:var(--morph-ink,#f3ecdc);--m-1:var(--morph-1,#ff8a4c);--m-2:var(--morph-2,#8db8ff);--m-3:var(--morph-3,#ffe08a);--m-4:var(--morph-4,#69db7c)}}',
  '@media (forced-colors:active){svg.morph{--m-ink:CanvasText;--m-1:Highlight;--m-2:CanvasText;--m-3:GrayText;--m-4:LinkText}}',
  'svg.morph .morph-a{opacity:0}',
  'svg.morph .morph-b{opacity:1}',
  'svg.morph.morph-show-a .morph-a{opacity:1}',
  'svg.morph.morph-show-a .morph-b{opacity:0}',
  'svg.morph .morph-strokes{fill:none;stroke:var(--m-ink);stroke-width:85;stroke-linecap:round;stroke-linejoin:round}',
  'svg.morph .morph-trace{opacity:.6;stroke-width:14}',
  'svg.morph.morph-show-a .morph-trace{opacity:1;stroke-width:85}',
  'svg.morph .mk,svg.morph .ml{fill:none;stroke-linecap:round;stroke-linejoin:round}',
  'svg.morph .mk{stroke-width:85}',
  'svg.morph .ml{stroke-width:var(--w,24)}',
  'svg.morph .mfi{fill:var(--m-ink)}',
  'svg.morph .mf1{fill:var(--m-1)}',
  'svg.morph .mf2{fill:var(--m-2)}',
  'svg.morph .mf3{fill:var(--m-3)}',
  'svg.morph .mf4{fill:var(--m-4)}',
  'svg.morph .msi{stroke:var(--m-ink)}',
  'svg.morph .ms1{stroke:var(--m-1)}',
  'svg.morph .ms2{stroke:var(--m-2)}',
  'svg.morph .ms3{stroke:var(--m-3)}',
  'svg.morph .ms4{stroke:var(--m-4)}',
  'svg.morph .mb{stroke-linecap:butt}',
  'svg.morph .mtile{fill:var(--m-ink);fill-opacity:.09}',
  'svg.morph .mshade{fill:var(--m-ink);fill-opacity:.3}',
  'svg.morph .morph-pop{transform-box:fill-box;transform-origin:50% 50%}',
  '@media (prefers-reduced-motion:no-preference){',
  'svg.morph.morph-play .morph-a{animation:morph-a 8s ease-in-out infinite}',
  'svg.morph.morph-play .morph-a.morph-trace{animation-name:morph-trace}',
  'svg.morph.morph-play .morph-b{animation:morph-b 8s ease-in-out infinite}',
  'svg.morph.morph-play .morph-pop{animation:morph-pop 8s ease-in-out infinite}',
  'svg.morph.morph-play .morph-pop-late{animation-delay:.2s}',
  'svg.morph.morph-show-a *{animation:none!important}}',
  '@keyframes morph-a{0%,18%{opacity:1}38%,86%{opacity:0}100%{opacity:1}}',
  '@keyframes morph-b{0%,18%{opacity:0}38%,86%{opacity:1}100%{opacity:0}}',
  '@keyframes morph-trace{0%,18%{opacity:1;stroke-width:85}38%,86%{opacity:.6;stroke-width:14}100%{opacity:1;stroke-width:85}}',
  '@keyframes morph-pop{0%,22%{opacity:0;transform:scale(.3)}42%,86%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.3)}}',
  '@media (prefers-reduced-motion:reduce){svg.morph,svg.morph *{animation:none!important;transition:none!important}}',
].join('\n');

/** Class names every file may use without declaring them. Anything else must be a local class declared under svg.morph-<id>. */
export const CORE_CLASSES = new Set(['morph', 'morph-a', 'morph-b', 'morph-show-a', 'morph-play', 'morph-strokes', 'morph-trace', 'morph-pop', 'morph-pop-late',
  'mk', 'ml', 'mfi', 'mf1', 'mf2', 'mf3', 'mf4', 'msi', 'ms1', 'ms2', 'ms3', 'ms4', 'mb', 'mtile', 'mshade']);
export const PUBLIC_VARS = ['--morph-ink', '--morph-1', '--morph-2', '--morph-3', '--morph-4'];
const PRIVATE_VARS = new Set(['--m-ink', '--m-1', '--m-2', '--m-3', '--m-4', '--w']);
export const MAX_BYTES = 6 * 1024;

/** The 27 letter forms (data/letters/letters.json) plus any extra picture files (sin). */
export function listMorphIds() {
  const letters = JSON.parse(readFileSync(path.join(root, 'data/letters/letters.json'), 'utf8')).map((l) => l.id);
  const have = readdirSync(MORPH_DIR).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
  const rank = (id) => { const i = letters.indexOf(id); return i < 0 ? 1e6 : i; };
  return have.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
export const readMorph = (id) => readFileSync(path.join(MORPH_DIR, id + '.svg'), 'utf8');

/** Split CSS into flat rules; at-rule blocks are walked and reported with their prelude. */
export function cssRules(css, at = '') {
  const out = []; const s = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf('{', i);
    if (open < 0) break;
    const prelude = s.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < s.length && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; }
    const body = s.slice(open + 1, j - 1);
    if (prelude.startsWith('@media') || prelude.startsWith('@supports')) out.push(...cssRules(body, prelude));
    else if (prelude.startsWith('@keyframes')) out.push({ at, keyframes: prelude.slice(10).trim(), body });
    else out.push({ at, selector: prelude, body });
    i = j;
  }
  return out;
}

/** Every way a file can break the contract. Returns a list of short messages (empty = follows the contract). */
export function checkContract(id, src) {
  const p = [];
  const bad = (m) => p.push(m);
  const root = src.match(/^<svg\b([^>]*)>/);
  if (!root) return ['no <svg> root'];
  const attrs = root[1];
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(attrs)) bad('root: xmlns missing');
  if (!/viewBox="0 0 200 200"/.test(attrs)) bad('root: viewBox must be "0 0 200 200"');
  if (/\s(width|height)=/.test(attrs)) bad('root: no width/height (the host sizes it)');
  if (!/role="img"/.test(attrs)) bad('root: role="img" missing');
  const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1].split(/\s+/).filter(Boolean);
  if (cls.join(' ') !== `morph morph-${id}`) bad(`root: class must be exactly "morph morph-${id}" (found "${cls.join(' ')}")`);
  if (!new RegExp(`aria-labelledby="${id}-t ${id}-d"`).test(attrs)) bad(`root: aria-labelledby must be "${id}-t ${id}-d"`);
  if (!new RegExp(`<title id="${id}-t">[^<]{8,}</title>`).test(src)) bad(`title id="${id}-t" with 8+ characters missing`);
  if (!new RegExp(`<desc id="${id}-d">[^<]{40,}</desc>`).test(src)) bad(`desc id="${id}-d" with 40+ characters missing`);
  if (Buffer.byteLength(src) >= MAX_BYTES) bad('file is 6 KB or larger');
  if (!src.trimEnd().endsWith('</svg>')) bad('does not end with </svg>');

  const styles = [...src.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  if (styles.length !== 1) bad(`exactly one <style> required (found ${styles.length})`);
  const css = styles[0] || '';
  if (!css.startsWith(CORE_CSS)) bad('<style> must begin with the contract core, verbatim');
  const local = css.startsWith(CORE_CSS) ? css.slice(CORE_CSS.length) : css;
  const localClasses = new Set();
  for (const r of cssRules(local)) {
    if (r.keyframes !== undefined) { if (!r.keyframes.startsWith(`morph-${id}-`)) bad(`local @keyframes "${r.keyframes}" must be named morph-${id}-*`); continue; }
    for (const sel of r.selector.split(',').map((x) => x.trim())) {
      if (!sel.startsWith(`svg.morph-${id}`)) bad(`local selector "${sel}" must start with svg.morph-${id}`);
      for (const m of sel.matchAll(/\.([A-Za-z][\w-]*)/g)) if (m[1] !== `morph-${id}`) localClasses.add(m[1]);
    }
  }
  if (/:root|\bhtml\b|\bbody\b/.test(local)) bad('local CSS must not touch :root/html/body');
  if (/@import|url\(\s*['"]?(?!#)/.test(css)) bad('no @import or external url()');
  if (/!important/.test(local)) bad('no !important outside the core');

  // variables: only the contract's names
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) if (!PRIVATE_VARS.has(m[1]) && !PUBLIC_VARS.includes(m[1])) bad(`variable ${m[1]} is not in the contract`);
  for (const m of local.matchAll(/(--[\w-]+)\s*:/g)) if (!PRIVATE_VARS.has(m[1])) bad(`local CSS declares ${m[1]}`);
  for (const m of src.replace(css, '').matchAll(/(--[\w-]+)\s*:/g)) if (m[1] !== '--w') bad(`inline style declares ${m[1]}`);
  for (const v of PUBLIC_VARS) if (!css.includes(v + ',')) bad(`core must give ${v} a fallback`);
  if (/var\(--morph-[^)]*\)/.test(src.replace(css, ''))) bad('body must use --m-* only, not --morph-*');

  // layers
  const body = src.replace(/<style>[\s\S]*?<\/style>/, '');
  const tokens = [...body.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));
  const root0 = new Set(cls);
  const layerA = [...body.matchAll(/<g\b[^>]*\sclass="([^"]*\bmorph-a\b[^"]*)"/g)];
  const layerB = [...body.matchAll(/<g\b[^>]*\sclass="([^"]*\bmorph-b\b[^"]*)"/g)];
  if (layerA.length !== 1) bad(`exactly one <g class="morph-a"> required (found ${layerA.length})`);
  if (layerB.length !== 1) bad(`exactly one <g class="morph-b"> required (found ${layerB.length})`);
  for (const t of tokens) if (!root0.has(t) && !CORE_CLASSES.has(t) && !localClasses.has(t)) bad(`class "${t}" is neither core nor declared locally`);
  if (/\bmph\b|morph-a-only|\bmx\b/.test(tokens.join(' '))) bad('legacy class name');

  // ids: namespaced, unique, every reference resolves inside the file
  const ids = [...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) bad('duplicate id');
  for (const x of ids) if (!x.startsWith(id + '-')) bad(`id "${x}" must start with "${id}-"`);
  for (const m of src.matchAll(/(?:xlink:)?href="([^"]*)"/g)) if (!m[1].startsWith('#') || !ids.includes(m[1].slice(1))) bad(`href "${m[1]}" does not resolve to an id in this file`);
  for (const m of src.matchAll(/url\(\s*['"]?#([^)'"\s]+)/g)) if (!ids.includes(m[1])) bad(`url(#${m[1]}) does not resolve`);

  // safe to inline and to load as <img>
  if (/<script|<foreignObject|<image|<animate|<set\b|\son[a-z]+\s*=/i.test(src)) bad('script, handler, foreignObject, image or SMIL found');
  if (/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(src)) bad('remote reference');
  if (/[֐-׿]/.test(src)) bad('Hebrew text inside the picture');
  if (/\s(?:fill|stroke)="(?!none|var\(|url\(#)/.test(body)) bad('fill/stroke must be none or a --m-* variable (no hard-coded colours in markup)');
  return p;
}

export function checkAll() {
  const res = {};
  for (const id of listMorphIds()) res[id] = checkContract(id, readMorph(id));
  return res;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function buildSheet() {
  const results = checkAll();
  const fails = Object.values(results).filter((x) => x.length).length;
  const cards = Object.keys(results).map((id) => {
    const svg = readMorph(id).replace(/^<\?xml[^>]*>\s*/, '');
    // Inlined, so ids repeat nowhere (each file is namespaced); A is the same file with the documented modifier class.
    const a = svg.replace(/class="morph morph-/, 'class="morph morph-show-a morph-');
    const b = svg.replace(/aria-labelledby="[^"]*"/, '').replace(/\s*<title[\s\S]*?<\/title>|\s*<desc[\s\S]*?<\/desc>/g, (m) => m); // keep as is
    const bad = results[id];
    return `<figure class="${bad.length ? 'fail' : ''}"><figcaption>${id} <span class="badge">${bad.length ? 'FAIL ' + bad.length : 'ok'}</span></figcaption>`
      + `<div class="row"><div class="c" title="A: the letter">${a}</div><div class="c" title="B: the picture">${b}</div></div>`
      + (bad.length ? `<ul>${bad.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : '') + '</figure>';
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Letter picture contact sheet</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#f6efe0;--fg:#1d2433;--accent:#1f3a5f;--muted:#5a6275;--card:#fffaf0;--border:#d9cdb3}
body.dark{--bg:#111722;--fg:#ece7da;--accent:#8fb4ee;--muted:#a3abbd;--card:#1a2231;--border:#2e3850}
body{background:var(--bg);color:var(--fg);font:14px system-ui,sans-serif;margin:16px;--morph-ink:var(--fg)}
body.dark{--morph-1:#ff8a4c;--morph-2:#8db8ff;--morph-3:#ffe08a}
h1{font-size:18px}p{max-width:64ch;color:var(--muted)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px}
figure{margin:0;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:8px}figure.fail{border-color:#c0392b}
figcaption{font-weight:700;margin-bottom:4px}.badge{font-weight:400;font-size:12px;color:var(--muted)}.fail .badge{color:#c0392b}
.row{display:flex;gap:8px}.c{width:160px;height:160px}.c svg{width:160px;height:160px;display:block}
ul{margin:6px 0 0;padding-left:18px;font-size:12px;color:#c0392b}
</style></head><body>
<h1>Letter pictures: A (the letter) | B (the picture)</h1>
<p>${Object.keys(results).length} files, ${fails ? fails + ' break' : 'all follow'} the contract in docs/letters/MORPH-USAGE.md. Generated by tools/letters/build_morph_sheet.mjs; add #dark to the address for the dark palette. Nothing moves here: motion needs the class morph-play.</p>
<main>
${cards.join('\n')}
</main>
<script>if(location.hash==='#dark')document.body.className='dark'</script>
</body></html>
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const res = checkAll(); let n = 0;
    for (const [id, probs] of Object.entries(res)) for (const m of probs) { console.log(`${id}: ${m}`); n++; }
    console.log(n ? `${n} problem(s) in ${Object.values(res).filter((x) => x.length).length} of ${Object.keys(res).length} files` : `all ${Object.keys(res).length} files follow the contract`);
    process.exit(n ? 1 : 0);
  }
  const out = path.join(root, 'tools/letters/morph-sheet.html');
  writeFileSync(out, buildSheet());
  const res = checkAll();
  console.log('wrote', path.relative(root, out), Object.keys(res).length, 'files,', Object.values(res).filter((x) => x.length).length, 'failing the contract');
}
