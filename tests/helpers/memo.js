// Disk memo for deterministic, JSON-safe, expensive builders (e.g. the pronunciation builders, ~5-15 s each).
// The key is the (path, size, mtime) of every file under the given roots, so editing any source or data file
// the builder could read invalidates the cache. Cache lives in os.tmpdir(); set ALEF_NO_TEST_CACHE=1 to bypass.
// Use it for the FIRST build in a file only; keep one direct call wherever a test asserts determinism.
import { createHash } from 'node:crypto';
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(tmpdir(), 'alef-test-cache');

function walk(dir, out) {
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') walk(p, out); }
    else { const s = statSync(p); out.push(`${p}:${s.size}:${Math.floor(s.mtimeMs)}`); }
  }
}

/** memoDisk(name, rootsRelativeToRepo, fn) -> fn() result, reused while no file under the roots changed. */
export function memoDisk(name, roots, fn) {
  if (process.env.ALEF_NO_TEST_CACHE) return fn();
  const lines = [];
  for (const r of roots) walk(join(REPO, r), lines);
  const key = createHash('sha256').update(name + '\n' + lines.join('\n')).digest('hex').slice(0, 24);
  const file = join(CACHE, `${name}-${key}.json`);
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { /* miss */ }
  const val = fn();
  try { mkdirSync(CACHE, { recursive: true }); for (const f of readdirSync(CACHE)) if (f.startsWith(name + '-') && f.endsWith('.json')) { try { unlinkSync(join(CACHE, f)); } catch {} } const tmp = `${file}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(val)); renameSync(tmp, file); } catch { /* cache is best-effort */ }
  return val;
}
export const PRON_ROOTS = ['data', 'src', 'tools/pronunciation'];
