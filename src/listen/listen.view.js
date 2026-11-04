/**
 * Listen and pick (#/listen). With a recording: hear a word, pick its written form from 4 look-alikes. Without any recording the
 * screen says "Audio not recorded yet" and offers a read-and-match drill (meaning shown, pick the written word); it never fakes listening.
 * Words: data/vocab/words.json (machine-built DRAFT). Store key "listen.v1". ctx extras for tests: ctx.listenData {words, config}, ctx.rng.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { KEY, normState, buildPool, buildRound, applyAnswer } from './model.js';

const CSS = `
.alef-listen{max-inline-size:36rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-listen *{box-sizing:border-box;max-inline-size:100%}
.alef-listen .ls-opts{display:grid;gap:.5rem;margin-block:.75rem}
.alef-listen button.btn{min-block-size:44px;min-inline-size:44px;inline-size:100%;white-space:normal;font-size:1.6rem}
.alef-listen .ls-note{border-inline-start:6px solid currentColor;padding-inline-start:.5rem;margin-block:.75rem}
.alef-listen footer{margin-block-start:1.5rem;font-size:.85rem}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.('alef-listen-style')) return; const s = document.createElement('style'); s.id = 'alef-listen-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
async function loadJson(rel) {
  const url = new URL('../../' + rel, import.meta.url);
  if (url.protocol === 'file:') { const [{ readFile }, { fileURLToPath }] = await Promise.all([import('node:fs/promises'), import('node:url')]); return JSON.parse(await readFile(fileURLToPath(url), 'utf8')); }
  const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json();
}

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  const rng = ctx?.rng || Math.random;
  const wrap = el('section', { class: 'alef-listen', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Listen and pick');
  const body = el('div', { class: 'ls-body' });
  const status = el('div', { class: 'ls-status', role: 'status', 'aria-live': 'polite' });
  let cfg = null;
  const notice = el('p', { class: 'ls-draft' }, 'Draft: loading...');
  wrap.append(h1, notice, body, status);
  root.append(wrap);
  let alive = true, state = normState(null), pool = [], mode = 'read', qs = [], qi = 0, right = 0, answered = false;
  const say = (t) => { status.textContent = t; };
  const set = (...n) => body.replaceChildren(...n.filter(Boolean));
  const audioHas = (id) => { try { return !!ctx?.audio?.has?.('word', id); } catch { return false; } };

  async function init() {
    set(el('p', {}, 'Loading words...'));
    try {
      const d = ctx?.listenData;
      let words; [cfg, words] = d ? [d.config, d.words] : await Promise.all([loadJson('data/listen/config.json'), loadJson('data/vocab/words.json').then((j) => j.words)]);
      state = normState(await storeGet(ctx, KEY, null));
      if (!alive) return;
      notice.textContent = cfg.draftNotice;
      pool = buildPool(words, cfg);
      home();
    } catch (e) { if (alive) set(el('p', { role: 'alert' }, 'Could not load the word list. Check your connection and try again.')); }
  }

  function home() {
    const withAudio = pool.filter((w) => audioHas(w.id));
    const nodes = [];
    if (withAudio.length >= 4) {
      nodes.push(el('p', {}, `${withAudio.length} words have audio. You hear a word and pick how it is written.`),
        el('button', { class: 'btn', type: 'button', onclick: () => start('audio', withAudio) }, 'Start listening drill'));
    } else {
      nodes.push(el('p', { class: 'ls-note', role: 'note' }, cfg.noAudio + '.'), el('p', {}, cfg.noAudioHelp),
        el('button', { class: 'btn', type: 'button', onclick: () => start('read', pool) }, 'Start read-and-match'));
    }
    if (state.answered) nodes.push(el('p', {}, `So far: ${state.correct} right out of ${state.answered}.`));
    set(...nodes); h1.focus?.();
  }

  function start(m, targets) {
    mode = m; qi = 0; right = 0;
    qs = buildRound(targets, pool, cfg, rng, m, state.missed);
    if (!qs.length) { set(el('p', {}, 'Not enough look-alike words to build a round.')); return; }
    show();
  }

  function show() {
    answered = false;
    const q = qs[qi];
    const opts = el('div', { class: 'ls-opts', role: 'group', 'aria-label': 'Choices' },
      q.choices.map((c, i) => el('button', { class: 'btn', type: 'button', lang: 'he', dir: 'rtl', 'aria-label': `Choice ${i + 1}: ${c.he}`, onclick: () => pick(c, opts) }, heText(c.he))));
    const head = mode === 'audio'
      ? [el('p', {}, `Word ${qi + 1} of ${qs.length}. Press Play, then pick the written word.`),
        el('button', { class: 'btn', type: 'button', onclick: () => play(q.id) }, 'Play')]
      : [el('p', {}, `Word ${qi + 1} of ${qs.length}. Which written word means: ${q.prompt}?`)];
    set(...head, opts);
    focusLead();
    if (mode === 'audio') play(q.id);
  }
  async function play(id) {
    try { const r = await ctx.audio.play('word', id); if (r && r.source === 'none') say('This clip could not play. You can press Play to try again.'); } catch { say('This clip could not play.'); }
  }
  async function pick(c, opts) {
    if (answered) return; answered = true;
    const q = qs[qi], ok = c.he === q.answer;
    if (ok) right++;
    state = applyAnswer(state, q.id, ok, Date.now()); await storeSet(ctx, KEY, state);
    const msg = ok ? 'Right.' : `Not this time. The word was ${q.answer}. It will come back later.`;
    say(msg);
    const next = el('button', { class: 'btn', type: 'button', onclick: () => { qi++; if (qi < qs.length) show(); else done(); } }, qi + 1 < qs.length ? 'Next word' : 'Finish');
    body.append(el('p', {}, msg), next); next.focus?.();
  }
  // After the list is replaced the focused button is gone; move focus to the new first paragraph so keyboard and screen reader users keep their place.
  function focusLead() { const lead = body.querySelector?.('p'); if (lead) { lead.setAttribute('tabindex', '-1'); lead.focus?.(); } }
  function done() { set(el('p', {}, `Done: ${right} right out of ${qs.length}.`), el('button', { class: 'btn', type: 'button', onclick: home }, 'Back')); focusLead(); say(`Done: ${right} of ${qs.length}.`); }

  init();
  return () => { alive = false; wrap.remove?.(); };
}
