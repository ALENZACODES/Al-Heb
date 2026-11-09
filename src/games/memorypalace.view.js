// Game 25. Indexed letter-picture stations; no invented geographic map.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, speak, resultsCard } from './engine.js';
import { loadJson } from '../grammar/loader.js';
import { sfx } from '../audio/sfx.js';

export const STORE_KEY = 'games.memorypalace.v1';
export function buildStations(letters, R) {
  const seen = new Set(), out = [];
  for (const row of Array.isArray(letters) ? letters : []) {
    if (!row?.id || !row.he || !row.name) continue;
    for (const role of ['mnemonic', 'silhouette']) {
      const image = imgOf(R, 'letter', row.id, { variant: 'print', role });
      if (!image?.id || !image.src || seen.has(image.id) || !imgOf(R, 'id', image.id)) continue;
      seen.add(image.id);
      out.push({ id: image.id, letterId: row.id, he: row.he, name: row.name, image });
    }
  }
  return out;
}
export function recallStation(route, index, id) {
  return !!route[index] && route[index].id === id;
}
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, pool = [], stations = [], route = [], phase = 'study', index = 0, session, R;
  const studied = new Set();
  const wrongThisStop = new Set();
  const status = h('p', { role: 'status', 'aria-live': 'polite' }, 'Resolving courtyard stations…');
  const speechNote = h('p', { class: 'muted', 'data-speech': 'palace' });
  const board = h('div', { class: 'game-board' });
  root.replaceChildren(h('article', { class: 'card game-card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Memory Palace'),
    h('p', {}, 'Study each letter picture, walk the ordered route, then recall its stops.'), status, speechNote, board));
  function start() {
    session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 5 });
    const distinct = new Set();
    stations = shuffled(pool).filter(s => !distinct.has(s.letterId) && distinct.add(s.letterId)).slice(0, 5);
    route = shuffled(stations); phase = 'study'; index = 0; studied.clear(); paint();
  }
  function tap(s) {
    if (!alive) return;
    void speak(ctx, s.he, { kind: 'letter', id: s.letterId, onStatus: (m) => { speechNote.textContent = m; } });
    if (phase === 'study') { if (!studied.has(s.id)) sfx.play('pluck'); studied.add(s.id); paint(); return; }
    if (phase !== 'recall') return;
    if (wrongThisStop.has(s.id)) {
      status.textContent = 'That station was already tried for this stop.';
      return;
    }
    const ok = recallStation(route, index, s.id);
    session.answer(ok);
    sfx.play(ok ? 'success' : 'miss');
    if (ok) { wrongThisStop.clear(); index++; }
    else wrongThisStop.add(s.id);
    if (index === route.length) {
      phase = 'done';
      status.textContent = 'Courtyard route recalled.';
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'Courtyard route recalled', onAgain: start }));
    } else {
      paint();
      if (!ok) status.prepend('That is another station. Try this stop again. ');
    }
  }
  function paint() {
    if (!alive) return;
    const scene = imgOf(R, 'id', 'GAME_memory_palace_courtyard');
    const grid = h('div', { class: 'palace-courtyard' }, ...stations.map(s => {
      const active = phase === 'route' && route[index].id === s.id;
      const named = phase !== 'recall';
      return h('button', { type: 'button', class: 'palace-station' + (active ? ' palace-active' : ''),
        'data-img-id': s.id, 'aria-label': named ? s.name : 'Picture station',
        disabled: phase === 'route' || wrongThisStop.has(s.id), onclick: () => tap(s) },
        h('img', { src: s.image.src, alt: named ? s.image.alt : '', width: 140, height: 140 }),
        phase === 'study' ? h('span', {}, heSpan(s.he), ` ${s.name}${studied.has(s.id) ? ' ✓' : ''}`) : null);
    }));
    if (scene) grid.style.backgroundImage = `url("${scene.src}")`;
    const nodes = [grid];
    if (phase === 'study') {
      status.textContent = `Study ${studied.size} of ${stations.length} stations · ${pool.length} resolvable pictures in the pool`;
      nodes.push(h('button', { type: 'button', class: 'btn', disabled: studied.size < stations.length,
        onclick: () => { phase = 'route'; index = 0; paint(); } }, 'Walk the route'));
    } else if (phase === 'route') {
      status.replaceChildren(`Stop ${index + 1} of ${route.length}: `, heSpan(route[index].he), ` ${route[index].name}`);
      nodes.push(h('button', { type: 'button', class: 'btn', onclick: () => {
        void speak(ctx, route[index].he, { kind: 'letter', id: route[index].letterId, onStatus: (m) => { speechNote.textContent = m; } });
        index++;
        if (index === route.length) { phase = 'recall'; index = 0; }
        paint();
      } }, index + 1 === route.length ? 'Begin recall' : 'Next stop'));
    } else {
      status.replaceChildren(`Recall stop ${index + 1} of ${route.length}: `, heSpan(route[index].he));
    }
    board.replaceChildren(...nodes);
  }
  Promise.all([loadJson('data/letters/letters.json'), loadGameImages(ctx)]).then(([letters, images]) => {
    if (!alive) return;
    R = images; pool = buildStations(letters, R);
    if (new Set(pool.map(s => s.letterId)).size < 5) {
      status.textContent = 'At least five approved letter pictures are needed. No unresolved stations are shown.'; return;
    }
    start();
    sfx.play('swoosh');
  }).catch(() => { if (alive) status.textContent = 'Station data unavailable. Try again when online.'; });
  return () => { alive = false; try { ctx?.audio?.stop?.(); } catch { /* already gone */ } leaveSfx(); };
}
