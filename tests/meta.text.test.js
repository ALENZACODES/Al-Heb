import test from 'node:test';
import assert from 'node:assert/strict';
import { TEXT_RE, PROVENANCE_RE, textHit } from '../tools/meta/text.mjs';

test('text scan pattern catches tool names and spares Hebrew transliterations', () => {
  for (const s of ['\u0043hatGPT', '\u0043laude', 'OpenAI', 'gpt-image', 'Co-Authored-By', 'Midjourney', 'DALL-E']) assert.ok(TEXT_RE.test(s), s);
  for (const s of ['dalet', 'gimel', 'plain text']) assert.ok(!TEXT_RE.test(s), s);
});

test('provenance pattern catches "written by an AI agent" wording and spares Hebrew transliterations', () => {
  for (const s of ['written by an AI agent', 'pointed by AI', 'AI-generated images', 'AI-written, unreviewed', 'Hebrew is AI-pointed']) assert.ok(PROVENANCE_RE.test(s) && textHit(s), s);
  for (const s of ['Adonai', 'Sinai', 'chai', 'kan ai', 'an ai glide', 'ai / ay', 'ADONAI', 'AIX-ish', 'MAIN']) assert.ok(!PROVENANCE_RE.test(s), s);
});
