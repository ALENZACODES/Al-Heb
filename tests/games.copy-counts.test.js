// A game's "how to play" must not promise one round length when its levels use several (25 Nov 2026 audit: Sorter said
// "Twenty letters" while showing "1 of 16"; Plural Pop "Fifteen nouns" vs "1 of 12"; Flap "ten gates" vs "Gate 1 of 8").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const N = { ten: 10, twelve: 12, fifteen: 15, sixteen: 16, twenty: 20 };
test('no fixed round length in howTo when the levels vary', () => {
  const dir = new URL('../src/games/', import.meta.url);
  const bad = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.view.js'))) {
    const s = readFileSync(new URL(f, dir), 'utf8');
    const how = s.match(/howTo:\s*\[([^\]]*)\]/)?.[1] || ''; const lv = s.match(/levels:\s*\[([\s\S]*?)\n\s*\],/)?.[1] || '';
    const vals = new Set([...lv.matchAll(/\b(goal|count|gates):\s*(\d+)/g)].map((m) => +m[2]));
    for (const m of how.matchAll(/\b(Ten|Twelve|Fifteen|Sixteen|Twenty) [a-z ]+?(per round|finish the level)/gi))
      if (vals.size > 1 || (vals.size === 1 && !vals.has(N[m[1].toLowerCase()]))) bad.push(`${f}: "${m[0]}" vs ${[...vals]}`);
  }
  assert.deepEqual(bad, []);
});
