// ALEF lane 2 view: Letter Atlas. All 31 tiles (27 letters + vet, khaf, fe, sin) with sound, memory hook,
// tap-to-hear, and an optional "find the letter" quiz that shows a look-alike warning only after a wrong tap.
// Plain DOM, no dependencies. export mount(root, ctx) -> unmount.
// ctx (from the shell): {settings, store, audio, route, t, params}. Everything is optional.
// Test/offline hooks: ctx.letters, ctx.mnemonics, ctx.confusables, ctx.interference, ctx.consonants supply already-loaded data.
// @ts-check
import { warningAfterWrongTap } from './interference.js';
import { letterSound, congregationOf } from '../pronunciation/forTradition.js';
import { loadMemoryChain, entryFor, buildMemoryCard, memoryFallback } from './memorycard.js';
import { SCENE, picture } from '../img/scenes.js';

const DATA = (name) => new URL('../../data/letters/' + name, import.meta.url).href;
const PRON = (name) => new URL('../../data/pronunciation/' + name, import.meta.url).href;
async function loadJson(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url); return r.json(); }

const DAGESH = 'ּ', SHIN_DOT = 'ׁ', SIN_DOT = 'ׂ';
/** Glyph shown on the tile. The two-sound letters show the mark that selects the sound. */
const TILE_GLYPH = { bet: 'ב' + DAGESH, vet: 'ב', kaf: 'כ' + DAGESH, khaf: 'כ', pe: 'פ' + DAGESH, fe: 'פ', shin: 'ש' + SHIN_DOT, sin: 'ש' + SIN_DOT };
const VARIANT_IPA = { vet: 'v', khaf: 'χ', fe: 'f', sin: 's' };
const HARD_IPA = { bet: 'b', kaf: 'k', pe: 'p', shin: 'ʃ' };
const FINAL_RE = /-final$/;

/** First bracketed symbol of a consonants.json IPA string, marks stripped ("[ʁ̞] uvular" -> "ʁ"); '' when the record gives none (e.g. "alveolar trill"). */
const firstSymbol = (rec, t) => { const m = /\[([^\]]+)\]/.exec((rec && rec.ipa && rec.ipa[t]) || ''); return m ? m[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '') : ''; };
/** The tile's slash IPA is the Israeli value from letters.json. Outside the Israeli setting it is kept only where the tradition's stored IPA starts with the same symbol; otherwise it is dropped (no invented value). */
function tileIpa(ipa, rec, tradition) {
  if (!rec || !tradition || tradition === 'israeli') return ipa;
  const mine = firstSymbol(rec, tradition);
  return mine && mine === firstSymbol(rec, 'israeli') ? ipa : '';
}

/**
 * Build the 31 atlas tiles (pure, tested). Variants follow their parent.
 * @param {any[]} letters letters.json  @param {{letters?:any[], variants?:any[]}|null} mn mnemonics.json
 * @param {{consonants?: any, tradition?: string}} [opts] consonants = data/pronunciation/consonants.json; tradition = settings.congregation.
 *   With both, soundEn follows the tradition (Ashkenazi tav: s without dagesh); without, letters.json's Israeli-only sound.en.
 *   soundEnIsraeli is the same record's Israeli line, so the detail panel can say when the setting changes the sound.
 */
