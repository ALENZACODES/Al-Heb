// Word spotlight (B2) with syllable taps (B3): one shared component. Tap a word in any Reading Tools text and it opens here:
// the word large, each letter with its marks shown big and named, the syllables as buttons, and the word's clip at normal or
// slow speed where the app has a clip of that exact pointed spelling. Also shows the word's family letters and verb pattern
// when data/readlab/word-tags.json lists that exact spelling (B7, B8).
// Honesty: the syllable split comes from the app's syllable rules (src/pronunciation/syllables.js, unreviewed); a syllable plays
// only when the app has a clip spelled exactly like it; "slow" is the shared player's slow speed (0.7x), never a separate recording.
// The four-letter name is shown as ה׳ and is never split or voiced here.
import { el, heText } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { isAudioFree } from '../shell/audiofree.js';
import { parseWord } from '../pronunciation/hebrew.js';
import { chipsFor } from '../pronunciation/syllables.js';
import { letterClusters } from '../games/tg-core.js';
import { lookupClip, alternateClip, planIsExactFile, clipCaption, unavailableLine } from '../vocab/clips.js';
import { wordKey, hasDivineName, familyMatch, letterPieces, patternOf } from './words.js';
import { syllableClipId } from './drills.js';

export const FILES = Object.freeze({ niqqud: 'data/pronunciation/niqqud.json', letters: 'data/letters/letters.json', tags: 'data/readlab/word-tags.json', clips: 'data/vocab/clip-lookup.json' });
export const SYLLABLE_NOTE = 'Split by the app\'s syllable rules (draft, not checked by a teacher).';
const loader = (ctx) => (typeof ctx?.readlabLoad === 'function' ? ctx.readlabLoad : loadJSON);
const soft = (p) => Promise.resolve(p).catch(() => null);

/** Names for each letter cluster of a word: letter name, and the vowel, dagesh and shin/sin dot from the app's sign list. */
export function describeClusters(word, letters, niqqud) {
  const L = new Map((letters?.letters || []).map((l) => [l.id, l]));
  const N = new Map((niqqud?.records || []).map((r) => [r.id, r]));
  const parsed = parseWord(word);
  return letterClusters(word).map((c, i) => {
    const p = parsed[i] || {};
    const marks = [];
    if (p.dot) marks.push(N.get(p.dot === 'shin' ? 'shin-dot' : 'sin-dot')?.name || `${p.dot} dot`);
    if (p.dagesh) marks.push(p.id === 'vav' && !p.vowel ? (N.get('shuruk')?.name || 'shuruk') : (N.get('dagesh')?.name || 'dagesh'));
    const v = p.vowel === 'kamatz-katan' ? N.get('kamatz') : p.vowel ? N.get(p.vowel) : null;
    if (v) marks.push(`${v.name}${v.english?.israeli ? `: ${v.english.israeli}` : ''}`);
    return { text: c.text, letter: L.get(p.id)?.name || L.get(String(p.id || '').replace(/-final$/, ''))?.name || '', marks };
  });
}

/** The spotlight as a pure description (tests use it): what the panel shows for one word. */
export function spotlightModel(word, { letters, niqqud, tags } = {}) {
  const raw = String(word ?? '');
  if (hasDivineName(raw)) return { name: true, shown: 'ה׳' };
  const key = wordKey(raw);
  const tag = tags?.tags?.[key] || null;
  const c = chipsFor(key);
  const syllables = c.ok && c.syllables.map((s) => s.he).join('') === key ? c.syllables.map((s) => ({ he: s.he, clip: syllableClipId(s.he) })) : [];
  const hits = tag?.f ? familyMatch(key, tag.f) : null;
  return { name: false, shown: key, clusters: describeClusters(key, letters, niqqud), syllables, tag, family: tag?.f || null, familyHits: hits, pattern: tag?.b ? patternOf(tag.b) : null, binyan: tag?.b || null };
}

/**
 * Open the spotlight for one word inside `host` (replaces its children). Returns a close function.
 * @param {HTMLElement} host @param {any} ctx @param {string} word pointed word as it appears in the text
 * @param {{onClose?:() => void, say?:(t:string) => void}} [o]
 */
