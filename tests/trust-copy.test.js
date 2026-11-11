// Trust copy: each statement about pictures, the device voice and the Man/Woman choice is checked against the shipped data, so it
// cannot drift into a claim the app does not keep (found by the learner review and the journey QA, 2026-11-05).
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAudio } from '../src/audio/player.js';
import { audioTruthDetail } from '../src/shell/audio-truth.js';
import { readinessLines, loadReadinessFacts } from '../src/shell/readiness.js';
import { audioSupport } from '../src/pronunciation/forTradition.js';
import { plain } from '../src/shell/plain-copy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const summary = json('data/audio/summary.json');
const listOf = (m) => (Array.isArray(m) ? m : (m.entries || m.clips || Object.values(m)));
const all = [json('data/audio/manifest.json'), json('data/audio/manifest-kind-word.json'), ...['israeli', 'sephardi', 'ashkenazi'].map((t) => json(`data/audio/manifest-words-${t}.json`))].flatMap(listOf);
const clips = all.filter((e) => e.status !== 'missing' && e.status !== 'plays-israeli'); // plays-israeli rows have no file of their own

test('About: pictures line does not deny the pictures that are shown; the count is read from data/letters/memory-chain.json', async () => {
  const chain = json('data/letters/memory-chain.json');
  const n = chain.letters.filter((l) => l.picture && l.picture.svg).length;
  assert.ok(n > 0);
  for (const l of chain.letters) assert.ok(existsSync(join(root, l.picture.svg)), `${l.id} picture file ships in the repo`);
  const facts = await loadReadinessFacts(async (u) => ({ ok: true, json: async () => json(u) }));
  assert.equal(facts.memoryPictures, n);
  const text = readinessLines(facts).find((l) => l.id === 'images').text;
  const approved = Object.values(json('data/images/approvals.json').approvals).filter(a => a?.status === 'approved').length;
  assert.ok(approved > 0);
  assert.equal(facts.images.approved, approved);
  assert.ok(text.includes(`${approved} approvals`), text);
  assert.doesNotMatch(text, /none approved yet/);
  assert.ok(text.includes(`the ${n} letter memory pictures are drawings made for this app and are shown as unreviewed drafts`), text);
  assert.equal(facts.images.shown, approved, 'each approved picture is indexed and available');
  assert.ok(text.includes(`${approved} shown`), text);
  // without the memory-chain file the line stays true and carries no number
  const bare = readinessLines({ imagesApproved: 0 }).find((l) => l.id === 'images').text;
  assert.ok(/the letter memory pictures are drawings/.test(bare) && !/\d/.test(bare));
});

test('device-voice line: never says the learner chose it (it is on by default); still says what it will sound like', () => {
  const a = audioSupport('ashkenazi', { browserVoiceAnyway: true });
  assert.equal(a.supported, 'device-mismatch');
  assert.doesNotMatch(a.line, /you chose/i);
  assert.match(a.line, /No Ashkenazi audio yet\. The device voice is on: it speaks Israeli Hebrew, so it will not sound Ashkenazi\./);
  const sep = audioSupport('sephardi', { browserVoiceAnyway: true });
  assert.equal(sep.supported, 'device'); assert.doesNotMatch(sep.line, /you chose|will not sound/i); assert.match(sep.line, /Sephardi clip is in the audio bank/);
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
  assert.ok(['tts', 'synthetic-unreviewed'].includes(house.status), `a synthetic status that no human reviewed, got ${house.status}`);
  const at = (voice, congregation, id) => createAudio({ settings: { voice, congregation }, manifest: all, AudioCtor: class {}, speech: null }).status('word', id);
  const fSep = at('f', 'sephardi', 'h9c8ddecf');
  assert.equal(fSep.source, 'file', 'Woman + Sephardi plays a clip');
  if (fSep.fileTradition === 'israeli') assert.match(fSep.path, /audio\/f\/israeli\//);
  else { assert.equal(fSep.fileTradition, undefined); assert.match(fSep.path, /audio\/f\/sephardi\//); }
  const mSep = at('m', 'sephardi', 'h9c8ddecf');
  assert.equal(mSep.source, 'file', 'Man + Sephardi plays a clip');
  assert.match(mSep.path, mSep.fileTradition === 'israeli' ? /audio\/m\/israeli\// : /audio\/m\/sephardi\//);
  assert.equal(at('f', 'israeli', 'h9c8ddecf').source, 'file', 'the Israeli woman house clip stays on its own row');
  const mAsh = at('m', 'ashkenazi', 'h9c8ddecf');
  assert.equal(mAsh.source, 'file', 'Man + Ashkenazi plays a clip');
  assert.match(mAsh.path, mAsh.fileTradition === 'israeli' ? /audio\/m\/israeli\// : /audio\/m\/ashkenazi\//);
  const d = audioTruthDetail(summary);
  assert.match(d, /never swapped for the other voice/);
  assert.match(d, /Sephardi and Ashkenazi settings play the Israeli clip of that voice/);
  assert.match(d, /Israeli style has not been verified/);
  assert.doesNotMatch(d, /native|recorded by|All .* use the Man \(Ari\) voice/i);
  for (const text of [plain('settingsIntro'), d, read('src/shell/how.view.js')]) {
    assert.doesNotMatch(text, /does not change the sound yet|saved for later|cannot change it yet/);
  }
  assert.match(plain('settingsIntro'), /Ari/);
});
