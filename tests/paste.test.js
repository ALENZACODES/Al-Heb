import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../tools/images/build_next1000.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs/images/paste');
const names = readdirSync(DIR).filter((f) => /^cmd-\d{3}(-[a-h])?\.txt$/.test(f));
const text = (f) => readFileSync(join(DIR, f), 'utf8');
const groups = JSON.parse(readFileSync(join(ROOT, 'data/images/next1000-groups.json'), 'utf8')).groups;

test('every command has a paste file', () => {
  for (const g of groups) {
    const n = String(g.number).padStart(3, '0');
    assert.ok(names.some((f) => f.startsWith(`cmd-${n}`)), `missing paste file for command ${g.number}`);
  }
});

test('every csv filename appears exactly once across paste files', () => {
  const rows = parseCsv(readFileSync(join(ROOT, 'data/images/next1000.csv'), 'utf8'));
  const all = names.map(text).join('\n');
  for (const r of rows) {
    const hits = all.split(`FILENAME: ${r.file} |`).length - 1;
    assert.equal(hits, 1, `${r.file} appears ${hits} times`);
  }
});

test('every paste file has the no-text rule, the style guide and stays under 12k chars', () => {
  for (const f of names) {
    const t = text(f);
    assert.match(t, /NEVER put any text in any image/, f);
    assert.match(t, /STYLE GUIDE v1/, f);
    assert.match(t, /wait for me to say "next"/, f);
    assert.ok(t.length <= 12000, `${f} is ${t.length} chars`);
  }
});

test('size hints map to ChatGPT aspect ratios', () => {
  for (const f of names) for (const m of text(f).matchAll(/SIZE: use (\S+).*?target (\d+)x(\d+)/g)) {
    const [, ratio, w, h] = m;
    const want = w === h ? '1:1' : Number(w) > Number(h) ? '3:2' : '2:3';
    assert.equal(ratio.replace(/[^0-9:]/g, ''), want, f);
  }
});

test('index names the first pending command and 282 done images', () => {
  const idx = readFileSync(join(DIR, 'INDEX.md'), 'utf8');
  assert.match(idx, /282 images are already done/);
  assert.match(idx, new RegExp(`\\*\\*${groups[0].number}\\*\\*`));
  assert.ok(names.includes('cmd-036.txt') && !names.includes('cmd-028.txt'));
});
