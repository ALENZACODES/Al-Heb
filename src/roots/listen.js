// Listen button for one pointed Hebrew form: plays a clip only when the app has a file for exactly that form, in the learner's voice
// and tradition (the Dictionary's lookup and player checks). Shared by the roots page and the look-alike words page.
// ctx extras for tests: ctx.clipLookup. `isAlive` lets a view stop late updates after it is closed.
import { el } from '../curriculum/dom.js';
import { isAudioFree } from '../shell/audiofree.js';
import { loadJson } from '../speak/loader.js';
import { lookupClip, alternateClip, planIsExactFile, clipCaption, unavailableLine, CHECKING } from '../vocab/clips.js';

export function createListen(ctx, isAlive = () => true) {
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  let clipLookup = ctx?.clipLookup || null, clipPromise = null;
  const ensureClips = () => {
    if (clipLookup || !ctx?.audio) return Promise.resolve(clipLookup);
    if (!clipPromise) clipPromise = loadJson('data/vocab/clip-lookup.json').then((j) => { clipLookup = j; return j; }).catch(() => { clipPromise = null; return null; });
    return clipPromise;
  };
  const voice = () => { const v = ctx?.settings?.get?.('voice'); return v === 'm' ? 'm' : 'f'; };
  const trad = () => { const c = ctx?.settings?.get?.('congregation'); return ['israeli', 'sephardi', 'ashkenazi'].includes(c) ? c : 'israeli'; };
  let dictAudio = null;
  const loadDictionaryAudio = () => {
    if (!dictAudio) dictAudio = loadJson('data/vocab/audio-dictionary.json').then((list) => { ctx.audio?.extend?.(list); return true; }).catch(() => { dictAudio = null; return false; });
    return dictAudio;
  };
  function listen(he, name) {
    if (isAudioFree(ctx) || !ctx?.audio) return null;
    const cell = el('span', { class: 'rt-audio', 'data-audio-state': 'checking' }, 'Checking audio...');
    ensureClips().then(() => {
      if (!isAlive()) return;
      const v = voice(), t = trad();
      const clip = clipLookup && (lookupClip(clipLookup, he, v, t) || alternateClip(clipLookup, he, v, t));
      if (!clip) { cell.replaceChildren('No clip for this form.'); cell.setAttribute?.('data-audio-state', 'none'); return; }
      const note = el('span', { class: 'muted' }, clipCaption(clip));
      const play = async () => {
        const want = { voice: clip.voice, tradition: clip.tradition, id: clip.id }, opts = { voice: clip.voice, tradition: clip.tradition, allowMismatchedTts: false };
        try {
          if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest();
          let plan = ctx.audio.status?.(clip.kind, clip.id, opts);
          if (plan?.reason === CHECKING && ctx.audio.ensureManifest) { await ctx.audio.ensureManifest(); plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want) && String(clip.id).startsWith('dict-')) { await loadDictionaryAudio(); plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want) && typeof globalThis.alefShards?.load === 'function') { try { await globalThis.alefShards.load(); } catch { /* honest line below */ } plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want)) { note.textContent = unavailableLine(clip.voice, clip.tradition); return; }
          try { ctx.audio.stop?.(); } catch { /* ignore */ }
          const r = await ctx.audio.play(clip.kind, clip.id, { ...opts, rate: 'normal' });
          if (!r || r.source === 'none' || r.fileError) note.textContent = unavailableLine(clip.voice, clip.tradition);
        } catch { note.textContent = unavailableLine(clip.voice, clip.tradition); }
      };
      cell.setAttribute?.('data-audio-state', 'file');
      cell.replaceChildren(btn('Listen', play, { class: 'btn secondary', 'aria-label': `Listen: ${name}`, 'data-audio': `${clip.kind}/${clip.id}` }), ' ', note);
    });
    return cell;
  }
  return listen;
}
