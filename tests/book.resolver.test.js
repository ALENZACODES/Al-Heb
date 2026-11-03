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
