import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio/player.js';
import { audioAccess, deviceVoiceState, bannerText, mountAudioBanner, audioButton, DEVICE_LABEL, NO_AUDIO } from '../src/shell/audio-access.js';

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
  assert.match(bannerText({ recorded: 0 }, 'no'), /no recorded teacher clips yet.*no Hebrew voice.*respelling/s);
  assert.match(bannerText({ recorded: 0 }, 'yes'), /device voice, not a recorded teacher, and Israeli-style only/);
  assert.ok(!/sephardi|ashkenazi/i.test(bannerText({ recorded: 0 }, 'yes')));
});
// tiny DOM fake for audioButton / banner
const h = (tag, attrs = {}, ...kids) => ({ tag, attrs, kids, textContent: kids.filter((k) => typeof k === 'string').join(''), remove() { this.removed = true; } });
test('audioButton: none -> text only with respelling; device -> button', () => {
  const none = audioButton(h, { audio: mk(null) }, { kind: 'word', id: 'bayit', respelling: 'BAH-yeet' });
  assert.equal(none.tag, 'span'); assert.match(none.kids.join(''), new RegExp(NO_AUDIO)); assert.match(none.kids.join(''), /BAH-yeet/);
  const dev = audioButton(h, { audio: mk(speech([{ lang: 'he-IL' }])) }, { kind: 'word', id: 'bayit' });
  assert.equal(dev.kids[0].tag, 'button'); assert.equal(dev.kids[0].attrs['data-audio-state'], 'device');
});
test('banner shows once', () => {
  const store = {}; const host = { after(n) { host.n = n; } };
  const doc = { querySelector: () => host };
  const st = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const n = mountAudioBanner(h, { summary: { recorded: 0 } }, { doc, storage: st, speech: null, Utt: null });
  assert.ok(n);
  n.kids.at(-1).attrs.onclick(); assert.ok(n.removed);
  assert.equal(mountAudioBanner(h, {}, { doc, storage: st }), null);
});
