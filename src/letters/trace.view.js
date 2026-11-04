// ALEF lane 2 view: letter picker, print/cursive tracing, confusable drill, SI-1452 typing trainer.
// Plain DOM, no dependencies. export mount(root, ctx) -> unmount.
// ctx (from lane 8 shell): {settings, store, audio, route, t}. Everything on ctx is optional here.
// Test/offline hooks: ctx.letters, ctx.confusables, ctx.keyboard may supply already-loaded data.
// @ts-check
import { createTracer, MODES } from './trace.js';
import { createTrainer, keyboardRows, XKB_TO_DOM } from './typing.js';
import { createProgress } from './progress.js';
import { matchLetter } from './shapecheck.js';
import { warningAfterWrongTap } from './interference.js';

const DATA = (name) => new URL('../../data/letters/' + name, import.meta.url).href;

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
.alef-trace button[aria-pressed=true],.alef-trace button[aria-selected=true]{background:#1f4e9c;color:#fff;border-color:#1f4e9c}
.alef-trace button:focus-visible{outline:3px solid #e67e22;outline-offset:2px}
.alef-trace .tabs{display:flex;gap:6px;margin:8px 0}
.alef-trace .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:6px;margin:8px 0}
.alef-trace .grid button{font-size:1.6rem;padding:4px}
.alef-trace .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.alef-trace .notice{background:#fff4e0;border:1px solid #e0b060;border-radius:8px;padding:8px 10px;font-size:.9rem}
.alef-trace .feedback{min-height:2.2em;font-size:1.05rem;margin:6px 0}
.alef-trace .stage{background:#fff;border:1px solid #ccd;border-radius:12px;padding:6px}
.alef-trace .big{font-size:4rem;line-height:1.1}
.alef-trace .kb{direction:ltr;display:flex;flex-direction:column;gap:4px;margin:10px 0;user-select:none}
.alef-trace .kb .r{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.alef-trace .kb .k{min-width:44px;min-height:44px;padding:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.2rem}
.alef-trace .kb .k small{font-size:.6rem;color:#667}
.alef-trace .kb .k.hit{background:#c8f0c8}.alef-trace .kb .k.want{outline:3px solid #e67e22}
.alef-trace .grid button{position:relative}
.alef-trace .badge{position:absolute;top:1px;right:3px;font-size:.7rem;color:#1a7f37;font-weight:bold}
.alef-trace .chip{display:inline-block;background:#e3f6e8;color:#14582a;border:1px solid #9bd3ab;border-radius:999px;padding:1px 10px;font-size:.85rem;margin-inline-start:6px}
.alef-trace .opts{display:flex;gap:10px;flex-wrap:wrap}
.alef-trace .opts button{font-size:2.4rem;min-width:72px}
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
  let tracer = null, keyHandler = null, unmounted = false, trainer = null;
  const cleanups = [];

  root.textContent = '';
  const wrap = h('div', { class: 'alef-trace' });
  wrap.appendChild(h('style', { text: CSS }));
  const body = h('div', {});
  wrap.appendChild(body);
  root.appendChild(wrap);
  body.appendChild(h('p', { role: 'status', text: t('trace.loading', 'Loading letters...') }));

  Promise.all([
    ctx.letters || loadJson(DATA('letters.json')),
    ctx.confusables || loadJson(DATA('confusables.json')).catch(() => null),
    ctx.keyboard || loadJson(DATA('keyboard-si1452.json')).catch(() => null),
    ctx.mnemonics || loadJson(DATA('mnemonics.json')).catch(() => null),
    ctx.interference || loadJson(DATA('interference.json')).catch(() => null)
  ]).then(([letters, conf, kb, mn, interf]) => {
    if (unmounted) return;
    state.letters = letters; state.confusables = conf; state.keyboard = kb; state.interference = interf;
    state.mnemonics = {}; for (const m of ((mn && mn.letters) || [])) state.mnemonics[m.id] = m;
    render();
  }).catch(err => {
    if (unmounted) return;
    body.textContent = '';
    body.appendChild(h('p', { role: 'alert', text: t('trace.loadError', 'Could not load letter data: ') + (err && err.message) }));
  });

  function teardownInner() {
    if (tracer) { try { tracer.destroy(); } catch (e) { /* ignore */ } tracer = null; }
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
  }

  function render() {
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
    body.appendChild(h('p', { class: 'notice' }, t('trace.draftNotice', 'Stroke order and shapes are a DRAFT and have not yet been checked by a native Israeli teacher. If your school teaches a different order, follow your teacher.')));
    if (state.tab === 'trace') renderTrace();
    else if (state.tab === 'drill') renderDrill();
    else renderTyping();
  }

  const letterById = id => state.letters.find(l => l.id === id);

  // ------------------------------------------------------------ trace tab
  function picker(onPick, current) {
    const g = h('div', { class: 'grid', dir: 'rtl', role: 'group', 'aria-label': t('trace.letters', 'Letters') });
    for (const l of state.letters) {
      const done = progress0.isCompleted(l.id, state.script);
      g.appendChild(h('button', { dir: 'rtl', lang: 'he', 'aria-label': l.name + (done ? ', ' + t('trace.completed', 'completed') : ''), title: l.name + (done ? ' (' + t('trace.completed', 'completed') + ')' : ''), 'data-completed': done ? '1' : false, 'aria-pressed': l.id === current, onclick: () => onPick(l.id) }, l.he, done ? h('span', { class: 'badge', 'aria-hidden': 'true' }, '\u2713') : null));
    }
    return g;
  }

  function renderTrace() {
    const letter = letterById(state.letterId) || state.letters[0];
    body.appendChild(picker(id => { state.letterId = id; render(); }, letter.id));
    const toggle = h('div', { class: 'row', role: 'group', 'aria-label': t('trace.script', 'Script') },
      h('button', { 'aria-pressed': state.script === 'print', onclick: () => { state.script = 'print'; render(); } }, t('trace.print', 'Print')),
      h('button', { 'aria-pressed': state.script === 'cursive', onclick: () => { state.script = 'cursive'; render(); } }, t('trace.cursive', 'Cursive')),
      h('button', { 'aria-pressed': state.strict, onclick: () => { state.strict = !state.strict; render(); } }, t('trace.strict', 'Strict')),
      h('button', { 'aria-pressed': state.outline, onclick: () => { state.outline = !state.outline; render(); } }, t('trace.outline', 'Outline')),
      h('button', { 'data-act': 'mode-step', 'aria-pressed': state.step, onclick: () => { state.step = !state.step; render(); const nb = body.querySelector('[data-act="mode-step"]'); if (nb) nb.focus(); } }, t('trace.modeStep', 'Show me, stroke by stroke (buttons)')));
    body.appendChild(toggle);
    body.appendChild(h('div', { class: 'row' },
      h('span', { class: 'big', dir: 'rtl', lang: 'he' }, letter.he),
      h('div', {}, h('strong', {}, letter.name + ' '), he(letter.nameHe), progress0.isCompleted(letter.id, state.script) ? h('span', { class: 'chip', role: 'status' }, '\u2713 ' + t('trace.completed', 'completed') + ' (' + state.script + ')') : (progress0.isAssisted(letter.id, state.script) ? h('span', { class: 'chip', role: 'status' }, t('trace.walkedThrough', 'walked through with buttons, not drawn yet') + ' (' + state.script + ')') : null), h('br'), h('span', {}, '/' + letter.sound.ipa + '/  ' + letter.sound.en))));
    const mn = state.mnemonics && state.mnemonics[letter.id];
    if (mn) {
      body.appendChild(h('details', { class: 'remember', open: 'open' },
        h('summary', {}, t('trace.remember', 'Remember it')),
        h('p', {}, h('strong', {}, t('trace.shape', 'Shape: ')), mn.shape),
        h('p', {}, h('strong', {}, t('trace.sound', 'Sound: ')), mn.sound),
        h('p', {}, h('strong', {}, t('trace.story', 'Story: ')), mn.story),
        h('p', {}, h('strong', {}, t('trace.why', 'Why this name: ')), mn.reason),
        h('p', {}, h('strong', {}, t('trace.lookalike', 'Do not confuse with: ')), mn.lookalike),
        h('p', { dir: 'rtl', lang: 'he' }, mn.word, ' ', h('span', { dir: 'ltr' }, '(' + mn.wordSound + ' = ' + mn.wordMeaning + ')')),
        h('p', { class: 'muted' }, t('trace.mnDraft', 'Draft memory hook: not yet checked by a Hebrew teacher.'))));
    }
    assistedRun = false;
    const stage = h('div', { class: 'stage' });
    const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' }, t('trace.start', 'Press Animate to see the order, then trace it.'));
    body.appendChild(stage); body.appendChild(fb);
    const block = letter[state.script];
    const progress = h('div', { class: 'row', role: 'status', 'aria-live': 'polite' });
    const setProgress = () => { const s = tracer.getState(); const n = s.done ? s.total : s.index; progress.textContent = t('trace.strokeCount', 'Stroke ') + n + t('trace.strokeOf', ' of ') + s.total + t('trace.strokeDone', ' done'); };
    try {
      tracer = createTracer(stage, letter, state.script, Object.assign({}, state.strict ? MODES.strict : MODES.forgiving, {
        showOutline: state.outline,
        onStrokeResult: r => { fb.textContent = r.forced ? t('trace.shown', 'Here is the correct stroke.') : t('trace.good', 'Good!'); setProgress(); },
        onUserStroke: pts => { attempt.push(pts); if (attempt.length > 6) attempt.shift(); },
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
          fb.textContent = (c.perfect ? t('trace.perfect', 'Perfect! ') : t('trace.done', 'Done. ')) + letter.name;
          try {
            attempt = [];
            if (assistedRun) { // walked through with the buttons: recorded apart from drawn completions
              progress0.recordAssisted(letter.id, state.script);
              fb.textContent += ' ' + t('trace.assistedNote', 'You used the stroke buttons, so this is recorded as walked through, not as drawn.');
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
      state.step ? h('button', { 'data-act': 'next-stroke', onclick: () => {
        const s = tracer.getState(); if (s.done) return;
        assistedRun = true; // set first: submit() can complete the letter synchronously
        tracer.submit(block.strokes[s.index].median.map(p => [p[0], p[1]]));
      } }, t('trace.nextStroke', 'Next stroke')) : null,
      h('button', { onclick: () => { attempt = []; assistedRun = false; tracer.reset(); fb.textContent = t('trace.start', 'Press Animate to see the order, then trace it.'); setProgress(); } }, t('trace.reset', 'Start over'))));
    body.appendChild(progress); setProgress();
    body.appendChild(h('p', { class: 'notice' }, (block.needsNativeReview ? t('trace.reviewFlag', 'Status: draft, needs native review. ') : '') + (block.quality ? '(' + block.quality + ')' : '')));
  }

  // ------------------------------------------------------------ look-alike drill
  function renderDrill() {
    const sets = ((state.confusables && state.confusables.sets) || []).filter(s => s.letters.length > 1);
    if (!state.drillSet || !sets.find(s => s.id === state.drillSet)) state.drillSet = sets[0] && sets[0].id;
    const set = sets.find(s => s.id === state.drillSet);
    if (!set) { body.appendChild(h('p', {}, t('trace.noSets', 'No look-alike sets loaded.'))); return; }
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
      opts.appendChild(h('button', { lang: 'he', 'aria-label': l.name, onclick: () => {
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
    if (!kb) { body.appendChild(h('p', { role: 'alert' }, t('trace.noKb', 'Keyboard data not loaded.'))); return; }
    const kind = state.typingKind || 'letter';
    const idsWithKey = Object.keys(kind === 'niqqud' ? kb.niqqud : kb.letters);
    trainer = createTrainer(kb, { kind, pool: idsWithKey });
    body.appendChild(h('div', { class: 'row', role: 'group', 'aria-label': t('trace.typeWhat', 'What to type') },
      h('button', { 'aria-pressed': kind === 'letter', onclick: () => { state.typingKind = 'letter'; render(); } }, t('trace.typeLetters', 'Letters')),
      h('button', { 'aria-pressed': kind === 'niqqud', onclick: () => { state.typingKind = 'niqqud'; render(); } }, t('trace.typeNiqqud', 'Vowel marks (AltGr)'))));
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
    body.appendChild(h('p', { class: 'notice' }, t('trace.kbNote', 'Layout: SI-1452 (2013), from xkeyboard-config. Press the physical key; for vowel marks hold AltGr (or tap the key on screen). Shuruk has no key: type vav, then dagesh.')));

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
