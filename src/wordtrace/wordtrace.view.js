// Aleph word tracing view: trace a whole word, letter by letter, right to left; then place the vowel marks.
// Reuses createTracer() from src/letters/trace.js and the stroke data in data/letters/letters.json unchanged.
// export mount(root, ctx) -> unmount.  ctx (shell): {settings, store, audio, route, t, query}. Test hooks: ctx.letters, ctx.wordtrace.
// DRAFT: stroke order is unreviewed (docs/letters/STROKE-RULES.md); word pointing comes from course data / Wiktionary-derived vocab, not proofread.
// @ts-check
import { createTracer, MODES } from '../letters/trace.js';
import { sourcesLine } from '../shell/sources.js';
import { audioButton } from '../shell/audio-access.js';
import { createProgress } from '../letters/progress.js';
import { cellsOf } from '../curriculum/hebrew.js';
import { LEVELS, eligibleWords, knownLetters, pickNext, suggestLevel, FINAL_OF } from './bank.js';
import { createFade, GUIDES, rateWord, saveOutcome, dueWordIds, sget, CARDS_KEY, PROGRESS_KEY, cardId } from './flow.js';
import { createBoard, composeCell, MARKS, markLabel, hasNiqqud } from './niqqud.js';

const DATA = (name) => new URL('../../data/' + name, import.meta.url).href;
async function loadJson(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url); return r.json(); }

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (typeof v === 'boolean' && k.startsWith('aria-')) { e.setAttribute(k, String(v)); continue; }
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}

const CSS = `
.wt{font-family:var(--font-ui,system-ui,sans-serif);max-width:760px;margin:0 auto;padding:8px 4px;color:var(--fg,#1b1b1f)}
.wt h1{font-size:1.5rem;margin:.2em 0}
.wt button{font:inherit;cursor:pointer;border:1px solid var(--border,#9aa);background:var(--card,#fff);color:var(--fg,#1b1b1f);border-radius:8px;padding:8px 12px;min-height:44px}
.wt button[aria-pressed=true]{background:var(--accent,#1f4e9c);color:var(--accent-fg,#fff);border-color:var(--accent,#1f4e9c)}
.wt button:focus-visible{outline:3px solid var(--focus,#b45309);outline-offset:2px}
.wt button[disabled]{opacity:.55;cursor:default}
.wt .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.wt .notice{background:var(--warn-bg,#fff4e0);color:var(--warn-fg,#3a2a00);border:1px solid #e0b060;border-radius:8px;padding:8px 10px;font-size:.9rem;margin:6px 0}
.wt .muted{color:var(--muted,#5a6656);font-size:.9rem}
.wt .target{font-size:2.6rem;line-height:1.3;margin:4px 0}
.wt .strip{display:grid;direction:rtl;gap:8px;margin:8px 0}
.wt .cell{border:3px solid var(--border,#ccd);border-radius:12px;background:var(--card,#fff);padding:3px;min-width:0}
.wt .cell[data-active=true]{border-color:var(--focus,#b45309)}
.wt .cell[data-done=true]{border-color:#1a7f37}
.wt .box{background:#fff;border-radius:8px}
.wt .box svg{display:block;width:100%;height:auto;aspect-ratio:1/1;max-width:none}
.wt svg[data-guide=dotted]>g:first-child>path{fill:none;stroke:#7b8499;stroke-width:7;stroke-dasharray:1 24;stroke-linecap:round}
.wt .cap{direction:ltr;text-align:center;font-size:.85rem;margin:2px 0}
.wt .tag{display:inline-block;background:#e3f6e8;color:#14582a;border:1px solid #9bd3ab;border-radius:999px;padding:0 8px;font-size:.78rem}
.wt .feedback{min-height:2.2em;font-size:1.05rem;margin:6px 0}
.wt .nq-strip{display:flex;direction:rtl;flex-wrap:wrap;gap:8px;margin:8px 0}
.wt .nq-cell{flex:1 1 72px;max-width:150px;font-family:var(--font-he,serif);font-size:3.2rem;line-height:1.6;min-height:96px}
.wt .nq-cell[data-state=ok]{border-color:#1a7f37;border-width:3px}
.wt .nq-cell[data-state=bad]{border-color:#c0392b;border-width:3px;border-style:dashed}
.wt .tray{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.wt .tray button{display:flex;flex-direction:column;align-items:center;min-width:84px}
.wt .tray .g{font-family:var(--font-he,serif);font-size:2rem;line-height:1.2}
.wt .tray small{font-size:.72rem}
.wt .words{list-style:none;padding:0;margin:8px 0;display:flex;flex-wrap:wrap;gap:6px}
.wt .words button{font-family:var(--font-he,serif);font-size:1.3rem}
.wt .legend{font-size:.8rem}
`;

