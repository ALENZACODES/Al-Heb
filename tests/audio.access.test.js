import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio/player.js';
import { audioAccess, deviceVoiceState, bannerText, wireSoundBar, soundBarDismissed, audioButton, DEVICE_LABEL, NO_AUDIO } from '../src/shell/audio-access.js';

class Utt { constructor(t) { this.text = t; } }
const speech = (voices) => ({ getVoices: () => voices, speak(u) { queueMicrotask(() => u.onend?.()); }, cancel() {} });
const entry = { path: 'audio/f/israeli/word/bayit.mp3', voice: 'f', tradition: 'israeli', kind: 'word', id: 'bayit', text: 'בַּיִת', status: 'missing' };
const mk = (sp, o = {}) => createAudio({ settings: { voice: 'f', congregation: 'israeli' }, manifest: [entry], AudioCtor: class {}, speech: sp, UtteranceCtor: sp ? Utt : undefined, ...o });

test('no clip, no speech synthesis -> none', () => {
  assert.equal(audioAccess(mk(null), 'word', 'bayit').level, 'none');
  assert.equal(deviceVoiceState(null, null), 'no');
});
test('no clip, browser has only non-Hebrew voices -> none (no dead button)', () => {
  assert.equal(audioAccess(mk(speech([{ lang: 'en-US' }])), 'word', 'bayit').level, 'none');
  assert.equal(deviceVoiceState(speech([{ lang: 'en-US' }]), Utt), 'no');
});
test('no clip, he-IL voice -> device, labelled honestly, never a tradition name', () => {
  const a = audioAccess(mk(speech([{ lang: 'he-IL' }])), 'word', 'bayit');
  assert.equal(a.level, 'device'); assert.equal(a.label, DEVICE_LABEL);
  assert.ok(!/sephardi|ashkenazi/i.test(a.label));
});
test('recorded clip -> file', () => {
  const a = audioAccess(mk(speech([]), { manifest: [{ ...entry, status: 'recorded' }] }), 'word', 'bayit');
  assert.equal(a.level, 'file');
});
test('unknown item and missing engine never throw', () => {
  assert.equal(audioAccess(mk(speech([{ lang: 'he-IL' }])), 'word', 'nope').level, 'none');
  assert.equal(audioAccess(undefined, 'word', 'x').level, 'none');
  assert.equal(audioAccess({ status() { throw new Error('x'); } }, 'word', 'x').level, 'none');
});
test('banner text is honest in each state', () => {
  assert.match(bannerText({ recorded: 0 }, 'no'), /no Hebrew voice.*English-letter spelling/s);
  assert.match(bannerText({ recorded: 0 }, 'yes'), /Israeli pronunciation/);
  assert.ok(!/sephardi|ashkenazi/i.test(bannerText({ recorded: 0 }, 'yes')));
});

// ---- synthetic clips from the local pipeline: label per tradition, never "recorded", device voice stays Israeli-only ----
const synthEntry = (tradition, status = 'synthetic-unreviewed', extra = {}) => ({ path: `audio/f/${tradition}/word/bayit.mp3`, voice: 'f', tradition, kind: 'word', id: 'bayit', text: 'בַּיִת', status,
  source: tradition === 'israeli' ? 'tts-hebrew' : 'tts-respelled', ...extra });
