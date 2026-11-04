// @ts-check
// Dot-toggle tile for bet/vet, kaf/khaf, pe/fe and shin/sin (concept yt-alphabet-03). Lane 3, round 4.
//   mount(root, ctx) -> unmount
// Sounds come from consonants.json, glyph/name from data/letters/letters.json (read only), mouth hints from
// dot-pairs.json (own wording, unreviewed). Tradition-aware: a pair with no audible contrast is shown as merged and
// is left out of the test. A 6 item "set the dot" test shows the wanted sound as text (no audio exists yet).

import { createView, loadData } from './ui.js';
import { dotPairs, makeDotItems, makeRng } from './boards.model.js';

/** @returns {() => void} */
export function mount(root, ctx = {}) {
  const ui = createView(root, ctx, { cls: 'alef-dottile', titleId: 'alef-dottile-title', title: 'Dot toggle', titleKey: 'dottile.title' });
  const { h, tr, on, wrap } = ui;
  wrap.append(ui.title, h('p', { role: 'status' }, tr('sounds.loading', 'Loading...')));
  const rng = typeof ctx.random === 'function' ? ctx.random : makeRng(Date.now() & 0xffff);

  const loadLetters = async () => {
    if (ctx.letters) return ctx.letters;
    const res = await globalThis.fetch(new URL('../../data/letters/letters.json', import.meta.url));
    if (!res.ok) throw new Error(`could not load letters.json (${res.status})`);
    return res.json();
  };

  Promise.all([loadData(ctx, ['consonants', 'dot-pairs']), loadLetters()]).then(([{ consonants, 'dot-pairs': dotData }, letters]) => {
    if (!ui.alive) return;
    let pairIdx = 0, state = 0, testing = false, refocus = false;
    /** @type {{items:any[], i:number, score:number}|null} */ let test = null;
    const body = h('div', {});
    const pairs = () => dotPairs(consonants, letters, dotData, ui.tradition);

    const explore = () => {
      const ps = pairs();
      const p = ps[pairIdx];
      const picker = h('div', { role: 'group', 'aria-label': 'Letter pair' });
      ps.forEach((q, i) => {
        const b = h('button', { type: 'button', 'aria-pressed': i === pairIdx }, ui.he(q.letter, 'he-small'), ` ${q.letterName}`);
        on(b, 'click', () => { pairIdx = i; state = 0; render(); });
        picker.append(b, ' ');
      });
      const tile = h('div', { class: 'cols' });
      p.states.forEach((s, i) => {
        const half = h('section', { class: 'card', 'aria-current': i === state ? 'true' : null, style: i === state ? 'border-width:3px' : '' },
          ui.he(s.glyph), h('p', {}, h('strong', {}, s.label)), h('p', {}, `${s.english} `, ui.ipaEl(s.ipa)),
          h('p', { class: 'muted' }, s.hint), ui.audioButton('syllable', `dot-${p.id}-${i}`, s.english));
        tile.append(half);
      });
      const sw = h('button', { type: 'button', role: 'switch', 'aria-checked': state === 0, 'aria-label': p.kind === 'dagesh' ? 'Dot (dagesh) on' : 'Dot on the right (shin)' },
        p.kind === 'dagesh' ? (state === 0 ? 'Dot on' : 'Dot off') : (state === 0 ? 'Right dot (shin)' : 'Left dot (sin)'));
      on(sw, 'click', () => { state = state === 0 ? 1 : 0; const s = p.states[state]; ui.status.textContent = `${s.label}: ${s.english}.`; ui.tryPlay('syllable', `dot-${p.id}-${state}`); refocus = true; render(); });
      const big = h('div', { class: 'card' }, ui.he(p.states[state].glyph), h('p', {}, `${p.states[state].english}`));
      ui.put(body, picker,
        h('p', { class: 'muted' }, `Tradition note for ${p.letterName}: ${p.traditionNote}`),
        p.contrast ? null : h('p', { role: 'note' }, 'In this tradition the two forms are not audibly different.'),
        big, sw, tile,
        h('h3', {}, 'Cautions'), h('ul', {}, ...dotData.caveats.map((c) => h('li', {}, c))));
      if (refocus) { refocus = false; sw.focus?.(); }
    };

    const runTest = () => {
      if (!test) test = { items: makeDotItems(pairs(), ui.tradition, rng, 6), i: 0, score: 0 };
      const t = test;
      if (t.i >= t.items.length) { ui.put(body, h('p', {}, `Done: ${t.score} of ${t.items.length}.`)); return; }
      const it = t.items[t.i];
      const p = pairs().find((x) => x.id === it.pairId);
      let setTo = 0;
      const sw = h('button', { type: 'button', role: 'switch', 'aria-checked': true }, p.kind === 'dagesh' ? 'Dot on' : 'Right dot (shin)');
      on(sw, 'click', () => { setTo = setTo === 0 ? 1 : 0; sw.setAttribute('aria-checked', setTo === 0); sw.replaceChildren(p.kind === 'dagesh' ? (setTo === 0 ? 'Dot on' : 'Dot off') : (setTo === 0 ? 'Right dot (shin)' : 'Left dot (sin)')); });
      const check = h('button', { type: 'button' }, 'Check');
      on(check, 'click', () => {
        const ok = setTo === it.wanted;
        if (ok) t.score++; else ui.recordMiss('dottile', it.pairId);
        ui.status.textContent = ok ? 'Correct.' : `Not quite: ${it.cue} needs "${p.states[it.wanted].label}".`;
        t.i++; render();
      });
      ui.put(body, h('p', {}, `Item ${t.i + 1} of ${t.items.length}. Set the dot so ${p.letterName} says: `, h('strong', {}, it.cue), ' ', ui.ipaEl(it.ipa)),
        ui.he(p.letter), sw, ' ', check,
        h('p', { class: 'muted' }, 'Audio is not recorded yet, so the sound is given in words. Mistakes are logged under pron.misses for later review.'));
    };

    const render = () => ui.renderInto(body, () => (testing ? runTest() : explore()));
    ui.tradListeners.push(() => { test = null; render(); });
    const modeBtn = h('button', { type: 'button', 'aria-pressed': false }, 'Set-the-dot test');
    on(modeBtn, 'click', () => { testing = !testing; test = null; modeBtn.setAttribute('aria-pressed', testing); ui.status.textContent = testing ? 'Test started.' : 'Back to the tile.'; render(); });
    wrap.replaceChildren(ui.title, ui.draftNotice(), h('p', {}, tr('dottile.intro', 'One dot changes the sound of four letters. Toggle it and compare.')), ui.traditionSwitch('dottile-trad'), modeBtn, ui.status, body);
    render();
  }).catch((e) => { wrap.replaceChildren(ui.title, ui.draftNotice(), h('p', { role: 'alert' }, `Could not load the data: ${e.message}`)); });

  return ui.unmount;
}
