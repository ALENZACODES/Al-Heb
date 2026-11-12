// S-02 and S-04 (12 Nov audit): the memory-chain picture draws in colour with its ball (not a black silhouette), and a failed first load
// of the chain or the picture is retried instead of showing "did not load" until the letter is opened again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../src/letters/memorycard.js';

const chainFixture = { letters: [{ id: 'alef', picture: { alt: 'an ox', svg: 'assets/letters/morph/alef.svg' } }] };

test('S-02: the sanitised picture styles only apply under .mc-svg, and the review/letters picture is placed inside one', () => {
  const clean = M.sanitizeSvg(readFileSync(new URL('../assets/letters/morph/bet.svg', import.meta.url), 'utf8'));
  const css = /<style[^>]*>([^]*?)<\/style>/.exec(clean)[1];
  const rules = css.replace(/@media[^{]*\{/g, '').split('}').map((r) => r.split('{')[0].trim()).filter((x) => x && !x.startsWith('@'));
  assert.ok(rules.length > 10);
  for (const sel of rules) for (const one of sel.split(',')) assert.match(one.trim(), /^\.mc-svg /, one);
  assert.match(clean, /class="s o"/, 'the ball is drawn with the picture classes');
  const view = readFileSync(new URL('../src/letters/memory.view.js', import.meta.url), 'utf8');
  assert.match(view, /box\.replaceChildren\(el\("span", \{ class: "mc-svg alef-mem-pic-art" \}, svg\)\)/);
  assert.match(readFileSync(new URL('../assets/css/learn.css', import.meta.url), 'utf8'), /\.alef-mem-pic-art \{ display: contents; \}/);
});

test('S-02: the Bet picture text and its drawing agree (bungalow, ball)', () => {
  const chain = JSON.parse(readFileSync(new URL('../data/letters/memory-chain.json', import.meta.url), 'utf8'));
  const bet = chain.letters.find((l) => l.id === 'bet');
  assert.match(bet.picture.alt, /bungalow with a ball inside/);
  const svg = readFileSync(new URL('../' + bet.picture.svg, import.meta.url), 'utf8');
  assert.match(svg, /<desc[^>]*>[^<]*ball[^<]*<\/desc>/i);
  assert.match(svg, /<circle class="s o"/, 'a ball is in the drawing');
});

test('S-04: a chain load that fails once is retried and succeeds', async () => {
  M._resetMemoryCardCache();
  let n = 0;
  const flaky = async () => (++n === 1 ? { ok: false, status: 503 } : { ok: true, json: async () => chainFixture });
  const c = await M.loadMemoryChain(flaky);
  assert.equal(n, 2);
  assert.equal(c.letters[0].id, 'alef');
  M._resetMemoryCardCache();
  let m = 0; // the worker answering with the offline page (HTML, not JSON) is a failure too, and is retried
  const html = async () => (++m === 1 ? { ok: true, json: async () => { throw new SyntaxError('Unexpected token <'); } } : { ok: true, json: async () => chainFixture });
  assert.ok(await M.loadMemoryChain(html));
  M._resetMemoryCardCache();
});

test('S-04: a picture load that fails once is retried', async () => {
  M._resetMemoryCardCache();
  const svg = readFileSync(new URL('../assets/letters/morph/alef.svg', import.meta.url), 'utf8');
  let n = 0;
  const flaky = async () => { if (++n === 1) throw new TypeError('network'); return { ok: true, text: async () => svg }; };
  assert.ok(await M.loadMorphSvg('assets/letters/morph/alef.svg', flaky));
  assert.equal(n, 2);
  M._resetMemoryCardCache();
});

test('S-04: after a failed first load the view keeps trying in the background and is handed the chain', async () => {
  M._resetMemoryCardCache();
  let n = 0;
  const later = async () => (++n <= 2 ? { ok: false, status: 503 } : { ok: true, json: async () => chainFixture });
  assert.equal(await M.loadMemoryChain(later), null, 'both quick tries failed');
  const got = await new Promise((resolve) => M.retryMemoryChainLater(resolve, { delays: [5, 5], fetchFn: later }));
  assert.equal(got.letters[0].id, 'alef');
  const stop = M.retryMemoryChainLater(() => assert.fail('cancelled'), { delays: [5], fetchFn: later });
  stop();
  await new Promise((r) => setTimeout(r, 20));
  for (const f of ['trace.view.js', 'atlas.view.js']) assert.match(readFileSync(new URL('../src/letters/' + f, import.meta.url), 'utf8'), /retryMemoryChainLater\(/, f);
  M._resetMemoryCardCache();
});
