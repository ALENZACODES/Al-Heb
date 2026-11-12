/**
 * C1 skill-tree map (pure, no DOM): every lesson with its prerequisites, what it opens, its depth in the graph and the learner's
 * state, from data/curriculum/lessons-index.json (the same prerequisites the lesson pages enforce, src/curriculum/unlock.js).
 * state: 'done' (completed), 'open' (every prerequisite done, or opened early by the learner), 'locked'. `here` marks the first
 * open lesson of each track in course order: where the learner is.
 */
export const isIntermediate = (id) => /^I-\d{2}$/.test(String(id));
export const lessonLink = (id) => (isIntermediate(id) ? `#/intermediate/${encodeURIComponent(id)}` : `#/learn?lesson=${encodeURIComponent(id)}`);
export const TRACK_NAME = { read: 'Reading Path', israel: 'Israel Path' };

/** @param {{id:string,track:string,title:string,prerequisites:string[]}[]} lessons @param {Record<string,number>|Set<string>} completed @param {Set<string>} [unlocked] */
export function courseMap(lessons, completed = {}, unlocked = new Set()) {
  const done = completed instanceof Set ? completed : new Set(Object.keys(completed || {}).filter((k) => completed[k]));
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const opens = new Map(lessons.map((l) => [l.id, []]));
  for (const l of lessons) for (const p of l.prerequisites || []) opens.get(p)?.push(l.id);
  const depth = new Map();
  const depthOf = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id);
    if (seen.has(id)) throw new Error('cycle in lesson graph at ' + id);
    seen.add(id);
    const pre = (byId.get(id)?.prerequisites || []).filter((p) => byId.has(p));
    const d = pre.length ? 1 + Math.max(...pre.map((p) => depthOf(p, seen))) : 0;
    depth.set(id, d); return d;
  };
  const nodes = lessons.map((l, order) => {
    const needs = (l.prerequisites || []).filter((p) => byId.has(p));
    const state = done.has(l.id) ? 'done' : (unlocked.has(l.id) || needs.every((p) => done.has(p))) ? 'open' : 'locked';
    return { id: l.id, title: l.title, track: l.track, order, depth: depthOf(l.id), needs, opens: opens.get(l.id), state, early: state === 'open' && unlocked.has(l.id) && !needs.every((p) => done.has(p)) };
  });
  const tracks = [...new Set(lessons.map((l) => l.track))].map((track) => {
    const list = nodes.filter((n) => n.track === track);
    const here = list.find((n) => n.state === 'open') || null;
    if (here) here.here = true;
    const rows = new Map();
    for (const n of list) (rows.get(n.depth) || rows.set(n.depth, []).get(n.depth)).push(n);
    const layered = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([d, ns]) => ({ depth: d, nodes: ns.sort((a, b) => a.order - b.order) }));
    return { track, name: TRACK_NAME[track] || track, total: list.length, done: list.filter((n) => n.state === 'done').length, open: list.filter((n) => n.state === 'open').length, here, rows: layered };
  });
  return { nodes, tracks, total: nodes.length, done: nodes.filter((n) => n.state === 'done').length };
}

/** Grid positions for drawing: x by place in the row, y by depth (cell units). */
export function layout(track, { cell = 64, row = 64, pad = 32 } = {}) {
  const width = Math.max(1, ...track.rows.map((r) => r.nodes.length));
  const pos = new Map();
  track.rows.forEach((r, ri) => { const off = (width - r.nodes.length) / 2; r.nodes.forEach((n, i) => pos.set(n.id, { x: pad + (off + i) * cell + cell / 2, y: pad + ri * row + row / 2 })); });
  return { pos, w: pad * 2 + width * cell, h: pad * 2 + track.rows.length * row };
}
