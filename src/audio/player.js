// @ts-check
import { speechSafeText } from '../shell/names.js';
// ALEF audio player. Resolution order for play(kind, id):
//   1. exact file (same voice + tradition) whose manifest status is not "missing"
//   2. same voice, OTHER tradition, only if the manifest entry lists it in `equivalentTo`
//   3. Web Speech API (speechSynthesis, he-IL) speaking the pointed text
//   4. nothing
// Ids: a word clip may be asked for under its lesson-word id (r01-w1) or its vocabulary id (h842147e5, data/vocab/words.json).
// Manifest word entries carry `vocabId` (lesson-word entries whose pointed text maps to one vocab entry, see
// data/curriculum/word-vocab-map.json). The player links the two ids both ways and, for steps 1-2, tries the requested id
// first, then every linked id (same kind, same voice and tradition). An exact-id file always wins over a linked one.
// A man voice is never swapped for a woman voice by the file logic. The Web Speech fallback cannot
// guarantee gender or tradition (browser voices expose neither); results say so via `voiceGuaranteed`.
// Results always carry `source`: 'file' | 'tts-fallback' | 'none'.

/** A speechSynthesis voice that is actually Hebrew, or null. An empty list is null, not "try the default voice". */
export function hebrewSynthesisVoice(speech) {
  if (!speech || typeof speech.getVoices !== 'function') return null;
  let voices;
  try { voices = speech.getVoices(); } catch { return null; }
  if (!Array.isArray(voices)) return null;
  return voices.find((v) => /^he([-_]|$)/i.test(String(v?.lang || ''))) || null;
}

/** Must stay identical to normalizeId in tools/audio/hebrew_data.mjs (a test checks this). */
export function normalizeId(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

const VOICES = ['m', 'f'];
const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];

/**
 * @param {{
 *  settings: {voice?: string, congregation?: string, ttsRate?: number},
 *  manifest: Array<any>, basePath?: string,
 *  AudioCtor?: any, speech?: any, UtteranceCtor?: any,
 *  wait?: (ms:number)=>Promise<void>,
 *  allowMismatchedTts?: boolean
 * }} opts
 */
