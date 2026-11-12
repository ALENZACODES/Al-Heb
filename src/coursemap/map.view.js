/**
 * #/course-map (C1): all lessons as a map, one per track, drawn from their prerequisites. Each dot is a lesson (filled = done,
 * ringed = open, faint = locked); a line joins a lesson to the lessons it needs. "You are here" is the first open lesson of each
 * track. Under each map the same graph is a plain list (needs / opens / state) for keyboards and screen readers.
 */
import { el } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { loadState } from '../curriculum/state.js';
import { loadUnlocked } from '../curriculum/unlock.js';
import { courseMap, layout, lessonLink } from './map.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATE = { done: 'done', open: 'open', locked: 'locked' };
const CSS = `.alef-cmap svg{display:block;max-inline-size:100%;block-size:auto}.alef-cmap .cm-scroll{overflow:auto;max-block-size:70vh;border:1px solid var(--line,#ccc);border-radius:12px}
.alef-cmap .cm-edge{stroke:currentColor;opacity:.35;stroke-width:1.5;fill:none}.alef-cmap .cm-node{stroke:currentColor;stroke-width:2}
.alef-cmap .cm-done{fill:currentColor}.alef-cmap .cm-open{fill:var(--bg,#fff)}.alef-cmap .cm-locked{fill:var(--bg,#fff);opacity:.35}
.alef-cmap .cm-here{stroke-width:5}.alef-cmap text{font-size:11px;fill:currentColor}.alef-cmap a:focus-visible circle{stroke-width:6}
.alef-cmap .cm-list li{margin-block:.25rem}`;

/** SVG markup for one track (built only from ids, titles and numbers; every string is escaped). */
export function trackSVG(track) {
  const { pos, w, h } = layout(track);
  const edges = [], dots = [];
  for (const r of track.rows) for (const n of r.nodes) {
    const p = pos.get(n.id);
    for (const q of n.needs) { const a = pos.get(q); if (a) edges.push(`<path class="cm-edge" d="M${a.x} ${a.y}L${p.x} ${p.y}"/>`); }
    const label = `${n.id}: ${n.title}. ${n.state === 'done' ? 'Done' : n.state === 'open' ? 'Open' : 'Locked'}${n.here ? '. You are here' : ''}.`;
    dots.push(`<a href="${esc(lessonLink(n.id))}" aria-label="${esc(label)}"><title>${esc(label)}</title><circle class="cm-node cm-${STATE[n.state]}${n.here ? ' cm-here' : ''}" cx="${p.x}" cy="${p.y}" r="${n.here ? 14 : 11}"/><text x="${p.x}" y="${p.y + 26}" text-anchor="middle">${esc(n.id)}</text></a>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="group" aria-label="${esc(track.name)} map">${edges.join('')}${dots.join('')}</svg>`;
}

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  let alive = true;
  try { if (!document.getElementById('alef-cmap-style')) { const s = document.createElement('style'); s.id = 'alef-cmap-style'; s.textContent = CSS; document.head.append(s); } } catch { /* optional */ }
  const wrap = el('section', { class: 'alef-cmap', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Course Map');
  const body = el('div', {}, el('p', {}, 'Loading the map...'));
  wrap.append(h1, el('p', { class: 'muted' }, 'Every lesson and what it needs first. Filled dot: done. Ringed dot: open. Faint dot: locked. The thick ring is where you are. Tap a dot to open the lesson.'), body);
  root.append(wrap);
  (async () => {
    try {
      const [idx, st, unlocked] = await Promise.all([ctx?.lessonsIndex || loadJSON('data/curriculum/lessons-index.json'), loadState(ctx), loadUnlocked(ctx)]);
      if (!alive) return;
      const m = courseMap(idx.lessons, st.completed, unlocked);
      body.replaceChildren(el('p', { role: 'status' }, `${m.done} of ${m.total} lessons done: ${m.tracks.map((t) => `${t.done} of ${t.total} on the ${t.name}`).join(', ')}.`),
        ...m.tracks.map((t) => {
          const box = el('div', { class: 'cm-scroll' }); box.innerHTML = trackSVG(t);
          return el('section', { class: 'card', 'aria-labelledby': `cm-${t.track}`, 'data-track': t.track },
            el('h2', { id: `cm-${t.track}` }, t.name),
            el('p', {}, t.here ? ['You are here: ', el('a', { href: lessonLink(t.here.id) }, `${t.here.id} ${t.here.title}`), '.'] : t.done === t.total ? 'Every lesson on this path is done.' : 'No lesson is open yet.'),
            box,
            el('details', {}, el('summary', {}, `The ${t.name} as a list`),
              el('ol', { class: 'cm-list' }, ...t.rows.flatMap((r) => r.nodes).sort((a, b) => a.order - b.order).map((n) => el('li', { 'data-state': n.state },
                el('a', { href: lessonLink(n.id) }, `${n.id} ${n.title}`), ` (${n.state}${n.early ? ', opened early' : ''}${n.here ? ', you are here' : ''}). `,
                n.needs.length ? `Needs: ${n.needs.join(', ')}. ` : 'Needs nothing first. ', n.opens.length ? `Opens: ${n.opens.join(', ')}.` : '')))));
        }));
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The course map could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.remove(); };
}
