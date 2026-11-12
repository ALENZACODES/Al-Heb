// H1 + H2 on #/scheduler: "Your Reviews Now" (the live scheduler's real state on this device) and "Fit to My Reviews" (the
// on-device fit of the scheduler's own parameters, src/platform/fit.js). Loaded by src/fsrs/scheduler.view.js on demand.
// Reads the four card stores; writes only store key srs.fit, and only when the learner presses a button.
import { el } from '../curriculum/dom.js';
import { activeParams, INIT_S } from '../curriculum/srs.js';
import { schedulerState, DECKS, pct } from './sched-state.js';
import { fit, histories, fitRecord, MIN_REVIEWS, MIN_CARDS } from './fit.js';

const FIT_STORE_KEY = 'srs.fit';
const B = (label, onclick) => el('button', { class: 'btn secondary', type: 'button', style: 'min-height:44px;min-width:44px', onclick }, label);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const fmtS = (a) => a.map((v) => `${Number(v).toFixed(1)} d`).join(', ');

async function readDecks(store) {
  const out = {};
  for (const [key] of DECKS) { try { out[key] = store?.get ? await store.get(key, {}) : {}; } catch { out[key] = {}; } }
  return out;
}

/** @param {any} ctx @param {{textContent:string}} status the page's one status line @param {() => number} [clock] */
export async function liveSection(ctx, status, clock = () => Date.now()) {
  const decks = await readDecks(ctx?.store);
  const now = clock();
  const s = schedulerState(decks, now);
  const sec = el('section', { class: 'card sc-live', 'aria-labelledby': 'sc-live-h' }, el('h2', { id: 'sc-live-h' }, 'Your Reviews Now'));
  if (!s.total) {
    sec.append(el('p', {}, 'You have no review cards on this device yet. Cards appear here after your first lesson, dictionary review or word tracing.'));
    return sec;
  }
  sec.append(
    el('p', {}, `${plural(s.total, 'card')} on this device: ${s.byState.new} new, ${s.byState.learning} relearning after a miss, ${s.byState.review} in review.`),
    el('p', {}, `Due now: ${s.dueNow}. Due by the end of today: ${s.dueToday}. Due tomorrow: ${s.dueTomorrow}.${s.newWaiting ? ` New cards waiting: ${s.newWaiting}.` : ''}`),
    el('div', { role: 'region', 'aria-label': 'Cards by interval, scrolls sideways on narrow screens', tabindex: '0', style: 'overflow-x:auto;max-width:100%' },
      el('table', { class: 'sc-table' }, el('caption', {}, 'Cards by the gap until their next review (new cards not counted)'),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Gap'), el('th', { scope: 'col' }, 'Cards'))),
        el('tbody', {}, ...s.buckets.map((b) => el('tr', {}, el('th', { scope: 'row' }, b.label), el('td', {}, String(b.n))))))),
    el('p', {}, `Chance of remembering a review card right now, the scheduler's own estimate (a formula, not a test): ${pct(s.estimate)}${s.estimateN ? ` over ${plural(s.estimateN, 'card')}` : ''}.`),
    el('p', {}, s.measured.n
      ? `Measured from your own answers: you remembered ${s.measured.recalled} of ${s.measured.n} reviews made a day or more after the one before (${pct(s.measured.rate)}).`
      : 'Measured from your own answers: not yet. Aleph started keeping a short answer log on each card on 12 November 2026; it fills as you review.'),
    el('p', { class: 'muted' }, s.perDeck.filter((d) => d.n).map((d) => `${d.label}: ${d.n}`).join('. ') + '.'));
  sec.append(fitPart(ctx, decks, status, clock));
  return sec;
}

function fitPart(ctx, decks, status, clock) {
  const box = el('div', { class: 'sc-fit' });
  const hs = histories(decks);
  const saved = (() => { try { return ctx?.store?.get?.(FIT_STORE_KEY, null) ?? null; } catch { return null; } })();
  const render = (rec, result) => {
    const kids = [el('h3', {}, 'Fit to My Reviews')];
    kids.push(el('p', {}, `The scheduler starts every card from four set numbers (days a card lasts after a first answer of Again, Hard, Good or Easy: ${fmtS(INIT_S)}) and one growth factor (1). Aleph can fit these to your own answers, here on this device. It switches to fitted numbers only with enough history: at least ${MIN_REVIEWS} reviews made a day or more apart, on at least ${MIN_CARDS} cards, and only if the fit predicts your answers better than the set numbers.`));
    const r = result || fit(hs);
    if (!r.enough) {
      kids.push(el('p', { class: 'sc-fit-state' }, `Not enough review history yet: ${r.n} of ${MIN_REVIEWS} reviews on ${r.cards} of ${MIN_CARDS} cards. Your reviews use the set numbers.`));
    } else {
      kids.push(el('p', {}, `Fitted on ${r.n} reviews from ${r.cards} cards: first-answer days ${fmtS(r.params.init)}, growth factor ${r.params.grow}. Average log loss on those same reviews (lower predicts better): set numbers ${r.lossDefault.toFixed(3)}, fitted ${r.lossFitted.toFixed(3)}. This is measured on the reviews used for the fit, so it is a best case.`));
      if (!r.better) kids.push(el('p', { class: 'sc-fit-state' }, 'The fit does not predict your answers better than the set numbers, so the set numbers stay.'));
      else if (rec?.active) kids.push(el('p', { class: 'sc-fit-state' }, 'Your reviews now use your fitted numbers.'), B('Use the set numbers instead', () => save(r, false)), ' ', B('Fit again', () => save(r, true)));
      else kids.push(el('p', { class: 'sc-fit-state' }, rec ? 'Your reviews use the set numbers (you chose this).' : 'Your reviews use the set numbers.'), B('Use my fitted numbers', () => save(r, true)));
    }
    box.replaceChildren(...kids);
  };
  async function save(r, active) {
    const rec = fitRecord(fit(hs), clock(), active);
    try { await ctx?.store?.set?.(FIT_STORE_KEY, rec); } catch { /* best effort */ }
    activeParams(rec.active ? rec : null);
    status.textContent = rec.active ? 'Saved. New reviews use your fitted numbers.' : 'Saved. New reviews use the set numbers.';
    render(rec, r);
  }
  render(saved);
  return box;
}
