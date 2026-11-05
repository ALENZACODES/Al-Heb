/**
 * Listen and pick (#/listen). With audio clips: hear a word, pick its written form from 4 look-alikes. The page title, the intro and the
 * score line follow the mode actually in use: a listening drill only when clips exist; otherwise "Read and match" (meaning shown, pick the
 * written word), which is a reading drill and is never counted or described as listening. Clips may be synthetic: the intro says which.
 * Words: data/vocab/words.json (machine-built DRAFT). Store key "listen.v1". ctx extras for tests: ctx.listenData {words, config}, ctx.rng.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { uiEnglish } from '../shell/names.js';
import { sourcesLine } from '../shell/sources.js';
import { congregationOf, audioNote, playLine, LABELS } from '../pronunciation/forTradition.js';
import { KEY, normState, buildPool, buildRound, applyAnswer } from './model.js';
import { isAudioFree, AUDIO_FREE_NOTE, SKIP_NOTE } from '../shell/audiofree.js';

export const TITLE_LISTEN = 'Listen and pick';
export const TITLE_READ = 'Read and match';
export const READ_ONLY_NOTE = 'This is a reading drill. Seeing a word and its meaning is not listening, so nothing here shows how well you recognise spoken Hebrew.';
export const OFFLINE_NOTE = 'The list of recordings could not be loaded (offline?), so no listening questions are offered right now. Reading questions still work.';
export const SCORE_NOTE = 'Your own tally of picks on this device, not a test result. Reading and listening picks are counted separately.';

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
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Word drill');
  const body = el('div', { class: 'ls-body' });
  const status = el('div', { class: 'ls-status', role: 'status', 'aria-live': 'polite' });
  let cfg = null;
  const notice = el('p', { class: 'ls-draft' }, 'Draft: loading...');
  wrap.append(h1, notice, body, status, el('footer', {}, sourcesLine(el)));
  root.append(wrap);
  let alive = true, state = normState(null), pool = [], mode = 'read', qs = [], qi = 0, right = 0, answered = false;
  const say = (t) => { status.textContent = t; };
  const trad = () => congregationOf(ctx?.settings);
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
    const silent = isAudioFree(ctx);
    const withAudio = silent ? [] : pool.filter((w) => audioHas(w.id));
    const listening = !silent && withAudio.length >= 4;
    h1.textContent = listening ? TITLE_LISTEN : TITLE_READ;
    const nodes = [];
    if (silent) {
      nodes.push(el('p', { class: 'ls-note', role: 'note' }, AUDIO_FREE_NOTE),
        el('p', {}, 'Instead of listening, you see the meaning and pick the written word. This practises telling look-alike words apart by their letters. ' + READ_ONLY_NOTE),
        el('button', { class: 'btn', type: 'button', onclick: () => start('read', pool) }, 'Start read-and-match'));
    } else if (withAudio.length >= 4) {
      nodes.push(el('p', {}, `${withAudio.length} words have a clip for your ${LABELS[trad()]} setting${clipKinds(withAudio)}. You hear a word and pick how it is written. Browser speech is not used in this drill.`),
        el('button', { class: 'btn', type: 'button', onclick: () => start('audio', withAudio) }, 'Start listening drill'));
    } else {
      const offline = ctx?.audio?.manifestState === 'offline';
      nodes.push(el('p', { class: 'ls-note', role: 'note' }, offline ? OFFLINE_NOTE : cfg.noAudio + '.'),
        trad() === 'israeli' ? null : el('p', { class: 'ls-trad', role: 'note' }, audioNote(trad())),
        el('p', {}, cfg.noAudioHelp + ' ' + READ_ONLY_NOTE),
        el('button', { class: 'btn', type: 'button', onclick: () => start('read', pool) }, 'Start read-and-match'));
    }
    if (state.answered) {
      const readN = state.answered - state.heard, readOk = state.correct - state.heardCorrect;
      const parts = [];
      if (readN > 0) parts.push(`reading: ${readOk} right out of ${readN}`);
      if (state.heard > 0) parts.push(`after hearing a clip: ${state.heardCorrect} right out of ${state.heard}`);
      nodes.push(el('p', {}, `So far, ${parts.join('; ')}.`), el('p', { class: 'muted' }, SCORE_NOTE));
    }
    set(...nodes); h1.focus?.();
  }

  function start(m, targets) {
    mode = m; qi = 0; right = 0; h1.textContent = m === 'audio' ? TITLE_LISTEN : TITLE_READ;
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
      : [el('p', {}, `Word ${qi + 1} of ${qs.length}. Which written word means: ${uiEnglish(ctx, q.prompt)}?`)];
    // Skipping is always possible and records nothing: not a miss, not an answer. A listening round can also be swapped for reading questions.
    const skipRow = el('div', { class: 'ls-skip' },
      el('button', { class: 'btn secondary', type: 'button', 'data-act': 'skip', onclick: () => { qi++; if (qi < qs.length) show(); else done(); } }, 'Skip this word'),
      mode === 'audio' ? el('button', { class: 'btn secondary', type: 'button', 'data-act': 'to-read', onclick: () => start('read', pool) }, 'I cannot listen: use reading questions') : null,
      el('p', { class: 'muted' }, SKIP_NOTE));
    set(...head, opts, skipRow);
    focusLead();
    if (mode === 'audio') play(q.id);
  }
  function clipKinds(ws) {
    let rec = 0, syn = 0;
    for (const w of ws) { let st = null; try { st = ctx?.audio?.status?.('word', w.id)?.entryStatus; } catch { /* optional */ } if (st === 'recorded') rec++; else if (st) syn++; }
    if (!rec && !syn) return '';
    return rec && syn ? ` (${rec} recorded by a human reader, ${syn} computer-made)` : rec ? ' (recorded by a human reader)' : ' (computer-made voice, not a recorded teacher)';
  }
  async function play(id) {
    try { const r = await ctx.audio.play('word', id); if (r && r.source === 'none') say(r.reason === 'tts-pronunciation-mismatch' ? playLine(r, trad()) : 'This clip could not play. You can press Play to try again.'); else say(playLine(r, trad(), 'this word')); } catch { say('This clip could not play.'); }
  }
  async function pick(c, opts) {
    if (answered) return; answered = true;
    const q = qs[qi], ok = c.he === q.answer;
    if (ok) right++;
    state = applyAnswer(state, q.id, ok, Date.now(), mode); await storeSet(ctx, KEY, state);
    const msg = ok ? 'Right.' : `Not this time. The word was ${q.answer}. It will come back later.`;
    say(msg);
    const next = el('button', { class: 'btn', type: 'button', onclick: () => { qi++; if (qi < qs.length) show(); else done(); } }, qi + 1 < qs.length ? 'Next word' : 'Finish');
    try { body.querySelector?.('.ls-skip')?.remove?.(); } catch { /* optional */ }
    body.append(el('p', {}, msg), next); next.focus?.();
  }
  // After the list is replaced the focused button is gone; move focus to the new first paragraph so keyboard and screen reader users keep their place.
  function focusLead() { const lead = body.querySelector?.('p'); if (lead) { lead.setAttribute('tabindex', '-1'); lead.focus?.(); } }
  function done() { set(el('p', {}, `Done: ${right} right out of ${qs.length} ${mode === 'audio' ? 'listening' : 'reading'} questions.`), el('button', { class: 'btn', type: 'button', onclick: home }, 'Back')); focusLead(); say(`Done: ${right} of ${qs.length}.`); }

  init();
  return () => { alive = false; wrap.remove?.(); };
}
