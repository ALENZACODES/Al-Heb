import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
// Reader speed: normal by default, Slower is the learner's choice for this session only, same slow rate as the shared player.
const S = await import("../src/books/reader.speed.js");
const { clipPlaybackRate } = await import("../src/audio/player.js");

test("normal pace by default; the slow rate is the shared player's one slow speed", () => {
  S.setReaderSlow(false);
  assert.equal(S.readerSlow(), false);
  assert.equal(S.rateFor(false), 1);
  assert.equal(S.READER_SLOW_RATE, clipPlaybackRate("slow"));
  assert.ok(S.READER_SLOW_RATE > 0.5 && S.READER_SLOW_RATE < 1);
});

test("applyReaderRate sets the rate and asks for pitch preservation where the element offers it; tolerates a bare object", () => {
  const el = { playbackRate: 1, defaultPlaybackRate: 1, preservesPitch: false };
  assert.equal(S.applyReaderRate(el, true), S.READER_SLOW_RATE);
  assert.equal(el.playbackRate, S.READER_SLOW_RATE); assert.equal(el.defaultPlaybackRate, S.READER_SLOW_RATE); assert.equal(el.preservesPitch, true);
  assert.equal(S.applyReaderRate(el, false), 1); assert.equal(el.playbackRate, 1);
  const bare = {}; assert.equal(S.applyReaderRate(bare, true), S.READER_SLOW_RATE); assert.equal(bare.playbackRate, S.READER_SLOW_RATE); assert.equal("preservesPitch" in bare, false);
  assert.equal(S.applyReaderRate(null, true), S.READER_SLOW_RATE);
});

test("the choice lives in module state for the session: no store, no settings key; the status line names the speed", () => {
  assert.equal(S.setReaderSlow(true), true); assert.equal(S.readerSlow(), true);
  assert.match(S.speedLine(true), /Slower: 0\.7x speed/);
  assert.equal(S.speedLine(false), "Normal speed.");
  S.setReaderSlow(false);
  const src = fs.readFileSync(new URL("../src/books/reader.speed.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /localStorage|sessionStorage|store\.|settings/);
});
