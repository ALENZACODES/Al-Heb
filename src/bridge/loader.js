// Lazy data for the unvocalized bridge (lane 6). Every file already exists in the app; nothing here is new Hebrew.
import { loadJSON } from '../curriculum/data.js';

export const FILES = Object.freeze({
  shelf: 'data/books/index.json',
  readingSet: 'data/nikkudfade/reading-set.json',
  signs: 'data/camera/sign-glossary.json',
  scenarios: 'data/israel/scenarios.json',
  registry: 'data/corpus/registry.json',
});
export const bookFile = (id) => `data/books/${id}.json`;
/** ctx.bridgeLoad (tests) replaces loadJSON. */
export const loaderFor = (ctx) => (typeof ctx?.bridgeLoad === 'function' ? ctx.bridgeLoad : loadJSON);
