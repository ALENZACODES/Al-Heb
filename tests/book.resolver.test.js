import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createImgResolver, stemOf } from '../book/img.js';
import { placeholderSvg } from '../tools/images/make_placeholders.mjs';
import { selectRows, apiSize, parseArgs } from '../tools/images/gen_via_api.mjs';
import { readFileSync } from 'node:fs';

test('stemOf strips dirs and extensions', () => {
  assert.equal(stemOf('assets/img/L01_alef_print_mnemonic.png'), 'L01_alef_print_mnemonic');
  assert.equal(stemOf('x.SVG'), 'x');
});
test('resolver returns placeholder until real file listed, then real file', () => {
  const r = createImgResolver({ base: 'assets/img', files: [] });
  assert.equal(r.src('BG_cafe.png'), 'assets/img/placeholders/BG_cafe.svg');
  assert.equal(r.isReal('BG_cafe'), false);
  r.setFiles(['BG_cafe.png']);
  assert.equal(r.src('BG_cafe'), 'assets/img/BG_cafe.png');
  assert.equal(r.isReal('BG_cafe'), true);
});
test('resolver prefers png over svg, supports predicate and trailing slash base', () => {
  const r = createImgResolver({ base: '../x/', has: (f) => f === 'a.svg' || f === 'a.png' });
  assert.equal(r.src('a'), '../x/a.png');
  assert.equal(createImgResolver({ has: (f) => f === 'b.svg' }).src('b'), 'assets/img/b.svg');
});
test('placeholder SVG is well-formed and labelled', () => {
  const s = placeholderSvg({ file: 'L01_alef_print_mnemonic.png', width: 1024, height: 1024, block: 'B' });
  assert.match(s, /^<svg [^>]*viewBox="0 0 512 512"/);
  assert.match(s, /PLACEHOLDER/); assert.match(s, /L01_alef_print_mnemonic/);
  assert.equal((s.match(/<text/g) || []).length, (s.match(/<\/text>/g) || []).length);
});
test('gen_via_api: dry run default, 3 variants cap, size mapping, selection', () => {
  assert.equal(parseArgs([]).live, false);
  assert.equal(parseArgs(['--variants', '9']).variants, 3);
  assert.equal(apiSize(1792, 1024), '1536x1024'); assert.equal(apiSize(1024, 1536), '1024x1536'); assert.equal(apiSize(512, 512), '1024x1024');
  const data = JSON.parse(readFileSync(new URL('../data/images/prompt-groups.json', import.meta.url), 'utf8'));
  assert.equal(selectRows(data, parseArgs(['--command', '11'])).length, 10);
  assert.equal(selectRows(data, parseArgs(['--block', 'D'])).length, 75);
});

// --- approvals -> book image pickup (no code change when images get approved) ---
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { approvedManifest } from '../book/build.mjs';
import { lessonChapters } from '../book/intermediate/lessons.mjs';
import { TRACKS } from '../book/intermediate/lessons.mjs';

test('approvedManifest: an approval in approvals.json makes the resolver return the real image; unapproved stays placeholder', () => {
  const root = mkdtempSync(join(tmpdir(), 'alefimg-'));
  mkdirSync(join(root, 'data/images'), { recursive: true }); mkdirSync(join(root, 'assets/img/gen'), { recursive: true });
  const rec = (stem) => ({ width: 1600, height: 1600, variants: [{ edge: 800, file: `${stem}.800.webp`, width: 800, height: 800 }] });
  writeFileSync(join(root, 'data/images/provenance.json'), JSON.stringify({ images: { BG_cafe: rec('BG_cafe'), BG_market: rec('BG_market'), BG_gone: rec('BG_gone') } }));
  writeFileSync(join(root, 'data/images/approvals.json'), JSON.stringify({ version: 1, approvals: { BG_cafe: { status: 'approved' }, BG_market: { status: 'rejected' }, BG_gone: { status: 'approved' } } }));
  writeFileSync(join(root, 'assets/img/gen/BG_cafe.800.webp'), 'x'); writeFileSync(join(root, 'assets/img/gen/BG_market.800.webp'), 'x');
  const m = approvedManifest(root);
  assert.deepEqual(Object.keys(m.images), ['BG_cafe']); // rejected excluded; approved-but-file-missing excluded
  const r = createImgResolver({ base: 'b', files: [], generated: m });
  assert.equal(r.src('BG_cafe'), 'b/gen/BG_cafe.800.webp'); assert.equal(r.isReal('BG_cafe'), true);
  assert.equal(r.src('BG_market'), 'b/placeholders/BG_market.svg');
});
test('chapter opener shows placeholder until its scene is approved, then the <img>', () => {
  const scene = Object.values(TRACKS)[0].scene;
  const none = lessonChapters({ img: () => null });
  const real = lessonChapters({ img: (s) => (s === scene ? `gen/${s}.800.webp` : null), alt: { [scene]: 'alt text' } });
  const track = Object.keys(TRACKS)[0];
  assert.match(none.html[track], /Image placeholder/);
  assert.match(real.html[track], new RegExp(`<img src="gen/${scene}\\.800\\.webp" alt="alt text"`));
  assert.doesNotMatch(real.html[track], /Image placeholder/);
});
