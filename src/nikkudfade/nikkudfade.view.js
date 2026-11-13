/**
 * Vowel-point fade (#/nikkud-fade), PREVIEW and DRAFT. Reads a short session of common words while the schedule in model.js
 * decides whether each word shows its vowel points. The learner says whether they read the word; nothing is machine-graded.
 * Tap "Show the points" to reveal; a revealed word is recorded as aided. For look-alike words the learner also picks which sound they read; a wrong pick is recorded as aided. Store key nikkudfade.v1.
 * Whole lines: a second, optional part. The lines are the app's own marked lesson lines, read from the vowel-mark unit file only
 * when the learner asks. Marks are only ever taken away. A line read is not saved and does not move the stage.
 * After a line is read, its English from the lesson is shown with the shared Listen button (a recording, the device voice, or
 * "No audio yet", whichever is true).
 * ctx extras for tests: ctx.nikkudfadeData = {set, schedule}, ctx.nikkudfadeLines = a unit document, ctx.nikkudfadeLinesEn = {lines}.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { sourcesLine } from '../shell/sources.js';
import { loadReadingSet, loadSchedule, loadLinesEn } from './loader.js';
import { audioButton } from '../shell/audio-access.js';
import { usableLines, wordIndex, fadeLine, pickLines, LINE_UNIT } from './lines.js';
import { STORE_KEY, STAGES, normalizeState, display, recordRead, setStage, setAuto, pickSession, summary, DEFAULT_SCHEDULE, lessonReached, filterByLesson, soundChoices, gradeSound } from './model.js';

export const DRAFT_NOTE = 'Draft and unreviewed: no Hebrew teacher has checked this practice. You decide whether you read each word; the app does not grade your reading.';
export const REASON_TEXT = { full: 'Vowel marks shown: stage 1 shows every mark.', new: 'Vowel marks shown: this word is still new to you.', ambiguous: 'Vowel marks shown: another common word is spelled the same without them.', checked: 'Vowel marks shown so you can check your reading.', faded: 'No vowel marks on this word. Tap "Show the vowel marks" if you need them.' };
export const LINES_LEAD = 'Read a full lesson line with the vowel marks faded to your stage. These lines come from the lessons, with the marks they already have there. Nothing is fetched until you press the button.';
export const LINES_FAILED = 'The lines could not be loaded. If you are offline, open this page once while online. The word rounds above still work.';
export const STAGE_TEXT = { 1: 'Stage 1: all vowel marks', 2: 'Stage 2: vowel marks on new and look-alike words', 3: 'Stage 3: no vowel marks, tap to reveal' };

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-nikkudfade', 'aria-labelledby': 'nf-title' });
  const h1 = el('h1', { id: 'nf-title', tabindex: '-1' }, 'Vowel marks, fading out');
  const controls = el('div', { class: 'nf-controls' });
  const body = el('div', { class: 'nf-body' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'nf-status' });
  const lineBox = el('section', { class: 'nf-lines', 'aria-labelledby': 'nf-lines-title' });
  wrap.append(h1, el('p', { class: 'nf-draft' }, DRAFT_NOTE), controls, body, status, lineBox, el('footer', {}, sourcesLine(el)));
  root.append(wrap);
  let alive = true, set = null, sched = DEFAULT_SCHEDULE, st = normalizeState(null), queue = [], idx = 0, revealed = false, answered = false, round = 1, reached = 10, anyWord = false, asking = null;
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, STORE_KEY, st);
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);

  function renderControls() {
    const stageBtns = STAGES.map((n) => btn(STAGE_TEXT[n], () => { st = setStage(st, n, Date.now()); save(); startRound(); say(`${STAGE_TEXT[n]}. Automatic changes are off.`); },
      { 'aria-pressed': String(st.stage === n), class: 'btn secondary' }));
    const auto = btn(st.auto ? 'Automatic: on' : 'Automatic: off', () => { st = setAuto(st, !st.auto); save(); renderControls(); say(st.auto ? 'Automatic fading is on. The stage can move as you read.' : 'Automatic fading is off. The stage stays where you set it.'); },
      { 'aria-pressed': String(st.auto), class: 'btn secondary' });
    controls.replaceChildren(el('div', { role: 'group', 'aria-label': 'Vowel-mark stage' }, ...stageBtns), auto,
      btn(anyWord ? 'Words from any lesson: on' : 'Words from any lesson: off', () => { anyWord = !anyWord; startRound(); say(anyWord ? 'Practicing words from every lesson.' : `Practicing words up to lesson ${reached}.`); }, { 'aria-pressed': String(anyWord), class: 'btn secondary' }),
      el('p', {}, anyWord ? 'Words from every lesson.' : `Words from lessons up to ${reached} (your progress, with the first-release path as the minimum).`),
      el('p', {}, 'Related: ', el('a', { href: '#/torahread/ladder' }, 'reading Torah text without vowels'), ' and ', el('a', { href: '#/firstday/ladder' }, 'the 20-step ladder from vowel marks to none'), '. This page works on common modern words; the Torah page works on scroll text. To set the vowel marks yourself for stories, prayers and Torah, each on its own, or to try the Fade Challenge: ', el('a', { href: '#/readlab/texts' }, 'Read With Tools'), '.'),
      el('p', {}, st.auto ? 'The app moves you to fewer vowel marks after you read steadily without revealing, and back if you reveal most words.' : 'You chose this stage. The app will not change it.'));
  }

  function startRound() {
    queue = pickSession(filterByLesson(set.items, reached, anyWord), st, { size: sched.sessionSize, seed: round * 7919 + summary(st).reads });
    idx = 0; revealed = false; answered = false; asking = null; renderControls(); renderCard();
  }

  function renderCard() {
    if (idx >= queue.length) return renderDone();
    const item = queue[idx];
    const d = answered ? { text: item.he, pointed: true, reason: 'checked', revealed: false } : display(st, item, { revealed, sched });
    const nodes = [
      el('p', {}, `Word ${idx + 1} of ${queue.length}. ${STAGE_TEXT[st.stage]}.`),
      el('p', { class: 'nf-word' }, heText(d.text, 'alef-he nf-big')),
      el('p', { class: 'nf-reason' }, d.revealed ? 'You showed the vowel marks. This counts as a read with help.' : REASON_TEXT[d.reason]),
    ];
    if (asking) {
      nodes.push(el('p', {}, 'Which word did you read?'), el('div', { role: 'group', 'aria-label': 'Which word did you read' }, ...asking.map((o) => btn(o.label, () => answer(revealed || !gradeSound(o.id)), { class: 'btn secondary', 'aria-label': `I read ${o.label}` }))));
    } else if (!answered) {
      if (!d.pointed) nodes.push(btn('Show the vowel marks', () => { revealed = true; renderCard(); say('Vowel marks shown.'); }, { 'aria-label': `Show the vowel marks for word ${idx + 1}` }));
      nodes.push(btn('I read it', () => { const c = soundChoices(item, round * 31 + idx); if (c) { asking = c; renderCard(); } else answer(false); }, { 'aria-label': `I read it, word ${idx + 1}` }), btn('Not yet', () => answer(true), { 'aria-label': `Not yet, word ${idx + 1}` }));
    } else {
      nodes.push(el('p', {}, `Sounds like: ${item.translit}. Meaning: ${item.en}.`), btn(idx + 1 < queue.length ? 'Next word' : 'Finish round', () => { idx += 1; revealed = false; answered = false; renderCard(); }));
    }
    body.replaceChildren(...nodes);
  }

  function answer(notYet) {
    const item = queue[idx], before = st.stage; asking = null;
    const aided = revealed || notYet;
    st = recordRead(st, item.id, { aided, now: Date.now(), sched });
    save(); answered = true; // the answer screen shows the points so the word can be checked
    renderCard();
    say(st.stage !== before ? `Saved. You moved to ${STAGE_TEXT[st.stage]}.` : `Saved as ${aided ? 'aided' : 'read unaided'}.`);
  }

  // ---- whole lines
  let lines = null, linesEn = {}, lineQueue = [], lineIdx = 0, lineShown = false, lineDone = false, lineRound = 0;
  const lineTitle = () => el('h2', { id: 'nf-lines-title' }, 'Whole Lines');
  function renderLineStart(note) {
    lineBox.replaceChildren(...[lineTitle(), el('p', {}, LINES_LEAD), note ? el('p', { role: 'alert' }, note) : null,
      btn('Read Whole Lines', () => { openLines(); }, { 'aria-label': 'Read whole lines at your stage' })].filter(Boolean));
  }
  async function openLines() {
    if (!lines) {
      let doc = ctx?.nikkudfadeLines || null;
      if (!doc) { try { doc = await (await import('../nikud/service.js')).builtDoc(LINE_UNIT); } catch { doc = null; } }
      if (!alive) return;
      lines = usableLines(doc);
      if (!lines.length) { lines = null; renderLineStart(LINES_FAILED); return; }
      try { linesEn = (ctx?.nikkudfadeLinesEn || await loadLinesEn()).lines || {}; } catch { linesEn = {}; }
      if (!alive) return;
    }
    lineRound += 1; lineQueue = pickLines(lines, { seed: lineRound * 104729 + summary(st).reads, count: 5 }); lineIdx = 0; lineShown = false; lineDone = false;
    renderLine(); say(`Line 1 of ${lineQueue.length}.`);
  }
  function renderLine() {
    if (lineIdx >= lineQueue.length) {
      lineBox.replaceChildren(lineTitle(), el('p', {}, 'Lines done. Nothing was saved for these; only the word rounds above count toward your stage.'), btn('More Lines', () => { openLines(); }));
      return;
    }
    const line = lineQueue[lineIdx];
    const parts = fadeLine(line, st, wordIndex(set?.items), { revealed: lineShown || lineDone, sched });
    const kept = parts.filter((p) => p.pointed).length;
    const nodes = [lineTitle(), el('p', {}, `Line ${lineIdx + 1} of ${lineQueue.length}. ${STAGE_TEXT[st.stage]}.`),
      el('p', { class: 'nf-word' }, heText(parts.map((p) => p.text).join(' '), 'alef-he nf-line')),
      el('p', { class: 'nf-reason' }, lineDone ? 'All the vowel marks, so you can check yourself.' : lineShown ? 'You showed the vowel marks.' : `Vowel marks on ${kept} of ${parts.length} words.`)];
    if (!lineDone) {
      if (!lineShown && kept < parts.length) nodes.push(btn('Show The Vowel Marks', () => { lineShown = true; renderLine(); say('Vowel marks shown.'); }, { 'aria-label': `Show the vowel marks for line ${lineIdx + 1}` }));
      nodes.push(btn('I Read It', () => { lineDone = true; renderLine(); say('Here is the line with every mark.'); }, { 'aria-label': `I read it, line ${lineIdx + 1}` }),
        btn('Not Yet', () => { lineDone = true; renderLine(); say('Here is the line with every mark.'); }, { 'aria-label': `Not yet, line ${lineIdx + 1}` }));
    } else {
      if (linesEn[line.he]) nodes.push(el('p', { class: 'nf-meaning' }, `Meaning: ${linesEn[line.he]}`));
      nodes.push(audioButton(el, ctx, { kind: 'sentence', id: `nf-line-${lineRound}-${lineIdx}`, text: line.he, label: 'Listen', name: `line ${lineIdx + 1}` }));
      nodes.push(btn(lineIdx + 1 < lineQueue.length ? 'Next Line' : 'Finish Lines', () => { lineIdx += 1; lineShown = false; lineDone = false; renderLine(); say(lineIdx < lineQueue.length ? `Line ${lineIdx + 1} of ${lineQueue.length}.` : 'Lines done.'); }));
    }
    lineBox.replaceChildren(...nodes.filter(Boolean));
  }

  function renderDone() {
    const s = summary(st, set.items, sched);
    body.replaceChildren(el('p', {}, `Round done. Total reads saved: ${s.reads}, ${s.unaided} unaided and ${s.aided} aided. Words seen: ${s.wordsSeen} of ${set.items.length}.`),
      el('p', {}, `Current setting: ${STAGE_TEXT[st.stage]}${st.auto ? ' (automatic)' : ' (chosen by you)'}. These counts are your own self-reports.`),
      btn('Another round', () => { round += 1; startRound(); try { h1.focus(); } catch { /* ignore */ } }));
  }

  (async () => {
    try {
      const data = ctx?.nikkudfadeData;
      set = data?.set || await loadReadingSet();
      sched = { ...DEFAULT_SCHEDULE, ...(data?.schedule || await loadSchedule().catch(() => ({}))) };
      st = normalizeState(await storeGet(ctx, STORE_KEY, null));
      reached = lessonReached(await storeGet(ctx, 'curriculum.progress', null));
      if (alive) { startRound(); renderLineStart(''); }
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The word set could not be loaded. If you are offline, open this page once while online, or use "Use Aleph offline" in the More menu to download everything. Nothing was lost.')); }
  })();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
