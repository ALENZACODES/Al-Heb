// Guards the lint-driven fixes recorded in data/vocab/corrections.json (field forms.plural) and the
// human-review list in docs/hebrew-lint/FIXES.md. Claims only what is checked here: code-point shape of the fixed value.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintString } from '../tools/hebrew-lint/lint.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (r) => JSON.parse(fs.readFileSync(path.join(root, r), 'utf8'));
const stripNiq = (s) => String(s || '').replace(/[ְ-ׇ]/g, '');
// Only the lint-driven doubled-sheva fixes. Later forms.plural corrections that change letters (for example a wrong
// plural) are covered by their own tests, not this sheva-shape guard.
const spec = rd('data/vocab/corrections.json').corrections.filter((c) => c.field === 'forms.plural' && stripNiq(c.old) === stripNiq(c.new));
const words = rd('data/vocab/words.json').words;
const byId = new Map(words.map((w) => [w.id, w]));
const strip = (s) => s.replace(/[ְ-ׇ]/g, '');

test('forms.plural corrections: only a doubled sheva was removed, the letters are unchanged', () => {
  assert.ok(spec.length >= 1);
  for (const c of spec) {
    assert.equal(strip(c.old), strip(c.new), 'letters must be identical');
    assert.equal(c.old.replace(/ְְ/g, 'ְ'), c.new, 'the only change is doubled sheva -> single sheva');
    assert.equal(byId.get(c.id).forms.plural, c.new);
    assert.ok(!lintString(c.new).some((f) => f.rule === 'duplicate-mark'));
  }
});

test('fixed value is in words.json, its pack and its theme copy', () => {
  for (const c of spec) {
    for (const dir of ['packs', 'themes']) {
      let n = 0;
      for (const f of fs.readdirSync(path.join(root, 'data/vocab', dir))) {
        if (!f.endsWith('.json') || f === 'index.json') continue;
        const d = rd(`data/vocab/${dir}/${f}`); if (!Array.isArray(d.words)) continue;
        for (const w of d.words) if (w.id === c.id) { n++; assert.equal(w.forms.plural, c.new); }
      }
      assert.equal(n, 1, `${c.id} in ${dir}`);
    }
  }
});

test('no vocab record carries a duplicate-mark any more', () => {
  const bad = [];
  const walk = (v, p) => { if (typeof v === 'string') { if (lintString(v, p).some((f) => f.rule === 'duplicate-mark')) bad.push(p); } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p + '.' + k); };
  walk(words, 'words');
  assert.deepEqual(bad, []);
});

test('FIXES.md lists every open vocab definite finding by record id', () => {
  const md = fs.readFileSync(path.join(root, 'docs/hebrew-lint/FIXES.md'), 'utf8');
  for (const id of ['h448338e7', 'heb3f471a', 'h1da16296', 'h9167dfb6', 'h654755af', 'h48fc3422']) {
    assert.ok(words.some((w) => w.id === id), `${id} exists in words.json`);
    assert.ok(md.includes(id), id);
  }
});