const mkS = (tradition, entries, sp = null) => createAudio({ settings: { voice: 'f', congregation: tradition }, manifest: entries, AudioCtor: class {}, speech: sp, UtteranceCtor: sp ? Utt : undefined });
test('synthetic Ashkenazi / Israeli file: level file, honest per-tradition label, not the recorded label; an older respelled own file is retired', () => {
  const want = {
    ashkenazi: 'Ashkenazi voice',
    israeli: 'Israeli voice',
  };
  // an admitted Ashkenazi clip (the Israeli voice reading the Ashkenazi respelling, owner decision 2026-11-07 22:56) plays as itself
  const own = audioAccess(mkS('ashkenazi', [synthEntry('ashkenazi', 'synthetic-unreviewed', { source: 'tts-respelled-israeli-voice' })]), 'word', 'bayit');
  assert.equal(own.level, 'file'); assert.equal(own.label, want.ashkenazi); assert.ok(!/Recorded by a human/.test(own.label));
  const isr = audioAccess(mkS('israeli', [synthEntry('israeli')]), 'word', 'bayit');
  assert.equal(isr.level, 'file'); assert.equal(isr.label, want.israeli);
  // the older respelled own files (source tts-respelled / paid-cloud) are retired: Sephardi and Ashkenazi play the Israeli file, or nothing
  for (const t of ['sephardi', 'ashkenazi']) {
    assert.equal(audioAccess(mkS(t, [synthEntry(t)]), 'word', 'bayit').level, 'none', t);
    const viaRule = audioAccess(mkS(t, [synthEntry(t), synthEntry('israeli')]), 'word', 'bayit');
    assert.equal(viaRule.level, 'file', t); assert.equal(viaRule.label, want.israeli, 'the label names the file that plays');
  }
});
test('a synthetic clip is never counted or labelled as human, whichever tradition the learner picked', () => {
  // learner set to Ashkenazi, only an Israeli synthetic file exists and a human-approved equivalence allows it: the label names the file's tradition
  const a = audioAccess(mkS('ashkenazi', [synthEntry('ashkenazi', 'missing', { equivalentTo: ['israeli'] }), synthEntry('israeli')]), 'word', 'bayit');
  assert.equal(a.level, 'file'); assert.equal(a.label, 'Israeli voice');
  const human = audioAccess(mkS('ashkenazi', [synthEntry('ashkenazi', 'recorded', { source: 'human:record-kit' })]), 'word', 'bayit');
  assert.equal(human.label, 'Recorded by a human reader');
});
test('device voice stays Israeli-only: an Ashkenazi learner with no clip gets none, even with a he-IL voice; Sephardi plays Israeli by rule, so it may use it', () => {
  const a = audioAccess(mkS('ashkenazi', [{ ...synthEntry('ashkenazi', 'missing') }], speech([{ lang: 'he-IL' }])), 'word', 'bayit');
  assert.equal(a.level, 'none'); assert.equal(a.label, NO_AUDIO);
  assert.equal(audioAccess(mkS('sephardi', [{ ...synthEntry('sephardi', 'missing') }], speech([{ lang: 'he-IL' }])), 'word', 'bayit').label, DEVICE_LABEL);
  assert.equal(audioAccess(mkS('israeli', [synthEntry('israeli', 'missing')], speech([{ lang: 'he-IL' }])), 'word', 'bayit').label, DEVICE_LABEL);
  assert.match(DEVICE_LABEL, /Israeli/);
});
test('audioButton for a synthetic Ashkenazi clip shows the honest label as the chip and in the aria-label', () => {
  const b = audioButton(h, { audio: mkS('ashkenazi', [synthEntry('ashkenazi', 'synthetic-unreviewed', { source: 'tts-respelled-israeli-voice' })]) }, { kind: 'word', id: 'bayit' });
  const label = 'Ashkenazi voice';
  assert.equal(b.kids[0].attrs['data-audio-state'], 'file'); assert.ok(b.kids[0].attrs['aria-label'].includes(label)); assert.equal(b.kids[2].kids[0], label);
});

