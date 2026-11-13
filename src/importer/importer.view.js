/**
 * Read Your Own Text (#/import). Paste any Hebrew and read it with the dictionary beside it: tap a word for its meaning and
 * its recording, and see which of its words you have met and which you don't know yet.
 * The text stays in the page (nothing is sent, nothing is saved); only the words you mark "I know this" are kept (importer.v1).
 * ctx extras for tests: ctx.importer = {index, clips, text}.
 */
import { el, heText, storeGet, storeSet, PROGRESS_KEY } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { lookupClip, alternateClip, clipCaption, unavailableLine, planIsExactFile, CHECKING } from '../vocab/clips.js';
import { STORE_KEY, PRIVACY_NOTE, LIMITS_NOTE, MAX_CHARS, normalizeState, markKnown, createLookup, readText, vocabulary, howLine, summaryLine } from './model.js';

export const TITLE = 'Read Your Own Text';
export const FILES = Object.freeze({ index: 'data/vocab/index.json', clips: 'data/vocab/clip-lookup.json' });
const NO_CLIP = 'There is no recording of this word yet.';
/** Dictionary recordings: one list, fetched the first time a dictionary-only clip is asked for, then given to the player (as the vocabulary page does). */
let dictAudio = null;
function loadDictionaryAudio(ctx) {
  if (!dictAudio) dictAudio = loadJSON('data/vocab/audio-dictionary.json').then((list) => { ctx.audio?.extend?.(list); return true; }).catch(() => { dictAudio = null; return false; });
  return dictAudio;
}

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const inj = ctx?.importer || {};
  const wrap = el('section', { class: 'alef-importer', 'aria-labelledby': 'view-title' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'muted' });
  const input = el('textarea', { id: 'imp-text', rows: '6', dir: 'rtl', lang: 'he', maxlength: String(MAX_CHARS * 2), 'aria-describedby': 'imp-privacy', style: 'width:100%;font-size:1.25rem' });
  const out = el('div', { id: 'imp-out' });
  const btn = (label, onclick, extra = {}) => el('button', { type: 'button', class: 'btn', style: 'min-height:44px', onclick, ...extra }, label);
  wrap.append(el('h1', { id: 'view-title', tabindex: '-1' }, TITLE),
    el('p', {}, 'Paste any Hebrew: a handout, a page, a letter from the family. Tap a word to see what it means and hear it, and see which words are new to you.'),
    el('p', { class: 'muted', id: 'imp-privacy' }, PRIVACY_NOTE),
    el('label', { for: 'imp-text' }, 'Your Hebrew text'), input,
    el('div', { class: 'row' }, btn('Read it', () => read(), { id: 'imp-read' }), btn('Clear', () => { input.value = ''; out.replaceChildren(); say('Cleared.'); }, { class: 'btn secondary', id: 'imp-clear' })),
    status, out);
  root.append(wrap);
  import('../bridge/chip.js').then((m) => m.attachChip(root, ctx)).catch(() => { /* the screen works without the stage line */ });
  let alive = true, st = normalizeState(null), completed = {}, lookup = null, clips = inj.clips || null, picked = -1, reading = null;
  const say = (t) => { status.textContent = t; };
  const voice = () => { const v = ctx?.settings?.get?.('voice'); return v === 'f' ? 'f' : 'm'; };
  const tradition = () => { const t = ctx?.settings?.get?.('congregation'); return ['israeli', 'sephardi', 'ashkenazi'].includes(t) ? t : 'israeli'; };

  async function dictionary() {
    if (!lookup) lookup = createLookup(inj.index || await loadJSON(FILES.index));
    return lookup;
  }

  async function read() {
    const text = String(input.value ?? '');
    if (!text.trim()) { say('Paste or type some Hebrew first.'); return; }
    say('Reading…');
    let look;
    try { look = await dictionary(); } catch { say('The dictionary could not be loaded. If you are offline, open this page once while online.'); return; }
    if (!alive) return;
    reading = readText(text, look); picked = -1;
    draw();
    say(reading.cut ? `Only the first ${MAX_CHARS.toLocaleString('en')} characters were read. Paste the rest afterwards.` : 'Done. Tap any word.');
  }

  async function hear(sense, note) {
    if (!ctx?.audio || typeof ctx.audio.play !== 'function') { note.textContent = NO_CLIP; return; }
    try {
      if (!clips) clips = await loadJSON(FILES.clips);
      const clip = lookupClip(clips, sense.he, voice(), tradition()) || alternateClip(clips, sense.he, voice(), tradition());
      if (!clip) { note.textContent = NO_CLIP; return; }
      const want = { voice: clip.voice, tradition: clip.tradition, allowMismatchedTts: false };
      if (ctx.audio.ensureManifest) await ctx.audio.ensureManifest();
      let plan = ctx.audio.status?.(clip.kind, clip.id, want);
      if (plan?.reason === CHECKING && ctx.audio.ensureManifest) { await ctx.audio.ensureManifest(); plan = ctx.audio.status?.(clip.kind, clip.id, want); }
      if (!planIsExactFile(plan, { ...want, id: clip.id }) && String(clip.id).startsWith('dict-')) { await loadDictionaryAudio(ctx); plan = ctx.audio.status?.(clip.kind, clip.id, want); }
      if (!planIsExactFile(plan, { ...want, id: clip.id }) && typeof globalThis.alefShards?.load === 'function') { try { await globalThis.alefShards.load(); } catch { /* the honest line below */ } plan = ctx.audio.status?.(clip.kind, clip.id, want); }
      if (!planIsExactFile(plan, { ...want, id: clip.id })) { note.textContent = unavailableLine(clip.voice, clip.tradition); return; }
      try { ctx.audio.stop?.(); } catch { /* nothing playing */ }
      // only this word's own recording is asked for: no text is handed to a device voice
      const r = await ctx.audio.play(clip.kind, clip.id, { ...want, rate: 'normal' });
      note.textContent = !r || r.source === 'none' || r.fileError ? unavailableLine(clip.voice, clip.tradition) : clipCaption({ ...clip, status: r.entryStatus || clip.status, source: r.entrySource || clip.source, tradition: r.tradition || clip.tradition, voice: r.voice || clip.voice });
    } catch { note.textContent = NO_CLIP; }
  }

  function wordPanel(w) {
    if (!w) return el('p', { class: 'muted', id: 'imp-panel' }, 'Tap a word in the text to see it here.');
    const known = w.senses.some((s) => st.known[s.id]);
    const rows = w.senses.map((s) => {
      const note = el('span', { class: 'muted', role: 'status', 'aria-live': 'polite' });
      return el('li', { 'data-sense': s.id }, heText(s.he, 'alef-he'), s.translit ? ` (${s.translit})` : '', `: ${s.en}`, s.pos ? el('span', { class: 'muted' }, ` [${s.pos}]`) : null, ' ',
        ctx?.audio ? btn('Hear it', () => hear(s, note), { class: 'btn secondary', 'aria-label': `Hear ${s.translit || 'this word'}`, 'data-hear': s.id }) : null, ' ', note);
    });
    return el('section', { class: 'card', id: 'imp-panel', 'aria-labelledby': 'imp-panel-h' },
      el('h2', { id: 'imp-panel-h' }, heText(w.written, 'alef-he')),
      w.how === 'unknown' ? el('p', {}, 'This word is not in Aleph\'s dictionary. It may be a name, a form of a word the dictionary lists another way, or a word it does not have.') : el('ul', {}, ...rows),
      w.how !== 'dictionary' && w.how !== 'unknown' ? el('p', { class: 'muted' }, howLine(w)) : null,
      w.how === 'unknown' ? null : btn(known ? 'I do not know this word yet' : 'I know this word', async () => { st = markKnown(st, w.senses[0].id, !known); await storeSet(ctx, STORE_KEY, st); if (alive) { draw(); say(known ? 'Moved back to the words to learn.' : 'Marked as a word you know.'); } }, { class: 'btn secondary', id: 'imp-know', 'aria-pressed': String(known) }),
      el('p', { class: 'muted' }, `In this text ${w.count} time${w.count === 1 ? '' : 's'}.`));
  }

  function list(id, title, words, empty, lead) {
    return el('section', { id, 'aria-labelledby': `${id}-h` }, el('h2', { id: `${id}-h` }, `${title} (${words.length})`), lead ? el('p', { class: 'muted' }, lead) : null,
      words.length ? el('ul', {}, ...words.slice(0, 200).map((w) => el('li', {}, btn(w.written, () => { picked = reading.words.indexOf(w); draw(); }, { class: 'btn secondary', lang: 'he', dir: 'rtl', 'data-word': w.key }),
        w.senses[0] ? ` ${w.senses[0].en}` : '', w.count > 1 ? el('span', { class: 'muted' }, ` (${w.count} times)`) : null)))
        : el('p', { class: 'muted' }, empty));
  }

  function draw() {
    if (!reading) return;
    const v = vocabulary(reading.words, { completed, known: st.known });
    const fresh = new Set(v.fresh), unlisted = new Set(v.unlisted);
    const lines = reading.lines.map((ln) => el('p', { class: 'imp-line', dir: 'rtl', lang: 'he', style: 'font-size:1.5rem;line-height:2.2' }, ...ln.parts.map((p) => {
      if (p.t === 'other') return p.text;
      if (p.t === 'name') return el('span', { class: 'alef-he', 'data-name': '' }, p.shown); // shown as ה׳; never looked up, never played
      const w = reading.words[p.i];
      return el('button', { type: 'button', class: 'imp-word', 'data-i': String(p.i), 'data-kind': unlisted.has(w) ? 'unlisted' : fresh.has(w) ? 'new' : 'met', 'aria-pressed': String(p.i === picked),
        style: `font:inherit;background:none;border:0;border-bottom:2px ${unlisted.has(w) ? 'dotted' : fresh.has(w) ? 'solid' : 'none'} currentColor;padding:0 2px;min-height:44px;cursor:pointer`,
        onclick: () => { picked = p.i; draw(); } }, p.shown);
    })));
    out.replaceChildren(
      el('p', { id: 'imp-summary' }, el('strong', {}, summaryLine(reading, v))),
      reading.hebrewWords ? el('p', { class: 'muted' }, 'A solid line is under a word to learn; a dotted line is under a word that is not in the dictionary.') : null,
      el('div', { id: 'imp-reader' }, ...lines),
      reading.hebrewWords ? wordPanel(reading.words[picked]) : null,
      reading.hebrewWords ? list('imp-new', 'Words You Don\'t Know Yet', v.fresh, 'Every dictionary word in this text is one you have met.', 'In the dictionary, but not from a lesson you have finished and not marked as known. Most used in this text first.') : null,
      reading.hebrewWords ? list('imp-met', 'Words You Have Met', v.met, 'None yet. Words from lessons you finish, and words you mark as known, are listed here.') : null,
      reading.hebrewWords ? list('imp-unlisted', 'Not In The Dictionary', v.unlisted, 'Every word was found.') : null,
      el('p', { class: 'muted' }, LIMITS_NOTE));
  }

  (async () => {
    try {
      st = normalizeState(await storeGet(ctx, STORE_KEY, null));
      completed = (await storeGet(ctx, PROGRESS_KEY, null))?.completed || {};
      if (alive && inj.text) { input.value = inj.text; await read(); }
    } catch { /* a new learner: nothing saved */ }
  })();
  return () => { alive = false; reading = null; try { input.value = ''; } catch { /* gone */ } wrap.remove?.(); };
}
