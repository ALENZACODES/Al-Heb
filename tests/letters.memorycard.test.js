import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { waitFor } from './helpers/waitfor.js';

// Fake DOM: logic only (stages, aria state, audio calls, honest notes, sanitiser). Browser rendering is checked separately (docs/qa/memory-card/).
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.nodeType = 1; this._text = ''; this.innerHTML = ''; }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  appendChild(c) { this.children.push(c); return c; }
  set textContent(v) { this.children = []; this._text = v; } get textContent() { return this.text; }
  get text() { return this._text + this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join('') + (this.innerHTML && this.tag === 'span' ? '' : ''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = { createElement: (t) => new El(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const M = await import('../src/letters/memorycard.js');
const { respell } = await import('../src/pronunciation/forTradition.js');
const fixture = JSON.parse(readFileSync(new URL('./fixtures/memory-chain.fixture.json', import.meta.url)));
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><g class="morph-a"><path d="M0 0L9 9" fill="url(#g)"/></g><g class="morph-b"><circle cx="5" cy="5" r="3"/></g></svg>';
const act = (root, a) => root.find((n) => n.attrs['data-act'] === a)[0];
const body = (el) => el.find((n) => n.tag === 'style').reduce((t, st) => t.replace(st.text, ''), el.text);

test('sanitizeSvg: keeps a plain two-state picture, prefixes ids, makes the root decorative', () => {
  const out = M.sanitizeSvg(SVG);
  assert.ok(out.includes('class="morph-a"') && out.includes('class="morph-b"'));
  assert.ok(out.includes('id="mc-g"') && out.includes('url(#mc-g)'));
  assert.match(out, /^<svg aria-hidden="true" focusable="false"/);
});

test('sanitizeSvg: scopes the file\'s own <style> to the card (no :root/body rules, no keyframes, selectors prefixed)', () => {
  const css = '.morph-a{opacity:0}.L,.o{fill:none}@media (prefers-color-scheme:dark){:root{color:#ece7da}.d{fill:red}}@keyframes ma{0%,18%{opacity:1}100%{opacity:0}}body{color:red}@media (forced-colors:active){.s,.p{fill:Canvas}}';
  const out = M.sanitizeSvg('<svg viewBox="0 0 9 9"><style>' + css + '</style><g class="morph-a"/></svg>');
  const st = /<style>([\s\S]*)<\/style>/.exec(out)[1];
  assert.equal(st, '.mc-svg .morph-a{opacity:0}.mc-svg .L,.mc-svg .o{fill:none}@media (prefers-color-scheme:dark){.mc-svg .d{fill:red}}@media (forced-colors:active){.mc-svg .s,.mc-svg .p{fill:Canvas}}');
  assert.doesNotMatch(out, /keyframes|:root|body/);
});

test('sanitizeSvg: rejects script, handlers, external references, foreignObject, DOCTYPE, images, remote css', () => {
  const bad = [
    '<svg><script>alert(1)</script></svg>', '<svg onload="x()"><g/></svg>', '<svg><g onclick = "x()"/></svg>',
    '<svg><use href="https://x.test/a.svg#b"/></svg>', '<svg><foreignObject><div/></foreignObject></svg>',
    '<!DOCTYPE svg><svg><g/></svg>', '<svg><image href="#a"/></svg>', '<svg><style>@import url(x.css);</style></svg>',
    '<svg><path fill="url(https://x.test/p)"/></svg>', '<svg><a href="#x"><g/></a></svg>', '<svg><g style="x:javascript:1"/></svg>',
    '<div>not svg</div>', '', null, '<svg><iframe/></svg>', '<svg><g/></svg>trailing<b>',
    // a handler attribute does not need a space before it: after a closing quote or a slash it still runs when a click reaches it
    '<svg><path d="M0 0h9v9z"onclick="x()"/></svg>', '<svg><path d="M0 0"/onclick="x()"/></svg>', '<svg><g class=\'a\'onmouseover=\'x()\'/></svg>'
  ];
  for (const b of bad) assert.equal(M.sanitizeSvg(b), null, String(b));
  assert.ok(M.sanitizeSvg('<svg><use href="#a"/></svg>'));
});

test('soundLineFor: the learner\'s tradition, else the general line, never invented', () => {
  const e = fixture.letters[0];
  assert.equal(M.soundLineFor(e, 'ashkenazi'), 'Silent, or a tiny pause (Ashkenazi).');
  assert.equal(M.soundLineFor(e, 'sephardi'), 'Silent, or a tiny pause (Sephardi).');
  assert.equal(M.soundLineFor({ sound: { line: 'L' } }, 'israeli'), 'L');
  assert.equal(M.soundLineFor({ sound: { hook: 'H' } }, 'israeli'), '');
  assert.equal(M.soundLineFor({}, 'israeli'), '');
});

test('wordFor: respelling comes from respell() for each tradition, not from hand text', () => {
  const e = fixture.letters[2];
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
    const w = M.wordFor(e, t);
    assert.equal(w.respelling, respell(e.word.he, t)); assert.ok(w.respelling, t); assert.equal(w.he, e.word.he);
  }
  assert.equal(M.wordFor({ word: {} }, 'israeli'), null);
});

test('memory card: ONE tap shows picture + sound hook + word together; "Play the chain" is the optional slow walk; Hear is behind "Story and tip"', async () => {
  const played = [];
  const audio = { play: async (k, id) => { played.push([k, id]); return { source: 'file' }; } };
  const c = M.buildMemoryCard({ entry: fixture.letters[2], glyph: 'ש', tradition: 'ashkenazi', audio, svg: M.sanitizeSvg(SVG), compact: true });
  const art = act(c.el, 'mc-art'), next = () => act(c.el, 'mc-next');
  assert.equal(art.tag, 'button'); assert.equal(art.attrs.type, 'button'); assert.equal(art.attrs['aria-pressed'], 'false');
  assert.ok(art.attrs['aria-label'].includes('Shin'));
  assert.equal(c.getStage(), 0); assert.doesNotMatch(body(c.el), /Shin hushes/);
  assert.match(next().text, /Picture, sound, word/);
  await art.click(); // one tap: the letter turns into the picture and the sound and the word are all there
  assert.equal(art.attrs['aria-pressed'], 'true'); assert.equal(art.attrs['data-state'], 'b'); assert.equal(c.getStage(), 3);
  let b = body(c.el);
  assert.match(b, /Picture: Three candle flames/); assert.match(b, /Shin hushes\./);
  assert.ok(b.includes('שָׁלוֹם')); assert.ok(b.includes(respell('שָׁלוֹם', 'ashkenazi'))); assert.match(b, /= peace, hello/);
  assert.doesNotMatch(b, /respelling, rule-generated|\(Ashkenazi respelling/, 'no wrapping label');
  assert.equal(c.el.find((n) => n.className === 'mc-chip')[0].text, 'Ashkenazi', 'short tradition chip');
  assert.doesNotMatch(b, /Three prongs/, 'story is behind "Story and tip"'); assert.equal(act(c.el, 'mc-hear-word'), undefined);
  await act(c.el, 'mc-more').click();
  b = body(c.el); assert.match(b, /Three prongs/); assert.match(b, /Only shin has three prongs/); assert.match(b, /not history/);
  await act(c.el, 'mc-hear-word').click(); await act(c.el, 'mc-hear-letter').click();
  assert.deepEqual(played, [['word', 'shalom'], ['letter', 'shin']]);
  await act(c.el, 'mc-more').click(); assert.doesNotMatch(body(c.el), /Three prongs/);
  await act(c.el, 'mc-play').click(); // optional slow walk: picture, then hook, then word
  assert.equal(c.getStage(), 1); assert.match(body(c.el), /Picture: Three candle flames/); assert.doesNotMatch(body(c.el), /Shin hushes/);
  assert.match(next().text, /Next: sound hook/);
  await next().click(); assert.equal(c.getStage(), 2); assert.match(body(c.el), /Shin hushes\./); assert.doesNotMatch(body(c.el), /peace/);
  assert.match(next().text, /Next: example word/);
  await next().click(); assert.equal(c.getStage(), 3); assert.match(body(c.el), /= peace, hello/); assert.equal(next(), undefined);
});

test('memory card: the picture button toggles back and forth without moving the chain', async () => {
  const c = M.buildMemoryCard({ entry: fixture.letters[1], glyph: 'ב', svg: M.sanitizeSvg(SVG) });
  const art = act(c.el, 'mc-art');
  await art.click(); assert.equal(c.getStage(), 3); await art.click();
  assert.equal(art.attrs['aria-pressed'], 'false'); assert.equal(c.getStage(), 3);
  await art.click(); assert.equal(art.attrs['aria-pressed'], 'true'); assert.equal(c.getStage(), 3);
});

test('memory card: audio is honest (no recording, device voice, no player)', async () => {
  const mk = (audio) => { const c = M.buildMemoryCard({ entry: fixture.letters[1], glyph: 'ב', tradition: 'sephardi', audio, svg: M.sanitizeSvg(SVG) }); return c; };
  for (const [audio, re] of [
    [{ play: async () => ({ source: 'none' }) }, /^.*No recording yet, and the device voice could not say it\.$/],
    [{ play: async () => ({ source: 'none', reason: 'tts-pronunciation-mismatch' }) }, /speaks Israeli Hebrew, not Sephardi\. Read the English-letter spelling\.$/],
    [{ play: async () => ({ source: 'tts-fallback' }) }, /No recording yet\. Using your device's Hebrew voice, which speaks Israeli Hebrew\. Read the English-letter spelling\.$/],
    [{ play: async () => { throw new Error('x'); } }, /No recording yet, and the device voice could not say it\./],
    [undefined, /not available here yet/]]) {
    const c = mk(audio); await act(c.el, 'mc-art').click(); await act(c.el, 'mc-more').click();
    await act(c.el, 'mc-hear-word').click(); assert.match(body(c.el), re);
  }
});

test('memoryFallback: one calm line, not a card', () => {
  const f = M.memoryFallback();
  assert.equal(f.attrs['data-memory-fallback'], '1'); assert.equal(f.text, 'Picture and word hint unavailable offline');
  assert.equal(f.attrs['data-memory-card'], undefined);
});

test('atlas view: #/letters/atlas?id=bet (id arrives in ctx.query) opens the bet panel with its card; no chain file -> the one-line fallback', async () => {
  const rd = (p) => JSON.parse(readFileSync(new URL('../data/letters/' + p, import.meta.url)));
  const data = { letters: rd('letters.json'), mnemonics: rd('mnemonics.json'), confusables: rd('confusables.json'), interference: rd('interference.json') };
  const { mount } = await import('../src/letters/atlas.view.js');
  const r1 = new El('div'); const u1 = mount(r1, { ...data, memoryChain: fixture, query: { id: 'bet' }, t: (k) => k });
  await waitFor(() => r1.find((n) => n.attrs['data-memory-card'] === 'bet').length === 1, { message: 'bet card from ?id=bet' }); u1();
  const r2 = new El('div'); const u2 = mount(r2, { ...data, memoryChain: null, query: { id: 'bet' }, t: (k) => k });
  await waitFor(() => r2.find((n) => n.attrs['data-detail'] === 'bet').length === 1, { message: 'bet panel' });
  assert.equal(r2.find((n) => n.attrs['data-memory-fallback']).length, 1); u2();
});

test('memory card: no picture file -> the letter stays and the picture idea shows as words', async () => {
  const c = M.buildMemoryCard({ entry: { ...fixture.letters[1], picture: { idea: 'a house', alt: 'A small house' } }, glyph: 'ב' });
  const art = act(c.el, 'mc-art');
  assert.ok(art.find((n) => n.attrs.lang === 'he')[0].text.includes('ב'));
  await art.click(); assert.ok(art.text.includes('A small house')); assert.match(body(c.el), /Picture: A small house/);
});

test('memory card: no timers or animation frames in the module (no autoplay loops); reduced motion turns the morph off', () => {
  const src = readFileSync(new URL('../src/letters/memorycard.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /setInterval|setTimeout|requestAnimationFrame|animation\s*:/);
  assert.match(M.MEMORY_CARD_CSS, /prefers-reduced-motion:reduce[^}]*\{[^}]*transition:none/);
  assert.match(M.MEMORY_CARD_CSS, /forced-colors:active/);
  assert.match(M.MEMORY_CARD_CSS, /min-block-size:44px/);
});

test('loadMemoryChain: resolves null when the file is absent or malformed', async () => {
  M._resetMemoryCardCache();
  assert.equal(await M.loadMemoryChain(async () => ({ ok: false, status: 404 })), null);
  M._resetMemoryCardCache();
  assert.equal(await M.loadMemoryChain(async () => ({ ok: true, json: async () => ({}) })), null);
  M._resetMemoryCardCache();
  assert.equal((await M.loadMemoryChain(async () => ({ ok: true, json: async () => fixture }))).letters.length, 3);
  M._resetMemoryCardCache();
});

test('atlas view: shows a memory card for a letter in the chain, none for letters without one', async () => {
  const rd = (p) => JSON.parse(readFileSync(new URL('../data/letters/' + p, import.meta.url)));
  const data = { letters: rd('letters.json'), mnemonics: rd('mnemonics.json'), confusables: rd('confusables.json'), interference: rd('interference.json'), memoryChain: fixture };
  const { mount } = await import('../src/letters/atlas.view.js');
  const root = new El('div'); const un = mount(root, { ...data, audio: { play: async () => ({ source: 'file' }) }, t: (k) => k });
  const tile = (id) => root.find((n) => n.attrs['data-tile'] === id)[0];
  await waitFor(() => tile('bet'), { message: 'tiles' });
  await tile('bet').click(); await waitFor(() => root.find((n) => n.attrs['data-memory-card'] === 'bet').length === 1, { message: 'bet card' });
  await tile('dalet').click();
  assert.equal(root.find((n) => n.attrs['data-memory-card']).length, 0);
  un();
});

// Real data (written by another lane): checked only once it exists, so this file passes before and after it lands.
const REAL = new URL('../data/letters/memory-chain.json', import.meta.url);
test('real memory-chain.json (when present): schema, svg files, safe svg, tradition lines, respelling', { skip: !existsSync(REAL) && 'memory-chain.json not written yet' }, () => {
  const j = JSON.parse(readFileSync(REAL, 'utf8'));
  assert.ok(Array.isArray(j.letters) && j.letters.length >= 22, 'letters');
  assert.equal(new Set(j.letters.map((e) => e.id)).size, j.letters.length, 'unique ids');
  const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));
  const anySvg = existsSync(new URL('../assets/letters/morph/', import.meta.url)) && readdirSync(new URL('../assets/letters/morph/', import.meta.url)).some((n) => n.endsWith('.svg'));
  for (const e of j.letters) {
    for (const k of ['id', 'hebrew', 'name', 'story', 'tip']) assert.ok(e[k], e.id + ' ' + k);
    assert.ok(letters.find((l) => l.id === e.id), e.id + ' is a known letter id');
    assert.ok(e.picture && e.picture.alt && e.picture.idea && e.picture.svg === `assets/letters/morph/${e.id}.svg`, e.id + ' picture');
    const f = new URL('../' + e.picture.svg, import.meta.url);
    if (anySvg) { // the three drawing lanes may still be running: all-or-nothing once the first picture exists
      assert.ok(existsSync(f), e.id + ' svg exists');
      const svg = readFileSync(f, 'utf8'); assert.ok(M.sanitizeSvg(svg), e.id + ' svg passes the sanitiser');
      assert.ok(/morph-a/.test(svg) && /morph-b/.test(svg), e.id + ' has both states');
    }
    assert.ok(e.sound && e.sound.hook, e.id + ' hook');
    for (const t of ['israeli', 'sephardi', 'ashkenazi']) assert.ok(M.soundLineFor(e, t), e.id + ' sound ' + t);
    assert.ok(e.word && e.word.he && e.word.gloss, e.id + ' word');
    for (const t of ['israeli', 'sephardi', 'ashkenazi']) assert.ok(respell(e.word.he, t), e.id + ' respelling ' + t);
  }
});

test('memory card: the word is asked for with its Hebrew text (a word missing from the loaded list still gets the device voice); israeli gets a one-sentence note', async () => {
  const calls = [];
  const c = M.buildMemoryCard({ entry: fixture.letters[1], glyph: 'ב', tradition: 'israeli', audio: { play: async (k, id, o) => { calls.push([k, id, o]); return { source: 'tts-fallback' }; } }, svg: M.sanitizeSvg(SVG) });
  await act(c.el, 'mc-art').click(); await act(c.el, 'mc-more').click(); await act(c.el, 'mc-hear-word').click();
  assert.equal(calls[0][0], 'word'); assert.equal(calls[0][2].text, fixture.letters[1].word.he);
  assert.match(body(c.el), /No recording yet: using your device's Hebrew voice\.$/);
});

test('memory card: "Same sound:" prefix is not shown; hideSoundLine drops the line (first-day step has its own)', async () => {
  const e = { ...fixture.letters[1], sound: { ...fixture.letters[1].sound, perTradition: { sephardi: 'Same sound: b with dagesh, v without' } } };
  const c = M.buildMemoryCard({ entry: e, glyph: 'ב', tradition: 'sephardi', svg: M.sanitizeSvg(SVG) }); await act(c.el, 'mc-art').click();
  assert.doesNotMatch(body(c.el), /Same sound/); assert.match(body(c.el), /: b with dagesh, v without/);
  const d = M.buildMemoryCard({ entry: e, glyph: 'ב', tradition: 'sephardi', hideSoundLine: true, svg: M.sanitizeSvg(SVG) }); await act(d.el, 'mc-art').click();
  assert.doesNotMatch(body(d.el), /dagesh/);
});

// WCAG 2.5.3 (label in name): the picture button's visible words, when there are any, are inside its accessible name.
test('memory card: picture button name keeps its base wording, and includes the visible picture idea when no picture file loaded', async () => {
  const base = M.buildMemoryCard({ entry: { ...fixture.letters[1], picture: { idea: 'a house', alt: 'A small house' } }, glyph: 'ב' });
  const art = act(base.el, 'mc-art');
  const before = art.attrs['aria-label'];
  assert.match(before, /show the picture that helps you remember it$/);
  await art.click();
  assert.ok(art.text.includes('A small house'));
  assert.ok(art.attrs['aria-label'].startsWith(before) && art.attrs['aria-label'].includes('A small house'), art.attrs['aria-label']);
  await art.click();
  assert.equal(art.attrs['aria-label'], before, 'back to the base name when the words are gone');
  const withSvg = M.buildMemoryCard({ entry: fixture.letters[2], glyph: 'ש', svg: M.sanitizeSvg(SVG) });
  const a2 = act(withSvg.el, 'mc-art'); await a2.click();
  assert.doesNotMatch(a2.attrs['aria-label'], /\. /, 'with the drawn picture there are no visible words, so the name stays as it was');
});
