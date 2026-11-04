import test from 'node:test';
import assert from 'node:assert/strict';
import { TEXT_RE } from '../tools/meta/text.mjs';

test('text scan pattern catches tool names and spares Hebrew transliterations', () => {
  for (const s of ['ChatGPT', 'Claude', 'OpenAI', 'gpt-image', 'Co-Authored-By', 'Midjourney', 'DALL-E']) assert.ok(TEXT_RE.test(s), s);
  for (const s of ['dalet', 'gimel', 'plain text']) assert.ok(!TEXT_RE.test(s), s);
});
