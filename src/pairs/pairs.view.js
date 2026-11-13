/**
 * Look-Alike Words (#/pairs), PREVIEW and DRAFT. A tell-them-apart drill over pairs of words a learner mixes up: one letter apart,
 * said alike, or the same letters with different vowel marks. The pairs come from data/vocab/confusables.json, built by rule from
 * the word list (tools/vocab/build_confusables.mjs); nobody picked them by hand, and the page says so.
 * Modes: Practise (a round of 8, missed pairs first) and Browse (every pair, searchable). ?kind=look|sound|same picks a set.
 * Store key pairs.v1: counts per pair and totals, on this device only. ctx extras for tests: ctx.pairsData, ctx.clipLookup.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { sourcesLine } from '../shell/sources.js';
import { createListen } from '../roots/listen.js';
import { loadPairs } from './loader.js';
import { STORE_KEY, KINDS, KIND_IDS, DRAFT_NOTE, normalizeProgress, record, tally, difference, buildRound, grade, listPairs, standing } from './model.js';

const STANDING = { new: 'not asked yet', shaky: 'missed before', steady: 'steady' };

export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-pairs', 'aria-labelledby': 'pr-title' });
  const h1 = el('h1', { id: 'pr-title', tabindex: '-1' }, 'Look-Alike Words');
  const tabs = el('div', { role: 'group', 'aria-label': 'Which pairs', class: 'rt-tabs' }), modes = el('div', { role: 'group', 'aria-label': 'Mode', class: 'rt-tabs' });
  const body = el('div', { class: 'pr-body' }, el('p', { class: 'muted', role: 'status' }, 'Loading the pairs…'));
  const status = el('p', { role: 'status', 'aria-live': 'polite' });
  wrap.append(h1, el('p', {}, 'Some Hebrew words are easy to mix up. Here they come two at a time, so you learn what tells them apart.'), el('p', { class: 'rt-draft' }, DRAFT_NOTE), tabs, modes, body, status, el('footer', {}, sourcesLine(el)));
  root.append(wrap);
  const qy = ctx?.query || {};
  let alive = true, data = null, prog = normalizeProgress(null), kind = KIND_IDS.includes(qy.kind) ? qy.kind : 'look', mode = qy.mode === 'browse' ? 'browse' : 'practise';
  let round = [], qi = 0, picked = null, rightThisRound = 0, q = '';
  const say = (t) => { status.textContent = t; };
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  const listen = createListen(ctx, () => alive);
  const word = (id) => data.words[id];
  /** Both words of a pair side by side, with what differs: shown after an answer and in the browse list. */
  const apart = (pair) => el('div', { class: 'pr-apart', 'data-pair': pair.id },
    el('ul', {}, ...[pair.a, pair.b].map((id) => el('li', {}, heText(word(id).he), ` ${word(id).translit}: ${word(id).en} `, listen(word(id).he, word(id).translit) || ''))),
    el('p', {}, difference(pair, data.words)));

  function renderTabs() {
    tabs.replaceChildren(...KINDS.map(([id, label]) => btn(`${label} (${tally(data, prog, id).total})`, () => { kind = id; round = []; qi = 0; picked = null; q = ''; render(); say(`${label} pairs.`); }, { class: 'btn secondary', 'aria-pressed': String(kind === id) })));
    modes.replaceChildren(...[['practise', 'Practise'], ['browse', 'Browse the pairs']].map(([m, label]) => btn(label, () => { mode = m; render(); say(`${label} opened.`); }, { class: 'btn secondary', 'aria-pressed': String(mode === m) })));
  }
  function startRound() { round = buildRound(data, prog, { kind, seed: 7000 + prog.round * 53 + KIND_IDS.indexOf(kind), count: 8 }); qi = 0; picked = null; rightThisRound = 0; }

  function renderPractise() {
    const t = tally(data, prog, kind), about = KINDS.find((k) => k[0] === kind)[2];
    const head = [el('p', {}, about), el('p', { 'data-tally': kind }, `${t.total} pairs: ${t.steady} steady, ${t.shaky} missed before, ${t.new} not asked yet.`)];
    if (!round.length) startRound();
    if (!round.length) { body.replaceChildren(...head, el('p', {}, 'There are no pairs of this kind.')); return; }
    if (qi >= round.length) {
      body.replaceChildren(...head, el('h2', { tabindex: '-1' }, 'Round Done'), el('p', {}, `${rightThisRound} right of ${round.length} this round. All-time: ${prog.right} right of ${prog.asked} asked.`),
        el('p', { class: 'muted' }, 'Pairs you missed come back first next round. Answers are checked against the word list, not by a teacher.'),
        btn('Another round', async () => { prog = { ...prog, round: prog.round + 1 }; await storeSet(ctx, STORE_KEY, prog); round = []; renderPractise(); }));
      return;
    }
    const k = round[qi], res = picked ? grade(k, picked) : null;
    const opts = k.options.map((o) => btn(k.type === 'meaning' ? heText(o.he) : o.en, () => choose(o.id), { class: 'btn secondary', disabled: !!picked, 'aria-pressed': String(picked === o.id), 'data-option': o.id }));
    body.replaceChildren(...[...head, el('p', {}, `Question ${qi + 1} of ${round.length}`),
      el('p', { class: 'rt-prompt' }, k.prompt, k.type === 'word' ? [' ', heText(word(k.target).he)] : null),
      el('div', { role: 'group', 'aria-label': 'Answers' }, ...opts),
      res ? el('p', { 'data-result': res.correct ? 'right' : 'wrong' }, res.correct ? 'Right.' : 'Not this one.') : null,
      res ? apart(k.pair) : null,
      res ? btn(qi + 1 < round.length ? 'Next pair' : 'Finish round', () => { qi += 1; picked = null; renderPractise(); }) : null].filter(Boolean));
  }
  async function choose(id) {
    if (picked) return;
    const k = round[qi], ok = grade(k, id).correct;
    picked = id; rightThisRound += ok ? 1 : 0; prog = record(prog, k.pair.id, ok);
    renderPractise(); say(ok ? 'Right.' : 'Not this one.');
    await storeSet(ctx, STORE_KEY, prog);
  }

  function renderBrowse() {
    const list = el('div', {});
    const draw = () => {
      const res = listPairs(data, { kind, q, limit: 40 });
      list.replaceChildren(el('p', {}, q ? `${res.length} pairs match${res.length === 40 ? ' (first 40 shown)' : ''}.` : 'Most common words first. The first 40 are shown; search to find others.'),
        ...res.map((p) => el('div', { class: 'pr-row' }, apart(p), el('p', { class: 'muted' }, `In practice: ${STANDING[standing(prog, p.id)]}.`))));
    };
    const input = el('input', { id: 'pr-q', type: 'search', autocomplete: 'off', style: 'min-height:44px' }); input.value = q;
    input.addEventListener('input', () => { q = input.value; draw(); });
    body.replaceChildren(el('p', {}, KINDS.find((k) => k[0] === kind)[2]), el('div', {}, el('label', { for: 'pr-q' }, 'Find a pair (Hebrew letters, English or sounds-like)'), input), list); draw();
  }
  function render() { renderTabs(); if (mode === 'browse') renderBrowse(); else renderPractise(); }

  (async () => {
    try {
      data = ctx?.pairsData || (await loadPairs());
      prog = normalizeProgress(await storeGet(ctx, STORE_KEY, null));
      if (alive) render();
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The pairs could not be loaded. If you are offline, open this page once while online, or use "Use Aleph offline" in the More menu to download everything. Nothing was lost.')); }
  })();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
