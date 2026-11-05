// @ts-check
// Niqqud dial with plene check (concept gr-t625-02). Lane 3, round 4.
//   mount(root, ctx) -> unmount
// Three levels: Unpointed (as Israelis write), Partial (same letters, vowel letters marked), Full (siddur pointing).
// The plene check compares the everyday spelling with the pointed one. A tradition badge lists marks whose sound
// differs between traditions. A read-first quiz asks for the respelling from the unpointed word.
// No recorded audio exists yet; respellings are Latin approximations from transliterate.js, unreviewed.

import { createView, loadData } from './ui.js';
import { pleneCheck, traditionBadges, makeRng } from './boards.model.js';
import { transliterate } from './transliterate.js';

const LEVELS = [['unpointed', 'Unpointed'], ['partial', 'Partial'], ['full', 'Full']];

/** @returns {() => void} */
export function mount(root, ctx = {}) {
  const ui = createView(root, ctx, { cls: 'alef-niqquddial', titleId: 'alef-niqquddial-title', title: 'Niqqud dial', titleKey: 'niqquddial.title' });
  const { h, tr, on, wrap } = ui;
  wrap.append(ui.title, h('p', { role: 'status' }, tr('sounds.loading', 'Loading...')));
  const rng = typeof ctx.random === 'function' ? ctx.random : makeRng(Date.now() & 0xffff);

  loadData(ctx, ['niqqud', 'consonants', 'dial-words']).then(({ niqqud, consonants, 'dial-words': dial }) => {
    if (!ui.alive) return;
    const words = dial.words;
    let idx = 0, level = 'unpointed', quiz = false;
    const body = h('div', {});
    const spell = (w) => transliterate(w.full, { scheme: ui.tradition === 'ashkenazi' ? 'ashkenazi-siddur' : 'siddur', tradition: ui.tradition, finalHe: 'silent' });

    const wordCard = (w) => {
      const chk = pleneCheck(w.unpointed, w.full);
      const card = h('div', { class: 'card' });
      if (level === 'unpointed') card.append(ui.he(w.unpointed));
      else if (level === 'partial') {
        const line = h('span', { class: 'he', dir: 'rtl', lang: 'he' });
        [...w.unpointed].forEach((ch, i) => {
          const r = chk.roles[i];
          line.append(r === 'consonant' ? ch : h('span', { class: r, style: 'text-decoration:underline;' + (r === 'plene-extra' ? 'text-decoration-style:dotted' : '') }, ch));
        });
        card.append(line, h('p', { class: 'muted' }, 'Underlined letters are vowel letters (vav, yod, he, alef used as vowels). Dotted underline: a vowel letter that the pointed spelling leaves out.'));
      } else card.append(ui.he(w.full));
      card.append(h('p', {}, w.gloss), ui.audioButton('word', `dial-${w.id}`, w.gloss, w.full));
      return card;
    };

    const info = (w) => {
      const chk = pleneCheck(w.unpointed, w.full);
      const out = h('div', {});
      out.append(h('p', {}, h('strong', {}, 'Plene check: '),
        chk.same ? 'The everyday spelling has exactly the letters of the pointed spelling.'
          : `The everyday spelling has an extra vowel letter (${chk.extra.join(', ')}) that the pointed spelling does not write. ${w.plene?.note ?? 'NO EXPLANATION RECORDED'}`));
      if (level === 'full') {
        out.append(h('p', {}, h('strong', {}, `Respelling (${ui.tradition}): `), ui.ipaEl(spell(w)), h('span', { class: 'muted' }, ' (Latin approximation, unreviewed)')));
        for (const b of traditionBadges(w.full, niqqud, consonants)) {
          const vals = Object.entries(b.ipa).map(([t, v]) => `${t} ${v}`).join('; ');
          out.append(h('p', {}, h('span', { class: 'badge' }, 'differs by tradition'), ' ', ui.he(b.shape, 'he-small'), ` ${b.id}: ${vals}${b.note ? '. ' + b.note : ''}`));
        }
      }
      return out;
    };

    const explore = () => {
      const w = words[idx];
      const nav = h('div', {});
      const prev = h('button', { type: 'button' }, 'Previous word');
      const nextB = h('button', { type: 'button' }, 'Next word');
      on(prev, 'click', () => { idx = (idx + words.length - 1) % words.length; render(); });
      on(nextB, 'click', () => { idx = (idx + 1) % words.length; render(); });
      nav.append(prev, ' ', nextB, ` Word ${idx + 1} of ${words.length}`);
      const dialSet = h('fieldset', {}, h('legend', {}, 'Niqqud dial'));
      for (const [id, label] of LEVELS) {
        const input = h('input', { type: 'radio', name: 'niqquddial-level', value: id, id: `niqquddial-${id}` });
        input.checked = id === level;
        on(input, 'change', () => { if (input.checked) { level = id; render(); } });
        dialSet.append(h('label', { for: `niqquddial-${id}` }, input, ' ', label), ' ');
      }
      ui.put(body, nav, dialSet, wordCard(w), info(w));
    };

    const quizMode = () => {
      const w = words[Math.floor(rng() * words.length)];
      const right = spell(w);
      const pool = [...new Set(words.filter((x) => x.id !== w.id).map(spell))].filter((x) => x !== right);
      const opts = [right];
      while (opts.length < 3 && pool.length) opts.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
      ui.put(body, h('p', {}, 'Read the unpointed word. Which respelling is its sound?'), ui.he(w.unpointed));
      const g = h('div', { role: 'group', 'aria-label': 'Respellings' });
      for (const o of opts) {
        const b = h('button', { type: 'button' }, o);
        on(b, 'click', () => {
          const ok = o === right;
          ui.status.textContent = ok ? `Correct: ${right}.` : `Not quite. The pointed word is ${w.full} and its respelling is ${right}.`;
          if (!ok) ui.recordMiss('niqquddial', w.id);
          render();
        });
        g.append(b, ' ');
      }
      ui.put(body, g, h('p', { class: 'muted' }, 'Several unpointed words can be read more than one way in real text; this list uses words with one reading.'));
    };

    const render = () => ui.renderInto(body, () => (quiz ? quizMode() : explore()));
    ui.tradListeners.push(render);
    const modeBtn = h('button', { type: 'button', 'aria-pressed': false }, 'Read-first quiz');
    on(modeBtn, 'click', () => { quiz = !quiz; modeBtn.setAttribute('aria-pressed', quiz); ui.status.textContent = quiz ? 'Quiz on.' : 'Back to the dial.'; render(); });
    wrap.replaceChildren(ui.title, ui.draftNotice(), h('p', {}, tr('niqquddial.intro', 'Israelis usually write without points. Turn the dial to see which marks are added.')), ui.traditionSwitch('niqquddial-trad'), modeBtn, ui.status, body);
    render();
  }).catch((e) => { wrap.replaceChildren(ui.title, ui.draftNotice(), h('p', { role: 'alert' }, 'Could not load the data. Check your connection, then try again.')); });

  return ui.unmount;
}
