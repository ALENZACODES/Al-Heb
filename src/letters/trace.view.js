// Aleph lane 2 view: letter picker, print/cursive tracing, confusable drill, SI-1452 typing trainer.
// Plain DOM, no dependencies. export mount(root, ctx) -> unmount.
// ctx (from lane 8 shell): {settings, store, audio, route, t}. Everything on ctx is optional here.
// Test/offline hooks: ctx.letters, ctx.confusables, ctx.keyboard, ctx.consonants may supply already-loaded data.
// @ts-check
import { createTracer, MODES } from './trace.js';
import { createTrainer, keyboardRows, XKB_TO_DOM } from './typing.js';
import { createProgress } from './progress.js';
import { matchLetter } from './shapecheck.js';
import { warningAfterWrongTap } from './interference.js';
import { letterSound, congregationOf } from '../pronunciation/forTradition.js';
import { loadMemoryChain, entryFor, buildMemoryCard, memoryFallback, retryMemoryChainLater } from './memorycard.js';
import { describeLetterStrokes, STROKE_WORDS_NOTE } from './strokewords.js';
import { shapeLabel } from './shapetext.js';
import { makeRoving } from '../shell/roving.js';
import { ROSTER } from './roster.js';

/** Records whose LETTERFORM (not just the order) the builder doubts most: docs/letters/REVIEW-LIST.md "DOUBT (HIGH)". */
export const HIGH_DOUBT = { 'pe-final': ['cursive'], 'tsadi-final': ['cursive'] };

/**
 * Review status line for one stroke record. Pure: used by the view and by tests.
 * @param {{id:string}} letter
 * @param {'print'|'cursive'} script
 * @param {(key:string, fallback:string)=>string} [t]
 * @returns {{level:'none'|'draft'|'high', text:string}}
 */
export function reviewNotice(letter, script, t = (k, f) => f) {
  const block = letter && letter[script];
  if (!block) return { level: 'none', text: '' };
  if ((HIGH_DOUBT[letter.id] || []).includes(script)) {
    return { level: 'high', text: t('trace.highDoubt', 'Caution: the ' + script + ' form of this letter may not be the one Israeli schools teach, and its stroke order is an unreviewed draft. Do not learn it from here until a teacher has confirmed it.') };
  }
  if (block.validated === false || block.needsNativeReview) {
    return { level: 'draft', text: t('trace.draftStrokes', 'Follow the arrows to write the letter.') };
  }
  return { level: 'none', text: '' };
}

const DATA = (name) => new URL('../../data/letters/' + name, import.meta.url).href;
const PRON = (name) => new URL('../../data/pronunciation/' + name, import.meta.url).href;

async function loadJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
  return r.json();
}

/** tiny hyperscript helper */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (typeof v === 'boolean' && k.startsWith('aria-')) { e.setAttribute(k, String(v)); continue; } // aria-pressed={true} must be "true", not ""
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}
const he = (text, attrs = {}) => h('span', Object.assign({ dir: 'rtl', lang: 'he' }, attrs), text);

const CSS = `
.alef-trace{font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:12px;color:#1b1b1f}
.alef-trace button{font:inherit;cursor:pointer;border:1px solid #9aa;background:#fff;border-radius:8px;padding:8px 12px;min-height:44px}
.alef-trace button[aria-pressed=true],.alef-trace button[aria-selected=true]{background:var(--accent,#1e4634);color:var(--accent-fg,#fffaf0);border-color:var(--accent,#1e4634)}
.alef-trace button:focus-visible{outline:3px solid var(--focus,#b45309);outline-offset:2px}
.alef-trace .tabs{display:flex;gap:6px;margin:8px 0}
.alef-trace .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:6px;margin:8px 0}
.alef-trace .grid button{font-size:1.6rem;padding:4px}
.alef-trace .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.alef-trace .notice{background:#fff4e0;border:1px solid #e0b060;border-radius:8px;padding:8px 10px;font-size:.9rem}
.alef-trace .notice-high{background:#fde8e8;border-color:#c0392b;color:#5a1010;font-weight:bold}
.alef-trace .feedback{min-height:2.2em;font-size:1.05rem;margin:6px 0}
.alef-trace .stage{background:#fff;border:1px solid #ccd;border-radius:12px;padding:6px;min-height:min(70vw,22rem)}
.alef-trace .big{font-size:4rem;line-height:1.1}.alef-trace .letter-meta{min-height:0}
.alef-trace .kb{direction:ltr;display:flex;flex-direction:column;gap:4px;margin:10px 0;user-select:none}
.alef-trace .kb .r{display:flex;gap:4px;justify-content:center}
.alef-trace .kb .k{min-width:34px;min-height:44px;padding:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.2rem}
.alef-trace .kb .k small{font-size:.6rem;color:#667}
.alef-trace .kb .k.hit{background:#c8f0c8}.alef-trace .kb .k.want{outline:3px solid var(--focus,#b45309)}
.alef-trace .grid button{position:relative}
.alef-trace .badge{position:absolute;top:1px;right:3px;font-size:.7rem;color:#1a7f37;font-weight:bold}
.alef-trace .chip{display:inline-block;background:#e3f6e8;color:#14582a;border:1px solid #9bd3ab;border-radius:999px;padding:1px 10px;font-size:.85rem;margin-inline-start:6px}
.alef-trace .opts{display:flex;gap:10px;flex-wrap:wrap}
.alef-trace .opts button{font-size:2.4rem;min-width:72px}
.alef-trace .strokewords{border:1px solid #ccd;border-radius:8px;padding:6px 10px;margin:8px 0}
.alef-trace .strokewords summary{min-height:44px;display:flex;align-items:center;cursor:pointer}
.alef-trace .sw-now{min-height:2.4em;font-weight:600}
.alef-trace .sw-h{font-size:1rem;margin:8px 0 4px}
.alef-trace .sw-list li{margin:4px 0}
`;

