// Honesty wording checks (no DOM): assisted vs independent tracing, placement recommendation wording, no "measured mastery" claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('trace view: forced or button-driven strokes count as assisted, and the wording says so', () => {
  const s = read('src/letters/trace.view.js');
  assert.match(s, /if \(r\.forced\) assistedRun = true/);
  assert.match(s, /walked through, not as drawn by you/);
  
  assert.doesNotMatch(s, /t\('trace\.completed', 'completed'\)/);
});

test('no learner-facing text calls self-rating or completion measured mastery', () => {
  for (const f of ['src/placement/placement.view.js', 'src/placement/model.js', 'data/placement/config.json']) {
    let s = ''; try { s = read(f); } catch { continue; }
    assert.doesNotMatch(s, /measured (mastery|proficiency)|proven|certif/i, f);
  }
});

test('the voices are described once, plainly: About says they are computer-generated; nothing calls them human recordings', () => {
  const must = [
    ['src/shell/plain-copy.js', /Ari \(man\) or Noa \(woman\)/], // was /does not change the sound yet/, which was false for Man + Israeli
    ['src/shell/about.view.js', /audioTruthNode/], // the about line (computer-generated voices) is built in src/shell/audio-truth.js; tests/audio.truth.test.js
    ['src/shell/settings.view.js', /href: '#\/about'/], // Settings links to About, where the sound statement lives (one place for notes)
    ['src/shell/audio-truth.js', /computer-generated/],
    ['src/shell/a11y.statement.js', /computer-generated/],
  ];
  for (const [f, re] of must) assert.match(read(f), re, f);
  for (const f of ['src/shell/how.view.js', 'src/shell/offline.view.js', 'src/app.js']) assert.doesNotMatch(read(f), /recorded teacher|native[- ]recorded|human[- ]recorded/i, f);
  // the audio labels keep the two apart
  const lab = read('src/shell/audio-labels.js');
  assert.match(lab, /Recorded by a human reader/);
});

test('listen view: title and copy follow the mode; reading fallback never claims listening', () => {
  const s = read('src/listen/listen.view.js');
  assert.match(s, /TITLE_READ = 'Read and match'/);
  assert.match(s, /Seeing a word and its meaning is not listening/);
  assert.match(s, /Browser speech is not used in this drill/);
});
