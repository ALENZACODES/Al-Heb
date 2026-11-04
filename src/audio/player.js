// @ts-check
// ALEF audio player. Resolution order for play(kind, id):
//   1. exact file (same voice + tradition) whose manifest status is not "missing"
//   2. same voice, OTHER tradition, only if the manifest entry lists it in `equivalentTo`
//   3. Web Speech API (speechSynthesis, he-IL) speaking the pointed text
//   4. nothing
// A man voice is never swapped for a woman voice by the file logic. The Web Speech fallback cannot
// guarantee gender or tradition (browser voices expose neither); results say so via `voiceGuaranteed`.
// Results always carry `source`: 'file' | 'tts-fallback' | 'none'.

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

  let current = null;     // {audio} currently playing
  let stopped = 0;        // generation counter for cancelling sequences

  const url = (p) => (basePath ? basePath.replace(/\/+$/, '') + '/' : '') + p.replace(/^\/+/, '');

  function context(o = {}) {
    const voice = o.voice || settings.voice;
    const tradition = o.tradition || settings.congregation || 'israeli';
    return { voice, tradition };
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
    if (exact && exact.status !== 'missing') {
      return { source: 'file', path: exact.path, url: url(exact.path), kind, id, voice, tradition, entryStatus: exact.status, via: 'exact' };
    }
    // alias (e.g. a one-line 'prayer' record is the same clip as its 'line'): only when the target file exists
    if (exact && exact.aliasOf) {
      const [ak, ...rest] = String(exact.aliasOf).split('/');
      const target = index.get(`${voice}|${tradition}|${ak}|${rest.join('/')}`);
      if (target && target.status !== 'missing') {
        return { source: 'file', path: target.path, url: url(target.path), kind, id, voice, tradition, entryStatus: target.status, via: 'alias' };
      }
    }
    if (exact && Array.isArray(exact.equivalentTo)) {
      for (const t of exact.equivalentTo) {
        const alt = index.get(`${voice}|${t}|${kind}|${id}`);
        if (alt && alt.status !== 'missing') {
          return { source: 'file', path: alt.path, url: url(alt.path), kind, id, voice, tradition, fileTradition: t, entryStatus: alt.status, via: 'equivalent' };
        }
      }
    }
    const text = (exact && exact.text) || textBy.get(`${kind}|${id}`);
    if (!text) return { source: 'none', reason: 'unknown-item', kind, id, voice, tradition };
    if (!speech || !UtteranceCtor) return { source: 'none', reason: 'no-speech-synthesis', kind, id, voice, tradition };
    if (tradition !== 'israeli' && !allowMismatchedTts && !o.allowMismatchedTts) {
      // Web Speech reads Modern Israeli Hebrew only; do not present it as sephardi/ashkenazi audio.
      return { source: 'none', reason: 'tts-pronunciation-mismatch', kind, id, voice, tradition, text };
    }
    if (typeof speech.getVoices === 'function') {
      const vs = speech.getVoices();
      if (vs && vs.length && !vs.some((v) => /^he([-_]|$)/i.test(v.lang || ''))) {
        return { source: 'none', reason: 'no-hebrew-browser-voice', kind, id, voice, tradition, text };
      }
    }
    return {
      source: 'tts-fallback', text, kind, id, voice, tradition,
      voiceGuaranteed: false, // browser voice gender/tradition cannot be selected reliably
      mismatch: tradition !== 'israeli',
    };
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
      const u = new UtteranceCtor(p.text);
      u.lang = 'he-IL';
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
    const text = textBy.get(`${kind}|${id}`);
    if (!text) return { source: 'none', reason: 'unknown-item', kind, id, voice, tradition };
    if (!speech || !UtteranceCtor) return { source: 'none', reason: 'no-speech-synthesis', kind, id, voice, tradition };
    if (tradition !== 'israeli' && !allowMismatchedTts && !o.allowMismatchedTts) return { source: 'none', reason: 'tts-pronunciation-mismatch', kind, id, voice, tradition, text };
    return { source: 'tts-fallback', text, kind, id, voice, tradition, voiceGuaranteed: false, mismatch: tradition !== 'israeli' };
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
    extend: (entries) => addEntries(entries || []),
  };
}
