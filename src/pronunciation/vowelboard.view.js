// @ts-check
// Five-family vowel board (concept yt-vowels-01 + plene spellings from yt-vowels-03). Lane 3, round 4.
//   mount(root, ctx) -> unmount
// Families are derived from data/pronunciation/niqqud.json at runtime (never hand copied). Modes: Study, Sort
// (select a sign, then choose its family: works by keyboard, no drag needed), Quick round (pointed letter -> family).
// Short vs long is NOT claimed as an audible difference in Israeli Hebrew. No recorded audio exists yet.

import { createView, loadData } from './ui.js';
import { TRADITION_LABELS } from './sounds.model.js';
import { FAMILY_IDS, FAMILY_NAMES, boardSigns, vowelFamilies, movingSigns, variantSigns, familyOfIpa, makeRng } from './boards.model.js';
import { transliterate } from './transliterate.js';

const CARRIERS = ['ב', 'כ', 'ל', 'מ', 'נ', 'ס', 'ד', 'ת'];

/** @returns {() => void} */
export function mount(root, ctx = {}) {
  const ui = createView(root, ctx, { cls: 'alef-vowelboard', titleId: 'alef-vowelboard-title', title: 'Vowel families', titleKey: 'vowelboard.title' });
  const { h, he, tr, on, wrap } = ui;
  wrap.append(ui.title, h('p', { role: 'status' }, ui.tr('sounds.loading', 'Loading...')));
  const rng = typeof ctx.random === 'function' ? ctx.random : makeRng(Date.now() & 0xffff);

  loadData(ctx, ['niqqud', 'plene']).then(({ niqqud, plene }) => {
    if (!ui.alive) return;
    let mode = 'study';
    const body = h('div', {});
    const signRec = (id) => niqqud.records.find((r) => r.id === id);
    const fams = () => vowelFamilies(niqqud, ui.tradition);

    const note = h('p', { class: 'muted' }, tr('vowelboard.shortlong', plene.shortLongNote));
    const modes = h('div', { role: 'group', 'aria-label': 'Mode' });
    const modeBtns = [['study', 'Study'], ['sort', 'Sort the signs'], ['quick', 'Quick round']].map(([id, label]) => {
      const b = h('button', { type: 'button', 'aria-pressed': id === mode }, label);
      on(b, 'click', () => { mode = id; modeBtns.forEach(([bb, i]) => bb.setAttribute('aria-pressed', i === mode)); render(); });
      return /** @type {[any,string]} */ ([b, id]);
    });
    modeBtns.forEach(([b]) => modes.append(b, ' '));

    const signButton = (rec, extra) => {
      const d = rec.ipa?.[ui.tradition] ?? '';
      const b = h('button', { type: 'button' },
        ui.he(rec.shape), ' ', h('span', {}, rec.name ?? rec.id), ' ', ui.ipaEl(d), extra);
      on(b, 'click', () => {
        const played = ui.tryPlay('vowel', rec.id);
        ui.status.textContent = played ? `Playing ${rec.name}.` : `${rec.name}: no audio yet. Sound value (${TRADITION_LABELS[ui.tradition] ?? ui.tradition}): ${d}.`;
      });
      return b;
    };

    const study = () => {
      const moved = new Set(movingSigns(niqqud).map((m) => m.id));
      const cols = h('div', { class: 'cols' });
      for (const f of fams()) {
        const col = h('section', { class: 'card', 'aria-label': `Family ${f.family}, ${f.count} signs` },
          h('h3', {}, FAMILY_NAMES[f.family], h('span', { class: 'badge' }, `${f.count} ${f.count === 1 ? 'sign' : 'signs'}`)));
        const ul = h('ul', { style: 'list-style:none;padding:0;margin:0' });
        for (const id of f.signs) {
          const rec = signRec(id);
          ul.append(h('li', {}, signButton(rec, moved.has(id) ? h('span', { class: 'badge' }, 'differs by tradition') : null)));
        }
        col.append(ul);
        const vs = variantSigns(niqqud, ui.tradition).filter((v) => v.family === f.family);
        for (const v of vs) col.append(h('p', { class: 'muted' }, `Variant: ${v.id} `, ui.he(v.shape, 'he-small'), ' (same family; rare, memorised word list, unverified)'));
        // spellings row
        const sp = plene.families[f.family];
        const row = h('div', {}, h('h4', {}, 'Spellings (same sound)'));
        if (sp?.pair) {
          const p = sp.pair;
          const tt = ui.tradition === 'ashkenazi' ? 'ashkenazi' : 'israeli';
          const a = transliterate(p.defective, { tradition: tt }), b = transliterate(p.plene, { tradition: tt });
          const same = a === b || a.replace(/ei/g, 'e') === b.replace(/ei/g, 'e'); // siddur style writes tzere+yod as 'ei'
          row.append(h('p', {}, h('strong', {}, 'defective: '), ui.he(p.defective, 'he-small'), ui.audioButton('word', `plene-${f.family}-defective`, p.defective), ' ',
            h('strong', {}, 'plene: '), ui.he(p.plene, 'he-small'), ui.audioButton('word', `plene-${f.family}-plene`, p.plene)),
            h('p', { class: 'muted' }, `${p.gloss}. ${p.note}. ${same ? (a === b ? 'Both spellings give the same respelling.' : `Respellings ${a} and ${b} differ only because the siddur style writes a tzere plus yod as ei; in Israeli speech they sound the same.`) : 'Respellings differ here: check.'}`));
        } else if (sp) {
          row.append(h('p', { class: 'muted' }, sp.pairNote));
          for (const ex of sp.finalVowelLetter ?? []) row.append(h('p', {}, ui.he(ex.he, 'he-small'), ` ${ex.gloss}: ${ex.note}`));
        }
        col.append(row);
        cols.append(col);
      }
      ui.put(body, 
        h('p', {}, tr('vowelboard.intro', 'Many signs, five sounds. Tap a sign to hear it (audio is not recorded yet, so you will see the sound value instead).')),
        cols,
        h('h3', {}, 'Final he'),
        h('p', {}, plene.finalHe.summary), h('p', { class: 'muted' }, plene.finalHe.caution),
        h('p', {}, ...plene.finalHe.examples.flatMap((e) => [ui.he(e.he, 'he-small'), ` ${e.gloss} (${e.kind}); `])),
      );
    };

    const sort = () => {
      const signs = boardSigns(niqqud);
      const order = signs.map((s) => s.id);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      /** @type {Set<string>} */ const placed = new Set();
      let selected = /** @type {string|null} */ (null);
      const tray = h('div', { role: 'group', 'aria-label': 'Signs to place' });
      const cols = h('div', { class: 'cols' });
      const redraw = () => {
        tray.replaceChildren(); cols.replaceChildren();
        for (const id of order.filter((x) => !placed.has(x))) {
          const rec = signRec(id);
          const b = h('button', { type: 'button', 'aria-pressed': selected === id, 'aria-label': `Sign ${rec.name}` }, ui.he(rec.shape));
          b.addEventListener('click', () => { selected = id; ui.status.textContent = `Selected ${rec.name}. Now choose a family.`; redraw(); });
          tray.append(b, ' ');
        }
        for (const f of FAMILY_IDS) {
          const mine = [...placed].filter((id) => familyOfIpa(signRec(id).ipa[ui.tradition]) === f);
          const b = h('button', { type: 'button', disabled: selected ? null : true }, `Put in ${f}`);
          b.addEventListener('click', () => {
            if (!selected) return;
            const rec = signRec(selected);
            if (familyOfIpa(rec.ipa[ui.tradition]) === f) { placed.add(selected); ui.status.textContent = `Correct: ${rec.name} is in the ${f} family (${TRADITION_LABELS[ui.tradition]}).`; selected = null; if (placed.size === signs.length) ui.status.textContent = 'All signs placed.'; }
            else { ui.status.textContent = `Not the ${f} family. Try again.`; ui.recordMiss('vowelboard', rec.id); }
            redraw();
          });
          cols.append(h('section', { class: 'card' }, h('h3', {}, FAMILY_NAMES[f]), b, h('div', {}, ...mine.map((id) => ui.he(signRec(id).shape, 'he-small')))));
        }
      };
      redraw();
      ui.put(body, h('p', {}, 'Select a sign, then choose its family. No dragging needed; Tab and Enter work.'), tray, cols);
    };

    const quick = () => {
      const signs = boardSigns(niqqud);
      let n = 0, score = 0, cur = /** @type {any} */ (null);
      const area = h('div', {});
      const next = () => {
        if (n >= 10) { area.replaceChildren(h('p', {}, `Done: ${score} of 10.`)); return; }
        const rec = signs[Math.floor(rng() * signs.length)];
        const letter = CARRIERS[Math.floor(rng() * CARRIERS.length)];
        cur = { rec, shape: rec.shape.replace('ב', letter) };
        area.replaceChildren(h('p', {}, `Round ${n + 1} of 10. Which family?`), ui.he(cur.shape));
        const btns = h('div', { role: 'group', 'aria-label': 'Families' });
        for (const f of FAMILY_IDS) {
          const b = h('button', { type: 'button' }, f);
          b.addEventListener('click', () => {
            const right = familyOfIpa(cur.rec.ipa[ui.tradition]);
            if (f === right) { score++; ui.status.textContent = 'Correct.'; } else { ui.status.textContent = `Not quite: ${cur.rec.name} is the ${right} family.`; ui.recordMiss('vowelboard', cur.rec.id); }
            n++; next();
          });
          btns.append(b, ' ');
        }
        area.append(btns);
      };
      next();
      ui.put(body, area);
    };

    const render = () => ui.renderInto(body, () => { ({ study, sort, quick })[mode](); });
    ui.tradListeners.push(render);
    wrap.replaceChildren(ui.title, ui.draftNotice(), note, ui.traditionSwitch('vowelboard-trad'), modes, ui.status, body);
    render();
  }).catch((e) => { wrap.replaceChildren(ui.title, ui.draftNotice(), h('p', { role: 'alert' }, 'Could not load the vowel data. Check your connection, then try again.')); });

  return ui.unmount;
}
