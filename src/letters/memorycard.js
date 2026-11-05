// Memory card: letter -> picture -> sound hook -> example word -> story -> look-alike tip, one letter at a time.
// Shared by the Letters views (trace.view.js, atlas.view.js) and the first-day on-ramp (src/firstday/firstday.view.js).
// Data: data/letters/memory-chain.json ({meta, letters:[{id, hebrew, name, picture:{idea, alt, svg}, sound:{hook, line, perTradition},
// word:{he, vocabId, rank, gloss}, story, tip, risk}]}). Pictures: assets/letters/morph/<id>.svg with .morph-a (the letter) and .morph-b (the picture).
// Everything here is a DRAFT teaching aid, not history; nothing in this file writes Hebrew: all Hebrew comes from the data file.
// Plain DOM, no dependencies, no timers, no autoplay: the morph runs only on a press, and instantly under prefers-reduced-motion.
// @ts-check
import { respell, normalize, LABELS } from '../pronunciation/forTradition.js';

export const CHAIN_PATH = 'data/letters/memory-chain.json';
/** The three parts of the chain, in order. Stage 0 = only the big letter is showing; one tap shows all three, "Play the chain" walks them one by one. */
export const CHAIN_STEPS = Object.freeze(['picture', 'hook', 'word']);

const rootUrl = (rel) => new URL('../../' + rel, import.meta.url);
const cache = new Map();
function cached(key, make) {
  if (cache.has(key)) return cache.get(key);
  const p = make(); p.catch(() => cache.delete(key)); cache.set(key, p); return p;
}
/** Test hook: forget loaded files. */
export const _resetMemoryCardCache = () => cache.clear();

/** Load the chain file; resolves null (never rejects) when it is absent or malformed, so a view simply shows no card. */
export function loadMemoryChain(fetchFn = globalThis.fetch?.bind(globalThis)) {
  if (!fetchFn) return Promise.resolve(null);
  return cached('chain', async () => {
    const r = await fetchFn(rootUrl(CHAIN_PATH));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!j || !Array.isArray(j.letters)) throw new Error('bad memory chain');
    return j;
  }).catch(() => null);
}

/** @param {any} chain @param {string} id the letter record for id, or null (finals and variants have none unless the file lists them) */
export function entryFor(chain, id) {
  const list = chain && Array.isArray(chain.letters) ? chain.letters : [];
  return list.find((e) => e && e.id === id) || null;
}

/** The sound line for a tradition: perTradition[t], else the general line, else ''. Never invents text. */
export function soundLineFor(entry, tradition) {
  const s = entry && entry.sound; if (!s) return '';
  const t = normalize(tradition);
  const per = s.perTradition && typeof s.perTradition === 'object' ? s.perTradition[t] : '';
  return String(per || s.line || '');
}

/** The example word for a tradition: Hebrew as stored, the rule-generated respelling (src/pronunciation/forTradition.js), the gloss. */
export function wordFor(entry, tradition) {
  const w = entry && entry.word; if (!w || !w.he) return null;
  return { he: String(w.he), respelling: respell(w.he, tradition), gloss: String(w.gloss || ''), vocabId: w.vocabId || null };
}

const OK_TAGS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'defs', 'title', 'desc', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'use', 'style', 'text', 'tspan', 'symbol', 'filter', 'fegaussianblur', 'feoffset', 'feflood', 'fecomposite', 'femerge', 'femergenode', 'fecolormatrix']);
/**
 * Scope an inline SVG's <style> to the card so its class names (.L .o .s ...) and :root rules cannot leak into the page:
 * every selector is prefixed with ".mc-svg ", :root/html/body rules and @keyframes (only used by the files' autoplay mode, which the card never turns on) are dropped.
 * @param {string} css @returns {string}
 */
