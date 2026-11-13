// @ts-check
// A Listen control for one pointed word, shared by Word by Word and Cross-References (ideas M1, M4). It plays a clip only when the
// app holds a file for that exact pointed spelling, using the Dictionary's lookup and the shared player's checks (the same steps as
// the Roots page). No clip means a plain line saying so; nothing is synthesised and the Name is never passed in by the callers.
import { h } from '../shell/ui.js';
import { isAudioFree } from '../shell/audiofree.js';
import { lookupClip, alternateClip, clipCaption, unavailableLine, planIsExactFile, CHECKING } from '../vocab/clips.js';

const CLIPS = 'data/vocab/clip-lookup.json', DICT_AUDIO = 'data/vocab/audio-dictionary.json';

/** @param {any} ctx @param {(rel: string) => Promise<any>} load @returns {(he: string, name: string) => HTMLElement|null} */
export function clipControls(ctx, load) {
  let lookup = ctx?.clipLookup || null, pending = null, dict = null;
  const ensure = () => {
    if (lookup || !ctx?.audio) return Promise.resolve(lookup);
    if (!pending) pending = load(CLIPS).then((j) => { lookup = j; return j; }).catch(() => { pending = null; return null; });
    return pending;
  };
  const dictAudio = () => { if (!dict) dict = load(DICT_AUDIO).then((list) => { ctx.audio?.extend?.(list); return true; }).catch(() => { dict = null; return false; }); return dict; };
  const voice = () => (ctx?.settings?.get?.('voice') === 'm' ? 'm' : 'f');
  const trad = () => { const c = ctx?.settings?.get?.('congregation'); return ['israeli', 'sephardi', 'ashkenazi'].includes(c) ? c : 'israeli'; };
  return function listen(he, name) {
    if (isAudioFree(ctx) || !ctx?.audio) return null;
    const cell = h('span', { class: 'ws-audio', 'data-audio-state': 'checking' }, 'Checking audio…');
    ensure().then(() => {
      const v = voice(), t = trad();
      const clip = lookup && (lookupClip(lookup, he, v, t) || alternateClip(lookup, he, v, t));
      if (!clip) { cell.replaceChildren('No recording of this word yet.'); cell.setAttribute('data-audio-state', 'none'); return; }
      const note = h('span', { class: 'muted' }, clipCaption(clip));
      const play = async () => {
        const want = { voice: clip.voice, tradition: clip.tradition, id: clip.id }, opts = { voice: clip.voice, tradition: clip.tradition, allowMismatchedTts: false };
        try {
          if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest();
          let plan = ctx.audio.status?.(clip.kind, clip.id, opts);
          if (plan?.reason === CHECKING && ctx.audio.ensureManifest) { await ctx.audio.ensureManifest(); plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want) && String(clip.id).startsWith('dict-')) { await dictAudio(); plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want) && typeof globalThis.alefShards?.load === 'function') { try { await globalThis.alefShards.load(); } catch { /* honest line below */ } plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want)) { note.textContent = unavailableLine(clip.voice, clip.tradition); return; }
          try { ctx.audio.stop?.(); } catch { /* ignore */ }
          const r = await ctx.audio.play(clip.kind, clip.id, { ...opts, rate: 'normal' });
          if (!r || r.source === 'none' || r.fileError) note.textContent = unavailableLine(clip.voice, clip.tradition);
        } catch { note.textContent = unavailableLine(clip.voice, clip.tradition); }
      };
      cell.setAttribute('data-audio-state', 'file');
      cell.replaceChildren(h('button', { type: 'button', class: 'btn secondary', 'aria-label': `Listen: ${name}`, 'data-audio': `${clip.kind}/${clip.id}`, onclick: play }, 'Listen'), ' ', note);
    });
    return cell;
  };
}