// tiny DOM fake for audioButton / banner
const h = (tag, attrs = {}, ...kids) => ({ tag, attrs, kids, textContent: kids.filter((k) => typeof k === 'string').join(''), remove() { this.removed = true; } });
test('audioButton: none -> text only with respelling; device -> button', () => {
  const none = audioButton(h, { audio: mk(null) }, { kind: 'word', id: 'bayit', respelling: 'BAH-yeet' });
  assert.equal(none.tag, 'span'); assert.match(none.kids.join(''), new RegExp(NO_AUDIO)); assert.match(none.kids.join(''), /BAH-yeet/);
  const dev = audioButton(h, { audio: mk(speech([{ lang: 'he-IL' }])) }, { kind: 'word', id: 'bayit' });
  assert.equal(dev.kids[0].tag, 'button'); assert.equal(dev.kids[0].attrs['data-audio-state'], 'device');
});
test('one sound bar: Details link, dismiss remembered, focus moves, status comes back when it matters', () => {
  const store = {}; const st = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const x = { listeners: {}, addEventListener(t, f) { this.listeners[t] = f; } }, link = {};
  const bar = { hidden: false, querySelector: (q) => (q === '.sound-bar-x' ? x : q === '.sound-bar-details' ? link : null) };
  const main = { focused: false, focus() { this.focused = true; } };
  const doc = { querySelector: (q) => (q === '.sound-bar' ? bar : null), getElementById: (id) => (id === 'main' ? main : null) };
  const w = wireSoundBar({ summary: { recorded: 0 } }, { doc, storage: st, speech: null, Utt: null });
  assert.ok(w); assert.equal(bar.hidden, false, 'shown until dismissed');
  assert.ok(link.title.length > 0, 'link title carries the notice');
  x.listeners.click();
  assert.equal(bar.hidden, true); assert.equal(main.focused, true, 'focus moves to main, not lost');
  assert.equal(store['alef.audioBannerSeen.v1'], '1', 'dismissal persists'); assert.equal(soundBarDismissed(st), true);
  w.show('none'); assert.equal(bar.hidden, false, 'a problem status (list not loaded) is shown even after dismissal');
  w.show('idle'); assert.equal(bar.hidden, true);
  bar.hidden = false; wireSoundBar({}, { doc, storage: st }); assert.equal(bar.hidden, true, 'stays dismissed on the next visit');
  assert.equal(wireSoundBar({}, { doc: { querySelector: () => null } }), null);
});

// ---- caller text: an item missing from the recording list can still use the device voice with the text the screen shows ----
test('unknown item + caller text -> device; without text it stays none', () => {
  const a = mk(speech([{ lang: 'he-IL' }]));
  assert.equal(audioAccess(a, 'word', 'not-in-list').level, 'none');
  assert.equal(audioAccess(a, 'word', 'not-in-list', { text: 'שָׁלוֹם' }).level, 'device');
  assert.equal(audioAccess(a, 'word', 'not-in-list', { text: '   ' }).level, 'none', 'blank text is not text');
});
test('caller text never beats a file or the manifest text, and stays Israeli-only for the device voice', async () => {
  const spoken = [];
  const sp = { getVoices: () => [{ lang: 'he-IL' }], speak(u) { spoken.push(u.text); queueMicrotask(() => u.onend?.()); }, cancel() {} };
  const a = mk(sp);
  await a.play('word', 'bayit', { text: 'שָׁלוֹם' });
  assert.deepEqual(spoken, ['בַּיִת'], 'manifest text wins over caller text');
  await a.play('word', 'not-in-list', { text: 'שָׁלוֹם' });
  assert.equal(spoken[1], 'שָׁלוֹם');
  const ash = createAudio({ settings: { voice: 'f', congregation: 'ashkenazi' }, manifest: [], AudioCtor: class {}, speech: sp, UtteranceCtor: Utt });
  assert.equal(ash.status('word', 'not-in-list', { text: 'שָׁלוֹם' }).reason, 'tts-pronunciation-mismatch');
});
test('audioButton passes caller text through: a device button for an item missing from the list', () => {
  const ctx = { audio: mk(speech([{ lang: 'he-IL' }])) };
  const without = audioButton(h, ctx, { kind: 'word', id: 'not-in-list', respelling: 'sha-LOM' });
  assert.equal(without.attrs['data-audio-state'], 'none');
  const withText = audioButton(h, ctx, { kind: 'word', id: 'not-in-list', text: 'שָׁלוֹם' });
  assert.equal(withText.kids[0].tag, 'button'); assert.equal(withText.kids[0].attrs['data-audio-state'], 'device');
});
