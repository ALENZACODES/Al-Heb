// Letter audit of 13 Nov 2026 (docs/letters/LETTER-AUDIT-2026-11-13.md): the picture shown with a letter is the one its story describes,
// and the home page builder says letter names with the checked recordings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createImageResolver } from '../src/img/resolve.js';

const rd = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const R = createImageResolver({ index: rd('data/img/index.json'), approvals: rd('data/images/approvals.json') });
const LETTERS = rd('data/letters/letters.json');

test('every letter shows a picture, and Dalet shows the diving board its story describes', () => {
  for (const l of LETTERS) {
    const hit = R.resolve('letter', l.id, { variant: 'print', role: 'mnemonic' });
    assert.ok(hit, `${l.id} has a memory picture`);
    assert.ok(existsSync(new URL('../' + hit.src, import.meta.url)), hit.src);
  }
  const story = R.resolve('letter', 'dalet', { variant: 'print', role: 'mnemonic' });
  assert.equal(story.id, 'L04_dalet_quirky');
  assert.match(story.alt, /diving board/);
  assert.match(R.resolve('letter', 'dalet', { role: 'meet' }).alt, /Meet Dalet/, 'the Dalet meet picture is the new letter card');
});

test('builder letter names are the checked letter recordings and cannot be re-rendered', () => {
  const clips = rd('tools/audio/builder-manifest.json').clips;
  for (const s of rd('data/builder_symbols.json').letters) {
    for (const [v, dir] of [['ari', 'm'], ['noa', 'f']]) {
      const c = clips.find((x) => x.path === s['audio_' + v]);
      assert.equal(c.source, `audio/${dir}/israeli/letter/${s.id}.mp3`, s.id);
    }
  }
});

test('Pe is written with its dot', () => {
  assert.equal(LETTERS.find((l) => l.id === 'pe').nameHe, 'פֵּא');
  assert.equal(LETTERS.find((l) => l.id === 'pe-final').nameHe, 'פֵּא סוֹפִית');
});
