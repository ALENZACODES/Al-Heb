// ALEF lane 2 view: Letter Atlas. All 31 tiles (27 letters + vet, khaf, fe, sin) with sound, memory hook,
// tap-to-hear, and an optional "find the letter" quiz that shows a look-alike warning only after a wrong tap.
// Plain DOM, no dependencies. export mount(root, ctx) -> unmount.
// ctx (from the shell): {settings, store, audio, route, t, params}. Everything is optional.
// Test/offline hooks: ctx.letters, ctx.mnemonics, ctx.confusables, ctx.interference supply already-loaded data.
// @ts-check
import { warningAfterWrongTap } from './interference.js';

const DATA = (name) => new URL('../../data/letters/' + name, import.meta.url).href;
async function loadJson(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url); return r.json(); }

const DAGESH = 'ּ', SHIN_DOT = 'ׁ', SIN_DOT = 'ׂ';
/** Glyph shown on the tile. The two-sound letters show the mark that selects the sound. */
const TILE_GLYPH = { bet: 'ב' + DAGESH, vet: 'ב', kaf: 'כ' + DAGESH, khaf: 'כ', pe: 'פ' + DAGESH, fe: 'פ', shin: 'ש' + SHIN_DOT, sin: 'ש' + SIN_DOT };
const VARIANT_IPA = { vet: 'v', khaf: 'χ', fe: 'f', sin: 's' };
const HARD_IPA = { bet: 'b', kaf: 'k', pe: 'p', shin: 'ʃ' };
const FINAL_RE = /-final$/;

/**
 * Build the 31 atlas tiles (pure, tested). Variants follow their parent.
 * @param {any[]} letters letters.json  @param {{letters?:any[], variants?:any[]}|null} mn mnemonics.json
 */
export function buildTiles(letters, mn) {
  const byId = {}; for (const m of ((mn && mn.letters) || [])) byId[m.id] = m;
  for (const m of ((mn && mn.variants) || [])) byId[m.id] = m;
  const variants = ((mn && mn.variants) || []);
  const tiles = [];
  for (const l of letters) {
    tiles.push({
      id: l.id, name: l.name, he: l.he, glyph: TILE_GLYPH[l.id] || l.he,
      ipa: HARD_IPA[l.id] || (l.sound && l.sound.ipa) || '', soundEn: l.sound && l.sound.en, kind: FINAL_RE.test(l.id) ? 'final' : 'letter',
      soundAudioId: FINAL_RE.test(l.id) ? l.id : l.id + '-sound', nameAudioId: l.id, parent: null, mn: byId[l.id] || null
    });
    for (const v of variants.filter((x) => x.parent === l.id)) {
      tiles.push({
        id: v.id, name: v.name, he: l.he, glyph: TILE_GLYPH[v.id] || l.he, ipa: VARIANT_IPA[v.id] || '', soundEn: v.sound, kind: 'variant',
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
.alef-atlas button:focus-visible{outline:3px solid #e67e22;outline-offset:2px}
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
  const state = { status: '', tiles: /** @type {any[]} */ ([]), selected: null, alt: false, quiz: null, conf: null, interf: null };
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
    ctx.interference || loadJson(DATA('interference.json')).catch(() => null)
  ]).then(([letters, mn, conf, interf]) => {
    if (unmounted) return;
    state.tiles = buildTiles(letters, mn); state.conf = conf; state.interf = interf;
    const want = ctx.params && ctx.params.id;
    state.selected = (want && state.tiles.find((x) => x.id === want)) ? want : null;
    render();
  }).catch((err) => {
    if (unmounted) return;
    body.textContent = '';
    body.appendChild(h('p', { role: 'alert', text: t('atlas.loadError', 'Could not load the atlas: ') + (err && err.message) }));
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

  function render() {
    body.textContent = '';
    const q = state.quiz;
    body.appendChild(h('div', { class: 'row' },
      h('button', { 'aria-pressed': !!q, onclick: () => { if (q) state.quiz = null; else startQuiz(); render(); } }, q ? t('atlas.quizOff', 'Stop quiz') : t('atlas.quizOn', 'Quiz me: find the letter')),
      h('span', { class: 'muted' }, t('atlas.help', 'Tap a tile to hear its sound. Dashed tiles are the second sound of a two-sound letter.'))));
    statusEl = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' }, state.status || '');

    if (q) {
      const tg = tileById(q.target);
      const box = h('div', { class: 'panel' },
        h('strong', {}, t('atlas.find', 'Find: ') + tg.name + '  '), h('span', { class: 'muted' }, '/' + tg.ipa + '/'),
        h('div', { class: 'row' }, h('button', { onclick: () => hear(tg.nameAudioId) }, t('atlas.hearName', 'Hear it'))),
        q.right ? h('p', {}, t('atlas.good', 'Good! ') + tg.name, ' ', h('button', { onclick: () => { startQuiz(); render(); } }, t('atlas.next', 'Next'))) : null,
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
        class: cls, 'data-tile': tile.id, 'aria-pressed': !q && state.selected === tile.id, 'aria-label': tile.name + (q ? '' : ', /' + tile.ipa + '/'),
        onclick: () => onTile(tile)
      }, h('span', { class: 'g', dir: 'rtl', lang: 'he', 'aria-hidden': 'true' }, tile.glyph), h('span', { class: 'n' }, q ? '' : tile.name), h('span', { class: 's' }, q ? '' : '/' + tile.ipa + '/'))));
    }
    body.appendChild(list);

    const sel = !q && state.selected && tileById(state.selected);
    if (sel) {
      const m = sel.mn || {};
      const panel = h('div', { class: 'panel', 'data-detail': sel.id },
        h('div', { class: 'row' },
          h('span', { class: 'big', dir: 'rtl', lang: 'he' }, sel.glyph),
          h('div', {}, h('strong', {}, sel.name), h('br'), h('span', {}, '/' + sel.ipa + '/  ' + (m.soundAnchor || sel.soundEn || '')))),
        h('div', { class: 'row' },
          h('button', { onclick: () => hear(sel.soundAudioId) }, t('atlas.hearSound', 'Hear the sound')),
          h('button', { onclick: () => hear(sel.nameAudioId) }, t('atlas.hearName', 'Hear the name')),
          m.altStory ? h('button', { 'aria-pressed': state.alt, onclick: () => { state.alt = !state.alt; render(); } }, t('atlas.another', 'Another picture')) : null),
        m.shape ? h('p', {}, h('strong', {}, t('atlas.shape', 'Shape: ')), m.shape) : null,
        m.story ? h('p', {}, h('strong', {}, t('atlas.story', 'Story: ')), state.alt && m.altStory ? m.altStory : m.story) : null,
        m.lookalike ? h('p', {}, h('strong', {}, t('atlas.lookalikeLabel', 'Do not confuse with: ')), m.lookalike) : null,
        m.word ? h('p', { dir: 'rtl', lang: 'he' }, m.word, ' ', h('span', { dir: 'ltr' }, '(' + m.wordSound + ' = ' + m.wordMeaning + ')')) : null,
        h('p', { class: 'muted' }, t('atlas.draft', 'Draft memory hooks: sound-alike stories, not history, and not yet checked by a Hebrew teacher.')),
        ctx.route ? h('p', {}, h('button', { onclick: () => { try { ctx.route('/letters/' + (sel.parent || sel.id)); } catch (e) { /* ignore */ } } }, t('atlas.trace', 'Trace this letter'))) : null);
      body.appendChild(panel);
    }
    body.appendChild(statusEl);
  }

  return function unmount() { unmounted = true; root.textContent = ''; };
}
