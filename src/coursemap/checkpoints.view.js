/**
 * #/checkpoints (C5): one checkpoint per 10 lessons of each path. ?block=read-2 runs one. The same pass rule as a lesson;
 * a pass raises the path's checkpoint level, opens the next 10 lessons early (not done), and on the reading path offers to move
 * the starting lesson forward. Nothing here marks a lesson done, takes a heart or gives XP.
 */
import { el, storeGet, storeSet, CARDS_KEY } from '../curriculum/dom.js';
import { lessons, byId } from '../curriculum/lessons.js';
import { loadContent } from '../curriculum/content.js';
import { loadState } from '../curriculum/state.js';
import { unlockLesson } from '../curriculum/unlock.js';
import { mountQuiz } from '../curriculum/exercises.ui.js';
import { applyOutcomesToCards } from '../curriculum/progress.js';
import { fmtDuration } from '../curriculum/exercises.session.js';
import { passMarkText } from '../curriculum/passmark.js';
import { blocks, checkpointQuestions, standing, grade, withTry, nextBlock, replaceOffer, replacementRecord, STORE_KEY } from './checkpoints.js';

const PLACEMENT_KEY = 'placement.v1';
const NAME = { read: 'Reading Path', israel: 'Israel Path' };

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  let alive = true, off = () => {};
  const wrap = el('section', { class: 'alef-checkpoints', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Checkpoint Tests');
  const body = el('div', {}, el('p', {}, 'Loading...'));
  wrap.append(h1, body); root.append(wrap);
  const all = blocks(lessons), want = ctx?.query?.block;

  async function list() {
    const [saved, st] = await Promise.all([storeGet(ctx, STORE_KEY, {}), loadState(ctx)]);
    if (!alive) return;
    const s = standing(all, saved, st.completed);
    body.replaceChildren(el('p', {}, 'Every 10 lessons has a checkpoint: one question from each lesson, with the same pass rule as a lesson. Take one when you finish its lessons, or earlier to test yourself. Passing opens the next 10 lessons early and raises your checkpoint level. It never marks a lesson as done.'),
      ...Object.values(s).map((t) => el('section', { class: 'card', 'data-track': t.track, 'aria-labelledby': `cp-${t.track}` },
        el('h2', { id: `cp-${t.track}` }, NAME[t.track] || t.track),
        el('p', { 'data-level': String(t.level) }, `Checkpoint level: ${t.level} of ${t.of}.`),
        el('ul', {}, ...t.blocks.map((b) => el('li', { 'data-block': b.id, 'data-passed': String(b.passed) },
          el('a', { class: 'btn secondary', href: `#/checkpoints?block=${b.id}` }, `Checkpoint ${b.n}: ${b.first} to ${b.last}`),
          ` ${b.lessonsDone} of ${b.lessons.length} lessons done. `, b.passed ? 'Passed.' : b.tries ? `Not passed yet (${b.tries} ${b.tries === 1 ? 'try' : 'tries'}).` : 'Not taken.'))))));
  }

  async function run(b) {
    const [c, saved, st] = await Promise.all([loadContent(), storeGet(ctx, STORE_KEY, {}), loadState(ctx)]);
    if (!alive) return;
    const questions = checkpointQuestions(b, lessons, c, { tradition: ctx?.settings?.get?.('congregation') || 'sephardi' });
    h1.textContent = `Checkpoint ${b.n}: ${NAME[b.track]}`;
    if (!questions.length) { body.replaceChildren(el('p', {}, 'These lessons have no questions yet, so this checkpoint cannot be taken yet.'), el('a', { class: 'btn', href: '#/checkpoints' }, 'All checkpoints')); return; }
    const host = el('div', {});
    body.replaceChildren(el('p', {}, `Lessons ${b.first} to ${b.last}: ${questions.length} questions, one from each lesson. To pass: ${passMarkText(questions.length)} right on the first try. ${b.lessons.filter((id) => st.completed[id]).length} of ${b.lessons.length} of these lessons are done.`), host);
    off = mountQuiz(host, { questions, ctx, onFinish: async ({ results, ms }) => {
      const g = grade(questions, results), at = Date.now();
      try {
        await storeSet(ctx, STORE_KEY, withTry(await storeGet(ctx, STORE_KEY, {}), b.id, g, at, ms));
        const cards = await storeGet(ctx, CARDS_KEY, {}); // misses on cards the learner already has come back sooner; no card is created
        const outs = questions.filter((q) => q.cardId && cards[q.cardId] && q.id in results).map((q) => ({ id: q.cardId, kind: q.cardKind, good: !!results[q.id], create: false }));
        if (outs.length) await storeSet(ctx, CARDS_KEY, applyOutcomesToCards(cards, outs, at));
      } catch { if (alive) host.append(el('p', { role: 'alert' }, 'The result could not be saved.')); return; }
      const nb = nextBlock(all, b);
      let opened = 0;
      if (g.passed && nb) for (const id of nb.lessons) { if (!st.completed[id]) { await unlockLesson(ctx, id, at); opened++; } }
      if (!alive) return;
      const offer = g.passed ? replaceOffer(all, b, await storeGet(ctx, PLACEMENT_KEY, null), lessons) : null;
      const status = el('p', { role: 'status', 'aria-live': 'polite' });
      host.replaceChildren(el('h2', { id: 'alef-int-ex', tabindex: '-1' }, g.passed ? 'Checkpoint Passed' : 'Checkpoint Not Passed Yet'),
        el('p', {}, `${g.right} of ${g.of} right on the first try (pass mark ${g.need} of ${g.of}, ${g.pct}%). Time: ${fmtDuration(ms)} (measured).`),
        g.passed ? el('p', {}, nb ? `Your ${NAME[b.track]} checkpoint level is now at least ${b.n}. ${opened ? `${opened} lesson${opened === 1 ? '' : 's'} from ${nb.first} to ${nb.last} are open early; none is marked done.` : `The lessons from ${nb.first} to ${nb.last} were already open or done.`}` : `That was the last checkpoint on the ${NAME[b.track]}.`)
          : el('p', {}, 'Nothing changes: no lesson is opened or closed. The questions you missed point to these lessons: ' + [...new Set(questions.filter((q) => results[q.id] === false).map((q) => q.from))].map((id) => `${id} ${byId[id]?.title || ''}`).join('; ') + '.'),
        offer ? el('p', {}, `You can start from ${offer.start} instead of ${offer.from || 'the first open lesson'}. Earlier lessons stay open and are not marked done. `,
          el('button', { type: 'button', class: 'btn', id: 'cp-replace', onclick: async () => { await storeSet(ctx, PLACEMENT_KEY, replacementRecord(b, offer.start, Date.now())); status.textContent = `Your starting lesson is now ${offer.start}. You can change it again in the placement check.`; } }, `Start from ${offer.start}`)) : null,
        status,
        el('div', { class: 'row' }, el('a', { class: 'btn', href: '#/checkpoints' }, 'All checkpoints'), nb && g.passed ? el('a', { class: 'btn secondary', href: `#/learn?lesson=${nb.first}` }, `Open ${nb.first}`) : null));
      host.querySelector?.('#alef-int-ex')?.focus?.();
    } });
  }

  (async () => {
    try { const b = all.find((x) => x.id === want); if (b) await run(b); else await list(); }
    catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The checkpoints could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; off(); wrap.remove(); };
}
