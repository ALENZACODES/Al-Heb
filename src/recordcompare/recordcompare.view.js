/**
 * Record and compare (#/record-compare), PREVIEW, DRAFT and UNSCORED. For each minimal pair the learner hears a model voice for each word,
 * records themselves saying each word, plays both recordings back and reports whether they could hear a difference.
 * Recordings live in memory only (MediaRecorder, object URLs); only counts of the learner's own answers are stored (recordcompare.v1).
 * Reuses createRecorder / createSpeaker from src/speak/recognizer.js. ctx extras for tests: ctx.recordCompare = {data, recorder, speaker, makeAudio, tradition}.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { sourcesLine } from '../shell/sources.js';
import { untimedOn } from '../shell/motor.js';
import { isAudioFree, AUDIO_FREE_NOTE, SKIP_NOTE } from '../shell/audiofree.js';
import { mixed } from '../hebrewtext/mixed.js';
import { loadJson } from '../speak/loader.js';
import { createRecorder, createSpeaker } from '../speak/recognizer.js';
import { STORE_KEY, RECORD_MS, ANSWERS, ANSWER_LABEL, HONESTY, PRIVACY, listPairs, contrastsFor, normalizeState, recordAnswer, pickPairs, summaryText, describeError } from './model.js';

export const DRAFT_NOTE = 'Draft and unreviewed: the pairs are made by rule from the word list and no Hebrew teacher has checked them.';
// M-12: this page stays a self-check on purpose. A browser recognizer writes letters without vowel points, so it cannot separate
// most of these pairs (same letters, different points or dagesh); for the rest (alef/ayin, het/khaf) it would pick the more common
// word, not the sound you made. A score here would look objective without being so.
export const NO_SCORE_WHY = 'Why there is no score here: your browser\'s speech recognizer writes Hebrew without vowel points, and in most of these pairs both words have the same letters, so it cannot tell them apart. In the others it would guess the more common word, not judge your sound. For a scored check of whole words and lines, use the Say it page.';
const TRADS = [['israeli', 'Israeli'], ['sephardi', 'Sephardi'], ['ashkenazi', 'Ashkenazi']];

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const inj = ctx?.recordCompare || {};
  const wrap = el('section', { class: 'alef-recordcompare', 'aria-labelledby': 'rc-title' });
  const h1 = el('h1', { id: 'rc-title', tabindex: '-1' }, 'Record and compare');
  const top = el('div', { class: 'rc-top' });
  const body = el('div', { class: 'rc-body' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'rc-status' });
  wrap.append(h1, el('p', { class: 'rc-draft' }, DRAFT_NOTE), el('p', { class: 'rc-honest' }, HONESTY), el('p', { class: 'rc-privacy' }, PRIVACY), el('p', { class: 'rc-noscore' }, NO_SCORE_WHY, ' ', el('a', { href: '#/speak' }, 'Open Say it')), top, body, status, el('footer', {}, sourcesLine(el)));
  root.append(wrap);
  const recorder = inj.recorder || createRecorder({ maxMs: untimedOn(ctx) ? 600000 : RECORD_MS + 10000 }) // the view stops at RECORD_MS itself so it keeps the result; the recorder's own limit is only a backstop;
  const speaker = inj.speaker || createSpeaker();
  const makeAudio = inj.makeAudio || ((url) => (typeof Audio === 'function' ? new Audio(url) : null));
  let alive = true, data = null, st = normalizeState(null), trad = inj.tradition || ctx?.settings?.get?.('congregation') || 'israeli', contrast = 'all', queue = [], idx = 0, round = 0, answered = false;
  /** takes for the current pair: {a:{url,ms}|null, b:...}; recording = 'a'|'b'|null */
  let takes = { a: null, b: null }, recording = null, audioEl = null, autoTimer = null;
  const clearAuto = () => { if (autoTimer != null) { (inj.clearTimeout || clearTimeout)(autoTimer); autoTimer = null; } };
  const say = (t) => { status.textContent = t; };
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  if (!TRADS.some(([k]) => k === trad)) trad = 'israeli';

  function dropTakes() { clearAuto(); takes = { a: null, b: null }; recording = null; try { recorder.dispose?.(); } catch { /* ignore */ } }
  function renderTop() {
    const cs = data ? contrastsFor(data, trad) : [];
    top.replaceChildren(
      el('div', { role: 'group', 'aria-label': 'Reading style' }, ...TRADS.map(([k, label]) => btn(label, () => { trad = k; contrast = 'all'; start(); say(`${label} reading style. Only pairs that sound different in it are offered.`); }, { class: 'btn secondary', 'aria-pressed': String(trad === k) }))),
      el('div', { role: 'group', 'aria-label': 'Sound contrast' }, ...[{ id: 'all', title: 'All', count: null }, ...cs].map((c) => btn(c.count ? `${c.title} (${c.count})` : c.title, () => { contrast = c.id; start(); }, { class: 'btn secondary', 'aria-pressed': String(contrast === c.id) }))));
  }
  function start() {
    dropTakes(); answered = false;
    const list = data ? listPairs(data, trad, contrast) : [];
    queue = pickPairs(list, st, { size: 6, seed: 31 + round }); idx = 0; renderTop(); renderPair();
  }
  async function play(which) {
    const url = takes[which]?.url; if (!url) return;
    try { audioEl?.pause?.(); audioEl = makeAudio(url); await audioEl?.play?.(); } catch { say('Playback did not start. Try the play button again.'); }
  }
  async function toggleRecord(which) {
    if (recording === which) {
      clearAuto();
      const r = await recorder.stop(); recording = null;
      if (r.ok) { takes[which] = { url: r.url, ms: r.ms }; say(`Recorded ${which.toUpperCase()}: ${(r.ms / 1000).toFixed(1)} seconds.`); } else say(describeError(r.error));
      renderPair(); return;
    }
    if (recording) return;
    const r = await recorder.start();
    if (!r.ok) { say(describeError(r.error)); renderPair(); return; }
    recording = which; say(`Recording ${which.toUpperCase()}. Say the word, then press Stop.${untimedOn(ctx) ? ' It does not stop by itself.' : ` It stops by itself after ${RECORD_MS / 1000} seconds.`}`); renderPair();
    if (!untimedOn(ctx)) autoTimer = (inj.setTimeout || setTimeout)(async () => {
      autoTimer = null; if (!alive || recording !== which) return;
      const rr = await recorder.stop(); recording = null;
      if (rr.ok) { takes[which] = { url: rr.url, ms: rr.ms }; say(`Recorded ${which.toUpperCase()}: stopped after ${RECORD_MS / 1000} seconds.`); } else say(describeError(rr.error));
      renderPair();
    }, RECORD_MS);
  }
  async function model(word) { const r = await speaker.speak(word.he, { rate: 0.8 }); if (!r.ok) say('The device voice is not available here, so there is no model to hear.'); }

  function side(label, key, p) {
    const w = p[key], busy = recording === key, other = recording && recording !== key;
    return el('div', { class: 'rc-side', role: 'group', 'aria-label': `Word ${label}` },
      el('p', {}, `Word ${label}: `, heText(w.he, 'alef-he rc-big'), ` (${w.en})`),
      el('p', {}, `Say it: ${w.respelling || ''}`),
      btn(`Hear ${label} (device voice)`, () => model(w)),
      recorder.supported ? btn(busy ? `Stop recording ${label}` : `Record ${label}`, () => toggleRecord(key), { 'aria-pressed': String(busy), disabled: !!other }) : null,
      takes[key] ? btn(`Play my ${label}`, () => play(key)) : null);
  }
  function renderPair() {
    if (!data) return;
    if (isAudioFree(ctx)) { // the whole task is "could you hear a difference": it cannot be done without hearing, so say so and point to the written version
      body.replaceChildren(el('p', { role: 'note' }, AUDIO_FREE_NOTE), el('p', {}, 'This page asks whether you could hear a difference between two words, so it is left out. The same pairs are written out, with the difference described in words, in the Sound-gap lab.'), el('a', { class: 'btn', href: '#/soundgap' }, 'Sound-gap lab (written)'));
      return;
    }
    if (!queue.length) { body.replaceChildren(el('p', {}, 'No pairs for this reading style and contrast. Try another.')); return; }
    if (idx >= queue.length) {
      body.replaceChildren(el('p', {}, 'Round done. ' + summaryText(st)), btn('Another round', () => { round += 1; start(); }));
      return;
    }
    const p = queue[idx], both = recorder.supported ? takes.a && takes.b : true; // no microphone: the question is about the two model words
    const ask = recorder.supported ? 'Could you hear a difference between your two recordings?' : 'Could you hear a difference between the two words?';
    const nodes = [el('p', {}, ...mixed(`Pair ${idx + 1} of ${queue.length}. ${p.contrastTitle}: ${p.feature}.`)), p.heard ? el('p', {}, ...mixed(`In this style: ${p.heard}`)) : null,
      side('A', 'a', p), side('B', 'b', p),
      recorder.supported ? null : el('p', { role: 'note' }, describeError('unsupported'))];
    if (both && !answered) {
      nodes.push(el('div', { role: 'group', 'aria-label': ask }, el('p', {}, recorder.supported ? 'Play your A and your B. Could you hear a difference?' : 'Hear A and B. Could you hear a difference?'),
        ...ANSWERS.map((a) => btn(ANSWER_LABEL[a], () => { st = recordAnswer(st, p.key, a); storeSet(ctx, STORE_KEY, st); answered = true; renderPair(); say('Saved your answer.'); }))));
    }
    if (answered) nodes.push(btn(idx + 1 < queue.length ? 'Next pair' : 'Finish round', () => { dropTakes(); answered = false; idx += 1; renderPair(); }));
    else nodes.push(btn('Skip this pair', () => { dropTakes(); idx += 1; renderPair(); say('Skipped. Nothing was saved for that pair.'); }, { class: 'btn secondary', 'data-act': 'skip' }), el('p', { class: 'muted' }, SKIP_NOTE));
    body.replaceChildren(...nodes.filter(Boolean));
  }

  (async () => {
    try {
      data = inj.data || await loadJson('data/speak/minimal-pairs.json');
      st = normalizeState(await storeGet(ctx, STORE_KEY, null));
      if (alive) start();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The pair list could not be loaded. If you are offline, open this page once while online, or use "Use Aleph offline" in the More menu to download everything. Nothing was lost.')); }
  })();
  return () => { alive = false; try { audioEl?.pause?.(); } catch { /* ignore */ } dropTakes(); wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
