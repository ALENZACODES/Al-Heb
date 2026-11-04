/**
 * Placement check (#/placement): DRAFT, UNREVIEWED 20-item check (letters, vowels, syllables, common words, Siddur phrases) that
 * recommends a starting lesson. Cutoffs are untested guesses. Result saved under store key "placement.v1". It never changes lesson
 * completion history; accepting its recommendation separately saves an unlocked entry lesson. Audio via ctx.audio (shown honestly; there are no recorded clips yet).
 * ctx extras for tests: ctx.placementData {config, data}, ctx.rng, ctx.clock.now.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { loadPlacementData } from './loader.js';
import { STORE_KEY, buildItems, nextItem, recommend, seeded } from './model.js';

export const DRAFT_NOTE = 'Draft, unreviewed: no Hebrew teacher has checked this check and no learner has tried it. The cutoffs that pick your starting lesson are untested guesses. You can always start at lesson r01. Choosing the suggested lesson unlocks it without marking earlier lessons complete.';

export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-placement', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Placement check (draft)');
  const body = el('div', {}); const status = el('div', { role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, body, status); root.append(wrap);
  let alive = true, P = null, items = [], answers = [], answered = false;
  const set = (...n) => body.replaceChildren(...n.filter(Boolean));
  const now = () => (ctx?.clock?.now ? ctx.clock.now() : Date.now());
  const focus = (n) => { try { n?.focus?.(); } catch { /* ignore */ } };

  async function init() {
    set(el('p', {}, 'Loading...'));
    try { P = ctx?.placementData || await loadPlacementData(); } catch { if (alive) set(el('p', { role: 'alert' }, 'The check could not be loaded. Nothing was lost.')); return; }
    if (!alive) return;
    items = buildItems(P.data, P.config, ctx?.rng || seeded(P.config.seed));
    const saved = await storeGet(ctx, STORE_KEY, null);
    renderStart(saved?.result);
  }
  function renderStart(prev) {
    set(
      el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE),
      el('p', {}, `Up to ${items.length} short questions, easiest first. It stops early if several answers in a row are missed. "Not sure" is always fine.`),
      prev ? el('p', {}, `Last result: lesson ${prev.lesson}.`) : null,
      el('button', { type: 'button', class: 'btn', id: 'placement-start', onclick: () => { answers = []; question(); } }, 'Start'),
      el('a', { class: 'btn', href: '#/learn?lesson=' + P.config.firstLesson }, 'Skip: start at the beginning'),
    );
    focus(h1);
  }
  function question() {
    const it = nextItem(items, answers, P.config.stop);
    if (!it) return finish();
    answered = false; status.textContent = '';
    const fb = el('p', { class: 'ps-fb' });
    const next = el('button', { type: 'button', class: 'btn', id: 'placement-next', hidden: true, onclick: question }, 'Next');
    const give = (opt) => {
      if (answered) return; answered = true;
      const correct = !!opt?.correct;
      answers.push({ id: it.id, correct, picked: opt?.id ?? null });
      fb.textContent = correct ? 'Yes.' : 'Not this time. That is fine; it only helps pick your starting point.';
      next.hidden = false; status.textContent = fb.textContent; focus(next);
    };
    const play = it.audio && ctx?.audio?.play ? el('button', { type: 'button', class: 'btn', onclick: async () => { try { await ctx.audio.play(it.audio.kind, it.audio.id); } catch { status.textContent = 'No sound available.'; } } }, 'Listen') : null;
    set(
      el('p', { class: 'muted' }, `Question ${answers.length + 1} of up to ${items.length}`),
      el('p', {}, it.prompt), el('p', { class: 'ps-he' }, heText(it.he)), play,
      el('div', { class: 'ps-opts' }, it.options.map((o) => el('button', { type: 'button', class: 'btn', onclick: () => give(o) }, o.label)), el('button', { type: 'button', class: 'btn', onclick: () => give(null) }, 'Not sure')),
      fb, next,
    );
    focus(h1);
  }
  async function finish() {
    const result = recommend(items, answers, P.config, P.data.lessons);
    const lesson = P.data.lessons.find((l) => l.id === result.lesson);
    await storeSet(ctx, STORE_KEY, { v: 1, draft: true, at: now(), answers, result });
    if (!alive) return;
    set(
      el('h2', {}, 'Suggested starting point'),
      el('p', {}, `Lesson ${result.lesson}: ${lesson?.title || ''}`),
      el('p', {}, `${result.correct} of ${result.asked} answered correctly. Why: ${result.reason}.`),
      el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE),
      el('a', { class: 'btn', id: 'placement-go', href: '#/learn?lesson=' + result.lesson, onclick: async (event) => {
        event.preventDefault();
        try {
          await storeSet(ctx, 'placement.startLesson', result.lesson, { required: true });
          ctx.route('/learn?lesson=' + result.lesson);
        } catch { status.textContent = 'Could not save your starting point. Please try again.'; }
      } }, 'Go to this lesson'),
      el('button', { type: 'button', class: 'btn', onclick: () => { answers = []; renderStart(result ? { lesson: result.lesson } : null); } }, 'Retake'),
    );
    focus(h1);
  }
  init();
  return () => { alive = false; wrap.remove?.(); };
}