export function scopeSvgCss(css) {
  let out = '', i = 0; const n = css.length;
  while (i < n) {
    const open = css.indexOf('{', i); if (open < 0) break;
    const prelude = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < n && depth) { const c = css[j++]; if (c === '{') depth++; else if (c === '}') depth--; }
    const inner = css.slice(open + 1, j - 1); i = j;
    if (/^@(media|supports)\b/i.test(prelude)) { const body = scopeSvgCss(inner); if (body) out += prelude + '{' + body + '}'; continue; }
    if (prelude.startsWith('@')) continue;
    const sel = prelude.split(',').map((x) => x.trim()).filter((x) => x && !/^(:root|html|body)\b/i.test(x)).map((x) => '.mc-svg ' + x);
    if (sel.length) out += sel.join(',') + '{' + inner + '}';
  }
  return out;
}

/**
 * Make an SVG file safe to inline: returns the cleaned markup, or null when anything is off (the caller then shows the plain letter).
 * It REJECTS rather than repairs: script, foreignObject, event handlers, external references, DOCTYPE/entities, unknown elements, @import, remote url().
 * Ids are prefixed ("mc-") so they cannot collide with the page; the root becomes decorative (aria-hidden) because the card supplies the alt text.
 * @param {string} text @returns {string|null}
 */