export function buildTiles(letters, mn, { consonants, tradition } = {}) {
  const consById = consonants && consonants.letters ? consonants.letters : null;
  const byId = {}; for (const m of ((mn && mn.letters) || [])) byId[m.id] = m;
  for (const m of ((mn && mn.variants) || [])) byId[m.id] = m;
  const variants = ((mn && mn.variants) || []);
  const tiles = [];
  for (const l of letters) {
    tiles.push({
      id: l.id, name: l.name, he: l.he, glyph: TILE_GLYPH[l.id] || l.he,
      ipa: tileIpa(HARD_IPA[l.id] || (l.sound && l.sound.ipa) || '', consById && consById[l.id], tradition), soundEn: letterSound(consById ? consById[l.id] : null, tradition, { fallbackEn: l.sound && l.sound.en }).en, soundEnIsraeli: letterSound(consById ? consById[l.id] : null, 'israeli', { fallbackEn: l.sound && l.sound.en }).en, kind: FINAL_RE.test(l.id) ? 'final' : 'letter',
      soundAudioId: FINAL_RE.test(l.id) ? l.id : l.id + '-sound', nameAudioId: l.id, parent: null, mn: byId[l.id] || null
    });
    for (const v of variants.filter((x) => x.parent === l.id)) {
      tiles.push({
        id: v.id, name: v.name, he: l.he, glyph: TILE_GLYPH[v.id] || l.he, ipa: tileIpa(VARIANT_IPA[v.id] || '', consById && consById[v.id === 'khaf' ? 'kaf-final' : l.id], tradition), soundEn: v.sound, kind: 'variant',
        soundAudioId: v.id + '-sound', nameAudioId: v.id, parent: l.id, mn: v
      });
    }
  }
  return tiles;
}

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (typeof v === 'boolean' && k.startsWith('aria-')) { e.setAttribute(k, String(v)); continue; } // aria-pressed={true} must be "true", not ""
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}