/**
 * @param {HTMLElement} root
 * @param {any} ctx
 * @returns {() => void}
 */
export function mount(root, ctx = {}) {
  const t = (key, fallback) => { try { const v = ctx.t && ctx.t(key); return v && v !== key ? v : fallback; } catch (e) { return fallback; } };
  const state = {
    letters: /** @type {any[]} */ ([]), confusables: null, keyboard: null,
    tab: 'trace', letterId: (ctx.params && typeof ctx.params.id === 'string' && ctx.params.id) || 'alef', script: (ctx.settings && (ctx.settings.script === 'cursive' || ctx.settings.script === 'print')) ? ctx.settings.script : 'print',
    strict: false, outline: true, step: false
  };
  { const q = ctx.query && ctx.query.tab; if (q === 'drill') state.tab = 'drill'; else if (q === 'type' || q === 'typing') state.tab = 'typing'; }
  const progress0 = createProgress(ctx.store);
  let assistedRun = false; // true once "Next stroke" was used in this run: the run then counts as walked through, not drawn
  let attempt = []; // raw learner strokes since the last reset, for the whole-shape fallback hint
  let tracer = null, keyHandler = null, unmounted = false, trainer = null, memCard = null;
  const cleanups = [];

  const keptTitle = root.querySelector && root.querySelector('#view-title');
  const keptGlyph = root.querySelector && root.querySelector('.alef-first-glyph');
  // Keep the first-paint title (and glyph) in #main. Clearing or reparenting them resets LCP.
  if (keptTitle || keptGlyph) {
    const kids = root.children ? [...root.children] : (root.childNodes ? [...root.childNodes] : []);
    for (const n of kids) {
      if (n === keptTitle || n === keptGlyph) continue;
      if (n.remove) n.remove();
      else if ((n.parentNode || n.parent) && (n.parentNode || n.parent).removeChild) (n.parentNode || n.parent).removeChild(n);
      else if (root.textContent !== undefined && !keptTitle && !keptGlyph) root.textContent = '';
    }
  } else {
    root.textContent = '';
  }
  const wrap = h('div', { class: 'alef-trace' });
  wrap.appendChild(h('style', { text: CSS }));
  const body = h('div', {});
  body.style.minBlockSize = 'calc(100svh - 9.5rem)';
  wrap.appendChild(body);
  root.appendChild(wrap);
  // First paint from the compact roster so the letter and stage space are on screen
  // before the 200 KB stroke file arrives (and so the inner tree does not grow from a one-line loading status).
  state.letters = ROSTER.slice();
  render();

  Promise.all([
    ctx.letters || loadJson(DATA('letters.json')),
    ctx.confusables || loadJson(DATA('confusables.json')).catch(() => null),
    ctx.keyboard || loadJson(DATA('keyboard-si1452.json')).catch(() => null),
    ctx.mnemonics || loadJson(DATA('mnemonics.json')).catch(() => null),
    ctx.interference || loadJson(DATA('interference.json')).catch(() => null),
    ctx.consonants || loadJson(PRON('consonants.json')).catch(() => null),
    ctx.memoryChain || loadMemoryChain()
  ]).then(([letters, conf, kb, mn, interf, consonants, chain]) => {
    if (unmounted) return;
    state.letters = letters; state.confusables = conf; state.keyboard = kb; state.interference = interf;
    state.consonants = (consonants && consonants.letters) || null; state.chain = chain || null;
    state.mnemonics = {}; for (const m of ((mn && mn.letters) || [])) state.mnemonics[m.id] = m;
    render();
    // S-04: chain failed; retry and swap the card in for the fallback line.
    if (!chain && !ctx.memoryChain) cleanups.push(retryMemoryChainLater((c) => {
      if (unmounted) return; state.chain = c;
      const line = body.querySelector?.('[data-memory-fallback]'); const letter = state.letters && (letterById(state.letterId) || state.letters[0]);
      const me = letter && entryFor(c, letter.id);
      if (!line || !me) return;
      memCard = buildMemoryCard({ entry: me, glyph: letter.he, tradition: congregationOf(ctx.settings), audio: ctx.audio, t, fetchFn: ctx.fetch, compact: true });
      line.replaceWith(memCard.el);
    }, { fetchFn: ctx.fetch }));
  }).catch(err => {
    if (unmounted) return;
    body.textContent = '';
    body.appendChild(h('p', { role: 'alert', text: t('trace.loadError', 'The letter data did not load. Please reload the page and try again.') }));
  });

  function teardownInner() {
    if (memCard) { try { memCard.destroy(); } catch (e) { /* ignore */ } memCard = null; }
    if (tracer) { try { tracer.destroy(); } catch (e) { /* ignore */ } tracer = null; }
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
  }

  /** Re-rendering replaces every node, which drops keyboard focus to <body>. Remember the focused control and put focus back on its twin. */
  function focusSig() {
    const ae = document.activeElement;
    if (!ae || ae === document.body || !body.contains(ae) || !/^(BUTTON|A)$/.test(ae.tagName)) return null;
    const grp = ae.closest('[aria-label]');
    return { tag: ae.tagName, label: ae.getAttribute('aria-label'), text: (ae.textContent || '').trim(), act: ae.getAttribute('data-act'), role: ae.getAttribute('role'), grp: grp && grp !== ae ? grp.getAttribute('aria-label') : null };
  }
  function restoreFocus(sig) {
    if (!sig) return;
    const c = [...body.querySelectorAll(sig.tag.toLowerCase())].filter(e => e.getAttribute('data-act') === sig.act && e.getAttribute('role') === sig.role && e.getAttribute('aria-label') === sig.label && (e.textContent || '').trim() === sig.text);
    const el = c.find(e => { const g = e.closest('[aria-label]'); return (g && g !== e ? g.getAttribute('aria-label') : null) === sig.grp; }) || c[0];
    if (el) { try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }

  function render() {
    const sig = focusSig();
    renderInner();
    restoreFocus(sig);
  }

  function renderInner() {
    teardownInner();
    body.textContent = '';
    if (ctx.params && typeof ctx.params.id === 'string' && ctx.params.id && !letterById(ctx.params.id)) {
      body.appendChild(h('h2', { role: 'alert', text: t('trace.notFound', 'Letter not found') }));
      body.appendChild(h('p', {}, t('trace.notFoundBody', 'There is no letter called "') + ctx.params.id + t('trace.notFoundBody2', '". ') , h('a', { class: 'btn', href: '#/letters' }, t('trace.backToLetters', 'Back to all letters'))));
      return;
    }
    const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': t('trace.tabs', 'Letter practice') },
      ...[['trace', t('trace.tabTrace', 'Trace')], ['drill', t('trace.tabDrill', 'Look-alikes')], ['typing', t('trace.tabTyping', 'Typing')]].map(([id, label]) =>
        h('button', { role: 'tab', 'aria-selected': state.tab === id, onclick: () => { state.tab = id; render(); } }, label)));
    body.appendChild(tabs);
    
    if (state.tab === 'trace') { renderTrace(); inVisualOrder(body); }
    else if (state.tab === 'drill') renderDrill();
    else renderTyping();
  }

  function letterById(id){ return state.letters.find(l => l.id === id); }

  // Keyboard and screen reader order must follow what is drawn. On phones app.css re-orders this tab's blocks (the stage rises to the
  // top, see QA defect O1); the same ranking is applied here to the DOM so Tab, and reading order, go top to bottom. Ties keep DOM order.
  function inVisualOrder(host) {
    if (typeof host.append !== 'function' || !host.children?.[0]?.matches) return; // a stripped-down DOM (unit tests) has no sibling/selector API
    const kids = [...host.children]; const last = kids[kids.length - 1];
    const rank = (e) => e.classList.contains('tabs') ? 1 : e.classList.contains('grid') ? 2
      : e.matches('.row') && e.querySelector(':scope > .big') ? 3 : e.classList.contains('stage') ? 5 : e.classList.contains('feedback') ? 6
      : e.matches('.row') && e.previousElementSibling && e.previousElementSibling.classList.contains('feedback') ? 7
      : e.matches('.row') && e.previousElementSibling && e.previousElementSibling.matches('.row') && e.previousElementSibling.previousElementSibling && e.previousElementSibling.previousElementSibling.classList.contains('feedback') ? 7
      : e.matches('.row') && e.previousElementSibling && e.previousElementSibling.classList.contains('grid') ? 8
      : e.classList.contains('mc') ? (e.hasAttribute('data-first') ? 3.5 : 8.5)
      : e.matches('.notice') && e.previousElementSibling && e.previousElementSibling.classList.contains('tabs') ? 9
      : e.classList.contains('sw-wrap') ? 8.2
      : e.matches('details.remember') ? 10 : e.matches('.notice') && e === last ? 11 : 20;
    const ranked = kids.map((e, i) => [rank(e), i, e]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    host.append(...ranked.map((r) => r[2]));
  }

  // ------------------------------------------------------------ trace tab
  function picker(onPick, current) {
    const g = h('div', { class: 'grid', dir: 'rtl', role: 'group', 'aria-label': t('trace.letters', 'Letters') });
    for (const l of state.letters) {
      const done = progress0.isCompleted(l.id, state.script);
      g.appendChild(h('button', { dir: 'rtl', lang: 'he', 'aria-label': l.name + (done ? ', ' + t('trace.completed', 'drawn by you') : ''), title: l.name + (done ? ' (' + t('trace.completed', 'drawn by you') + ')' : ''), 'data-completed': done ? '1' : false, 'aria-pressed': l.id === current, onclick: () => onPick(l.id) }, l.he, done ? h('span', { class: 'badge', 'aria-hidden': 'true' }, '\u2713') : null));
    }
    try { makeRoving(g); } catch { /* a stripped-down DOM (unit tests) has no layout; every button then stays a tab stop */ }
    return g;
  }

  function renderTrace() {
    const letter = letterById(state.letterId) || state.letters[0];
    let cardHost = null;
    const strokesReady = !!(letter && letter[state.script] && letter[state.script].strokes);
    // first look: the first two letters of the first-day flow (Shin, then Bet) one tap away, one compact row
    { const fl = ['shin', 'bet'].map(letterById).filter(Boolean);
      if (fl.length === 2) body.appendChild(h('div', { class: 'row', 'data-firstlook': '1', role: 'group', 'aria-label': t('trace.firstLook', 'First look') },
        h('strong', {}, t('trace.firstLook', 'First look') + ':'),
        ...fl.map(l => h('a', { class: 'btn secondary', href: '#/letters/' + l.id, 'data-firstlook-id': l.id, 'aria-current': l.id === letter.id ? 'true' : false }, l.name + ' ', h('span', { lang: 'he', dir: 'rtl' }, l.he))))); }
    body.appendChild(picker(id => { state.letterId = id; render(); }, letter.id));
    const toggle = h('div', { class: 'row script-toggles', role: 'group', 'aria-label': t('trace.script', 'Script') },
      h('button', { 'aria-pressed': state.script === 'print', onclick: () => { state.script = 'print'; render(); } }, t('trace.print', 'Print')),
      h('button', { 'aria-pressed': state.script === 'cursive', onclick: () => { state.script = 'cursive'; render(); } }, t('trace.cursive', 'Cursive')),
      h('button', { 'aria-pressed': state.strict, onclick: () => { state.strict = !state.strict; render(); } }, t('trace.strict', 'Strict checking')),
      h('button', { 'aria-pressed': state.outline, onclick: () => { state.outline = !state.outline; render(); } }, t('trace.outline', 'Show outline')),
    );
    body.appendChild(toggle);
    { const rn = reviewNotice(letter, state.script, t); // above the drawing area so the caution is seen before the learner starts
      if (rn.level !== 'none') body.appendChild(h('p', { class: 'notice' + (rn.level === 'high' ? ' notice-high' : ''), 'data-review': rn.level, role: rn.level === 'high' ? 'alert' : undefined }, rn.text)); }
    body.appendChild(h('div', { class: 'row' },
      h('span', { class: 'big', dir: 'rtl', lang: 'he' }, letter.he),
      h('div', { class: 'letter-meta' }, h('strong', {}, letter.name + ' '), he(letter.nameHe), progress0.isCompleted(letter.id, state.script) ? h('span', { class: 'chip', role: 'status' }, '\u2713 ' + t('trace.completed', 'drawn by you') + ' (' + state.script + ')') : (progress0.isAssisted(letter.id, state.script) ? h('span', { class: 'chip', role: 'status' }, t('trace.walkedThrough', 'walked through with help, not drawn by you yet') + ' (' + state.script + ')') : null), h('br'), h('span', {}, (() => { const rec = state.consonants ? state.consonants[letter.id] : null; const trad = congregationOf(ctx.settings); const mine = letterSound(rec, trad, { fallbackEn: letter.sound?.en || '' }).en; return mine; })()))));
    { // memory card: letter -> picture -> sound hook -> word. For a letter the learner has not traced yet it sits right under the letter row,
      // above the stage (first screen on a phone); once traced it moves below the toggles so the stage stays first.
      const me = entryFor(state.chain, letter.id);
      if (me) {
        memCard = buildMemoryCard({ entry: me, glyph: letter.he, tradition: congregationOf(ctx.settings), audio: ctx.audio, t, fetchFn: ctx.fetch, compact: true });
        const traced = progress0.isCompleted(letter.id, 'print') || progress0.isCompleted(letter.id, 'cursive') || progress0.isAssisted(letter.id, state.script);
        if (!traced) memCard.el.setAttribute('data-first', '1');
        cardHost = { el: memCard.el, first: !traced };
        if (!traced) body.appendChild(memCard.el);
      } else if (!state.chain) cardHost = { el: memoryFallback(t), first: true, fallback: true };
      if (cardHost && cardHost.fallback) body.appendChild(cardHost.el);
    }
    const mn = state.mnemonics && state.mnemonics[letter.id];
    const chained = !!entryFor(state.chain, letter.id); // the card above is then the one story, picture and word; keep only what does not repeat or disagree with it
    if (mn) {
      body.appendChild(h('details', { class: 'remember', open: (typeof matchMedia === 'function' && matchMedia('(max-width: 600px)').matches) ? false : 'open' }, // closed by default on phones so the stage starts in the first screen
        h('summary', {}, t('trace.remember', 'Remember it')),
        h('p', {}, h('strong', {}, t('trace.shape', 'Shape: ')), mn.shape),
        chained ? null : h('p', {}, h('strong', {}, t('trace.sound', 'Sound: ')), mn.sound),
        chained ? null : h('p', {}, h('strong', {}, t('trace.story', 'Story: ')), mn.story),
        h('p', {}, h('strong', {}, t('trace.why', 'Why this name: ')), mn.reason),
        h('p', {}, h('strong', {}, t('trace.lookalike', 'Do not confuse with: ')), mn.lookalike),
        chained ? null : h('p', { dir: 'rtl', lang: 'he' }, mn.word, ' ', h('span', { dir: 'ltr' }, '(' + mn.wordSound + ' = ' + mn.wordMeaning + ')')),
        h('p', { class: 'muted' }, t('trace.mnDraft', 'Draft memory hook: not yet checked by a Hebrew teacher.'))));
    }
    if (cardHost && !cardHost.first) body.appendChild(cardHost.el);
    assistedRun = false;
    if (!strokesReady) {
      const stage = h('div', { class: 'stage' });
      const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' }, t('trace.loading', 'Loading the tracing area...'));
      body.appendChild(stage); body.appendChild(fb);
      return;
    }
    const block = letter[state.script];
    const stage = h('div', { class: 'stage' });
    const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' }, t('trace.start', 'Press Animate to see the order, then trace it.'));
    body.appendChild(stage); body.appendChild(fb);
    const progress = h('div', { class: 'row', role: 'status', 'aria-live': 'polite' });
    const setProgress = () => { const s = tracer.getState(); const n = s.done ? s.total : s.index; progress.textContent = t('trace.strokeCount', 'Stroke ') + n + t('trace.strokeOf', ' of ') + s.total + t('trace.strokeDone', ' done'); };
    try {
      tracer = createTracer(stage, letter, state.script, Object.assign({}, state.strict ? MODES.strict : MODES.forgiving, {
        showOutline: state.outline,
        onStrokeResult: r => { if (r.forced) assistedRun = true; /* the correct stroke was shown for you: not independent drawing */ fb.textContent = r.forced ? t('trace.shown', 'Here is the correct stroke.') : t('trace.good', 'Good!'); setProgress(); },
        onUserStroke: pts => { attempt.push(pts); if (attempt.length > 6) attempt.shift(); },
        onInputWhileDone: () => { fb.textContent = t('trace.finishedTap', 'This letter is finished. Press Start over to trace it again.'); },
        onMistake: m => {
          fb.textContent = t(m.feedback.key, m.feedback.text);
          if (m.totalMistakes >= 2) { // fallback: does the overall shape look like this letter even though strokes are off?
            try {
              const r = matchLetter(attempt, state.letters, state.script, { targetId: letter.id, ignoreDirection: true });
              if (r.looksLikeTarget) fb.textContent += ' ' + t('trace.shapeOk', 'Your overall shape looks like this letter; check the stroke order and direction (press Animate).');
            } catch (e) { /* hint is optional */ }
          }
        },
        onComplete: c => {
          fb.textContent = (assistedRun ? t('trace.walked', 'Walked through. ') : c.perfect ? t('trace.perfect', 'Perfect! ') : t('trace.done', 'Done. ')) + letter.name + ' ' + t('trace.againHint', 'Press Start over to trace it again.');
          try {
            attempt = [];
            if (assistedRun) { // walked through with the buttons: recorded apart from drawn completions
              progress0.recordAssisted(letter.id, state.script);
              fb.textContent += ' ' + t('trace.assistedNote', 'The app moved the strokes for you (stroke buttons or shown strokes), so this is recorded as walked through, not as drawn by you.');
              return;
            }
            progress0.record(letter.id, state.script, c);
            const cur = body.querySelector('.grid button[aria-pressed=true]');
            if (cur && !cur.querySelector('.badge')) { cur.setAttribute('data-completed', '1'); cur.appendChild(h('span', { class: 'badge', 'aria-hidden': 'true' }, '\u2713')); }
          } catch (e) { /* progress is best-effort */ }
          try { const p = ctx.audio && ctx.audio.play && ctx.audio.play('letter', letter.id); if (p && p.catch) p.catch(() => {}); } catch (e) { /* audio is optional */ }
        }
      }));
    } catch (e) {
      stage.textContent = t('trace.noStrokes', 'No stroke data for this letter.');
      return;
    }
    body.appendChild(h('div', { class: 'row' },
      h('button', { onclick: () => { fb.textContent = t('trace.animating', 'Watch the order...'); tracer.animate().then(() => { if (!unmounted) fb.textContent = t('trace.yourTurn', 'Your turn.'); }); } }, t('trace.animate', 'Animate')),
      h('button', { onclick: () => { tracer.hint(); } }, t('trace.hint', 'Hint')),
      h('button', { 'data-act': 'mode-step', 'aria-pressed': state.step, onclick: () => { state.step = !state.step; render(); const nb = body.querySelector('[data-act="mode-step"]'); if (nb) nb.focus(); } }, t('trace.modeStep', 'Walk me through it with buttons')),
      state.step ? h('button', { 'data-act': 'next-stroke', onclick: () => {
        const s = tracer.getState(); if (s.done) return;
        assistedRun = true; // set first: submit() can complete the letter synchronously
        tracer.submit(block.strokes[s.index].median.map(p => [p[0], p[1]]));
      } }, t('trace.nextStroke', 'Next stroke')) : null,
      h('button', { 'data-act': 'reset', onclick: () => { attempt = []; assistedRun = false; tracer.reset(); fb.textContent = t('trace.start', 'Press Animate to see the order, then trace it.'); setProgress(); } }, t('trace.reset', 'Start over'))));
    body.appendChild(progress); setProgress();
    body.appendChild(strokeWordsPanel(letter));
    { const svg = stage.querySelector && stage.querySelector('svg'); // the drawing is drag-on-canvas: point a screen reader to the text version
      if (svg) svg.setAttribute('aria-describedby', 'sw-hint'); }
  }

  /** Strokes in words: the same information as the drawing (where each stroke starts, which way it goes, what shape) as sentences, with a
   *  stepper. Collapsed by default so it does not crowd the first screen. Tracing itself stays a visual skill; the panel says so. */
  function strokeWordsPanel(letter) {
    const d = describeLetterStrokes(letter, state.script);
    const wrapEl = h('div', { class: 'sw-wrap' });
    wrapEl.appendChild(h('p', { id: 'sw-hint', class: 'visually-hidden' }, t('trace.swHint', 'The tracing area is drawn with a finger or mouse. A text description of every stroke is in the section called Strokes in words, below.')));
    const det = h('details', { class: 'strokewords', 'data-strokewords': '1' });
    wrapEl.appendChild(det);
    det.appendChild(h('summary', {}, t('trace.swTitle', 'Strokes in words') + ' (' + t('trace.swNoSee', 'no drawing needed') + ')'));
    det.appendChild(h('p', { class: 'notice', 'data-sw-note': '1' }, t('trace.swNote', STROKE_WORDS_NOTE)));
    if (!d.ok) { det.appendChild(h('p', {}, d.summary)); return wrapEl; }
    det.appendChild(h('p', {}, d.summary));
    const say = h('p', { class: 'sw-now', role: 'status', 'aria-live': 'polite', 'data-sw-now': '1' }, t('trace.swPress', 'Press Next stroke in words to hear stroke 1.'));
    let at = 0; // number of strokes already read out
    const show = () => { say.textContent = at < 1 ? t('trace.swPress', 'Press Next stroke in words to hear stroke 1.') : d.strokes[at - 1].sentence; };
    det.appendChild(h('div', { class: 'row' },
      h('button', { type: 'button', 'data-act': 'sw-prev', onclick: () => { if (at <= 1) { at = 0; say.textContent = t('trace.swStart', 'Back at the start. Press Next stroke in words to hear stroke 1.'); return; } at--; show(); } }, t('trace.swPrev', 'Previous stroke in words')),
      h('button', { type: 'button', 'data-act': 'sw-next', onclick: () => { if (at >= d.total) { say.textContent = t('trace.swLast', 'That was the last stroke.') + ' ' + d.strokes[d.total - 1].sentence; return; } at++; show(); } }, t('trace.swNext', 'Next stroke in words'))));
    det.appendChild(say);
    det.appendChild(h('p', { class: 'sw-h' }, h('strong', {}, t('trace.swAll', 'All strokes, in order'))));
    det.appendChild(h('ol', { class: 'sw-list' }, ...d.strokes.map(s => h('li', {}, s.sentence))));
    return wrapEl;
  }

  // ------------------------------------------------------------ look-alike drill
  function renderDrill() {
    const sets = ((state.confusables && state.confusables.sets) || []).filter(s => s.letters.length > 1);
    if (!state.drillSet || !sets.find(s => s.id === state.drillSet)) state.drillSet = sets[0] && sets[0].id;
    const set = sets.find(s => s.id === state.drillSet);
    if (!set) { body.appendChild(h('p', {}, t('trace.noSets', 'Look-alike sets are not available right now.'))); return; }
    body.appendChild(h('div', { class: 'row', role: 'group', 'aria-label': t('trace.sets', 'Look-alike sets') },
      ...sets.map(s => h('button', { dir: 'rtl', lang: 'he', 'aria-pressed': s.id === set.id, onclick: () => { state.drillSet = s.id; state.drillQ = null; render(); } },
        s.letters.map(id => (letterById(id) || {}).he).join(' ')))));
    // question: which glyph is <name>?
    const ids = set.letters;
    if (!state.drillQ || !ids.includes(state.drillQ.target)) state.drillQ = { target: ids[Math.floor(Math.random() * ids.length)], answered: null, score: (state.drillQ && state.drillQ.score) || { ok: 0, n: 0 } };
    const q = state.drillQ; const tl = letterById(q.target);
    body.appendChild(h('p', {}, t('trace.find', 'Find: ') + tl.name + ' '), );
    body.lastChild.appendChild(he(tl.nameHe));
    const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' }, q.answered ? q.answered : '');
    const opts = h('div', { class: 'opts', dir: 'rtl' });
    for (const id of ids.slice().sort(() => Math.random() - 0.5)) {
      const l = letterById(id);
      // the question names the target, so naming each option would hand over the answer: a screen reader gets each option's SHAPE in words (its name when there is no shape text)
      opts.appendChild(h('button', { lang: 'he', 'aria-label': shapeLabel(l, state.mnemonics && state.mnemonics[l.id]) || l.name, onclick: () => {
        q.score.n++;
        if (id === q.target) { q.score.ok++; fb.textContent = t('trace.good', 'Good!') + ' ' + l.name; state.drillQ = { target: null, score: q.score }; setTimeout(() => { if (!unmounted && state.tab === 'drill') render(); }, 900); }
        else { const w = warningAfterWrongTap(q.target, id, state.interference, state.confusables); fb.textContent = t('trace.notThat', 'That is ') + l.name + '.' + (w ? ' ' + w.hint : ''); } // look-alike hint only after a wrong tap
      } }, l.he));
    }
    body.appendChild(opts); body.appendChild(fb);
    body.appendChild(h('p', {}, t('trace.score', 'Score: ') + q.score.ok + ' / ' + q.score.n));
  }

  // ------------------------------------------------------------ typing tab
  function renderTyping() {
    const kb = state.keyboard;
    if (!kb) { body.appendChild(h('p', { role: 'alert' }, t('trace.noKb', 'The keyboard did not load. Please reload the page.'))); return; }
    const kind = state.typingKind || 'letter';
    const idsWithKey = Object.keys(kind === 'niqqud' ? kb.niqqud : kb.letters);
    trainer = createTrainer(kb, { kind, pool: idsWithKey });
    body.appendChild(h('div', { class: 'row', role: 'group', 'aria-label': t('trace.typeWhat', 'What to type') },
      h('button', { 'aria-pressed': kind === 'letter', onclick: () => { state.typingKind = 'letter'; render(); } }, t('trace.typeLetters', 'Letters')),
      h('button', { 'aria-pressed': kind === 'niqqud', onclick: () => { state.typingKind = 'niqqud'; render(); } }, t('trace.typeNiqqud', 'Vowel marks'))));
    const targetBox = h('div', { class: 'big', dir: 'rtl', lang: 'he', 'aria-live': 'polite' });
    const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    const kbEl = h('div', { class: 'kb', role: 'group', 'aria-label': t('trace.keyboard', 'Israeli SI-1452 keyboard') });
    const keyEls = new Map();
    for (const row of keyboardRows(kb)) {
      const r = h('div', { class: 'r' });
      for (const k of row) {
        const b = h('button', { class: 'k', tabindex: '-1', onclick: () => answer({ code: k.domCode, key: undefined, altGraph: kind === 'niqqud' }) },
          h('span', { dir: 'rtl', lang: 'he' }, k.base), h('small', {}, k.qwerty || ''));
        keyEls.set(k.domCode, b); r.appendChild(b);
      }
      kbEl.appendChild(r);
    }
    const stat = h('div', {});
    body.appendChild(targetBox); body.appendChild(kbEl); body.appendChild(fb); body.appendChild(stat);
    body.appendChild(h('p', { class: 'notice' }, t('trace.kbNote', 'This is the standard Israeli keyboard (SI-1452). Press the matching key on your keyboard. For vowel marks, hold AltGr (the right Alt key) or tap the key on screen. Shuruk, the "oo" vowel, has no key of its own: type vav, then the dot (dagesh).')));

    function show() {
      const tg = trainer.target(); const exp = trainer.expected();
      const l = kind === 'letter' ? letterById(tg.id) : null;
      targetBox.textContent = '';
      if (kind === 'letter') { targetBox.appendChild(document.createTextNode(l ? l.he : '')); }
      else targetBox.appendChild(document.createTextNode('◌' + (exp ? exp.char : '')));
      targetBox.setAttribute('aria-label', (l ? l.name : tg.id));
      keyEls.forEach(b => b.classList.remove('hit', 'want'));
      const s = trainer.stats();
      stat.textContent = s.correct + ' / ' + s.asked;
    }
    function answer(input) {
      const res = trainer.answer(input);
      const exp = res.expected;
      if (res.ok) { fb.textContent = t('trace.good', 'Good!'); const b = exp && keyEls.get(XKB_TO_DOM[exp.code]); show(); if (b) { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 400); } }
      else {
        fb.textContent = res.reason === 'needs-altgr' ? t('trace.needAltGr', 'Right key. Hold AltGr too.') : t('trace.tryKey', 'Not that key. The highlighted key is the one.');
        const b = exp && keyEls.get(XKB_TO_DOM[exp.code]); if (b) b.classList.add('want');
        const s = trainer.stats(); stat.textContent = s.correct + ' / ' + s.asked;
      }
    }
    keyHandler = (ev) => {
      if (['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'Tab', 'Escape'].includes(ev.key)) return;
      // Enter and Space belong to a focused button, link or field (a keyboard-only learner must still be able to press "Vowel marks")
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.closest && ev.target.closest('button, a, summary, select, input, textarea')) return;
      const altGraph = typeof ev.getModifierState === 'function' && (ev.getModifierState('AltGraph') || (ev.ctrlKey && ev.altKey));
      if (ev.preventDefault) ev.preventDefault();
      answer({ code: ev.code, key: ev.key, altGraph });
    };
    document.addEventListener('keydown', keyHandler);
    show();
  }

  return function unmount() {
    unmounted = true; teardownInner();
    cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    root.textContent = '';
  };
}
