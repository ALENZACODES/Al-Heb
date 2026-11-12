/**
 * Placement check (#/placement): DRAFT, UNREVIEWED 20-item check (letters, vowels, syllables, common words, Siddur phrases) that
 * sets a starting lesson. Cutoffs are untested guesses; the result is reversible, not a measure of what you know. Result saved under store key "placement.v1".
 * Lane 6 (#17): about 10 minutes (config.maxMinutes), unpointed words added; the result is applied (result.applied) so Home and the week
 * plan start at it, and the placed lesson is opened (curriculum.unlocked). It never completes a lesson. Audio via ctx.audio (shown honestly; there are no recorded clips yet).
 * ctx extras for tests: ctx.placementData {config, data}, ctx.rng, ctx.clock.now.
 */
import { audioAccess } from '../shell/audio-access.js';
import { el, heText, storeGet, storeSet, PROGRESS_KEY } from '../curriculum/dom.js';
import { loadPlacementData } from './loader.js';
import { STORE_KEY, buildItems, nextItem, openStart, recommend, seeded, timeUp, placedOut } from './model.js';
import { unlockLesson } from '../curriculum/unlock.js';
import { isAudioFree } from '../shell/audiofree.js';
import { loadFailureText } from '../shell/load-error.js';

export const DRAFT_NOTE = 'Draft, unreviewed: no Hebrew teacher has checked this check and no learner has tried it. The cutoffs that pick your starting lesson are untested guesses. You can always start at lesson r01 or pick any lesson yourself.';