/**
 * @param {HTMLElement} root
 * @param {any} ctx
 * @returns {() => void}
 */
export function mount(root, ctx = {}) {
  const t = (key, fallback) => { try { const v = ctx.t && ctx.t(key); return v && v !== key ? v : fallback; } catch (e) { return fallback; } };
  const q = ctx.query || {};
  const S = {
    bank: null, letters: /** @type {Record<string, any>} */ ({}), lettersList: /** @type {any[]} */ ([]),
    script: q.script === 'cursive' || q.script === 'print' ? q.script : ((ctx.settings && ctx.settings.script === 'cursive') ? 'cursive' : 'print'),
    level: LEVELS.some(l => l.id === q.level) ? q.level : null,
    anyLetters: q.any === '1', strict: false, mode: q.mode === 'step' ? 'step' : 'draw', // 'draw' (pointer) | 'step' (buttons only)
    phase: 'pick', word: /** @type {any} */ (null), progress: {}, cards: {}, completedLessons: /** @type {string[]} */ ([]),
    fade: null, round: null, board: null, firstCheck: null, revealed: false, skipped: false, selMark: null, activeCell: 0, result: null
  };
  let unmounted = false;
  /** @type {any[]} */ let tracers = [];
  const progressStore = createProgress(ctx.store);

  root.textContent = '';
  const wrap = h('div', { class: 'wt' });
  wrap.appendChild(h('style', { text: CSS }));
  const body = h('div', {});
  wrap.appendChild(body); wrap.appendChild(h('footer', {}, sourcesLine(h))); root.appendChild(wrap);
  body.appendChild(h('h1', { id: 'view-title', tabindex: '-1' }, t('wt.title', 'Trace words')));
  body.appendChild(h('p', { role: 'status', text: t('wt.loading', 'Loading words...') }));

  Promise.all([
    ctx.wordtrace || loadJson(DATA('wordtrace/words.json')),
    ctx.letters || loadJson(DATA('letters/letters.json')),
    sget(ctx.store, PROGRESS_KEY, {}), sget(ctx.store, CARDS_KEY, {}), sget(ctx.store, 'curriculum.progress', { completed: {} })
  ]).then(([bank, letters, prog, cards, cur]) => {
    if (unmounted) return;
    S.bank = bank; S.lettersList = letters; for (const l of letters) S.letters[l.id] = l;
    S.progress = prog; S.cards = cards; S.completedLessons = Object.keys((cur && cur.completed) || {});
    if (!S.level) S.level = suggestLevel(bank, prog, S.script, known());
    if (q.word) { const w = bank.words.find(x => x.he.normalize('NFC') === String(q.word).normalize('NFC')); if (w) { startWord(w); return; } }
    renderPick(true);
  }).catch(err => {
    if (unmounted) return;
    body.textContent = '';
    body.appendChild(h('h1', { id: 'view-title', tabindex: '-1' }, t('wt.title', 'Trace words')));
    body.appendChild(h('p', { role: 'alert', text: t('wt.loadError', 'Could not load the word data. Check your connection, then try again.') }));
  });

  // ------------------------------------------------------------ helpers
  function known() {
    if (S.anyLetters) return null;
    const traced = S.lettersList.filter(l => progressStore.isCompleted(l.id)).map(l => l.id);
    const fromLessons = S.completedLessons.flatMap(id => (S.bank.lessonLetters && S.bank.lessonLetters[id]) || []);
    return knownLetters(traced, fromLessons);
  }
  const eligible = () => eligibleWords(S.bank, known(), { level: S.level });
  const dueIds = () => dueWordIds(S.cards, S.script, Date.now());
  function destroyTracers() { for (const tr of tracers) { try { tr.destroy(); } catch (e) { /* ignore */ } } tracers = []; }
  const isFinal = (id) => !!FINAL_OF[id];
  const cellLabel = (l, i, n) => `${t('wt.letter', 'Letter')} ${i + 1} ${t('wt.of', 'of')} ${n}: ${l.name}${isFinal(l.id) ? ', ' + t('wt.finalForm', 'final form') : ''}`;
  const he = (text, attrs = {}) => h('span', Object.assign({ dir: 'rtl', lang: 'he' }, attrs), text);
  function say(msg) { const el = body.querySelector('.feedback'); if (el) el.textContent = msg; }
  function focusTitle() { const e = body.querySelector('#view-title'); if (e && e.focus) e.focus({ preventScroll: true }); }

  function header(extra) {
    const nodes = [h('h1', { id: 'view-title', tabindex: '-1' }, t('wt.title', 'Trace words'))];
    nodes.push(h('p', { class: 'notice draft-flag', role: 'note' }, t('wt.draft', 'DRAFT: stroke order and shapes have not been checked by a native Israeli teacher, and the word pointing comes from course data and Wiktionary-derived vocabulary that has not been proofread. If your teacher writes a letter differently, follow your teacher.')));
    if (S.script === 'cursive') nodes.push(h('p', { class: 'notice', role: 'note', 'data-note': 'joins' }, t('wt.joins', 'Cursive note: connected handwriting between letters is NOT modelled here. Each letter is traced separately in its cursive shape (ktav yad), and the joins between letters are not drawn or checked. Ask your teacher how your school connects letters.')));
    return [...nodes, ...(extra || [])];
  }
  function set(nodes, opts) { if (!(opts && opts.keep)) destroyTracers(); body.textContent = ''; for (const n of nodes.flat()) if (n) body.appendChild(n); focusTitleSoon(); }
  let focusNext = false;
  function focusTitleSoon() { if (focusNext) { focusNext = false; focusTitle(); } }

  // ------------------------------------------------------------ pick screen
  function controls() {
    return [
      h('div', { class: 'row', role: 'group', 'aria-label': t('wt.script', 'Script') },
        h('button', { 'data-act': 'script-print', 'aria-pressed': S.script === 'print', onclick: () => { S.script = 'print'; S.phase = 'pick'; render(); } }, t('wt.print', 'Print')),
        h('button', { 'data-act': 'script-cursive', 'aria-pressed': S.script === 'cursive', onclick: () => { S.script = 'cursive'; S.phase = 'pick'; render(); } }, t('wt.cursive', 'Cursive'))),
      h('div', { class: 'row', role: 'group', 'aria-label': t('wt.level', 'Level') },
        ...LEVELS.map(lv => h('button', { 'data-level': lv.id, 'aria-pressed': S.level === lv.id, onclick: () => { S.level = lv.id; S.phase = 'pick'; render(); } }, t('wt.lv.' + lv.id, lv.label)))),
      h('div', { class: 'row', role: 'group', 'aria-label': t('wt.how', 'How to practise') },
        h('button', { 'data-act': 'mode-draw', 'aria-pressed': S.mode === 'draw', onclick: () => { S.mode = 'draw'; render(); } }, t('wt.modeDraw', 'Draw with finger or pen')),
        h('button', { 'data-act': 'mode-step', 'aria-pressed': S.mode === 'step', onclick: () => { S.mode = 'step'; render(); } }, t('wt.modeStep', 'Walk me through it with buttons')),
        h('button', { 'data-act': 'strict', 'aria-pressed': S.strict, onclick: () => { S.strict = !S.strict; render(); } }, t('wt.strict', 'Strict'))),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', 'data-act': 'any-letters', checked: S.anyLetters || undefined, onchange: (e) => { S.anyLetters = !!e.target.checked; render(); } }), ' ' + t('wt.anyLetters', 'Include letters I have not traced yet'))
    ];
  }

  function renderPick(initial) {
    S.phase = 'pick'; focusNext = !initial;
    const k = known();
    const words = eligible();
    const due = new Set(dueIds());
    const dueHere = words.filter(w => due.has(w.he));
    const kn = k === null ? null : S.lettersList.filter(l => k.has(l.id) && !isFinalOnly(l, k)).length;
    const list = [...dueHere, ...words.filter(w => !due.has(w.he))].slice(0, 12);
    const nodes = [
      ...header(), ...controls(),
      h('p', { class: 'muted', role: 'status', 'data-role': 'summary' },
        (kn === null ? t('wt.allLetters', 'Using all letters. ') : `${t('wt.knownLetters', 'Letters you have traced or learned:')} ${kn}. `) +
        `${words.length} ${t('wt.wordsHere', 'words at this level')}` + (dueHere.length ? `, ${dueHere.length} ${t('wt.dueRetrace', 'to retrace today')}` : '') + '.')
    ];
    if (!words.length) {
      nodes.push(h('div', { class: 'notice', role: 'status', 'data-role': 'empty' },
        t('wt.empty', 'No words at this level use only letters you have traced yet. Trace more letters first, or tick "Include letters I have not traced yet".'), ' ',
        h('a', { href: '#/letters', style: 'display:inline-flex;align-items:center;min-block-size:48px;min-inline-size:48px' }, t('wt.goLetters', 'Go to the letters'))));
    } else {
      nodes.push(h('div', { class: 'row' }, h('button', { 'data-act': 'next-word', onclick: () => startWord(pickNext(words, { dueIds: [...due], progress: S.progress, script: S.script, avoid: S.word && S.word.he })) }, dueHere.length ? t('wt.startRetrace', 'Start: retrace a due word') : t('wt.start', 'Start the next word'))));
      nodes.push(h('p', { class: 'muted' }, t('wt.orChoose', 'Or choose a word:')));
      nodes.push(h('ul', { class: 'words', 'aria-label': t('wt.wordList', 'Words') }, ...list.map(w => h('li', {}, h('button', { 'data-word': w.he, lang: 'he', dir: 'rtl', 'aria-label': `${w.he} (${w.en})${due.has(w.he) ? ', ' + t('wt.due', 'due for retrace') : ''}`, onclick: () => startWord(w) }, w.he, due.has(w.he) ? ' ↻' : '')))));
    }
    set(nodes);
  }
  const isFinalOnly = (l, k) => !!FINAL_OF[l.id]; // count regular letters only in the "known" figure

  // ------------------------------------------------------------ trace phase
  function startWord(w) {
    if (!w) { render(); return; }
    S.word = w; S.fade = createFade(); S.firstCheck = null; S.revealed = false; S.skipped = false; S.selMark = null; S.result = null; S.board = null;
    S.totals = { missedRounds: 0, assistedRounds: 0 };
    startRound(); 
  }

  function startRound() {
    destroyTracers();
    S.phase = 'trace'; focusNext = true;
    const w = S.word; const cells = cellsOf(w.he);
    const guide = S.fade.guide;
    S.round = { mistakes: 0, forced: 0, assisted: false, doneCells: 0, total: cells.length };
    S.activeCell = 0;
    const n = cells.length;
    const cols = n <= 3 ? n : (n === 4 ? 2 : 3);
    const strip = h('div', { class: 'strip', dir: 'rtl', lang: 'he', 'data-role': 'strip', style: `grid-template-columns:repeat(${cols},minmax(0,${n <= 2 ? 190 : 160}px))`, role: 'group', 'aria-label': t('wt.stripLabel', 'Letters of the word, first letter on the right') });
    const cellEls = [];
    cells.forEach((c, i) => {
      const letter = S.letters[c.base];
      const box = h('div', { class: 'box' });
      const cell = h('div', { class: 'cell', 'data-index': String(i), 'data-active': String(i === 0), 'data-done': 'false', role: 'group', 'aria-label': cellLabel(letter, i, n) }, box,
        h('div', { class: 'cap', dir: 'ltr' }, `${i + 1}. ${letter.name}`, isFinal(letter.id) ? [' ', h('span', { class: 'tag' }, t('wt.finalTag', 'final form'))] : null));
      strip.appendChild(cell); cellEls.push(cell);
      const tr = createTracer(box, letter, S.script, Object.assign({}, S.strict ? MODES.strict : MODES.forgiving, {
        showOutline: guide !== 'blank',
        onMistake: m => { S.round.mistakes++; say(t(m.feedback.key, m.feedback.text)); },
        onStrokeResult: r => { if (r.forced) S.round.forced++; say(`${letter.name}: ${t('wt.stroke', 'stroke')} ${r.strokeNum + 1} / ${r.total}`); },
        onComplete: () => cellDone(i, cellEls)
      }));
      if (tr.svg) { tr.svg.setAttribute('data-guide', guide); tr.svg.style.pointerEvents = i === 0 ? 'auto' : 'none'; }
      tracers.push(tr);
    });
    const finals = cells.filter(c => isFinal(c.base));
    const roundNo = S.fade.stats().rounds + 1;
    const nodes = [
      ...header(),
      h('div', { class: 'row' }, h('button', { 'data-act': 'back', onclick: () => renderPick() }, t('wt.back', 'Back to words')),
        S.word.audio ? audioButton(h, ctx, { kind: 'word', id: S.word.audio, text: S.word.he, label: t('wt.listen', 'Hear the word'), class: 'alef-play' }) : null),
      h('div', { class: 'target', dir: 'rtl', lang: 'he', 'data-role': 'target' }, w.he),
      h('p', { 'data-role': 'round' }, `${t('wt.round', 'Round')} ${roundNo}: `, h('strong', {}, t('wt.guide.' + guide, { solid: 'solid guide', dotted: 'dotted guide', blank: 'no guide' }[guide])), ` (${GUIDES.indexOf(guide) + 1} / ${GUIDES.length}). ${w.en ? w.en + '.' : ''}`),
      h('p', { class: 'muted' }, S.mode === 'step' ? t('wt.stepHelp', 'Press "Next stroke" to have each stroke drawn for you in order. Drawing practice is not checked in this mode.') : t('wt.drawHelp', 'Trace the letters from the right, one after another. The orange border shows the letter to trace.')),
      finals.length ? h('p', { class: 'muted', 'data-role': 'sofit' }, ...finals.map(c => [he(S.letters[c.base].he), ` ${t('wt.sofitNote', 'is the final form of')} `, he(S.letters[FINAL_OF[c.base]].he), `: ${t('wt.sofitUse', 'it is used only as the last letter of a word.')} `])) : null,
      strip,
      h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' }, t('wt.startTrace', 'Start with letter 1, on the right.')),
      h('div', { class: 'row' },
        S.mode === 'step' ? h('button', { 'data-act': 'step', onclick: () => stepStroke(cellEls) }, t('wt.nextStroke', 'Next stroke')) : null,
        h('button', { 'data-act': 'replay', onclick: () => { const tr = tracers[S.activeCell]; if (tr) { say(t('wt.watch', 'Watch the order...')); tr.animate().then(() => { if (!unmounted) say(t('wt.yourTurn', 'Your turn.')); }); } } }, t('wt.replay', 'Show the stroke order')),
        h('button', { 'data-act': 'hint', onclick: () => { const tr = tracers[S.activeCell]; if (tr) tr.hint(); } }, t('wt.hint', 'Hint')),
        h('button', { 'data-act': 'restart', onclick: () => startRound() }, t('wt.restart', 'Start this round over')),
        h('button', { 'data-act': 'skip-vowels', onclick: () => { S.skipped = true; finishTracing(); } }, t('wt.skipToVowels', 'Skip to vowel marks')))
    ];
    S.actionsRow = nodes[nodes.length - 1];
    set(nodes, { keep: true });
  }

  function playWord() { try { const p = ctx.audio && ctx.audio.play && ctx.audio.play('word', S.word.audio, { text: S.word.he }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* optional */ } }

  function stepStroke(cellEls) {
    const tr = tracers[S.activeCell]; if (!tr) return;
    const cells = cellsOf(S.word.he); const letter = S.letters[cells[S.activeCell].base];
    const st = tr.getState(); if (st.done) return;
    S.round.assisted = true;
    const median = letter[S.script].strokes[st.index].median;
    tr.submit(median.map(p => [p[0], p[1]]));
  }

  function cellDone(i, cellEls) {
    S.round.doneCells++;
    if (cellEls[i]) { cellEls[i].setAttribute('data-done', 'true'); cellEls[i].setAttribute('data-active', 'false'); }
    const tr = tracers[i]; if (tr && tr.svg) tr.svg.style.pointerEvents = 'none';
    const nextI = i + 1;
    if (nextI < S.round.total) {
      S.activeCell = nextI;
      if (cellEls[nextI]) cellEls[nextI].setAttribute('data-active', 'true');
      if (tracers[nextI] && tracers[nextI].svg) tracers[nextI].svg.style.pointerEvents = 'auto';
      const l = S.letters[cellsOf(S.word.he)[nextI].base];
      say(`${t('wt.good', 'Good!')} ${t('wt.nextLetter', 'Next letter:')} ${l.name}`);
      return;
    }
    roundDone();
  }

  function roundDone() {
    const res = S.fade.finishRound(S.round);
    if (res.missed) S.totals.missedRounds++;
    if (res.assisted) S.totals.assistedRounds++;
    const msg = res.assisted ? t('wt.roundAssisted', 'You used the stroke buttons, so this round does not move the guide forward.')
      : res.missed ? t('wt.roundMissed', 'That round had several strokes off the path. Try it again with the same guide.')
      : res.finished ? t('wt.roundFinished', 'Clean round with no guide. Now the vowel marks.')
      : t('wt.roundClean', 'Clean round. The guide fades for the next one.');
    const fb = body.querySelector('.feedback'); if (fb) fb.textContent = msg;
    const actions = S.actionsRow;
    const holder = h('div', { class: 'row', 'data-role': 'round-done' });
    if (res.finished) holder.appendChild(h('button', { 'data-act': 'to-vowels', onclick: () => finishTracing() }, t('wt.toVowels', 'Continue to vowel marks')));
    else holder.appendChild(h('button', { 'data-act': 'next-round', onclick: () => startRound() }, res.missed || res.assisted ? t('wt.sameGuide', 'Another round, same guide') : t('wt.nextRound', 'Next round: ') + t('wt.guide.' + S.fade.guide, S.fade.guide)));
    if (!res.finished) holder.appendChild(h('button', { 'data-act': 'to-vowels', onclick: () => { S.skipped = true; finishTracing(); } }, t('wt.skipToVowels', 'Skip to vowel marks')));
    if (actions && actions.parentNode) actions.parentNode.insertBefore(holder, actions);
    const nx = holder.querySelector('button'); if (nx && nx.focus) nx.focus();
  }

  // ------------------------------------------------------------ niqqud phase
  function finishTracing() {
    if (!hasNiqqud(S.word.he)) { finishWord(null); return; }
    S.phase = 'niqqud'; S.board = createBoard(S.word.he); S.firstCheck = null; S.revealed = false; S.selMark = null; focusNext = true;
    renderNiqqud();
  }

  function renderNiqqud(feedback, focusSel) {
    const board = S.board; const cells = cellsOf(S.word.he);
    const checked = board.checked ? board.check() : null;
    const strip = h('div', { class: 'nq-strip', dir: 'rtl', lang: 'he', role: 'group', 'data-role': 'nq-strip', 'aria-label': t('wt.nqStrip', 'Letters of the word, first letter on the right') });
    cells.forEach((c, i) => {
      const letter = S.letters[c.base];
      const marks = board.marksAt(i);
      const res = checked && checked.perCell[i];
      const desc = marks.length ? marks.map(m => MARKS[m].name).join(', ') : t('wt.noMarks', 'no marks');
      strip.appendChild(h('button', {
        class: 'nq-cell', 'data-index': String(i), 'data-state': res ? (res.ok ? 'ok' : 'bad') : false,
        'aria-label': `${cellLabel(letter, i, cells.length)}; ${desc}${res ? (res.ok ? ', ' + t('wt.correct', 'correct') : ', ' + t('wt.notRight', 'not right') + (res.expected.length ? ': ' + t('wt.expected', 'expected') + ' ' + res.expected.map(m => MARKS[m].name).join(', ') : ': ' + t('wt.expectedNone', 'expected no marks'))) : ''}`,
        onclick: () => placeOn(i)
      }, composeCell(letter.he, marks)));
    });
    const tray = h('div', { class: 'tray', role: 'group', 'aria-label': t('wt.tray', 'Vowel marks') },
      ...board.tray.map(m => h('button', { 'data-mark': m, 'aria-pressed': S.selMark === m, 'aria-label': markLabel(m), onclick: () => { S.selMark = S.selMark === m ? null : m; renderNiqqud(S.selMark ? `${MARKS[S.selMark].name}: ${t('wt.nowTap', 'now tap the letter it belongs to.')}` : '', `[data-mark="${m}"]`); } },
        h('span', { class: 'g', dir: 'rtl', lang: 'he', 'aria-hidden': 'true' }, '◌' + MARKS[m].char), h('small', {}, MARKS[m].name.split(' (')[0]))));
    const nodes = [
      ...header(),
      h('p', { 'data-role': 'phase' }, h('strong', {}, t('wt.vowelStep', 'Vowel marks')), `: ${S.word.en || ''}`),
      h('div', { class: 'target', dir: 'rtl', lang: 'he', 'aria-hidden': 'true' }, cells.map(c => c.text.replace(/[ְ-ּׁׂ]/g, '')).join('')),
      h('p', { class: 'muted' }, t('wt.nqHelp', 'Choose a mark from the tray, then tap the letter it goes on. Tap a placed mark again to remove it. Marks sit under, over, or inside the letter; the letter shows where it lands.')),
      tray, strip,
      checked && !checked.perfect ? h('ul', { 'data-role': 'nq-detail', class: 'legend' }, ...checked.perCell.filter(c => !c.ok).map(c => h('li', {}, `${t('wt.letter', 'Letter')} ${c.index + 1} (${S.letters[cells[c.index].base].name}): ` + (c.expected.length ? `${t('wt.expected', 'expected')} ${c.expected.map(m => MARKS[m].name).join(', ')}` : t('wt.expectedNone', 'expected no marks'))))) : null,
      h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' }, feedback || (checked ? `${checked.correct} / ${checked.total} ${t('wt.lettersRight', 'letters right')}` : '')),
      h('div', { class: 'row' },
        h('button', { 'data-act': 'check', onclick: () => doCheck() }, t('wt.check', 'Check')),
        h('button', { 'data-act': 'clear', onclick: () => { board.clear(); renderNiqqud('', '[data-act=clear]'); } }, t('wt.clear', 'Clear')),
        h('button', { 'data-act': 'reveal', onclick: () => { if (!S.firstCheck) S.firstCheck = { correct: 0, total: cells.length, revealed: true }; S.revealed = true; board.reveal(); board.check(); renderNiqqud(t('wt.revealed', 'Here is the answer. This word will come back for practice.')); } }, t('wt.showAnswer', 'Show the answer')),
        checked || S.revealed ? h('button', { 'data-act': 'finish', onclick: () => finishWord(S.firstCheck) }, t('wt.finish', 'Finish word')) : null)
    ];
    set(nodes);
    if (focusSel) { const f = body.querySelector(focusSel); if (f && f.focus) f.focus(); }
  }

  function placeOn(i) {
    if (!S.selMark) { say(t('wt.pickMarkFirst', 'Choose a mark from the tray first.')); return; }
    const on = S.board.place(i, S.selMark);
    renderNiqqud(`${MARKS[S.selMark].name} ${on ? t('wt.placed', 'placed on') : t('wt.removed', 'removed from')} ${t('wt.letter', 'letter')} ${i + 1}.`, `.nq-cell[data-index="${i}"]`);
  }

  function doCheck() {
    const r = S.board.check();
    if (!S.firstCheck) S.firstCheck = { correct: r.correct, total: r.total };
    renderNiqqud(r.perfect ? t('wt.allRight', 'All the vowel marks are right.') : `${r.correct} / ${r.total} ${t('wt.lettersRight', 'letters right')}. ${t('wt.fixOrFinish', 'Fix the marked letters or finish the word.')}`, '[data-act=check]');
  }

  // ------------------------------------------------------------ result
  async function finishWord(niqqud) {
    const st = S.fade.stats();
    const rating = rateWord({ missedRounds: S.totals.missedRounds, assistedRounds: S.totals.assistedRounds, skipped: S.skipped || !S.fade.finished, niqqud });
    const saved = await saveOutcome(ctx.store, { he: S.word.he, script: S.script, rating }, Date.now());
    if (unmounted) return;
    S.progress = saved.progress;
    if (saved.card) S.cards = { ...S.cards, [cardId(S.script, S.word.he)]: saved.card };
    S.phase = 'result'; focusNext = true; S.result = { rating, niqqud, stats: st };
    playWord();
    const retrace = rating < 3;
    const days = saved.card && saved.card.due ? Math.max(0, Math.round((saved.card.due - Date.now()) / 86400000)) : null;
    const words = eligible();
    set([
      ...header(),
      h('div', { class: 'target', dir: 'rtl', lang: 'he' }, S.word.he),
      h('p', { role: 'status', 'data-role': 'result', 'data-rating': String(rating) },
        rating === 3 ? t('wt.res3', 'Well done: clean tracing and the right vowels.') : rating === 2 ? t('wt.res2', 'Finished, with help or a few vowel marks to review.') : t('wt.res1', 'This one needs more practice.'),
        niqqud ? ` ${t('wt.vowelScore', 'Vowel letters right:')} ${niqqud.correct} / ${niqqud.total}.` : ''),
      retrace && saved.card ? h('p', { class: 'muted', 'data-role': 'srs' }, t('wt.srsAdded', 'Added to your retrace list; it comes back') + (days === null ? '.' : days === 0 ? ' ' + t('wt.srsSoon', 'in a few minutes.') : ` ${t('wt.srsIn', 'in about')} ${days} ${days === 1 ? t('wt.day', 'day') : t('wt.days', 'days')}.`)) : null,
      h('div', { class: 'row' },
        h('button', { 'data-act': 'next-word', onclick: () => startWord(pickNext(words, { dueIds: dueIds(), progress: S.progress, script: S.script, avoid: S.word.he })) }, t('wt.nextWord', 'Next word')),
        h('button', { 'data-act': 'again', onclick: () => startWord(S.word) }, t('wt.again', 'Same word again')),
        h('button', { 'data-act': 'to-pick', onclick: () => renderPick() }, t('wt.changeLevel', 'Choose a word or level')))
    ]);
  }

  function render() { renderPick(false); }

  return function unmount() {
    unmounted = true; destroyTracers(); root.textContent = '';
  };
}
