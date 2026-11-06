// Trust copy: each statement about pictures, the device voice and the Man/Woman choice is checked against the shipped data, so it
// cannot drift into a claim the app does not keep (found by the learner review and the journey QA, 2026-11-05).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAudio } from '../src/audio/player.js';
import { audioTruthDetail } from '../src/shell/audio-truth.js';
import { readinessLines, loadReadinessFacts, imageInventory } from '../src/shell/readiness.js';
import { audioSupport } from '../src/pronunciation/forTradition.js';
import { plain } from '../src/shell/plain-copy.js';

const root = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const summary = json('data/audio/summary.json');
const listOf = (m) => (Array.isArray(m) ? m : (m.entries || m.clips || Object.values(m)));
const all = [json('data/audio/manifest.json'), ...['israeli', 'sephardi', 'ashkenazi'].map((t) => json(`data/audio/manifest-words-${t}.json`))].flatMap(listOf);
const clips = all.filter((e) => e.status !== 'missing');

test('About: picture counts name catalogue, approvals and shown separately; letter memory pictures stay their own count', async () => {
  const chain = json('data/letters/memory-chain.json');
  const n = chain.letters.filter((l) => l.picture && l.picture.svg).length;
  assert.ok(n > 0);
  for (const l of chain.letters) assert.ok(existsSync(join(root, l.picture.svg)), `${l.id} picture file ships in the repo`);
  const facts = await loadReadinessFacts(async (u) => ({ ok: true, json: async () => json(u) }));
  assert.equal(facts.memoryPictures, n);
  const images = imageInventory(json('data/img/index.json'), json('data/images/approvals.json'));
  assert.deepEqual(facts.images, images);
  const text = readinessLines(facts).find((l) => l.id === 'images').text;
  assert.match(text, new RegExp(`${images.shown} shown \\(approved and the picture file is in the app\\)`));
  assert.match(text, new RegExp(`${images.approved} approvals`));
  assert.match(text, new RegExp(`${images.catalogued} catalogued`));
  if (images.pending > 0) assert.match(text, new RegExp(`${images.pending} approved but not in the app yet`));
  assert.doesNotMatch(text, /approved by a reviewer and shown/);
  assert.ok(text.includes(`the ${n} letter memory pictures are drawings made for this app and are shown as unreviewed drafts`), text);
  // without the memory-chain file, and with no approvals, the line stays true and carries no number
  const bare = readinessLines({ imagesApproved: 0 }).find((l) => l.id === 'images').text;
  assert.match(bare, /none approved yet, so no generated picture is shown/);
  assert.ok(/the letter memory pictures are drawings/.test(bare) && !/\d/.test(bare));
});

test('device-voice line: never says the learner chose it (it is on by default); still says what it will sound like', () => {
  const a = audioSupport('sephardi', { browserVoiceAnyway: true });
  assert.equal(a.supported, 'device-mismatch');
  assert.doesNotMatch(a.line, /you chose/i);
  assert.match(a.line, /No Sephardi audio yet\. The device voice is on: it speaks Israeli Hebrew, so it will not sound Sephardi\./);
  assert.match(read('src/shell/settings.js'), /browserVoiceAnyway: true/, 'the default is on, which is why the wording must not claim a choice');
});

test('Man/Woman: Settings and How this works say what is true, and the data proves it', () => {
  // the data: every clip is Man + Israeli; the player gives a clip for Man + Israeli and none for Woman, Sephardi or Ashkenazi
  assert.ok(clips.length > 0 && clips.length === summary.tts);
  for (const e of clips) assert.ok(e.voice === 'm' && e.tradition === 'israeli', `${e.kind}/${e.id} is ${e.voice}/${e.tradition}: update the Man/Woman wording (src/shell/audio-truth.js audioTruthDetail)`);
  const e = clips[0];
  const at = (voice, congregation) => createAudio({ settings: { voice, congregation }, manifest: all, AudioCtor: class {}, speech: null }).status(e.kind, e.id);
  assert.equal(at('m', 'israeli').source, 'file', 'Man + Israeli plays a clip');
  for (const [v, c] of [['f', 'israeli'], ['m', 'sephardi'], ['m', 'ashkenazi'], ['f', 'sephardi']]) assert.notEqual(at(v, c).source, 'file', `${v}/${c} has no clip`);
  // the words: count read from the summary, Man (Ari) named, no "does not change the sound yet"
  const d = audioTruthDetail(summary);
  assert.ok(d.includes(`All ${summary.tts.toLocaleString('en-US')} use the Man (Ari) voice`), d);
  assert.match(d, /only for Man with the Israeli style/);
  assert.match(d, /device voice.*never changed by it/);
  for (const text of [plain('settingsIntro'), d, read('src/shell/how.view.js')]) {
    assert.doesNotMatch(text, /does not change the sound yet|saved for later|cannot change it yet/);
  }
  assert.match(plain('settingsIntro'), /never changes your device voice/);
});