export function openSpotlight(host, ctx, word, o = {}) {
  let alive = true;
  const say = o.say || (() => {});
  const close = () => { alive = false; host.replaceChildren(); o.onClose?.(); };
  const btn = (label, onclick, extra = {}) => el('button', { type: 'button', class: 'btn secondary', onclick, ...extra }, label);
  const panel = el('section', { class: 'rl-spot', role: 'region', 'aria-label': 'Word spotlight' });
  host.replaceChildren(panel);
  panel.append(el('p', {}, 'Loading the word...'));
  const load = loader(ctx);
  (async () => {
    const [letters, niqqud, tags] = await Promise.all([soft(load(FILES.letters)), soft(load(FILES.niqqud)), soft(load(FILES.tags))]);
    if (!alive) return;
    const m = spotlightModel(word, { letters, niqqud, tags });
    const head = el('div', { class: 'rl-spot-head' }, el('h2', { tabindex: '-1', class: 'rl-spot-title' }, 'Word Spotlight'), btn('Close', close, { 'aria-label': 'Close the word spotlight' }));
    if (m.name) {
      panel.replaceChildren(head, el('p', { class: 'rl-spot-word' }, heText('ה׳', 'alef-he rl-huge')),
        el('p', {}, 'This is the four-letter name, shown as ה׳. Aleph does not spell it out, split it or play it.'));
      return;
    }
    const kids = [head, el('p', { class: 'rl-spot-word' }, heText(m.shown, 'alef-he rl-huge'))];
    // each letter with its marks, large, and named
    kids.push(el('h3', {}, 'Letters and Vowel Marks'), el('ol', { class: 'rl-clusters', dir: 'rtl' }, ...m.clusters.map((c, i) => el('li', { class: 'rl-cluster' },
      heText(c.text, 'alef-he rl-big'), el('span', { class: 'rl-cl-name', dir: 'ltr', lang: 'en' }, [c.letter || `letter ${i + 1}`, ...c.marks].join('; '))))));
    // syllables
    if (m.syllables.length) {
      const row = el('div', { class: 'rl-syl', dir: 'rtl', role: 'group', 'aria-label': 'Syllables' }, ...m.syllables.map((s, i) => btn(s.he, () => playSyllable(s, i), { class: 'btn secondary rl-chip alef-he', lang: 'he', 'aria-label': `Syllable ${i + 1} of ${m.syllables.length}` })));
      kids.push(el('h3', {}, 'Syllables'), row, el('p', { class: 'muted' }, `${SYLLABLE_NOTE} Tap a syllable to hear it where the app has a clip spelled exactly like it.`));
    } else kids.push(el('h3', {}, 'Syllables'), el('p', { class: 'muted' }, 'The app\'s syllable rules could not split this word cleanly, so no split is shown.'));
    // family letters and verb pattern
    if (m.family || m.pattern) {
      const fam = m.family ? el('p', {}, 'Family letters: ', heText(m.family), m.familyHits ? ' (marked in the word above when you turn on family letters).' : ' (the app could not find all of them in this spelling, so nothing is marked).') : null;
      const pat = m.pattern ? el('p', {}, `Verb pattern: ${m.binyan}.`) : null;
      const link = m.tag?.id ? el('p', {}, el('a', { href: m.pattern ? `#/roots?verb=${encodeURIComponent(m.tag.id)}` : `#/roots?letters=${encodeURIComponent(m.family)}` }, 'Open it on the Roots page')) : null;
      kids.push(el('h3', {}, 'Word Family'), fam, pat, link, el('p', { class: 'muted' }, 'From the app\'s word list (a dictionary source, not checked by a teacher). Matched by exact spelling only.'));
    }
    const audio = el('div', { class: 'rl-audio' });
    kids.push(el('h3', {}, 'Listen'), audio);
    panel.replaceChildren(...kids);
    try { head.querySelector?.('h2')?.focus?.(); } catch { /* ignore */ }
    listenInto(audio, ctx, m.shown, { say, alive: () => alive });
  })();

  async function playSyllable(s, i) {
    if (isAudioFree(ctx)) { say('Sound is off: you chose "I do not use audio".'); return; }
    if (!s.clip) { say(`No clip for syllable ${i + 1} yet.`); return; }
    try {
      if (ctx?.audio?.ensureManifest) await ctx.audio.ensureManifest();
      if (!ctx?.audio?.has?.('syllable', s.clip)) { say(`No clip for syllable ${i + 1} yet.`); return; }
      const r = await ctx.audio.play('syllable', s.clip, { rate: 'normal' });
      say(r && r.source === 'file' ? `Played syllable ${i + 1}.` : `Syllable ${i + 1} could not play.`);
    } catch { say(`Syllable ${i + 1} could not play.`); }
  }

  return close;
}

