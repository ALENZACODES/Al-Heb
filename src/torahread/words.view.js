// @ts-check
// The 30 most frequent written words of the Torah, with pointed forms (from the Torah text itself).
import { el, heEl, hearButton } from './ui.js';
import { spokenForm } from './pointing.js';
import { uiEnglish } from '../shell/names.js';

export function renderWords(host, env) {
  const { ctx, course, translit } = env;
  const W = course.words30;
  const st = { all: false, open: new Set() };
  const root = el('div', { class: 'trd-words' });
  host.append(root);
  render();

  function render() {
    root.replaceChildren();
    root.append(el('h2', { id: 'trd-sec-h', tabindex: '-1' }, 'The 30 most frequent Torah words'),
      el('p', {}, `Counted in the five books of the Torah (${W.totals.tokens.toLocaleString('en-US')} written words). The big form is how a scroll writes it, with no points. Tap a card to see the pointed form, how it is said, and what it means.`),
      el('p', { class: 'trd-muted' }, W.method),
      el('p', { role: 'note', class: 'trd-draft' }, 'Draft. Glosses are short, literal and original; they have not been reviewed by a Hebrew teacher.'),
      el('div', { class: 'trd-row' }, el('button', { type: 'button', class: 'trd-btn', 'aria-pressed': st.all ? 'true' : 'false', onclick: () => { st.all = !st.all; st.open.clear(); render(); } }, st.all ? 'Cover all again' : 'Show all')));
    const ul = el('ul', { class: 'trd-list', style: 'list-style:none;padding:0', 'aria-label': 'Most frequent Torah words' });
    for (const w of W.words) {
      const open = st.all || st.open.has(w.rank);
      const li = el('li', { class: 'trd-card', id: `trd-w-${w.rank}` });
      const btn = el('button', { type: 'button', class: 'trd-btn', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': `trd-wd-${w.rank}`,
        onclick: () => { if (st.open.has(w.rank)) st.open.delete(w.rank); else st.open.add(w.rank); st.all = false; render(); const b = root.querySelector(`#trd-w-${w.rank} button`); if (b) b.focus(); } },
        `${w.rank}. `, heEl('span', w.unpointed, 'trd-big'), ` ${open ? 'hide' : 'show'} points and meaning`);
      li.append(btn, el('span', { class: 'trd-muted' }, ` ${w.count.toLocaleString('en-US')} times`));
      if (open) {
        const d = el('div', { id: `trd-wd-${w.rank}`, class: 'trd-answer' });
        d.append(heEl('p', w.pointed, 'trd-big'));
        const tr = translit(w.say ? spokenForm(w.pointed) : w.pointed); if (tr) d.append(el('p', { class: 'trd-tr' }, tr));
        d.append(el('p', {}, el('strong', {}, uiEnglish(ctx, w.gloss))));
        if (w.say) d.append(el('p', { class: 'trd-muted' }, 'Written as the four-letter name; read aloud as ', heEl('span', w.say)));
        if (w.others.length) {
          d.append(el('p', { class: 'trd-muted' }, 'Same letters, other readings in the Torah:'),
            el('ul', {}, ...w.others.map((o) => el('li', {}, heEl('span', o.he), ` ${o.count}x`, o.gloss ? `: ${uiEnglish(ctx, o.gloss)}` : ': (no meaning given here)'))));
        }
        if (w.vocabId) d.append(el('p', { class: 'trd-muted' }, `Also in the Vocabulary list (entry ${w.vocabId}).`));
        const aid = 'torahread-word-' + String(w.rank).padStart(2, '0');
        d.append(el('div', { class: 'trd-row' }, hearButton(ctx, 'word', aid, w.pointed, 'this word')));
        li.append(d);
      }
      ul.append(li);
    }
    root.append(ul, el('p', { class: 'trd-muted' }, `Source: ${W.source}. Licence: ${W.license}. ${W.glossNote}`));
  }
  return () => {};
}
