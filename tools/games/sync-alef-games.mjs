#!/usr/bin/env node
// Keeps the ALENZACODES/alef-games repository and this app's copy of those games in step.
// The games run inside Aleph (they use its engine in src/games/arcade.js and its shell), and the app only runs code from its own
// site (Content-Security-Policy script-src 'self'), so the app always carries its own copy; alef-games is where the games live on GitHub.
//   node tools/games/sync-alef-games.mjs --to <alef-games clone>     copy the game files from here into the clone and write games.json
//   node tools/games/sync-alef-games.mjs --from <alef-games clone>   copy the files listed in the clone's games.json into this app
//   node tools/games/sync-alef-games.mjs --check <alef-games clone>  exit 1 when the two copies differ
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PATTERNS = [/^src\/games\/(?:hanukkah|tg|g[1-5])-[\w.-]+\.js$/, /^data\/games\/(?:hanukkah|tg|g[1-5])\/[\w-]+\.json$/,
  /^tests\/games\.(?:hanukkah|tg|g[1-5])\.test\.js$/];
const walk = (dir, base = dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join('/')])) : []);
export const gameFiles = (root = ROOT) => ['src/games', 'data/games', 'tests'].flatMap((d) => walk(path.join(root, d)).map((f) => `${d}/${f}`)).filter((f) => PATTERNS.some((p) => p.test(f))).sort();
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest = (root, files) => ({ schema: 'alef-games/1', note: 'Game files mirrored from the Aleph app (ALENZACODES/Al-Heb) at the same paths. sha256 per file.', files: Object.fromEntries(files.map((f) => [f, sha(path.join(root, f))])) });

function main() {
  const [mode, dest] = process.argv.slice(2);
  if (!['--to', '--from', '--check'].includes(mode) || !dest) { console.error('usage: --to|--from|--check <alef-games clone>'); process.exit(2); }
  const clone = path.resolve(dest);
  if (mode === '--to') {
    const files = gameFiles();
    for (const f of files) { fs.mkdirSync(path.dirname(path.join(clone, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(clone, f)); }
    fs.writeFileSync(path.join(clone, 'games.json'), JSON.stringify(manifest(ROOT, files), null, 1) + '\n');
    console.log(`copied ${files.length} files to ${clone}`);
  } else {
    const m = JSON.parse(fs.readFileSync(path.join(clone, 'games.json'), 'utf8'));
    const files = Object.keys(m.files);
    if (mode === '--from') {
      for (const f of files) { if (!PATTERNS.some((p) => p.test(f))) throw new Error(`refusing a path outside the game folders: ${f}`); fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.copyFileSync(path.join(clone, f), path.join(ROOT, f)); }
      console.log(`copied ${files.length} files from ${clone}`);
    } else {
      const here = gameFiles();
      const diff = [...new Set([...here, ...files])].filter((f) => !fs.existsSync(path.join(ROOT, f)) || !m.files[f] || sha(path.join(ROOT, f)) !== m.files[f]);
      if (diff.length) { console.error(`differ: ${diff.join(', ')}`); process.exit(1); }
      console.log(`in step: ${files.length} files`);
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
