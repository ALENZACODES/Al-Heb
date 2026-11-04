// @ts-check
// Syllable chips with stress marking (concept gr-tmh-05). Lane 3, round 4.
//   mount(root, ctx) -> unmount
// Chips are in reading order (first syllable on the right, dir=rtl). The stressed chip has a dot and the word
// "stress" under it (never colour alone). Tapping a chip plays that syllable only if a recorded file exists.
// Modes: Learn, "Which chip is stressed?", "Hide one by one". A toggle hides the Latin letters.
// Boundaries: src/photo/syllabify.js with this lane's shva rules; Latin: transliterate.js; stress: stress.json.

import { createView, loadData } from './ui.js';
import { chipWords, chipsFor, hyphenated, chipAudioId } from './syllables.js';
import { makeRng } from './boards.model.js';

/** @returns {() => void} */
export function mount(root, ctx = {}) {
  const ui = createView(root, ctx, { cls: 'alef-syllablechips', titleId: 'alef-syllablechips-title', title: 'Syllable chips', titleKey: 'syllablechips.title' });
  const { h, tr, on, wrap } = ui;
  wrap.append(ui.title, h('p', { role: 'status' }, tr('sounds.loading', 'Loading...')));
  const rng = typeof ctx.random === 'function' ? ctx.random : makeRng(Date.now() & 0xffff);

  loadData(ctx, ['dial-words', 'prayerwords', 'stress']).then(({ 'dial-words': dial, prayerwords, stress }) => {
    if (!ui.alive) return;
    const words = chipWords(dial, prayerwords);
    let idx = 0, mode = 'learn', hideLatin = false, hidden = 0;
    /** @type {number|null} */ let answered = null;
    const body = h('div', {});
    const cur = () => { const w = words[idx]; return { w, r: chipsFor(w.he, { tradition: ui.tradition, stress, prayer: w.prayer }) }; };

    const chipRow = ({ w, r }, { showStress, interactive }) => {
      const row = h('div', { dir: 'rtl', lang: 'he', style: 'display:flex;gap:.6rem;flex-wrap:wrap;justify-content:flex-start' });
      r.syllables.forEach((s, i) => {
        const isStress = i === r.stressIndex;
        const gone = mode === 'hide' && i >= r.syllables.length - hidden;
        const label = `Syllable ${i + 1} of ${r.syllables.length}${showStress && isStress ? ', stressed' : ''}`;
        const b = h('button', { type: 'button', class: 'chip', 'aria-label': label, style: 'display:flex;flex-direction:column;align-items:center;min-width:3.5rem' },
          h('span', { class: 'he', dir: 'rtl', lang: 'he' }, gone ? '·' : s.he),
          !hideLatin && s.latin != null ? h('span', { class: 'ipa', dir: 'ltr', style: 'font-size:.95rem' }, gone ? '' : s.latin) : null,
          showStress && isStress ? h('span', { style: 'font-size:.8rem', dir: 'ltr' }, '● stress') : h('span', { style: 'font-size:.8rem', 'aria-hidden': 'true' }, ' '));
        on(b, 'click', () => {
          if (interactive) {
            answered = i;
            const ok = i === r.stressIndex;
            ui.status.textContent = ok ? 'Correct: that chip is stressed.' : `Not quite: the stressed chip is number ${r.stressIndex + 1}.`;
            if (!ok) ui.recordMiss('syllablechips', w.id);
            render();
          } else {
            const played = ui.tryPlay('syllable', chipAudioId(w.id, i));
            ui.status.textContent = played ? 'Playing.' : 'No audio yet for this syllable.';
          }
        });
        row.append(b);
      });
      return row;
    };

    const render = () => ui.renderInto(body, () => {
      const c = cur();
      const { w, r } = c;
      const nav = h('div', {});
      const pv = h('button', { type: 'button' }, 'Previous word');
      const nx = h('button', { type: 'button' }, 'Next word');
      on(pv, 'click', () => { idx = (idx + words.length - 1) % words.length; hidden = 0; answered = null; render(); });
      on(nx, 'click', () => { idx = (idx + 1) % words.length; hidden = 0; answered = null; render(); });
      nav.append(pv, ' ', nx, ` Word ${idx + 1} of ${words.length}: ${w.gloss}`);
      ui.put(body, nav);
      if (!r.ok || !r.syllables.length) { ui.put(body, h('p', { role: 'alert' }, 'This word could not be split into syllables.')); return; }
      if (mode === 'learn') {
        ui.put(body, chipRow(c, { showStress: true, interactive: false }),
          r.latinOk && !hideLatin ? h('p', {}, h('span', { class: 'ipa' }, hyphenated(r)), h('span', { class: 'muted' }, ' (capitals = stressed syllable)')) : null,
          h('p', { class: 'muted' }, `Stress rule used: ${r.stressRule}.${r.checked ? '' : ' Not checked for this tradition.'}`),
          r.finalHeLetter ? h('p', {}, 'The last letter, he, is a vowel letter: it is written but you do not hear an h. It tells you the last vowel is a (or e/o), so it is not "just not read".') : null,
          r.syllables.some((_, i) => { try { return !!ctx.audio?.has?.('syllable', chipAudioId(w.id, i)); } catch { return false; } }) ? null : h('p', { class: 'muted' }, 'Tap a chip to hear it: no audio yet (nothing is recorded for these syllables).'),
          r.latinOk ? null : h('p', { role: 'note' }, 'Latin letters for the chips could not be derived consistently for this word, so none are shown.'));
      } else if (mode === 'which') {
        ui.put(body, h('p', {}, 'Which chip is stressed? Tap it.'), chipRow(c, { showStress: answered != null, interactive: answered == null }));
      } else {
        const nextH = h('button', { type: 'button' }, 'Hide next syllable');
        const reset = h('button', { type: 'button' }, 'Show all');
        on(nextH, 'click', () => { hidden = Math.min(r.syllables.length, hidden + 1); render(); });
        on(reset, 'click', () => { hidden = 0; render(); });
        ui.put(body, h('p', {}, 'Say the word aloud, hiding chips from the end. Say the rest from memory.'), chipRow(c, { showStress: true, interactive: false }), nextH, ' ', reset);
      }
    });

    const modes = h('div', { role: 'group', 'aria-label': 'Mode' });
    const mb = [['learn', 'Learn'], ['which', 'Which is stressed?'], ['hide', 'Hide one by one']].map(([id, label]) => {
      const b = h('button', { type: 'button', 'aria-pressed': id === mode }, label);
      on(b, 'click', () => { mode = id; hidden = 0; answered = null; mb.forEach(([bb, i]) => bb.setAttribute('aria-pressed', i === mode)); render(); });
      modes.append(b, ' ');
      return /** @type {[any,string]} */ ([b, id]);
    });
    const hideBtn = h('button', { type: 'button', 'aria-pressed': false }, 'Hide Latin letters');
    on(hideBtn, 'click', () => { hideLatin = !hideLatin; hideBtn.setAttribute('aria-pressed', hideLatin); render(); });
    ui.tradListeners.push(render);
    wrap.replaceChildren(ui.title, ui.draftNotice(),
      h('p', {}, tr('syllablechips.intro', 'Most Hebrew words are stressed on the last syllable. A few common ones are not, and the chips show which.')),
      ui.traditionSwitch('syllablechips-trad'), modes, hideBtn, ui.status, body);
    render();
  }).catch((e) => { wrap.replaceChildren(ui.title, ui.draftNotice(), h('p', { role: 'alert' }, `Could not load the data: ${e.message}`)); });

  return ui.unmount;
}