/**
 * Listen controls for one pointed word: Listen and Listen slowly, only when the app has a clip of that exact spelling.
 * @param {HTMLElement} cell @param {any} ctx @param {string} he @param {{say?:(t:string)=>void, alive?:()=>boolean}} [o]
 */
export function listenInto(cell, ctx, he, o = {}) {
  const say = o.say || (() => {}), aliveNow = o.alive || (() => true);
  const btn = (label, onclick, extra = {}) => el('button', { type: 'button', class: 'btn secondary', onclick, ...extra }, label);
  let dictAudio = null;
  const load = loader(ctx);
  const loadDictionaryAudio = () => {
    if (!dictAudio) dictAudio = Promise.resolve(load('data/vocab/audio-dictionary.json')).then((list) => { ctx.audio?.extend?.(list); return true; }).catch(() => { dictAudio = null; return false; });
    return dictAudio;
  };
  {
    if (isAudioFree(ctx) || !ctx?.audio) { cell.replaceChildren(el('p', { class: 'muted' }, isAudioFree(ctx) ? 'Sound is off: you chose "I do not use audio".' : 'No sound on this device.')); return; }
    cell.replaceChildren(el('p', { class: 'muted' }, 'Checking audio...'));
    soft(load(FILES.clips)).then((lookup) => {
      if (!aliveNow()) return;
      const v = ctx?.settings?.get?.('voice') === 'm' ? 'm' : 'f';
      const c = ctx?.settings?.get?.('congregation');
      const t = ['israeli', 'sephardi', 'ashkenazi'].includes(c) ? c : 'israeli';
      const clip = lookup && (lookupClip(lookup, he, v, t) || alternateClip(lookup, he, v, t));
      if (!clip) { cell.replaceChildren(el('p', {}, 'No clip for this word yet.')); return; }
      const note = el('p', { class: 'muted' }, clipCaption(clip));
      // the same checks as the Roots and Dictionary pages: play only the exact file for this voice and tradition
      const play = async (rate) => {
        const want = { voice: clip.voice, tradition: clip.tradition, id: clip.id }, opts = { voice: clip.voice, tradition: clip.tradition, allowMismatchedTts: false };
        try {
          if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest();
          let plan = ctx.audio.status?.(clip.kind, clip.id, opts);
          if (!planIsExactFile(plan, want) && String(clip.id).startsWith('dict-')) { await loadDictionaryAudio(); plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want) && typeof globalThis.alefShards?.load === 'function') { try { await globalThis.alefShards.load(); } catch { /* honest line below */ } plan = ctx.audio.status?.(clip.kind, clip.id, opts); }
          if (!planIsExactFile(plan, want)) { note.textContent = unavailableLine(clip.voice, clip.tradition); return; }
          try { ctx.audio.stop?.(); } catch { /* ignore */ }
          const r = await ctx.audio.play(clip.kind, clip.id, { ...opts, rate });
          if (!r || r.source === 'none' || r.fileError) note.textContent = unavailableLine(clip.voice, clip.tradition);
          else say(rate === 'slow' ? 'Playing slowly (0.7 times normal speed).' : 'Playing.');
        } catch { note.textContent = unavailableLine(clip.voice, clip.tradition); }
      };
      cell.replaceChildren(el('div', { class: 'rl-row' }, btn('Listen', () => play('normal'), { 'data-audio': `${clip.kind}/${clip.id}` }), btn('Listen slowly', () => play('slow'), { 'data-audio-slow': `${clip.kind}/${clip.id}` })), note);
    });
  }
}

/** A word as a tap target: a button that opens the spotlight. `pieces` (optional) marks family letters. */
export function wordButton(w, onTap, { pieces = null, pattern = null, label = '' } = {}) {
  const inner = pieces ? pieces.map((p) => (p.hit ? el('mark', { class: 'rl-fam' }, p.text) : p.text)) : [w.shown ?? w.text];
  return el('button', { type: 'button', class: `rl-w${pattern ? ` rl-pat ${pattern.cls}` : ''}`, lang: 'he', dir: 'rtl', 'data-word': String(w.index), 'aria-label': label || undefined, onclick: () => onTap(w) },
    ...inner, pattern ? el('sub', { class: 'rl-tag', dir: 'ltr', lang: 'en', 'aria-hidden': 'true' }, pattern.tag) : null);
}
export { letterPieces };
