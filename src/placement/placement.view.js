/**
 * Placement check (#/placement): DRAFT, UNREVIEWED 20-item check (letters, vowels, syllables, common words, Siddur phrases) that
 * suggests a starting lesson. Cutoffs are untested guesses; the result is a reversible suggestion, not a measure of what you know. Result saved under store key "placement.v1". It never changes lesson
 * progress; it only links to the recommended lesson. Audio via ctx.audio (shown honestly; there are no recorded clips yet).
 * ctx extras for tests: ctx.placementData {config, data}, ctx.rng, ctx.clock.now.
 */
import { audioAccess } from '../shell/audio-access.js';
import { el, heText, storeGet, storeSet, PROGRESS_KEY } from '../curriculum/dom.js';
import { loadPlacementData } from './loader.js';
import { STORE_KEY, buildItems, nextItem, openStart, recommend, seeded } from './model.js';
import { isAudioFree } from '../shell/audiofree.js';

export const DRAFT_NOTE = 'Draft, unreviewed: no Hebrew teacher has checked this check and no learner has tried it. The cutoffs that pick your starting lesson are untested guesses. You can always start at lesson r01 or pick any lesson yourself.';

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
      ctx.img?.(el, { kind: 'id', id: 'CHAR_ari_neutral', decorative: true, width: 300, class: 'pl-pic' }),
      el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE),
      el('p', {}, `Up to ${items.length} short questions, easiest first. It stops early if several answers in a row are missed. "Not sure" is always fine.`),
      prev ? el('p', {}, `Last suggestion: lesson ${prev.lesson}.`) : null,
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
    const play = it.audio && !isAudioFree(ctx) && ctx?.audio?.play && audioAccess(ctx.audio, it.audio.kind, it.audio.id).level !== 'none' ? el('button', { type: 'button', class: 'btn', onclick: async () => { try { await ctx.audio.play(it.audio.kind, it.audio.id); } catch { status.textContent = 'No audio yet'; } } }, 'Listen (device voice, not a recorded teacher)') : null;
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
    const progress = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
    const start = openStart(P.data.lessons, Object.keys(progress?.completed || {}), result.lesson);
    const startLesson = P.data.lessons.find((l) => l.id === start.id);
    await storeSet(ctx, STORE_KEY, { v: 1, draft: true, at: now(), answers, result: { ...result, start: start.id } });
    if (!alive) return;
    set(
      el('h2', {}, 'A possible starting point'),
      start.locked
        ? el('p', {}, `Your answers point towards lesson ${result.lesson}: ${lesson?.title || ''}. Lessons open in order and this check does not complete any, so that lesson is still locked. Start with lesson ${start.id}: ${startLesson?.title || ''}.`)
        : el('p', {}, `Lesson ${start.id}: ${startLesson?.title || ''}`),
      el('p', {}, `${result.correct} of ${result.asked} answers matched. The suggestion rests on this: ${result.reason}. A short, untested check cannot show how much you know, so treat it as a rough guess.`),
      el('p', {}, 'Nothing is locked in. You can pick an earlier or later lesson at any time, or retake this check.'),
      el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE),
      el('a', { class: 'btn', id: 'placement-go', href: '#/learn?lesson=' + start.id }, start.locked ? `Start lesson ${start.id}` : 'Go to this lesson'),
      el('button', { type: 'button', class: 'btn', onclick: () => { answers = []; renderStart({ lesson: start.id }); } }, 'Retake'),
    );
    focus(h1);
  }
  init();
  return () => { alive = false; wrap.remove?.(); };
}
