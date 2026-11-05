// @ts-check
// "Reading without vowels" ladder: pointed -> points fading -> unpointed, with tap-to-reveal and a self-check.
// The self-check never uses speech recognition: the learner reads aloud, presses Check, compares, and rates themselves.
import { el, heEl, playHook, hasDivineName } from './ui.js';
import { mixed } from '../hebrewtext/mixed.js'; // Hebrew runs inside the tips get lang=he dir=rtl
import { uiEnglish } from '../shell/names.js';
import { largePositionsIn, bigParts } from '../torahreader/model.js';
import { unpoint, shownWord, wordsOfLine, wordsWithStops, spokenForm, RATINGS } from './pointing.js';

export const RATING_LABEL = { right: 'I said it right', close: 'A few words off', notyet: 'Not yet' };

/**
 * @param {HTMLElement} host
 * @param {{ctx:any, course:any, translit:(he:string)=>string|null, progress:any, save:()=>void, announce:(m:string)=>void, params?:any}} env
 */
export function renderLadder(host, env) {
  const { ctx, course, translit, progress, save, announce } = env;
  const levels = course.ladder.levels;
  const st = { key: course.itemByKey.has(env.params?.item) ? env.params.item : course.items[0].key, levelId: '1', revealed: new Set(), allShown: false, checked: false, ctlOpen: false };

  const root = el('div', { class: 'trd-ladder' });
  host.append(root);
  render();

  function progressOf(key) { return progress.ladder[key] || {}; }
  function mark(key) {
    const p = progressOf(key);
    const n = levels.filter((l) => p[l.id] === 'right').length;
    return n ? ` (${n} of ${levels.length} levels marked right)` : '';
  }

  function render() {
    const item = course.itemByKey.get(st.key);
    const level = levels.find((l) => l.id === st.levelId);
    root.replaceChildren();

    const ctl = el('details', { class: 'trd-fold trd-ctl', open: st.ctlOpen ? '' : null, ontoggle: (e) => { st.ctlOpen = !!(e?.target?.open); } },
      el('summary', {}, 'Change line or step'));
    root.append(el('h2', { id: 'trd-sec-h', tabindex: '-1', class: 'trd-sr' }, 'Reading without vowels'), ctl);
    root.append(el('p', { class: 'trd-muted', id: 'trd-fade-link' }, 'Want the same idea with single words, one vowel point at a time? ', el('a', { class: 'btn secondary', href: '#/nikkud-fade' }, 'Vowel points, fading out (Preview)')));
    ctl.append(el('p', {}, 'A Torah scroll has no vowel points and no cantillation marks. Siddurim are pointed. This ladder takes the same line through four steps, from fully pointed to letters only.'),
      el('details', {}, el('summary', {}, 'Tips for reading without points'), el('ul', {}, ...course.ladder.tips.map((t) => el('li', {}, ...mixed(t))))));

    // picker
    const sel = el('select', { id: 'trd-pick', 'aria-label': 'Choose a line to practise', onchange: (e) => { st.key = e.target.value; st.revealed.clear(); st.allShown = false; st.checked = false; render(); focusHeading(); } });
    for (const g of course.groups) {
      const og = el('optgroup', { label: g.title });
      for (const it of g.items) og.append(el('option', { value: it.key, selected: it.key === st.key ? '' : null }, `${it.title} (${it.ref})${mark(it.key)}`));
      sel.append(og);
    }
    const idx = course.items.findIndex((i) => i.key === st.key);
    ctl.append(el('div', { class: 'trd-row' },
      el('label', { for: 'trd-pick' }, 'Line:'), sel,
      el('button', { type: 'button', class: 'trd-btn', disabled: idx <= 0 ? '' : null, onclick: () => go(idx - 1) }, 'Previous'),
      el('button', { type: 'button', class: 'trd-btn', disabled: idx >= course.items.length - 1 ? '' : null, onclick: () => go(idx + 1) }, 'Next')));

    const grp = course.groups.find((g) => g.id === item.group);
    root.append(el('h3', { id: 'trd-item-h' }, item.title, el('span', { class: 'trd-muted' }, ` ${item.ref}. Step ${level.label}`)));
    ctl.append(el('p', { class: 'trd-muted' }, grp.intro));

    // level buttons
    const lv = el('div', { class: 'trd-levels', role: 'group', 'aria-label': 'Step of the ladder' });
    for (const l of levels) {
      lv.append(el('button', { type: 'button', class: 'trd-btn', 'data-level': l.id, 'aria-pressed': l.id === st.levelId ? 'true' : 'false', onclick: () => { st.levelId = l.id; st.revealed.clear(); st.allShown = false; st.checked = false; render(); } },
        l.label, progressOf(item.key)[l.id] ? el('span', { class: 'trd-badge' }, RATING_LABEL[progressOf(item.key)[l.id]]) : null));
    }
    ctl.append(lv, el('p', { class: 'trd-muted', id: 'trd-level-desc' }, level.short));

    // the text, word by word
    ctl.append(el('div', { class: 'trd-row' },
      el('button', { type: 'button', class: 'trd-btn', 'aria-pressed': st.allShown ? 'true' : 'false', onclick: () => { st.allShown = !st.allShown; st.revealed.clear(); render(); } }, st.allShown ? 'Hide the points again' : 'Show all points')));
    let wi = 0;
    const large = item.largeLetters?.length ? largePositionsIn(item.lines.flatMap(wordsOfLine), item.largeLetters) : [];
    for (const line of item.lines) {
      const wst = wordsWithStops(line);
      const ws = wst.map((x) => x.word);
      const lineEl = el('div', { class: 'trd-line', role: 'group', 'aria-label': `Line of ${ws.length} words` });
      ws.forEach((w, i) => {
        const n = wi++;
        const sw = shownWord(w, i, { level: level.level, stage: level.stage });
        const open = st.allShown || st.revealed.has(n);
        const text = open ? w : sw.text;
        const showsPoints = open || sw.pointed;
        const tr = open ? translit(w) : null;
        const b = el('button', { type: 'button', class: 'trd-w', lang: 'he', dir: 'rtl', 'data-i': String(n), 'data-pointed': showsPoints ? '1' : '0',
          'aria-pressed': open ? 'true' : 'false',
          'aria-label': showsPoints ? `${text}. Points shown. Press to ${open ? 'hide' : 'show'} how it is said.` : `${text}. Points hidden. Press to show the points.`,
          onclick: () => { if (st.revealed.has(n)) st.revealed.delete(n); else st.revealed.add(n); st.allShown = false; const y = window.scrollY; render(); const nb = root.querySelector(`[data-i="${n}"]`); if (nb) nb.focus({ preventScroll: true }); window.scrollTo?.(0, y); } },
          ...bigParts(text, new Set(large.filter((l) => l.wi === n).map((l) => l.ln))).map((x) => (x.big ? el('span', { class: 'trd-lg' }, x.t) : x.t)));
        const cellBody = wst[i].stop ? el('span', { class: 'trd-wrow' }, b, el('span', { class: 'trd-stop', lang: 'he', 'aria-hidden': 'true' }, '\u05C3')) : b; // sof pasuq as in the source: a mark, not a tap target
        lineEl.append(el('span', { class: 'trd-cell' }, cellBody, tr ? el('span', { class: 'trd-tr' }, tr) : null));
      });
      root.append(lineEl);
    }
    root.append(el('p', { class: 'trd-muted' }, 'Tap a word to show its points and how it is said. Tap again to hide.'));
    if (large.length) root.append(el('p', { class: 'trd-muted trd-lgnote' }, 'Written large in the source text: ', ...item.largeLetters.flatMap((c, i) => [i ? ', ' : '', el('span', { lang: 'he', dir: 'rtl' }, c)]), '.'));
    if (item.lines.some((l) => hasDivineName(l))) root.append(el('p', { class: 'trd-muted' }, 'The divine name (four letters, yod he vav he) is never read as written. Say Adonai.'));

    // audio
    const status = el('p', { class: 'trd-status', role: 'status', 'aria-live': 'polite' });
    root.append(el('div', { class: 'trd-row' },
      el('button', { type: 'button', class: 'trd-btn', onclick: () => playHook(ctx, status, item.audio.kind, item.audio.id, item.he, item.title) }, 'Hear it')),
      status, el('p', { class: 'trd-muted' }, recordedLine(ctx, item.audio)));

    // self-check
    root.append(el('h3', {}, 'Check yourself'),
      el('p', {}, 'Say the line out loud first. This app does not listen: there is no speech recognition, so you are the judge.'));
    const checkBtn = el('button', { type: 'button', class: 'trd-btn', 'aria-expanded': st.checked ? 'true' : 'false', 'aria-controls': 'trd-answer', onclick: () => { st.checked = true; render(); const a = root.querySelector('#trd-answer'); if (a) a.focus(); } }, st.checked ? 'Answer shown below' : 'Did you say it right? Show the answer');
    root.append(checkBtn);
    if (st.checked) {
      const ans = el('div', { id: 'trd-answer', class: 'trd-answer', tabindex: '-1', role: 'region', 'aria-label': 'Answer' });
      for (const [li, line] of item.lines.entries()) {
        ans.append(heEl('p', line, 'trd-he'));
        const tr = translit(line);
        if (tr) ans.append(el('p', { class: 'trd-tr' }, tr));
        if (item.englishLines[li]) ans.append(el('p', { class: 'trd-en' }, uiEnglish(ctx, item.englishLines[li])));
      }
      if (item.lines.some((l) => hasDivineName(l))) ans.append(el('p', { class: 'trd-muted' }, 'Read aloud: Adonai ', heEl('span', spokenForm('יְהוָה')), ' wherever the four-letter name appears.'));
      ans.append(el('p', { class: 'trd-muted' }, 'Pronunciation follows your chosen congregation setting; it is a program-made aid, not reviewed by a teacher.'));
      const rate = el('div', { class: 'trd-row', role: 'group', 'aria-label': `How did it go? Step ${level.label}` });
      for (const r of RATINGS) {
        rate.append(el('button', { type: 'button', class: 'trd-rate', 'aria-pressed': progressOf(item.key)[st.levelId] === r ? 'true' : 'false', onclick: () => {
          progress.ladder[item.key] = { ...progressOf(item.key), [st.levelId]: r }; save();
          announce(`Saved: ${RATING_LABEL[r]} for ${item.title}, ${level.label}.`); render(); const nb = root.querySelector(`.trd-rate[aria-pressed="true"]`); if (nb) nb.focus();
        } }, RATING_LABEL[r]));
      }
      ans.append(rate);
      root.append(ans);
    }

    // sources
    root.append(el('details', {}, el('summary', {}, 'Source and licence of this line'),
      el('p', {}, item.attribution || ''),
      el('p', { class: 'trd-muted' }, `English: ${item.englishSource || 'n/a'}${item.englishLicense ? ` (${item.englishLicense})` : ''}. Hebrew licence label: ${item.license}. Proofread by a person: ${item.proofread ? 'yes' : 'no'}.`)));
  }

  function go(i) { const it = course.items[i]; if (!it) return; st.key = it.key; st.revealed.clear(); st.allShown = false; st.checked = false; render(); focusHeading(); }
  function focusHeading() { const h = root.querySelector('#trd-item-h'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }
  return () => {};
}

/** One honest line about whether a recording exists for this audio target. */
export function recordedLine(ctx, audio, noun = 'line') {
  let has = false;
  try { has = !!(ctx?.audio && typeof ctx.audio.has === 'function' && ctx.audio.has(audio.kind, audio.id)); } catch { has = false; }
  return has ? `A recording is listed for this ${noun}.` : `No recorded audio for this ${noun} yet. The button tries your browser\'s Hebrew voice (Israeli pronunciation only) and says what happened, including when nothing can play.`;
}
export { unpoint };