export function sanitizeSvg(text) {
  if (typeof text !== 'string' || text.length > 200000) return null;
  let s = text.replace(/^﻿/, '').replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return null;
  if (/<!\s*(DOCTYPE|ENTITY)|<!\[CDATA\[|<\s*script|<\s*foreignObject|<\s*iframe|<\s*image|<\s*a[\s>]|javascript:|data:|@import|&#|\son[a-z]+\s*=/i.test(s)) return null;
  for (const m of s.matchAll(/<\s*([a-zA-Z][\w:-]*)/g)) if (!OK_TAGS.has(m[1].toLowerCase())) return null;
  for (const m of s.matchAll(/(?:xlink:)?href\s*=\s*("([^"]*)"|'([^']*)')/gi)) { const v = (m[2] ?? m[3] ?? '').trim(); if (!v.startsWith('#')) return null; }
  for (const m of s.matchAll(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi)) if (!m[2].trim().startsWith('#')) return null;
  s = s.replace(/\sid\s*=\s*("([^"]*)"|'([^']*)')/g, (_, __, a, b) => ` id="mc-${a ?? b}"`)
    .replace(/(href\s*=\s*["'])#/gi, '$1#mc-').replace(/url\(\s*(['"]?)#/gi, 'url($1#mc-');
  s = s.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, a, css, z) => a + scopeSvgCss(css) + z);
  s = s.replace(/<svg\b/i, '<svg aria-hidden="true" focusable="false"');
  return s;
}

/** The picture file's own <title> and <desc> text (the files carry a plain-words description of what is drawn and how the letter forms it). '' when absent. */
export function svgDescription(clean) {
  if (typeof clean !== 'string') return '';
  const pick = (tag) => { const m = new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)</' + tag + '>', 'i').exec(clean); return m ? m[1].replace(/<[^>]*>/g, '').replace(/\\s+/g, ' ').trim() : ''; };
  return pick('desc') || pick('title');
}

/** Words for a screen reader: why the picture fits the letter, the sound hook and the example word, built from the memory chain entry (no Hebrew letters, so it reads in any voice). */
export function pictureDescription(entry, tradition, svgDesc = '', withSound = false) {
  const pic = (entry && entry.picture) || {};
  const hook = entry && entry.sound && entry.sound.hook;
  const w = wordFor(entry, tradition);
  const bits = [];
  if (pic.idea) bits.push(String(pic.idea).trim());
  if (svgDesc) bits.push(svgDesc);
  if (withSound && hook) bits.push('Sound hook: \u201C' + hook + '\u201D.');
  if (withSound && w) bits.push('Example word: ' + [w.respelling, w.gloss ? '(' + w.gloss + ')' : ''].filter(Boolean).join(' ') + '.');
  return bits.map((b) => (/[.!?\u201D]$/.test(b) ? b : b + '.')).join(' ');
}

/** Fetch + sanitize one picture (cached per path); resolves null on any failure, so the card falls back to the plain letter. */
export function loadMorphSvg(path, fetchFn = globalThis.fetch?.bind(globalThis)) {
  if (!path || !fetchFn) return Promise.resolve(null);
  return cached('svg:' + path, async () => {
    const r = await fetchFn(rootUrl(path));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const clean = sanitizeSvg(await r.text());
    if (!clean) throw new Error('unsafe or empty svg');
    return clean;
  }).catch(() => null);
}

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (typeof v === 'boolean' && k.startsWith('aria-')) { e.setAttribute(k, String(v)); continue; }
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}

export const MEMORY_CARD_CSS = `
.mc{--mc-bg:var(--card,#fff);--mc-fg:var(--fg,#1b1b1f);--mc-line:var(--border,#ccd);--mc-muted:var(--muted,#556);--mc-ink:#1f4e9c;border:1px solid var(--mc-line);border-radius:12px;background:var(--mc-bg);color:var(--mc-fg);padding:8px 10px;margin:8px 0;font-family:system-ui,sans-serif;scroll-margin-block-end:5.5rem}
.mc-compact{padding:6px 8px;margin:4px 0}.mc.mc-compact .mc-art{inline-size:72px;block-size:72px}.mc-compact .mc-glyph{font-size:2.8rem}.mc-compact .mc-name{display:none}.mc-compact .mc-cap{margin:0 0 4px}.mc-compact .mc-cap:empty{display:none}
.mc-top{display:flex;flex-wrap:nowrap;gap:8px 12px;align-items:center}
.mc .mc-art{flex:0 0 auto;inline-size:92px;block-size:92px;padding:0;border:2px solid var(--mc-line);border-radius:14px;background:var(--mc-bg);color:var(--mc-fg);display:grid;place-items:center;overflow:hidden;cursor:pointer;font:inherit;min-block-size:44px}
.mc .mc-art[aria-pressed=true]{background:var(--mc-bg);color:var(--mc-fg);border-color:var(--accent,var(--mc-ink))}
.mc .mc-art:focus-visible,.mc .mc-btn:focus-visible{outline:3px solid var(--focus,#b45309);outline-offset:2px}
.mc .mc-art>*{grid-area:1/1}
.mc .mc-glyph{font-size:3.6rem;line-height:1}
.mc .mc-idea{font-size:.6rem;line-height:1.15;padding:3px;text-align:center;overflow-wrap:anywhere;max-inline-size:100%;max-block-size:100%;overflow:hidden}
.mc-compact .mc-idea{font-size:.52rem;padding:2px}
.mc .mc-svg{inline-size:100%;block-size:100%;display:block}
.mc .mc-svg svg{inline-size:100%;block-size:100%;display:block}
.mc .mc-svg .morph-a{opacity:1;transition:opacity .4s ease}
.mc .mc-svg .morph-b{opacity:0;transition:opacity .4s ease}
.mc .mc-art[aria-pressed=true] .mc-svg .morph-a{opacity:0}
.mc .mc-art[aria-pressed=true] .mc-svg .morph-b{opacity:1}
.mc .mc-side{min-inline-size:0;flex:1 1 8rem}
.mc .mc-name{font-weight:700;margin:0}
.mc .mc-cap{margin:2px 0 6px;font-size:.88rem;color:var(--mc-muted)}
.mc .mc-btn{font:inherit;cursor:pointer;border:1px solid var(--mc-line);background:var(--mc-bg);color:var(--mc-fg);border-radius:10px;min-block-size:44px;padding:6px 10px;max-inline-size:100%;overflow-wrap:anywhere}
.mc .mc-btn.primary{background:var(--mc-ink);color:#fff;border-color:var(--mc-ink)}
.mc-steps{margin:6px 0 0;padding:0;list-style:none;display:grid;gap:4px}
.mc-steps:empty{display:none}
.mc-steps li{margin:0;line-height:1.3}
.mc-steps .mc-k{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--mc-muted);margin-inline-end:.4rem}
.mc .mc-word{font-size:1.6rem;line-height:1.2}
.mc .mc-chip{display:inline-block;font-size:.7rem;line-height:1.4;padding:0 .5rem;margin-inline-start:.4rem;border:1px solid var(--mc-line);border-radius:999px;color:var(--mc-muted);vertical-align:middle}
.mc .mc-small{font-size:.8rem;color:var(--mc-muted);margin:4px 0 0}
.mc .mc-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.mc .mc-row .mc-btn{flex:1 1 auto}
.mc .mc-sr{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.mc-fallback{font-size:.85rem;color:var(--muted,#556);margin:6px 0}
@media (prefers-reduced-motion:reduce){.mc .mc-svg .morph-a,.mc .mc-svg .morph-b{transition:none!important}}
@media (forced-colors:active){.mc{border:2px solid CanvasText}.mc .mc-art,.mc .mc-btn{border:2px solid ButtonText;forced-color-adjust:auto}.mc .mc-art[aria-pressed=true]{border-color:Highlight;outline:2px solid Highlight}}
`;

/** One calm line for a view whose chain file could not be loaded (offline, 404, bad JSON). Not a card: the view still works without it. */
export function memoryFallback(t = (k, f) => f) {
  return h('p', { class: 'mc-fallback', role: 'status', 'data-memory-fallback': '1' }, t('mc.unavailable', 'Picture and word hint unavailable offline'));
}

/**
 * Build one memory card. Returns {el, getStage, destroy}. The picture button persists across stages (so the morph can animate and focus stays);
 * only the revealed lines below it are rebuilt.
 * @param {{entry:any, glyph?:string, tradition?:string, audio?:any, t?:(k:string,f:string)=>string, fetchFn?:Function, svg?:string|null, compact?:boolean, withStyle?:boolean, onStage?:(n:number)=>void}} o
 *  svg: an already-loaded, already-sanitized picture (tests); otherwise the file named by entry.picture.svg is fetched.
 */
export function buildMemoryCard(o) {
  const entry = o.entry; const tradition = normalize(o.tradition);
  const t = o.t || ((k, f) => f);
  // stage = how much of the chain is showing: 0 letter only, 1 picture, 2 + sound hook, 3 + example word. One tap goes straight to 3;
  // "Play the chain" is the optional slow version (picture, then hook, then word, one press each). `more` adds story, tip and the Hear buttons.
  let stage = 0, pressed = false, more = false, status = '', alive = true, svgReady = false;
  const glyph = o.glyph || entry.hebrew || '';
  const pic = entry.picture || {};
  const word = wordFor(entry, tradition);
  const hookText = (entry.sound && entry.sound.hook) || '';
  // the data lines open with "Same sound: " which a first-time reader cannot place (same as what?): show the rest, after the hook
  const line = o.hideSoundLine ? '' : soundLineFor(entry, tradition).replace(/^Same sound:\s*/i, '');

  const svgBox = h('span', { class: 'mc-svg', 'aria-hidden': 'true' });
  const glyphEl = h('span', { class: 'mc-glyph', dir: 'rtl', lang: 'he', 'aria-hidden': 'true' }, glyph);
  const ideaEl = h('span', { class: 'mc-idea', 'aria-hidden': 'true' }, '');
  const art = h('button', {
    type: 'button', class: 'mc-art', 'data-act': 'mc-art', 'aria-pressed': false, 'data-state': 'a',
    'aria-label': t('mc.artLabel', entry.name + ': show the picture that helps you remember it'),
    'aria-describedby': 'mc-sr-' + entry.id,
    onclick: () => { pressed = !pressed; if (pressed && stage < 1) { stage = 3; if (o.onStage) o.onStage(stage); } sync(); if (pressed) reveal(); }
  }, svgBox, glyphEl, ideaEl);
  const nameEl = h('p', { class: 'mc-name' }, entry.name || '');
  // Words for the picture for a screen reader (the picture itself is decorative to it): why the shape fits, plus the picture file's own description.
  // Empty until the learner presses the picture (the card reveals the chain step by step; the hook and word appear as text in the list below).
  let svgDesc = '';
  const srEl = h('span', { class: 'mc-sr', id: 'mc-sr-' + entry.id, role: 'status', 'aria-live': 'polite' }, '');
  const capEl = h('p', { class: 'mc-cap', role: 'status', 'aria-live': 'polite' }, '');
  const nextHost = h('div', {});
  const steps = h('ul', { class: 'mc-steps' });
  const note = h('p', { class: 'mc-small', role: 'status', 'aria-live': 'polite' }, '');
  const card = h('section', { class: o.compact ? 'mc mc-compact' : 'mc', 'data-memory-card': entry.id, 'data-stage': '0', 'aria-label': t('mc.title', 'Memory card') + ': ' + (entry.name || entry.id) },
    o.withStyle === false ? null : h('style', { text: MEMORY_CARD_CSS }),
    h('div', { class: 'mc-top' }, art, srEl, h('div', { class: 'mc-side' }, nameEl, capEl, nextHost)),
    steps, note);

  const say = (m) => { status = m; note.textContent = m; };
  async function hear(kind, id, label) {
    const a = o.audio;
    if (!a || typeof a.play !== 'function' || !id) { say(t('mc.noAudio', 'Sound is not available here yet.')); return; }
    try {
      // a word that is not in the loaded recording list still has its Hebrew text here, so the device voice can be asked for it
      const r = await a.play(kind, id, kind === 'word' && word && word.he ? { text: word.he } : undefined);
      if (!alive) return;
      const israeliVoice = tradition === 'israeli';
      if (!r || r.source === 'none') {
        say(r && r.reason === 'tts-pronunciation-mismatch'
          ? t('mc.noClipMismatch', "No recording yet. The device voice speaks Israeli Hebrew, not " + LABELS[tradition] + '. Read the English-letter spelling.')
          : r && r.reason === 'no-hebrew-browser-voice' ? t('mc.noVoice', 'No recording yet, and this device has no Hebrew voice to use.')
          : t('mc.noClip', 'No recording yet, and the device voice could not say it.'));
      } else if (r.source === 'tts-fallback') say(israeliVoice ? t('mc.ttsNote', "No recording yet: using your device's Hebrew voice.") : t('mc.ttsNoteOther', "No recording yet. Using your device's Hebrew voice, which speaks Israeli Hebrew. Read the English-letter spelling."));
      else say(t('mc.playing', 'Playing') + ': ' + label + '.');
    } catch { say(t('mc.noClip', 'No recording yet, and the device voice could not say it.')); }
  }

  const go = (n, focusAct) => {
    stage = n; if (n >= 1) pressed = true; if (n === 0) { pressed = false; more = false; say(''); }
    if (o.onStage) o.onStage(stage);
    sync();
    try { const b = card.querySelector && card.querySelector('[data-act="' + focusAct + '"]'); if (b && b.focus) b.focus({ preventScroll: true }); } catch { /* ignore */ }
  };
  // keep the opened card clear of the fixed tab bar on a phone (scroll-margin on .mc leaves room); no-op where scrollIntoView is missing
  const reveal = () => { try { card.scrollIntoView({ block: 'nearest' }); } catch { /* ignore */ } };
  const btn = (act, label, fn, primary) => h('button', { type: 'button', class: 'mc-btn' + (primary ? ' primary' : ''), 'data-act': act, onclick: fn }, label);
  function sync() {
    art.setAttribute('aria-pressed', String(pressed)); art.setAttribute('data-state', pressed ? 'b' : 'a'); card.setAttribute('data-stage', String(stage)); card.setAttribute('data-more', more ? '1' : '0');
    // without a picture file, the pressed state still shows the picture idea as words (honest fallback)
    glyphEl.textContent = svgReady ? '' : (pressed ? '' : glyph);
    ideaEl.textContent = !svgReady && pressed ? (pic.alt || pic.idea || '') : ''; // the shorter text fits the small button; the caption beside it has it in full
    srEl.textContent = pressed ? pictureDescription(entry, tradition, svgDesc) : '';
    capEl.textContent = pressed ? t('mc.pic', 'Picture: ') + (pic.alt || pic.idea || '') : (o.compact ? '' : t('mc.cap', 'Press the letter to see what it turns into.'));
    nextHost.textContent = '';
    // the side button only walks the optional slow version; at stage 3 the chain is complete and the row below takes over
    if (stage === 0) nextHost.appendChild(btn('mc-next', t('mc.show', 'Picture, sound, word'), () => { go(3, 'mc-more'); reveal(); }, true));
    else if (stage === 1) nextHost.appendChild(btn('mc-next', t('mc.nextHook', 'Next: sound hook'), () => go(2, 'mc-next'), true));
    else if (stage === 2) nextHost.appendChild(btn('mc-next', t('mc.nextWord', 'Next: example word'), () => go(3, 'mc-more'), true));
    steps.textContent = '';
    const li = (k, ...kids) => steps.appendChild(h('li', {}, h('span', { class: 'mc-k' }, k), ...kids));
    if (stage >= 2) li(t('mc.kSound', 'Sound'), h('strong', {}, hookText ? '\u201C' + hookText + '\u201D' : ''), line ? h('span', { class: 'mc-line' }, ': ' + line) : null);
    if (stage >= 3) {
      if (word) li(t('mc.kWord', 'Word'), h('span', { class: 'mc-word', dir: 'rtl', lang: 'he' }, word.he), ' ', h('span', {}, [word.respelling ? word.respelling + ' ' : '', word.gloss ? '= ' + word.gloss : ''].join('').trim()),
        word.respelling ? h('span', { class: 'mc-chip' }, LABELS[tradition]) : null);
      if (more) {
        const storyText = (entry.storyByTradition && entry.storyByTradition[tradition]) || entry.story;
        if (storyText) li(t('mc.kStory', 'Story'), storyText);
        if (entry.tip) li(t('mc.kTip', 'Look-alike tip'), entry.tip);
      }
      const row = [btn('mc-more', more ? t('mc.less', 'Hide story and tip') : t('mc.more', 'Story and tip'), () => { more = !more; go(3, 'mc-more'); if (more) reveal(); }),
        btn('mc-play', t('mc.play', 'Show one step at a time'), () => { more = false; go(1, 'mc-next'); })];
      if (more) row.unshift(btn('mc-hear-letter', t('mc.hearLetter', 'Hear the letter'), () => hear('letter', entry.id, entry.name)),
        word && word.vocabId ? btn('mc-hear-word', t('mc.hearWord', 'Hear the word'), () => hear('word', word.vocabId, word.gloss || 'the word')) : null);
      steps.appendChild(h('li', {}, h('div', { class: 'mc-row' }, ...row.filter(Boolean)),
        more ? h('p', { class: 'mc-small' }, t('mc.draft', 'Draft memory hook: a teaching aid, not history, and not yet checked by a Hebrew teacher.')) : null));
    }
    note.textContent = status;
  }
  sync();

  const fetchFn = o.fetchFn;
  const apply = (clean) => {
    if (!alive || !clean) return;
    svgBox.innerHTML = clean; svgReady = true;
    svgDesc = svgDescription(clean);
    sync();
  };
  if (typeof o.svg === 'string') apply(o.svg);
  else if (pic.svg) loadMorphSvg(pic.svg, fetchFn).then(apply);
  return { el: card, getStage: () => stage, isPressed: () => pressed, destroy() { alive = false; } };
}
