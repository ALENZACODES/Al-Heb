/**
 * C6 one course ring: the whole course (both paths) as one ring, the two paths labelled as its two coloured parts.
 * Both paths use the same completion rule (a lesson is done only after a passed check: src/curriculum/passmark.js, for the
 * lesson page, the short-parts page, Test out and the intermediate lessons alike). `cnt` is progress/model.js lessonCounts().
 */
export function ringModel(cnt) {
  const read = cnt?.read || { done: 0, total: 0 }, israel = cnt?.israel || { done: 0, total: 0 };
  const total = read.total + israel.total, done = read.done + israel.done;
  const deg = (n) => (total ? Math.round((n / total) * 3600) / 10 : 0);
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, read, israel, readDeg: deg(read.done), israelDeg: deg(israel.done),
    text: `${done} of ${total} lessons done: ${read.done} of ${read.total} on the reading path and ${israel.done} of ${israel.total} on the Israel path.` };
}
/** The ring (a conic gradient, so no canvas) with a legend; `make` is the view's element helper (h or el). */
export function courseRing(make, cnt) {
  const m = ringModel(cnt);
  const style = `inline-size:9rem;block-size:9rem;border-radius:50%;flex:none;background:conic-gradient(var(--accent,#1f6f5c) 0 ${m.readDeg}deg, var(--accent-2,#b5651d) ${m.readDeg}deg ${m.readDeg + m.israelDeg}deg, var(--line,#ddd) ${m.readDeg + m.israelDeg}deg 360deg);-webkit-mask:radial-gradient(circle,transparent 55%,#000 56%);mask:radial-gradient(circle,transparent 55%,#000 56%)`;
  const key = (color, label) => make('li', {}, make('span', { 'aria-hidden': 'true', style: `display:inline-block;inline-size:.9rem;block-size:.9rem;border-radius:.2rem;background:${color};margin-inline-end:.4rem` }), label);
  return make('figure', { class: 'pg-course-ring', 'data-done': String(m.done), 'data-total': String(m.total), style: 'display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin:0' },
    make('div', { role: 'img', 'aria-label': m.text, style }),
    make('figcaption', {},
      make('strong', {}, `${m.done} of ${m.total} lessons (${m.pct}%)`),
      make('ul', { style: 'list-style:none;padding:0;margin:.4rem 0' },
        key('var(--accent,#1f6f5c)', `Reading path: ${m.read.done} of ${m.read.total}`),
        key('var(--accent-2,#b5651d)', `Israel path: ${m.israel.done} of ${m.israel.total}`)),
      make('span', { class: 'small muted' }, 'One course, two paths. A lesson counts on either path only after its check is passed. '),
      make('a', { href: '#/course-map' }, 'Course map'), ' · ', make('a', { href: '#/benchmarks' }, 'Benchmark map')));
}