const CSS = `
.alef-atlas{font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:12px;color:#1b1b1f}
.alef-atlas button{font:inherit;cursor:pointer;border:1px solid #9aa;background:#fff;border-radius:10px;min-height:44px;padding:6px 10px}
.alef-atlas button:focus-visible{outline:3px solid var(--focus,#b45309);outline-offset:2px}
.alef-atlas button[aria-pressed=true]{background:#1f4e9c;color:#fff;border-color:#1f4e9c}
.alef-atlas .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin:10px 0;padding:0;list-style:none}
.alef-atlas .tile{width:100%;display:flex;flex-direction:column;align-items:center;gap:0;line-height:1.15}
.alef-atlas .tile .g{font-size:2.3rem}.alef-atlas .tile .n{font-size:.8rem}.alef-atlas .tile .s{font-size:.75rem;color:#445}
.alef-atlas .tile[aria-pressed=true] .s{color:#dde}
.alef-atlas .tile.variant{border-style:dashed}.alef-atlas .tile.final{background:#f4f1ea}
.alef-atlas .tile.wrong{border-color:#c0392b;background:#fdecea}.alef-atlas .tile.right{border-color:#1a7f37;background:#e3f6e8}
.alef-atlas .panel{background:#fff;border:1px solid #ccd;border-radius:12px;padding:10px 14px;margin:8px 0}
.alef-atlas .panel .big{font-size:4rem;line-height:1.1}
.alef-atlas .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.alef-atlas .status{min-height:1.6em}.alef-atlas .warn{background:#fff4e0;border:1px solid #e0b060;border-radius:8px;padding:8px 10px}
.alef-atlas .muted{color:#556;font-size:.85rem}
`;

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} */
export function mount(root, ctx = {}) {
  const t = (key, fallback) => { try { const v = ctx.t && ctx.t(key); return v && v !== key ? v : fallback; } catch (e) { return fallback; } };
  const state = { status: '', tiles: /** @type {any[]} */ ([]), selected: null, alt: false, quiz: null, conf: null, interf: null, practice: false };
  let unmounted = false;
  root.textContent = '';
  const wrap = h('div', { class: 'alef-atlas' });
  wrap.appendChild(h('style', { text: CSS }));
  const body = h('div', {});
  wrap.appendChild(body); root.appendChild(wrap);
  body.appendChild(h('p', { role: 'status', text: t('atlas.loading', 'Loading the atlas...') }));

  Promise.all([
    ctx.letters || loadJson(DATA('letters.json')),
    ctx.mnemonics || loadJson(DATA('mnemonics.json')).catch(() => null),
    ctx.confusables || loadJson(DATA('confusables.json')).catch(() => null),
    ctx.interference || loadJson(DATA('interference.json')).catch(() => null),
    ctx.consonants || loadJson(PRON('consonants.json')).catch(() => null),
    ctx.memoryChain || loadMemoryChain()
  ]).then(([letters, mn, conf, interf, consonants, chain]) => {
    if (unmounted) return;
    state.tiles = buildTiles(letters, mn, { consonants, tradition: congregationOf(ctx.settings) }); state.conf = conf; state.interf = interf; state.chain = chain || null;
    const want = (ctx.params && ctx.params.id) || (ctx.query && ctx.query.id); // the route has no :id, so #/letters/atlas?id=bet arrives in ctx.query
    state.selected = (want && state.tiles.find((x) => x.id === want)) ? want : null;
    render();
  }).catch((err) => {
    if (unmounted) return;
    body.textContent = '';
    body.appendChild(h('p', { role: 'alert', text: t('atlas.loadError', 'The atlas did not load. Please reload the page and try again.') }));
  });

  const tileById = (id) => state.tiles.find((x) => x.id === id);
  let statusEl = null;
  const say = (msg) => { state.status = msg; if (statusEl) statusEl.textContent = msg; };

  /** play via ctx.audio; report honestly when nothing could be played. */
  async function hear(audioId) {
    if (!ctx.audio || typeof ctx.audio.play !== 'function') { say(t('atlas.noAudio', 'Audio is not available here.')); return; }
    try {
      const r = await ctx.audio.play('letter', audioId);
      if (unmounted) return;
      if (!r || r.source === 'none') say(t('atlas.noClip', 'No audio for this one yet.'));
      else if (r.source === 'tts-fallback') say(t('atlas.tts', 'Playing a computer voice (no recording yet).'));
      else say('');
    } catch (e) { say(t('atlas.noClip', 'No audio for this one yet.')); }
  }

  /** Lecture packs use aleph/…; atlas letter ids use alef/…. */
  const LECTURE_ID = { alef: 'aleph' };
  function lectureBase(tile) {
    const raw = (tile && (tile.parent || tile.id)) || '';
    return LECTURE_ID[raw] || raw;
  }
  async function hearExplain(tile) {
    if (!ctx.audio || typeof ctx.audio.play !== 'function') { say(t('atlas.noAudio', 'Audio is not available here.')); return; }
    const id = lectureBase(tile) + '-explain-en';
    try {
      const r = await ctx.audio.play('letter-lecture', id);
      if (!r || r.source === 'none') say(t('atlas.noClip', 'No audio for this one yet.'));
      else if (r.source === 'tts-fallback') say(t('atlas.tts', 'Playing a computer voice (no recording yet).'));
      else say('');
    } catch (e) { say(t('atlas.noClip', 'No audio for this one yet.')); }
  }


  function startQuiz() {
    const pool = state.tiles.filter((x) => x.kind !== 'variant');
    const target = pool[Math.floor(Math.random() * pool.length)];
    state.quiz = { target: target.id, score: (state.quiz && state.quiz.score) || { ok: 0, n: 0 }, wrong: null, right: null, warning: null };
  }

  function onTile(tile) {
    const q = state.quiz;
    if (!q) { state.selected = tile.id; state.alt = false; hear(tile.soundAudioId); render(); return; }
    if (q.right) return;
    if (tile.kind === 'variant') { state.quiz.msg = t('atlas.quizSkipVariant', 'Pick one of the main letters for the quiz.'); render(); return; }
    q.score.n++;
    if (tile.id === q.target) { q.score.ok++; q.right = tile.id; q.warning = null; q.wrong = null; hear(tile.soundAudioId); }
    else {
      q.wrong = tile.id;
      const w = warningAfterWrongTap(q.target, tile.id, state.interf, state.conf); // null unless a genuine look-alike mix-up
      q.warning = w ? w.hint : null;
    }
    render();
  }

  let memCard = null, practiceUnmount = null;
  function render() {
    if (practiceUnmount) { try { practiceUnmount(); } catch (e) { /* ignore */ } practiceUnmount = null; }
    if (memCard) { try { memCard.destroy(); } catch (e) { /* ignore */ } memCard = null; }
    // keep keyboard focus: the screen is rebuilt on every press, so remember what had focus and put it back afterwards
    const ae = document.activeElement;
    const keep = ae && ae !== document.body && body.contains(ae) ? (ae.getAttribute('data-tile') ? '[data-tile="' + ae.getAttribute('data-tile') + '"]' : ae.getAttribute('data-act') ? '[data-act="' + ae.getAttribute('data-act') + '"]' : '[data-act="quiz"]') : null;
    body.textContent = '';
    if (state.practice) { // memory-chain practice round: picture / sound hook / word -> letter (loaded on demand; answers go to the spaced-review deck)
      const host = h('div', { class: 'mem-host' }); body.appendChild(host);
      const back = () => { state.practice = false; render(); };
      import('./memory.view.js').then((m) => m.mountMemoryPractice(host, ctx, { onExit: back }))
        .then((un) => { if (unmounted || !state.practice) { if (un) un(); } else practiceUnmount = un; })
        .catch(() => { host.textContent = ''; host.appendChild(h('p', { role: 'alert', text: t('atlas.practiceError', 'The practice round did not load. Please try again.') })); host.appendChild(h('button', { onclick: back }, t('atlas.back', 'Back'))); });
      return;
    }
    const q = state.quiz;
    body.appendChild(h('div', { class: 'row' },
      h('button', { 'data-act': 'practice', onclick: () => { state.quiz = null; state.practice = true; render(); } }, t('atlas.practice', 'Practice: picture, sound, word')),
      h('button', { 'data-act': 'quiz', 'aria-pressed': !!q, onclick: () => { if (q) state.quiz = null; else startQuiz(); render(); } }, q ? t('atlas.quizOff', 'Stop quiz') : t('atlas.quizOn', 'Quiz me: find the letter')),
      h('span', { class: 'muted' }, t('atlas.help', 'Tap a tile to hear its sound. The symbols between slashes show the sound, as in a dictionary. Dashed tiles are the second sound of a two-sound letter.'))));
    statusEl = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' }, state.status || '');

    if (q) {
      const tg = tileById(q.target);
      const box = h('div', { class: 'panel' },
        picture(h, ctx, 'id', SCENE.letterRush, { width: 480, class: 'scene-art' }),
        h('strong', {}, t('atlas.find', 'Find: ') + tg.name + '  '), h('span', { class: 'muted' }, tg.ipa ? '/' + tg.ipa + '/' : ''),
        h('div', { class: 'row' }, h('button', { onclick: () => hear(tg.nameAudioId) }, t('atlas.hearName', 'Hear it'))),
        q.right ? h('p', {}, t('atlas.good', 'Good! ') + tg.name, ' ', h('button', { 'data-act': 'next', onclick: () => { startQuiz(); render(); } }, t('atlas.next', 'Next'))) : null,
        q.wrong && !q.right ? h('p', { role: 'alert' }, t('atlas.notThat', 'That is ') + tileById(q.wrong).name + '.') : null,
        q.warning && !q.right ? h('p', { class: 'warn' }, h('strong', {}, t('atlas.lookalike', 'Look-alike: ')), q.warning) : null,
        q.msg ? h('p', { class: 'muted' }, q.msg) : null,
        h('p', { class: 'muted' }, t('atlas.score', 'Score: ') + q.score.ok + ' / ' + q.score.n));
      q.msg = null;
      body.appendChild(box);
    }

    const list = h('ul', { class: 'tiles', dir: 'rtl', 'aria-label': t('atlas.tiles', 'All 31 letter forms') });
    for (const tile of state.tiles) {
      const cls = ['tile', tile.kind, q && q.wrong === tile.id && !q.right ? 'wrong' : '', q && q.right === tile.id ? 'right' : ''].filter(Boolean).join(' ');
      list.appendChild(h('li', {}, h('button', {
        class: cls, 'data-tile': tile.id, 'aria-pressed': !q && state.selected === tile.id, 'aria-label': q ? tile.glyph + ' ' + tile.name : null,
        onclick: () => onTile(tile)
      }, h('span', { class: 'g', dir: 'rtl', lang: 'he' }, tile.glyph), h('span', { class: 'n' }, q ? '' : tile.name), h('span', { class: 's' }, q || !tile.ipa ? '' : '/' + tile.ipa + '/'))));
    }
    body.appendChild(list);

    const sel = !q && state.selected && tileById(state.selected);
    if (sel) {
      const m = sel.mn || {};
      // the memory chain is the one source for picture, story and word; a variant (vet, khaf, fe, sin) shows its parent letter's card
      const own = entryFor(state.chain, sel.id), viaParent = !own && sel.parent ? entryFor(state.chain, sel.parent) : null;
      const cardEntry = own || viaParent, chained = !!cardEntry;
      const panel = h('div', { class: 'panel', 'data-detail': sel.id },
        ctx.img?.(h, { kind: 'letter', id: sel.id, script: state.script, variant: state.alt ? 'alt' : undefined, width: 600, class: 'at-pic' }),
        h('div', { class: 'row' },
          h('span', { class: 'big', dir: 'rtl', lang: 'he' }, sel.glyph),
          h('div', {}, h('strong', {}, sel.name), h('br'), h('span', {}, (sel.ipa ? '/' + sel.ipa + '/  ' : '') + (m.soundAnchor || sel.soundEn || '')),
            sel.soundEn && sel.soundEnIsraeli && sel.soundEn !== sel.soundEnIsraeli ? h('span', { class: 'muted', text: ' In your setting: ' + sel.soundEn }) : null)),
        h('div', { class: 'row' },
          h('button', { onclick: () => hear(sel.soundAudioId) }, t('atlas.hearSound', 'Hear the sound')),
          h('button', { onclick: () => hear(sel.nameAudioId) }, t('atlas.hearName', 'Hear the name')),
          h('button', { onclick: () => hearExplain(sel) }, t('atlas.hearExplain', 'Hear the explanation')),
          m.altStory && !chained ? h('button', { 'aria-pressed': state.alt, onclick: () => { state.alt = !state.alt; render(); } }, t('atlas.another', 'Another picture')) : null),
        viaParent ? h('p', { class: 'muted', 'data-variant-note': sel.id }, t('atlas.variantNote', sel.name + ' is ' + (cardEntry.name || sel.parent) + ', told apart by its dot, so it shares that letter\u2019s picture below. Sound: ') + (m.sound || sel.soundEn || '') + '.') : null,
        (() => { const me = cardEntry; if (!me) return state.chain ? null : memoryFallback(t); memCard = buildMemoryCard({ entry: me, glyph: viaParent ? (tileById(sel.parent) || {}).glyph || sel.glyph : sel.glyph, tradition: congregationOf(ctx.settings), audio: ctx.audio, t, fetchFn: ctx.fetch }); return memCard.el; })(),
        m.shape ? h('p', {}, h('strong', {}, t('atlas.shape', 'Shape: ')), m.shape) : null,
        m.story && !chained ? h('p', {}, h('strong', {}, t('atlas.story', 'Story: ')), state.alt && m.altStory ? m.altStory : m.story) : null,
        m.lookalike ? h('p', {}, h('strong', {}, t('atlas.lookalikeLabel', 'Do not confuse with: ')), m.lookalike) : null,
        m.word && !chained ? h('p', { dir: 'rtl', lang: 'he' }, m.word, ' ', h('span', { dir: 'ltr' }, '(' + m.wordSound + ' = ' + m.wordMeaning + ')')) : null,
        h('p', { class: 'muted' }, t('atlas.draft', 'Draft memory hooks: sound-alike stories, not history, and not yet checked by a Hebrew teacher.')),
        ctx.route ? h('p', {}, h('button', { onclick: () => { try { ctx.route('/letters/' + (sel.parent || sel.id)); } catch (e) { /* ignore */ } } }, t('atlas.trace', 'Trace this letter'))) : null);
      body.appendChild(panel);
    }
    body.appendChild(statusEl);
    if (keep) { const el = body.querySelector(keep) || body.querySelector('[data-act="quiz"]'); if (el) el.focus(); }
  }

  return function unmount() { unmounted = true; if (practiceUnmount) { try { practiceUnmount(); } catch (e) { /* ignore */ } } if (memCard) { try { memCard.destroy(); } catch (e) { /* ignore */ } } root.textContent = ''; };
}
