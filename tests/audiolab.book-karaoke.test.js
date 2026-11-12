// A8 book read along (src/books/book.view.js) and A7 the book's pages-with-audio line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, flush } from './rimon.fakedom.js';

const doc = createDocument(); globalThis.document = doc;
const { mount, ESTIMATED_NOTE } = await import('../src/books/book.view.js');

const book = { id: 'bk', titleHe: 'ספר', titleTranslit: 'Sefer', titleEn: 'Test Book', level: 'Grade 1', pages: [
  { n: 1, he: 'גָּדוֹל! קָטָן!', translit: 'Gadol! Katan!', en: 'Big! Small!', audio: { f: 'audio/f/israeli/book/bk-p01.mp3' }, hasImg: false },
  { n: 2, he: 'קוֹף קָטָן', translit: 'kof katan', en: 'a small monkey', audio: { f: 'audio/f/israeli/book/bk-p02.mp3' }, hasImg: false },
  { n: 3, he: 'סוֹף', translit: 'sof', en: 'end', hasImg: false },
] };
const ctx = () => {
  const data = {};
  return { params: { id: 'bk' }, settings: { get: (k) => (k === 'voice' ? 'f' : undefined) },
    store: { get: async (k) => data[k], set: async (k, v) => { data[k] = v; } },
    fetchFn: async (u) => ({ ok: true, json: async () => (u.includes('index.json') ? { books: [] } : book) }) };
};

test('the book says how many pages have audio in the learner\'s voice', async () => {
  const root = doc.createElement('div');
  await mount(root, ctx());
  const line = root.querySelector('.book-audio-ready');
  assert.ok(line);
  assert.equal(line.textContent, 'Noa: 2 of 3 pages have audio. 1 has audio coming.');
});

test('read along: words light up from estimated timings (labelled), and the page turns by itself at the end of the clip', async () => {
  const root = doc.createElement('div');
  await mount(root, ctx());
  const audio = root.querySelector('audio');
  let plays = 0;
  audio.play = () => { plays++; return Promise.resolve(); }; audio.pause = () => {}; audio.load = () => {};
  root.querySelector('.book-along').dispatchEvent({ type: 'click' });
  assert.match(root.textContent, new RegExp(ESTIMATED_NOTE.slice(0, 40)));
  assert.match(ESTIMATED_NOTE, /estimated/);
  const words = root.querySelectorAll('.al-word');
  assert.equal(words.length, 2);
  root.querySelector('.book-listen').dispatchEvent({ type: 'click' });
  await flush(1);
  assert.equal(plays, 1);
  audio.duration = 2; audio.currentTime = 1.8;
  audio.dispatchEvent({ type: 'timeupdate' });
  assert.deepEqual(root.querySelectorAll('.al-word').map((w) => w.getAttribute('data-on')), ['0', '1']);
  audio.dispatchEvent({ type: 'ended' });
  await flush(1);
  assert.match(root.textContent, /Page 2 of 3/);
  assert.equal(plays, 2, 'the next page plays by itself');
  assert.equal(audio.getAttribute('src'), 'audio/f/israeli/book/bk-p02.mp3');
  audio.dispatchEvent({ type: 'ended' });
  await flush(1);
  assert.match(root.textContent, /Page 3 of 3/);
  assert.equal(plays, 2, 'a page with no clip stops read along');
  assert.match(root.textContent, /Read along stopped: this page's voice is not recorded yet/);
});
