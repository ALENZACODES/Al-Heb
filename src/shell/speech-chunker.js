// App-wide: long device-voice text is spoken as short pieces (phones cut one long utterance off after ~10-15 s).
export const MAX = 160;

/** Pieces of at most `max` characters, cut at sentence ends, then commas, then spaces. */
export function chunkText(text, max = 160) {
  const out = [];
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return out;
  const sentences = clean.match(/[^.!?;:]+[.!?;:]*["'”’)]*\s*/g) || [clean];
  for (const s0 of sentences) {
    let s = s0.trim();
    while (s.length > max) {
      let cut = Math.max(s.lastIndexOf(', ', max), s.lastIndexOf(' — ', max));
      if (cut < max * 0.4) cut = s.lastIndexOf(' ', max);
      if (cut <= 0) cut = max;
      out.push(s.slice(0, cut + 1).trim());
      s = s.slice(cut + 1).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

const COPY = ['lang', 'voice', 'rate', 'pitch', 'volume'];

/** @param {any} [speech] @param {any} [Utterance] @returns {boolean} true when installed (or already installed) */
export function installSpeechChunker(speech = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance) {
  if (!speech || typeof speech.speak !== 'function' || typeof Utterance !== 'function') return false;
  if (speech.__alefChunked) return true;
  const native = speech.speak.bind(speech);
  const wrapped = (u) => {
    const text = u && typeof u.text === 'string' ? u.text : '';
    if (text.length <= MAX || u.__alefPiece) return native(u);
    const pieces = chunkText(text, MAX);
    if (pieces.length < 2) return native(u);
    pieces.forEach((t, i) => {
      const p = new Utterance(t);
      p.__alefPiece = true;
      for (const k of COPY) { try { if (u[k] !== undefined && u[k] !== null && u[k] !== '') p[k] = u[k]; } catch { /* read-only in some engines */ } }
      if (i === 0) p.onstart = (e) => { try { u.onstart?.(e); } catch { /* ignore */ } };
      if (i === pieces.length - 1) p.onend = (e) => { try { u.onend?.(e); } catch { /* ignore */ } };
      p.onerror = (e) => { try { u.onerror?.(e); } catch { /* ignore */ } };
      native(p);
    });
    return undefined;
  };
  try { speech.speak = wrapped; speech.__alefChunked = true; } catch { return false; }
  return true;
}
