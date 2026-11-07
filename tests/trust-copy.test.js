// Trust copy: each statement about pictures, the device voice and the Man/Woman choice is checked against the shipped data, so it
// cannot drift into a claim the app does not keep (found by the learner review and the journey QA, 2026-11-05).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAudio } from '../src/audio/player.js';
import { audioTruthDetail } from '../src/shell/audio-truth.js';
import { readinessLines, loadReadinessFacts } from '../src/shell/readiness.js';
import { audioSupport } from '../src/pronunciation/forTradition.js';
import { plain } from '../src/shell/plain-copy.js';

const root = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const summary = json('data/audio/summary.json');
const listOf = (m) => (Array.isArray(m) ? m : (m.entries || m.clips || Object.values(m)));
const all = [json('data/audio/manifest.json'), ...['israeli', 'sephardi', 'ashkenazi'].map((t) => json(`data/audio/manifest-words-${t}.json`))].flatMap(listOf);
const clips = all.filter((e) => e.status !== 'missing');

test('About: pictures line does not deny the pictures that are shown; the count is read from data/letters/memory-chain.json', async () => {
  const chain = json('data/letters/memory-chain.json');
  const n = chain.letters.filter((l) => l.picture && l.picture.svg).length;
  assert.ok(n > 0);
  for (const l of chain.letters) assert.ok(existsSync(join(root, l.picture.svg)), `${l.id} picture file ships in the repo`);
  const facts = await loadReadinessFacts(async (u) => ({ ok: true, json: async () => json(u) }));
  assert.equal(facts.memoryPictures, n);
  const text = readinessLines(facts).find((l) => l.id === 'images').text;
  assert.match(text, /none approved yet, so no generated picture is shown/);
  assert.ok(text.includes(`the ${n} letter memory pictures are drawings made for this app and are shown as unreviewed drafts`), text);
  // the shipped data really has no approved generated picture, which is what the first sentence says
  assert.equal(Object.values(json('data/images/approvals.json').approvals).filter((a) => a && a.status === 'approved').length, 0);
  // without the memory-chain file the line stays true and carries no number
  const bare = readinessLines({ imagesApproved: 0 }).find((l) => l.id === 'images').text;
  assert.ok(/the letter memory pictures are drawings/.test(bare) && !/\d/.test(bare));
});

test('device-voice line: never says the learner chose it (it is on by default); still says what it will sound like', () => {
  const a = audioSupport('sephardi', { browserVoiceAnyway: true });
  assert.equal(a.supported, 'device-mismatch');
  assert.doesNotMatch(a.line, /you chose/i);
  assert.match(a.line, /No Sephardi audio yet\. The device voice is on: it speaks Israeli Hebrew, so it will not sound Sephardi\./);
  assert.match(read('src/shell/settings.js'), /browserVoiceAnyway: true/, 'the default is on, which is why the wording must not claim a choice');
});

test('Man/Woman: a clip plays only for its own voice and tradition, and the wording does not call it a recording', () => {
  assert.ok(clips.length > 0 && clips.length === summary.tts);
  for (const e of clips) {
    assert.notEqual(e.status, 'recorded', `${e.path} is not a human recording`);
    assert.ok(e.voice === 'm' || e.voice === 'f', e.path);
    assert.ok(['israeli', 'sephardi', 'ashkenazi'].includes(e.tradition), e.path);
  }
  const house = all.find((e) => e.id === 'h9c8ddecf' && e.voice === 'f' && e.tradition === 'sephardi');
  assert.equal(house.status, 'synthetic-unreviewed');
  const at = (voice, congregation, id) => createAudio({ settings: { voice, congregation }, manifest: all, AudioCtor: class {}, speech: null }).status('word', id);
  assert.equal(at('f', 'sephardi', 'h9c8ddecf').source, 'file', 'Woman + Sephardi plays the house clip');
  assert.notEqual(at('m', 'sephardi', 'h9c8ddecf').source, 'file', 'Man + Sephardi has no house clip');
  assert.equal(at('f', 'israeli', 'h9c8ddecf').source, 'file', 'the Israeli woman house clip stays on its own row');
  assert.notEqual(at('m', 'ashkenazi', 'h9c8ddecf').source, 'file', 'Man + Ashkenazi house was not in the package');
  const d = audioTruthDetail(summary);
  assert.match(d, /not swapped for a different voice or tradition/);
  assert.match(d, /Israeli style has not been verified/);
  assert.doesNotMatch(d, /native|recorded by|All .* use the Man \(Ari\) voice/i);
  for (const text of [plain('settingsIntro'), d, read('src/shell/how.view.js')]) {
    assert.doesNotMatch(text, /does not change the sound yet|saved for later|cannot change it yet/);
  }
  assert.match(plain('settingsIntro'), /never changes your device voice/);
});