export function createAudio(opts) {
  const { settings, manifest, basePath = '' } = opts;
  const g = /** @type {any} */ (globalThis);
  const AudioCtor = opts.AudioCtor || g.Audio;
  const speech = opts.speech !== undefined ? opts.speech : g.speechSynthesis;
  const UtteranceCtor = opts.UtteranceCtor || g.SpeechSynthesisUtterance;
  const wait = opts.wait || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const allowMismatchedTts = !!opts.allowMismatchedTts;

  const index = new Map();
  const textBy = new Map();
  // Items marked scope:'israeli-only' (survival phrasebook, mnemonic anchor words) exist only in the israeli tradition:
  // they are conversational Modern Hebrew, so the learner's congregation setting must not change how they sound.
  const israeliOnly = new Set();
  const addEntries = (list) => { for (const e of list) {
    if (e.scope === 'israeli-only') israeliOnly.add(`${e.kind}|${e.id}`);
    index.set(`${e.voice}|${e.tradition}|${e.kind}|${e.id}`, e);
    if (!textBy.has(`${e.kind}|${e.id}`) && e.text) textBy.set(`${e.kind}|${e.id}`, e.text);
  } };
  addEntries(manifest);
  // kind|id -> Set of kind|id linked to it (lesson-word id <-> vocab id); built from entries' `vocabId`.
  const links = new Map();
  const link = (a, b) => {
    if (a === b) return;
    if (!links.has(a)) links.set(a, new Set());
    if (!links.has(b)) links.set(b, new Set());
    links.get(a).add(b); links.get(b).add(a);
  };
  const addLinks = (list) => { for (const e of list) if (e.vocabId) link(`${e.kind}|${e.id}`, `${e.kind}|${normalizeId(e.vocabId)}`); };
  addLinks(manifest);
  /** The requested id first, then every id reachable through the links (so two lesson words sharing one vocab id also meet). */
  function candidates(kind, id) {
    const out = [id]; const seenIds = new Set([`${kind}|${id}`]); const queue = [`${kind}|${id}`];
    while (queue.length) {
      for (const n of links.get(queue.shift()) || []) {
        if (seenIds.has(n)) continue;
        seenIds.add(n); queue.push(n); out.push(n.slice(kind.length + 1));
      }
    }
    return out;
  }

  let current = null;     // {audio} currently playing
  let stopped = 0;        // generation counter for cancelling sequences

  const url = (p) => (basePath ? basePath.replace(/\/+$/, '') + '/' : '') + p.replace(/^\/+/, '');

  function context(o = {}) {
    const voice = o.voice || settings.voice;
    const tradition = o.tradition || settings.congregation || 'israeli';
    return { voice, tradition };
  }

  /** File step for ONE id: exact, then alias, then equivalent tradition. Returns a partial plan or null. */
  function fileFor(voice, tradition, kind, id) {
    const exact = index.get(`${voice}|${tradition}|${kind}|${id}`);
    if (exact && exact.status !== 'missing') {
      return { source: 'file', path: exact.path, url: url(exact.path), entryStatus: exact.status, entrySource: exact.source, via: 'exact' };
    }
    // alias (e.g. a one-line 'prayer' record is the same clip as its 'line'): only when the target file exists
    if (exact && exact.aliasOf) {
      const [ak, ...rest] = String(exact.aliasOf).split('/');
      const target = index.get(`${voice}|${tradition}|${ak}|${rest.join('/')}`);
      if (target && target.status !== 'missing') {
        return { source: 'file', path: target.path, url: url(target.path), entryStatus: target.status, entrySource: target.source, via: 'alias' };
      }
    }
    if (exact && Array.isArray(exact.equivalentTo)) {
      for (const t of exact.equivalentTo) {
        const alt = index.get(`${voice}|${t}|${kind}|${id}`);
        if (alt && alt.status !== 'missing') {
          return { source: 'file', path: alt.path, url: url(alt.path), fileTradition: t, entryStatus: alt.status, entrySource: alt.source, via: 'equivalent' };
        }
      }
    }
    return null;
  }

  /** Decide the source without playing. */
  function plan(kind, rawId, o = {}) {
    const id = normalizeId(rawId);
    const ctxt = context(o);
    const { voice } = ctxt;
    let tradition = ctxt.tradition;
    if (TRADITIONS.includes(tradition) && israeliOnly.has(`${kind}|${id}`)) tradition = 'israeli';
    if (!VOICES.includes(voice)) return { source: 'none', reason: 'invalid-voice', kind, id, voice, tradition };
    if (!TRADITIONS.includes(tradition)) return { source: 'none', reason: 'invalid-tradition', kind, id, voice, tradition };
    const exact = index.get(`${voice}|${tradition}|${kind}|${id}`);
    // Same-tradition files (exact, alias) under any linked id beat another tradition's file under the requested id.
    let stand = null;
    for (const cid of candidates(kind, id)) {
      const hit = fileFor(voice, tradition, kind, cid);
      if (!hit) continue;
      const found = { ...hit, kind, id, voice, tradition, ...(cid !== id ? { viaId: cid } : {}) };
      if (hit.via !== 'equivalent') return found;
      if (!stand) stand = found;
    }
    if (stand) return stand;
    const text = (exact && exact.text) || textBy.get(`${kind}|${id}`) || (typeof o.text === 'string' && o.text.trim() ? o.text : '');
    if (!text) return { source: 'none', reason: 'unknown-item', kind, id, voice, tradition };
    const safe = speechSafeText(text);
    if (!safe.ok) return { source: 'none', reason: safe.reason || 'unresolved-liturgical-name', kind, id, voice, tradition, text };
    if (!speech || !UtteranceCtor) return { source: 'none', reason: 'no-speech-synthesis', kind, id, voice, tradition };
    if (tradition !== 'israeli' && !allowMismatchedTts && !o.allowMismatchedTts) {
      // Web Speech reads Modern Israeli Hebrew only; do not present it as sephardi/ashkenazi audio.
      return { source: 'none', reason: 'tts-pronunciation-mismatch', kind, id, voice, tradition, text };
    }
    if (noHebrewVoice()) return { source: 'none', reason: 'no-hebrew-browser-voice', kind, id, voice, tradition, text };
    return {
      source: 'tts-fallback', text: safe.text, kind, id, voice, tradition,
      voiceGuaranteed: false, // browser voice gender/tradition cannot be selected reliably
      mismatch: tradition !== 'israeli',
    };
  }

  /** A listed voice whose language tag is Hebrew. Anything else, including an empty list, is not proof of Hebrew. */
  function hebrewVoice() { return hebrewSynthesisVoice(speech); }

  /**
   * True when this browser must not speak.
   * An empty voice list used to count as "unknown" and the default system voice then read Hebrew in Dutch, English, or Arabic.
   * No getVoices function stays unknown at plan time; speak() still refuses to talk.
   */
  function noHebrewVoice() {
    if (!speech || typeof speech.getVoices !== 'function') return false;
    return !hebrewVoice();
  }

  function playFile(p) {
    return new Promise((resolve) => {
      let a;
      try { a = new AudioCtor(p.url); } catch (e) { resolve({ ok: false, error: String(e) }); return; }
      current = { stop: () => { try { a.pause(); } catch { /* ignore */ } resolve({ ok: true, stopped: true }); } };
      a.onended = () => resolve({ ok: true });
      a.onerror = () => resolve({ ok: false, error: 'file-error' });
      try {
        const r = a.play();
        if (r && typeof r.catch === 'function') r.catch(() => resolve({ ok: false, error: 'play-rejected' }));
      } catch { resolve({ ok: false, error: 'play-threw' }); }
    });
  }

  function speak(p) {
    return new Promise((resolve) => {
      const safe = speechSafeText(p.text);
      if (!safe.ok) { resolve({ ok: false, error: safe.reason || 'unresolved-liturgical-name' }); return; }
      const voice = hebrewVoice();
      // lang="he-IL" alone does not choose the voice. A Dutch or English default will still speak.
      if (!voice) { resolve({ ok: false, error: 'no-hebrew-browser-voice' }); return; }
      const u = new UtteranceCtor(safe.text);
      u.lang = /^he([-_]|$)/i.test(voice.lang || '') ? voice.lang : 'he-IL';
      try { u.voice = voice; } catch { /* a fake utterance may be frozen */ }
      if (typeof settings.ttsRate === 'number') u.rate = settings.ttsRate;
      current = { stop: () => { try { speech.cancel(); } catch { /* ignore */ } resolve({ ok: true, stopped: true }); } };
      u.onend = () => resolve({ ok: true });
      u.onerror = () => resolve({ ok: false, error: 'speech-error' });
      try { speech.speak(u); } catch { resolve({ ok: false, error: 'speech-threw' }); }
    });
  }

  async function play(kind, id, o = {}) {
    let p = plan(kind, id, o);
    if (p.source === 'file') {
      if (!AudioCtor) {
        p = { ...planWithoutFile(kind, id, o), reason: 'no-audio-support' };
      } else {
        const r = await playFile(p);
        current = null;
        if (r.ok) return p;
        // file failed to load: fall through to TTS, and say so
        const alt = planWithoutFile(kind, id, o);
        return { ...alt, reason: alt.reason || r.error, fileError: r.error, triedPath: p.path, ...(alt.source === 'tts-fallback' ? await speakResult(alt) : {}) };
      }
    }
    if (p.source === 'tts-fallback') { const r = await speakResult(p); return { ...p, ...r }; }
    return p;
  }

  async function speakResult(p) {
    const r = await speak(p);
    current = null;
    return r.ok ? {} : { source: 'none', reason: r.error };
  }

  function planWithoutFile(kind, rawId, o) {
    const id = normalizeId(rawId);
    const c2 = context(o);
    const { voice } = c2;
    const tradition = israeliOnly.has(`${kind}|${id}`) ? 'israeli' : c2.tradition;
    const text = textBy.get(`${kind}|${id}`) || (typeof o.text === 'string' && o.text.trim() ? o.text : '');
    if (!text) return { source: 'none', reason: 'unknown-item', kind, id, voice, tradition };
    const safe = speechSafeText(text);
    if (!safe.ok) return { source: 'none', reason: safe.reason || 'unresolved-liturgical-name', kind, id, voice, tradition, text };
    if (!speech || !UtteranceCtor) return { source: 'none', reason: 'no-speech-synthesis', kind, id, voice, tradition };
    if (tradition !== 'israeli' && !allowMismatchedTts && !o.allowMismatchedTts) return { source: 'none', reason: 'tts-pronunciation-mismatch', kind, id, voice, tradition, text };
    if (noHebrewVoice()) return { source: 'none', reason: 'no-hebrew-browser-voice', kind, id, voice, tradition, text };
    return { source: 'tts-fallback', text: safe.text, kind, id, voice, tradition, voiceGuaranteed: false, mismatch: tradition !== 'israeli' };
  }

  /** @param {Array<{kind:string,id:string,voice?:string,tradition?:string}|[string,string]>} items */
  async function playSequence(items, { gapMs = 250 } = {}) {
    const gen = ++stopped;
    const results = [];
    for (let i = 0; i < items.length; i++) {
      if (gen !== stopped) break;
      const it = Array.isArray(items[i]) ? { kind: items[i][0], id: items[i][1] } : items[i];
      results.push(await play(it.kind, it.id, it));
      if (gen !== stopped) break;
      if (i < items.length - 1 && gapMs > 0) await wait(gapMs);
    }
    return results;
  }

  function stop() {
    stopped++;
    if (current) { const c = current; current = null; c.stop(); }
    if (speech && typeof speech.cancel === 'function') { try { speech.cancel(); } catch { /* ignore */ } }
  }

  return {
    play,
    playSequence,
    stop,
    /** true only when a real recorded/rendered file would be used (never for TTS fallback). */
    has: (kind, id, o) => plan(kind, id, o).source === 'file',
    /** what play() would use right now, without playing. */
    status: (kind, id, o) => plan(kind, id, o),
    /** add entries after creation (the lazily loaded data/audio/manifest-words-<tradition>.json shards). Safe to call repeatedly. */
    extend: (entries) => { addEntries(entries || []); addLinks(entries || []); },
  };
}
