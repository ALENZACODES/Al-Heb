/**
 * Trope trainer (#/trope): a word from the Numbers 6:22-27 or Deuteronomy 6:4-9 corpus passages is shown with its cantillation mark
 * and the learner picks the mark's name from four choices. Levels are by how often the mark occurs in those passages. Names follow
 * data/corpus/trope/table.json (Ashkenazi or Sephardi/Mizrahi, from the congregation setting). Progress: store key "trope.v1".
 * DRAFT: machine parse, not reviewed by a cantor. No recorded audio; the draft tone melody lives at #/trope/melody (src/chant/). ctx extras for tests: ctx.tropeData {table,passages,levels}, ctx.rng.
 */
import { el, heText, storeGet, storeSet } from '../curriculum/dom.js';
import { loadTropeData } from './loader.js';
import { SETTING_LABELS } from '../traditions/model.js';
import { STORE_KEY, systemFor, nameMap, collectWords, frequency, buildQuestion, normaliseState, applyAnswer } from './model.js';

export const DRAFT_NOTICE = 'Draft, unreviewed: the words and mark names come from a machine parse of the Leningrad Codex text (UXLC). No cantor or Hebrew teacher has checked them yet.';
export const MELODY_NOTE = 'Melodies differ by community, and this trainer teaches only the names of the marks. There is no recorded audio. The Trope Melody page plays a draft melody in plain tones that is waiting for a cantor’s check; ask your cantor or teacher for the tune your community uses.';
const CSS = `
.alef-trope{max-inline-size:36rem;margin-inline:auto;overflow-wrap:anywhere}
.alef-trope *{box-sizing:border-box;max-inline-size:100%}
.alef-trope .tr-he{font-size:2.4rem;line-height:1.3;text-align:center;margin-block:.25rem}
.alef-trope h2{font-size:1.05rem;margin-block:.5rem .25rem}
.alef-trope .tr-name-he{font-size:1.15em;margin-inline-start:.25rem}
.alef-trope .tr-opts{display:grid;gap:.5rem;margin-block:.75rem}
.alef-trope button.btn,.alef-trope select{min-block-size:var(--tap,48px);min-inline-size:44px;inline-size:100%;font:inherit;white-space:normal}
.alef-trope select{padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.alef-trope label{display:block;font-weight:600;margin-block:.75rem .25rem}
.alef-trope .tr-row{display:grid;gap:.5rem;margin-block:.75rem}
.alef-trope footer{margin-block-start:1.5rem;font-size:.85rem;color:var(--muted,#555)}
`;
function injectStyle() {
  try { if (!document.head || document.getElementById?.('alef-trope-style')) return; const s = document.createElement('style'); s.id = 'alef-trope-style'; s.textContent = CSS; document.head.append(s); } catch { /* optional */ }
}
const focusNode = (n) => { try { n?.focus?.(); } catch { /* ignore */ } };

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  injectStyle();
  const rng = ctx?.rng || Math.random;
  const wrap = el('section', { class: 'alef-trope', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Trope trainer');
  const body = el('div', { class: 'tr-body' });
  const status = el('div', { class: 'tr-status', role: 'status', 'aria-live': 'polite' });
  const footer = el('footer', {}, el('p', { class: 'draft-flag', role: 'note' }, DRAFT_NOTICE), el('p', { role: 'note' }, MELODY_NOTE),
    el('p', {}, 'Hebrew text with cantillation: Unicode/XML Leningrad Codex (UXLC), Tanach.us Inc., copy without restriction.'),
    el('p', {}, el('a', { href: '#/trope/families' }, 'Trope Families'), ' · ', el('a', { href: '#/trope/aliyah' }, 'Trope Practice by Aliyah'), ' · ', el('a', { href: '#/trope/melody' }, 'Trope Melody (Draft)'))); // lane 6 (#13)
  wrap.append(h1, body, status, footer);
  root.append(wrap);

  let alive = true, data = null, state = normaliseState(null), q = null, lastKey = null, answered = false;
  const say = (t) => { status.textContent = t; };
  const setBody = (...n) => { body.replaceChildren(...n.filter(Boolean)); };
  const save = () => storeSet(ctx, STORE_KEY, state);

  async function init() {
    setBody(el('p', {}, 'Loading marks...'));
    try {
      const d = ctx?.tropeData || await loadTropeData();
      const settingId = ctx?.settings?.get?.('congregation');
      const system = systemFor(settingId);
      const names = nameMap(d.table, system);
      const words = collectWords(d.passages, names);
      data = { names, words, freq: frequency(words), levels: d.levels, system, settingId };
      state = normaliseState(await storeGet(ctx, STORE_KEY, null));
    } catch {
      if (alive) setBody(el('p', { role: 'alert' }, 'The trope data could not be loaded. Check your connection and reload; nothing was lost.'));
      return;
    }
    if (alive) question();
  }

  function question() {
    answered = false;
    q = buildQuestion({ words: data.words, names: data.names, freq: data.freq, levels: data.levels, level: state.level, rng, avoidKey: lastKey });
    if (!q) { setBody(el('p', { role: 'alert' }, 'Not enough marks are available at this level.')); return; }
    lastKey = q.word.key;
    const sel = el('select', { id: 'trope-level', name: 'level' }, (data.levels.levels || []).map((l) => el('option', { value: String(l.level), selected: l.level === state.level }, `Level ${l.level}: ${l.label}`)));
    sel.value = String(state.level);
    sel.addEventListener('change', (e) => { state = { ...state, level: Number(e.target.value) || 1 }; save(); say(''); question(); });
    const area = el('div', { class: 'tr-opts', role: 'group', 'aria-label': 'Choose the name of the mark' });
    const nextRow = el('div', { class: 'tr-row' });
    const next = el('button', { type: 'button', class: 'btn', id: 'trope-next', onclick: () => { say(''); question(); } }, 'Next word');
    for (const o of q.options) {
      area.append(el('button', { type: 'button', class: 'btn secondary', 'data-id': o.id, onclick: () => {
        if (answered) return; answered = true;
        const ok = o.id === q.answer, right = data.names.get(q.answer);
        state = applyAnswer(state, q.answer, ok); save();
        for (const b of area.children) b.setAttribute?.('disabled', '');
        const nm = right.he ? `${right.name} (${right.he})` : right.name;
        say(ok ? `Right. This is ${nm}.` : `Not yet. This one is ${nm}.`);
        nextRow.append(next); focusNode(next);
      } }, o.label, o.he ? [' ', heText(o.he, 'alef-he tr-name-he')] : null));
    }
    // Compact first screen: question, word and options come first; the level picker and source line sit below.
    setBody(
      el('h2', { id: 'trope-q', tabindex: '-1' }, 'What is the name of the mark on this word?'),
      el('div', { class: 'tr-he' }, heText(q.word.text)),
      area, nextRow,
      el('p', { class: 'muted', id: 'trope-score' }, `Answered ${state.answered}, right ${state.correct}. Saved on this device.`),
      el('p', { class: 'muted' }, `From ${q.word.ref}. Names: ${data.system === 'ashkenazi' ? 'Ashkenazi' : `Sephardi/Mizrahi, used with your ${SETTING_LABELS[data.settingId] || 'current'} setting`} (change in settings).`),
      el('label', { for: 'trope-level' }, 'Level (by how often the mark occurs in the corpus passages)'), sel);
    focusNode(body.querySelector?.('#trope-q'));
  }

  init();
  return () => { alive = false; };
}
