// @ts-check
// Shared loader for data/pronunciation/runtime/ (lookup shards, reasons, picks). Used by the tradition quiz, "Read it my way" and the rule pages.
// Tests inject ctx.compareData = {index, reasons, picks, shards:{file:json}, quiz, rules}; otherwise files are fetched next to this module.
// Everything loaded is rule-generated from the niqqud text and has not been checked by a native speaker.
import { shardOf, shardFile } from './compare.model.js';

const DIR = new URL('../../data/pronunciation/runtime/', import.meta.url);

/** @param {any} ctx */
export function createLoader(ctx) {
  const injected = ctx?.compareData;
  const cache = new Map();
  async function json(name) {
    const bare = name.replace(/\.json$/, '').replace(/^quiz-pool$/, 'quiz');
    if (injected && bare !== 'shards' && injected[bare] !== undefined) return injected[bare];
    if (injected?.shards?.[name]) return injected.shards[name];
    if (!cache.has(name)) {
      cache.set(name, (async () => {
        const res = await globalThis.fetch(new URL(name, DIR));
        if (!res.ok) throw new Error(`${name} ${res.status}`);
        return res.json();
      })());
    }
    return cache.get(name);
  }
  return {
    json,
    /** Fills `entry` on every token (null when the word is not in the table). */
    async lookup(tokens) {
      const index = await json('index.json');
      for (const t of tokens) {
        const shard = await json(shardFile(shardOf(t.key, index.shards)));
        t.entry = shard.w[t.key] ?? null;
      }
      return tokens;
    },
  };
}
