// Relative-link checker for Markdown. Usage: node tools/docs/linkcheck.mjs [--all] [path ...]
// Default targets: README.md and docs/*.md (the front door and the top-level docs). --all adds every .md under docs/ and book/.
// Checks that the file a relative link points to exists. Does NOT check #anchors, external (http, mailto) links or links inside code.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Links in Markdown text, ignoring fenced code and inline code. Returns [{line, target}]. */
export function extractLinks(md) {
  const out = [];
  let fence = null;
  md.split('\n').forEach((raw, i) => {
    const m = raw.match(/^\s*(`{3,}|~{3,})/);
    if (m) { if (!fence) fence = m[1][0]; else if (m[1][0] === fence) fence = null; return; }
    if (fence) return;
    const line = raw.replace(/`[^`]*`/g, '');
    for (const x of line.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) out.push({ line: i + 1, target: x[1] });
    const ref = line.match(/^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/);
    if (ref) out.push({ line: i + 1, target: ref[1] });
  });
  return out;
}

const isExternal = (t) => /^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith('//');

/** Broken relative links in one file. Root-relative ("/x") targets resolve against `root`. */
export function checkFile(file, root = ROOT) {
  const bad = [];
  for (const { line, target } of extractLinks(readFileSync(file, 'utf8'))) {
    if (isExternal(target) || target.startsWith('#')) continue;
    let p = target.split('#')[0].split('?')[0];
    try { p = decodeURIComponent(p); } catch { /* keep raw */ }
    if (!p) continue;
    const abs = p.startsWith('/') ? join(root, p) : resolve(dirname(file), p);
    if (!existsSync(abs)) bad.push({ file: relative(root, file).split(sep).join('/'), line, target });
  }
  return bad;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); } else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

export function defaultFiles(root = ROOT, all = false) {
  if (all) return ['README.md', ...[join(root, 'docs'), join(root, 'book')].filter(existsSync).flatMap((d) => walk(d))].map((f) => resolve(root, f));
  const top = readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.md')).map((f) => join(root, 'docs', f));
  return [join(root, 'README.md'), ...top];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const paths = args.filter((a) => a !== '--all');
  const files = paths.length ? paths.flatMap((p) => { const a = resolve(p); return statSync(a).isDirectory() ? walk(a) : [a]; }) : defaultFiles(ROOT, all);
  const bad = files.flatMap((f) => checkFile(f));
  for (const b of bad) console.log(`${b.file}:${b.line}  broken link -> ${b.target}`);
  console.log(`${files.length} files checked, ${bad.length} broken relative links`);
  process.exit(bad.length ? 1 : 0);
}
