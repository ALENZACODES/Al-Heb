// Cold-home weight guard: the modules every first load pulls in (curriculum content, queue, actions) must use the light half of the letter
// memory chain (memory.core.js), not memory.js, whose question builder imports the pronunciation stack (about 75 KB of script on the home route).
// Measured 2026-11-04: home JS 406,066 B with memory.js on the path, 311,000 B-ish without (budget docs/perf/budget.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const staticImports = (file) => [...read(file).matchAll(/^\s*(?:import|export)\b[^'"\n;]*?from\s*["']([^"']+)["']/gm)].map((m) => m[1]).filter((p) => p.startsWith('.')).map((p) => resolve(dirname(join(root, file)), p).slice(root.length + 1));

test('home-path curriculum modules import memory.core.js, never memory.js', () => {
  for (const f of ['src/curriculum/content.js', 'src/curriculum/progress.js', 'src/curriculum/actions.js']) {
    const imps = staticImports(f);
    assert.ok(imps.includes('src/letters/memory.core.js'), `${f} should use memory.core.js`);
    assert.ok(!imps.includes('src/letters/memory.js'), `${f} must not import memory.js (it would pull the pronunciation stack onto the cold home load)`);
  }
});
test('memory.core.js stays light: no pronunciation or exercise-session imports, transitively', () => {
  const seen = new Set(), todo = ['src/letters/memory.core.js'];
  while (todo.length) { const f = todo.pop(); if (seen.has(f)) continue; seen.add(f); todo.push(...staticImports(f)); }
  for (const heavy of ['src/pronunciation/forTradition.js', 'src/curriculum/exercises.session.js', 'src/pronunciation/transliterate.js', 'src/letters/memory.js']) assert.ok(!seen.has(heavy), `memory.core.js must not reach ${heavy}`);
});
test('memory.js still exports the whole public surface (core helpers are re-exported)', async () => {
  const M = await import('../src/letters/memory.js'), C = await import('../src/letters/memory.core.js');
  for (const k of ['MEM_TYPES', 'CHOICE_TYPES', 'MEM_DELAY_DAYS', 'memCardId', 'parseMemCardId', 'indexChain', 'hookWord', 'partnersOf', 'wordAnchor', 'canAsk', 'memoryCardsFor', 'ensureMemoryCards', 'spreadConfusables', 'minConfusableDistance', 'mergeMemoryIntoQueue']) assert.equal(M[k], C[k], k);
  for (const k of ['optionGlyph', 'hookCue', 'soundNotes', 'maskLeak', 'shortSound', 'memoryDistractors', 'buildMemoryQuestion', 'memoryFeedback', 'auditMemoryQuestion']) assert.equal(typeof M[k], 'function', k);
});