export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-placement', 'aria-labelledby': 'view-title' });
  const fromWelcome = ctx?.query?.from === 'welcome'; // lane 6: reached from the welcome flow's "Not a beginner? Find your level"
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, fromWelcome ? 'Find Your Level' : 'Placement Check');
  const body = el('div', {}); const status = el('div', { role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, body, status); root.append(wrap);
  let alive = true, P = null, items = [], answers = [], answered = false, startedAt = 0, stoppedForTime = false;
  const set = (...n) => body.replaceChildren(...n.filter(Boolean));
  const now = () => (ctx?.clock?.now ? ctx.clock.now() : Date.now());
  const focus = (n) => { try { n?.focus?.(); } catch { /* ignore */ } };

  async function init() {
    set(el('p', {}, 'Loading...'));
    try { P = ctx?.placementData || await loadPlacementData(); } catch (e) { if (alive) set(el('p', { role: 'alert' }, loadFailureText(e, 'The check could not be loaded', 'The check could not be loaded. Nothing was lost.'))); return; }
    if (!alive) return;
    items = buildItems(P.data, P.config, ctx?.rng || seeded(P.config.seed));
    const saved = await storeGet(ctx, STORE_KEY, null);
    renderStart(saved?.result);
  }
  function renderStart(prev) {
    set(
      ctx.img?.(el, { kind: 'id', id: 'CHAR_ari_neutral', decorative: true, width: 300, class: 'pl-pic' }),
      ctx.img?.(el, { kind: 'id', id: 'CHAR_noa_neutral', decorative: true, width: 300, class: 'pl-pic' }),
      el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE),
      el('p', {}, `About ${P.config.maxMinutes || 10} minutes: up to ${items.length} short questions, easiest first, from letters and vowels to words, prayer lines and words with no vowel marks. It stops early if several answers in a row are missed, and at ${P.config.maxMinutes || 10} minutes. "Not sure" is always fine.`),
      el('p', {}, 'Your result becomes your starting lesson. Nothing is marked as done, and every earlier lesson stays open.'),
      prev ? el('p', {}, `Last result: lesson ${prev.start || prev.lesson}${prev.applied ? ' (your starting lesson now)' : ''}.`) : null,
      el('button', { type: 'button', class: 'btn', id: 'placement-start', onclick: () => { answers = []; startedAt = now(); stoppedForTime = false; question(); } }, 'Start'),
      el('a', { class: 'btn', href: '#/learn?lesson=' + P.config.firstLesson }, 'Skip: start at the beginning'),
    );
    focus(h1);
  }
  function question() {
    if (answers.length && timeUp(startedAt, now(), P.config)) { stoppedForTime = true; return finish(); }
    const it = nextItem(items, answers, P.config.stop);
    if (!it) return finish();
    answered = false; status.textContent = '';
    const next = el('button', { type: 'button', class: 'btn', id: 'placement-next', hidden: true, onclick: question }, 'Next');
    const give = (opt) => {
      if (answered) return; answered = true;
      const correct = !!opt?.correct;
      answers.push({ id: it.id, correct, picked: opt?.id ?? null });
      // C-06: one feedback only — the visible status line (also the live region); no second copy in the question body
      status.textContent = correct ? 'Yes.' : 'Not this time. That is fine; it only helps pick your starting point.';
      if (it.cat === 'unpointed') wordEl.replaceChildren(heText(it.pointed || it.he)); // lane 6: the vowelled form after the answer
      next.hidden = false; focus(next);
    };
    const wordEl = el('p', { class: 'ps-he' }, heText(it.he));
    const play = it.audio && !isAudioFree(ctx) && ctx?.audio?.play && audioAccess(ctx.audio, it.audio.kind, it.audio.id).level !== 'none' ? el('button', { type: 'button', class: 'btn', onclick: async () => { try { await ctx.audio.play(it.audio.kind, it.audio.id); } catch { status.textContent = 'No audio yet'; } } }, 'Listen (device voice, not a recorded teacher)') : null;
    set(
      el('p', { class: 'muted' }, `Question ${answers.length + 1} of up to ${items.length}`),
      el('p', {}, it.prompt), wordEl, play,
      el('div', { class: 'ps-opts' }, it.options.map((o) => el('button', { type: 'button', class: 'btn', onclick: () => give(o) }, o.label)), el('button', { type: 'button', class: 'btn', onclick: () => give(null) }, 'Not sure')),
      next,
    );
    focus(h1);
  }
  async function finish() {
    const result = recommend(items, answers, P.config, P.data.lessons);
    const lesson = P.data.lessons.find((l) => l.id === result.lesson);
    const progress = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
    // Lane 6 (points plan #17): the result sets the starting lesson and sticks. The placed lesson is opened (the same record a double
    // tap on a locked lesson writes) and the lessons before it are skipped over when Home picks the next lesson. Nothing is completed.
    const done = Object.keys(progress?.completed || {});
    const skip = placedOut(P.data.lessons, { result: { applied: true, start: result.lesson } });
    const start = openStart(P.data.lessons, [...done, ...skip], result.lesson);
    const startLesson = P.data.lessons.find((l) => l.id === start.id);
    const record = (applied) => ({ v: 1, draft: true, at: now(), answers, result: { ...result, start: start.id, applied, stoppedForTime } });
    await storeSet(ctx, STORE_KEY, record(true));
    try { if (start.id) await unlockLesson(ctx, start.id, Math.max(1, now())); } catch { /* the start still shows; the lesson opens with a double tap */ }
    if (!alive) return;
    set(
      el('h2', {}, 'Your starting lesson'),
      el('p', { id: 'placement-start-lesson' }, `Lesson ${start.id}: ${startLesson?.title || ''}`),
      start.id !== result.lesson ? el('p', {}, `Your answers pointed to lesson ${result.lesson}: ${lesson?.title || ''}. You have already finished it, so you start at the next open lesson.`) : null,
      el('p', {}, `Saved: Home and your week plan now start here, and this lesson is open. The lessons before it are not marked as done and stay open to you.${stoppedForTime ? ` The check stopped at ${P.config.maxMinutes} minutes.` : ''}`),
      el('p', {}, `${result.correct} of ${result.asked} answers matched. The result rests on this: ${result.reason}. A short, untested check cannot show how much you know, so treat it as a rough guess.`),
      el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTE),
      el('a', { class: 'btn', id: 'placement-go', href: '#/learn?lesson=' + start.id }, `Start lesson ${start.id}`),
      fromWelcome ? el('a', { class: 'btn secondary', id: 'placement-week', href: '#/welcome' }, 'See your week') : null,
      el('button', { type: 'button', class: 'btn secondary', id: 'placement-undo', onclick: async () => { await storeSet(ctx, STORE_KEY, record(false)); status.textContent = 'Undone: Home goes back to the first open lesson. Lesson ' + start.id + ' stays open.'; } }, 'Start at the beginning instead'),
      el('button', { type: 'button', class: 'btn', onclick: () => { answers = []; renderStart({ lesson: result.lesson, start: start.id, applied: true }); } }, 'Retake'),
    );
    focus(h1);
  }
  init();
  return () => { alive = false; wrap.remove?.(); };
}
