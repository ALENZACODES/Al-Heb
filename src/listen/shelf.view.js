// Sacred listen shelf (#/listen/shelf). Play and pause only. No score, no autoplay.
import { h } from '../shell/ui.js';
import { LISTEN_BASE, SHELVES, itemsOn } from './catalog.js';
import { createShelfPlayer } from './player.js';

const CSS = `
.listen-shelf{max-inline-size:40rem;margin-inline:auto;display:grid;gap:1.25rem}
.listen-shelf article{display:grid;gap:.35rem;padding:.75rem 0;border-block-end:1px solid var(--line,#d7d0c4)}
.listen-shelf .row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.listen-shelf button{min-block-size:44px}
.listen-shelf .empty{margin:0}
`;

function styleOnce() {
  if (document.getElementById('listen-shelf-style')) return;
  const style = document.createElement('style');
  style.id = 'listen-shelf-style';
  style.textContent = CSS;
  document.head?.append(style);
}

export function mount(root, ctx = {}) {
  styleOnce();
  const player = ctx.player || createShelfPlayer({ base: LISTEN_BASE, ...(ctx.makeAudio ? { makeAudio: ctx.makeAudio } : {}) });
  const buttons = new Map();
  const status = h('p', { role: 'status', 'aria-live': 'polite' }, 'Nothing is playing.');
  const sections = SHELVES.map((shelf) => {
    const rows = itemsOn(shelf.id);
    const body = shelf.empty || !rows.length
      ? [h('p', { class: 'empty' }, shelf.note)]
      : rows.map((item) => {
        const button = h('button', {
          type: 'button', class: 'btn', 'data-listen-id': item.id, 'data-title': item.title, 'aria-pressed': 'false',
          onclick: () => player.toggle(item),
        }, `Play ${item.title}`);
        buttons.set(item.id, button);
        return h('article', { 'data-shelf': shelf.id, 'data-kind': item.kind },
          h('h3', {}, item.title),
          h('p', {}, `Performer: ${item.performer}. ${item.performerNote}`),
          h('p', {}, `Tradition: ${item.tradition}.`),
          item.historical ? h('p', {}, item.historical) : null,
          h('p', {}, `Licence: ${item.licence}.`, item.licenceUrl ? h('a', { href: item.licenceUrl }, ' Licence terms.') : null),
          h('p', {}, 'Source: ', h('a', { href: item.sourceUrl }, item.source), '.'),
          item.shareAlike ? h('p', {}, 'Adapting this recording keeps the same licence.') : null,
          h('div', { class: 'row' }, button));
      });
    return h('section', { 'aria-labelledby': `shelf-${shelf.id}` },
      h('h2', { id: `shelf-${shelf.id}` }, shelf.title),
      shelf.empty ? null : h('p', { class: 'muted' }, shelf.note),
      ...body);
  });
  root.replaceChildren(h('div', { class: 'listen-shelf' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Sacred listen'),
    h('p', {}, 'Press play to hear a cleared recording. Nothing starts by itself. These are not the app\'s lesson voices, and there is no score.'),
    status,
    ...sections));
  const unsub = player.subscribe((state) => {
    for (const [id, button] of buttons) {
      const title = button.getAttribute('data-title') || '';
      const on = id === state.id && state.phase === 'playing';
      const loading = id === state.id && state.phase === 'loading';
      button.textContent = on ? `Pause ${title}` : loading ? `Loading ${title}` : `Play ${title}`;
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    status.textContent = state.error
      ? state.error
      : state.phase === 'playing' ? 'Playing.'
        : state.phase === 'paused' ? 'Paused.'
          : state.phase === 'ended' ? 'Finished.'
            : 'Nothing is playing.';
  });
  return () => { unsub(); player.stop(); };
}
