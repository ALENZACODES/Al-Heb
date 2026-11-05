/**
 * Pointed-to-unpointed ladder (#/firstday/ladder): DRAFT, unreviewed. 20 steps from data/firstday/ladder.json.
 * Each step shows ladder step.shown at its stage; the learner reads aloud and self-checks (no machine grading).
 * A word read after tapping the pointing hint is recorded as not read unpointed. Score = unpointedScore (unpointed steps only).
 * Store key: firstday.ladder  { n, answers: {n: boolean}, hinted: {n: true} }.  ctx extras for tests: ctx.firstdayData {ladder}.
 */
import { el, heText, heLabeled, storeGet, storeSet } from '../curriculum/dom.js';
import { wordLabel } from '../letters/shapetext.js';
import { congregationOf } from '../pronunciation/forTradition.js';
import { loadLadder } from './loader.js';
import { uiEnglish } from '../shell/names.js';
import { DRAFT_NOTICE, unpointedScore, playHook, audioEntries } from './model.js';

export const LADDER_KEY = 'firstday.ladder';
export const emptyLadderState = () => ({ n: 1, answers: {}, hinted: {} });
/** Record a self-check. A hinted unpointed step never counts as right. */
export function recordAnswer(state, n, said, hinted = false) {
  return { ...state, answers: { ...state.answers, [n]: said === true && !hinted }, hinted: hinted ? { ...state.hinted, [n]: true } : state.hinted };
}
export const STAGE_LABEL = { 'pointed': 'Fully pointed', 'first-letter-pointed': 'First letter pointed', 'unpointed-with-hint': 'Unpointed, tap for a hint', 'unpointed': 'Unpointed, no hint' };

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-firstday-ladder', 'aria-labelledby': 'ladder-title' });
  const h1 = el('h1', { id: 'ladder-title', tabindex: '-1' }, 'Pointed to unpointed ladder');
  const body = el('div', { class: 'fd-body' });
  const status = el('div', { role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, el('p', { class: 'fd-draft' }, DRAFT_NOTICE), body, status);
  root.append(wrap);
  let alive = true, ladder = null, st = emptyLadderState(), revealed = false;
  const say = (t) => { status.textContent = t; };
  const save = () => storeSet(ctx, LADDER_KEY, st);
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', onclick, ...extra }, label);

  function render() {
    const s = ladder.steps[st.n - 1], total = ladder.steps.length;
    const shown = revealed && s.hintAvailable ? s.word : s.shown;
    const nodes = [
      el('p', {}, `Step ${s.n} of ${total}. Stage: ${STAGE_LABEL[s.stage] || s.stage}.`),
      el('p', {}, heLabeled(shown, wordLabel(s.word, congregationOf(ctx?.settings)), 'alef-he fd-big')), // a screen reader gets the respelling of the pointed word (the unpointed form has none)
      el('p', {}, 'Say it aloud, then say how it went.'),
      btn('Hear it', async () => { const r = await playHook(ctx?.audio, s.audio); say(r.source === 'none' ? 'Sound is not available on this device yet.' : r.source === 'tts-fallback' ? 'Played with the device voice, not a recording.' : 'Playing.'); }, { 'aria-label': `Hear it, step ${s.n}` }),
    ];
    if (s.hintAvailable) nodes.push(btn(revealed ? 'Points shown' : 'Show the points (hint)', () => { revealed = true; st = { ...st, hinted: { ...st.hinted, [s.n]: true } }; save(); render(); say('Points shown. This word will not count as read unpointed.'); }, { 'aria-pressed': String(revealed) }));
    const check = (said) => { st = recordAnswer(st, s.n, said, !!st.hinted[s.n]); save(); say(`${s.word}: ${uiEnglish(ctx, s.gloss)}. Saved. ${said ? 'Marked as read.' : 'Marked as not yet.'}`); };
    nodes.push(btn('I read it', () => check(true), { 'aria-label': `I read it, step ${s.n} correctly` }), btn('Not yet', () => check(false), { 'aria-label': `Not yet, step ${s.n}` }));
    nodes.push(el('p', {}, `Meaning: ${uiEnglish(ctx, s.gloss)}. This reading is self-reported.`));
    nodes.push(btn('Previous', () => go(st.n - 1), { disabled: st.n === 1 }), btn('Next', () => go(st.n + 1), { disabled: st.n === total }));
    const sc = unpointedScore(ladder, st.answers);
    nodes.push(el('p', {}, `Unpointed words marked read: ${sc.right} of ${sc.total} (${sc.pct}%). ${ladder.passRule}`));
    body.replaceChildren(...nodes);
  }
  function go(n) { st = { ...st, n: Math.max(1, Math.min(ladder.steps.length, n)) }; revealed = false; save(); render(); try { h1.focus(); } catch { /* ignore */ } }

  (async () => {
    try {
      ladder = ctx?.firstdayData?.ladder || await loadLadder();
      try { ctx?.audio?.extend?.(audioEntries({ words: [] }, ladder)); } catch { /* optional */ }
      const saved = await storeGet(ctx, LADDER_KEY, null);
      if (saved && Number.isInteger(saved.n) && saved.n >= 1 && saved.n <= ladder.steps.length) st = { ...emptyLadderState(), ...saved };
      if (alive) render();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The ladder could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.remove(); };
}
