// Thin wrappers around three browser APIs used by "Say it". Every constructor is injectable so tests run in Node.
// Nothing starts until the learner presses a button; nothing is uploaded by ALEF. The browser's SpeechRecognition may itself
// send audio to the browser vendor's servers (Chromium does); the screen says so before the first use.
// ALEF has not measured how well any browser recognizer hears Hebrew: treat its text as a hint.

const g = () => /** @type {any} */ (globalThis);

/**
 * SpeechRecognition (lang he-IL, one utterance, up to `maxAlternatives` candidates).
 * listen() resolves {ok:true, alternatives:string[]} or {ok:false, error:'no-speech'|'not-allowed'|'network'|'audio-capture'|'aborted'|'timeout'|'unsupported'|string}.
 */
export function createRecognizer(o = {}) {
  const Ctor = o.Ctor !== undefined ? o.Ctor : (g().SpeechRecognition || g().webkitSpeechRecognition);
  const lang = o.lang || 'he-IL', maxAlternatives = o.maxAlternatives || 5, timeoutMs = o.timeoutMs || 10000;
  const setT = o.setTimeout || ((f, ms) => g().setTimeout(f, ms)), clearT = o.clearTimeout || ((h) => g().clearTimeout(h));
  let rec = null, finish = null;
  function listen() {
    if (!Ctor) return Promise.resolve({ ok: false, error: 'unsupported' });
    if (rec) stop();
    return new Promise((resolve) => {
      let done = false, timer = null, alternatives = [];
      const end = (r) => { if (done) return; done = true; if (timer != null) clearT(timer); rec = null; finish = null; resolve(r); };
      let r;
      try { r = new Ctor(); } catch (e) { return end({ ok: false, error: 'unsupported' }); }
      rec = r; finish = end;
      try { r.lang = lang; r.continuous = false; r.interimResults = false; r.maxAlternatives = maxAlternatives; } catch { /* read-only in some fakes */ }
      r.onresult = (ev) => {
        try {
          const res = ev?.results?.[0];
          const list = [];
          const n = res?.length ?? 0;
          for (let i = 0; i < n; i++) { const t = res[i]?.transcript; if (typeof t === 'string' && t.trim()) list.push(t.trim()); }
          alternatives = list;
        } catch { /* ignore */ }
        end({ ok: alternatives.length > 0, alternatives, error: alternatives.length ? undefined : 'no-speech' });
      };
      r.onerror = (ev) => end({ ok: false, error: String(ev?.error || 'error'), alternatives: [] });
      r.onend = () => end({ ok: alternatives.length > 0, alternatives, error: alternatives.length ? undefined : 'no-speech' });
      timer = setT(() => { try { r.abort?.(); } catch { /* ignore */ } end({ ok: false, error: 'timeout', alternatives: [] }); }, timeoutMs);
      try { r.start(); } catch (e) { end({ ok: false, error: 'start-failed', alternatives: [] }); }
    });
  }
  function stop() { const r = rec, f = finish; if (r) { try { r.abort?.(); } catch { /* ignore */ } } if (f) f({ ok: false, error: 'aborted', alternatives: [] }); }
  return { supported: !!Ctor, listen, stop, get listening() { return !!rec; } };
}

/**
 * MediaRecorder: record the microphone for up to `maxMs`, then give back an object URL for playback. Stays in memory; dispose() revokes it.
 * start() resolves when recording is running; stop() resolves {ok, url, ms} (or {ok:false, error}).
 */
export function createRecorder(o = {}) {
  const MR = o.MediaRecorderCtor !== undefined ? o.MediaRecorderCtor : g().MediaRecorder;
  const gum = o.getUserMedia !== undefined ? o.getUserMedia : (g().navigator?.mediaDevices?.getUserMedia ? (c) => g().navigator.mediaDevices.getUserMedia(c) : null);
  const URLImpl = o.URL || g().URL;
  const maxMs = o.maxMs || 6000;
  const setT = o.setTimeout || ((f, ms) => g().setTimeout(f, ms)), clearT = o.clearTimeout || ((h) => g().clearTimeout(h));
  const now = o.now || (() => Date.now());
  let mr = null, stream = null, chunks = [], urls = [], startedAt = 0, timer = null, stopping = null;
  const supported = !!(MR && gum);
  async function start() {
    if (!supported) return { ok: false, error: 'unsupported' };
    if (mr) await stop();
    try { stream = await gum({ audio: true }); } catch (e) { return { ok: false, error: e?.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture' }; }
    try { mr = new MR(stream); } catch { release(); return { ok: false, error: 'unsupported' }; }
    chunks = []; startedAt = now();
    mr.ondataavailable = (ev) => { if (ev?.data) chunks.push(ev.data); };
    try { mr.start(); } catch { release(); return { ok: false, error: 'start-failed' }; }
    timer = setT(() => { stop(); }, maxMs);
    return { ok: true };
  }
  function release() { try { for (const t of stream?.getTracks?.() || []) t.stop?.(); } catch { /* ignore */ } stream = null; mr = null; if (timer != null) { clearT(timer); timer = null; } }
  function stop() {
    if (!mr) return Promise.resolve({ ok: false, error: 'not-recording' });
    if (stopping) return stopping;
    const r = mr;
    stopping = new Promise((resolve) => {
      r.onstop = () => {
        const ms = now() - startedAt;
        let url = null;
        try { const Blob = o.BlobCtor || g().Blob; const blob = Blob ? new Blob(chunks, { type: r.mimeType || 'audio/webm' }) : null; url = blob && URLImpl?.createObjectURL ? URLImpl.createObjectURL(blob) : null; if (url) urls.push(url); } catch { url = null; }
        release(); stopping = null;
        resolve(url ? { ok: true, url, ms } : { ok: false, error: 'no-data', ms });
      };
      try { r.stop(); } catch { release(); stopping = null; resolve({ ok: false, error: 'stop-failed' }); }
    });
    return stopping;
  }
  function dispose() { if (mr) { try { mr.stop(); } catch { /* ignore */ } } release(); for (const u of urls) { try { URLImpl?.revokeObjectURL?.(u); } catch { /* ignore */ } } urls = []; }
  return { supported, start, stop, dispose, get recording() { return !!mr; } };
}

/**
 * Browser text-to-speech for the model pronunciation when no clip exists (lang he-IL). Not a recording; gender and accent are the
 * device's. speak() resolves {ok} or {ok:false, error}.
 */
export function createSpeaker(o = {}) {
  const synth = o.synth !== undefined ? o.synth : g().speechSynthesis;
  const U = o.UtteranceCtor !== undefined ? o.UtteranceCtor : g().SpeechSynthesisUtterance;
  const supported = !!(synth && U);
  function speak(text, { rate } = {}) {
    if (!supported) return Promise.resolve({ ok: false, error: 'no-speech-synthesis' });
    return new Promise((resolve) => {
      let u;
      try { u = new U(String(text)); } catch { return resolve({ ok: false, error: 'speech-threw' }); }
      u.lang = 'he-IL'; if (typeof rate === 'number') u.rate = rate;
      u.onend = () => resolve({ ok: true });
      u.onerror = (ev) => resolve({ ok: false, error: ev?.error || 'speech-error' });
      try { synth.cancel?.(); synth.speak(u); } catch { resolve({ ok: false, error: 'speech-threw' }); }
    });
  }
  return { supported, speak, cancel: () => { try { synth?.cancel?.(); } catch { /* ignore */ } } };
}
