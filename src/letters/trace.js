// Aleph lane 2: letter tracing engine.
//
// Pure geometry + scoring (no DOM) at the top; DOM glue (createTracer) at the bottom.
// Coordinates: 0..1000 box, y down, same as data/letters/letters.json.
//
// Scoring follows the Hanzi Writer five-check design described in the research notes
// (average distance, start/end distance, direction cosine, Frechet shape distance, length ratio) with one
// `leniency` multiplier. NOTE: the numeric thresholds below come from a third-party summary of Hanzi Writer's
// src/strokeMatches.ts (DeepWiki); that source file was NOT re-read here, and the implementation is a fresh
// re-write (e.g. the direction check pairs each user edge with the nearest target segment). Tune on real
// finger/stylus traces before relying on it.
//
// @ts-check

/** @typedef {[number, number]} Pt */

export const DEFAULTS = Object.freeze({
  avgDist: 350,       // average distance user->target, scaled by distMod * leniency
  startEnd: 250,      // start and end point distance, scaled by leniency
  cosine: 0,          // average cosine similarity of edge vectors must be >= this
  frechet: 0.4,       // Frechet distance of normalized curves, scaled by leniency
  minLen: 0.35,       // (leniency*(userLen+25))/(targetLen+25) must be >= this
  distModOutline: 0.5 // avgDist multiplier when the outline/guide is visible (or not the first stroke)
});

/** Suggested option bundles (research: forgiving default leniency 1.5-2, force-correct after 3-5 misses). */
export const MODES = Object.freeze({
  forgiving: Object.freeze({ leniency: 1.75, markStrokeCorrectAfterMisses: 4, showHintAfterMisses: 2, acceptBackwardsStrokes: false }),
  strict: Object.freeze({ leniency: 0.8, markStrokeCorrectAfterMisses: 0, showHintAfterMisses: 3, acceptBackwardsStrokes: false })
});

// ---------------------------------------------------------------- geometry

/** @param {Pt} a @param {Pt} b */
export function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

/** @param {Pt[]} pts */
export function pathLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

/** Remove consecutive duplicate points. @param {Pt[]} pts @returns {Pt[]} */
export function stripDuplicates(pts) {
  /** @type {Pt[]} */ const out = [];
  for (const p of pts || []) {
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const q = out[out.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push([p[0], p[1]]);
  }
  return out;
}

/** Resample a polyline to exactly n points evenly spaced by arc length (endpoints kept).
 *  @param {Pt[]} pts @param {number} n @returns {Pt[]} */
export function resample(pts, n) {
  const p = stripDuplicates(pts);
  if (n < 2) throw new RangeError('resample: n must be >= 2');
  if (p.length === 0) return [];
  const total = pathLength(p);
  if (p.length === 1 || total === 0) return Array.from({ length: n }, () => /** @type {Pt} */ ([p[0][0], p[0][1]]));
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + dist(p[i - 1], p[i]));
  /** @type {Pt[]} */ const out = [];
  let seg = 1;
  for (let k = 0; k < n; k++) {
    const d = (total * k) / (n - 1);
    while (seg < p.length - 1 && cum[seg] < d) seg++;
    const segLen = cum[seg] - cum[seg - 1];
    const t = segLen === 0 ? 0 : Math.min(1, Math.max(0, (d - cum[seg - 1]) / segLen));
    out.push([p[seg - 1][0] + (p[seg][0] - p[seg - 1][0]) * t, p[seg - 1][1] + (p[seg][1] - p[seg - 1][1]) * t]);
  }
  return out;
}

/** Closest distance from a point to a polyline (segment-accurate). @param {Pt} p @param {Pt[]} line */
export function distToPolyline(p, line) {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return dist(p, line[0]);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) best = Math.min(best, distToSegment(p, line[i - 1], line[i]));
  return best;
}

/** @param {Pt} p @param {Pt} a @param {Pt} b */
export function distToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Index of the segment of `line` nearest to p. @param {Pt} p @param {Pt[]} line */
function nearestSegment(p, line) {
  let best = 0, bd = Infinity;
  for (let i = 1; i < line.length; i++) {
    const d = distToSegment(p, line[i - 1], line[i]);
    if (d < bd) { bd = d; best = i - 1; }
  }
  return best;
}

/** Mean distance from each user point to the target polyline. @param {Pt[]} points @param {Pt[]} line */
export function averageDistance(points, line) {
  if (!points.length) return Infinity;
  let s = 0;
  for (const p of points) s += distToPolyline(p, line);
  return s / points.length;
}

/** @param {Pt[]} pts @returns {Pt[]} edge vectors */
export function edgeVectors(pts) {
  /** @type {Pt[]} */ const v = [];
  for (let i = 1; i < pts.length; i++) v.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  return v;
}

/** Cosine similarity of two vectors (0 if either is zero). @param {Pt} a @param {Pt} b */
export function cosineSimilarity(a, b) {
  const la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
  if (la === 0 || lb === 0) return 0;
  return (a[0] * b[0] + a[1] * b[1]) / (la * lb);
}

/** Average cosine between user edges and the direction of the nearest target segment. */
export function averageDirectionCosine(user, target) {
  const u = resample(user, Math.max(8, Math.min(32, user.length)));
  const t = stripDuplicates(target);
  if (u.length < 2 || t.length < 2) return 0;
  let sum = 0, n = 0;
  for (let i = 1; i < u.length; i++) {
    const mid = /** @type {Pt} */ ([(u[i][0] + u[i - 1][0]) / 2, (u[i][1] + u[i - 1][1]) / 2]);
    const si = nearestSegment(mid, t);
    const tv = /** @type {Pt} */ ([t[si + 1][0] - t[si][0], t[si + 1][1] - t[si][1]]);
    const uv = /** @type {Pt} */ ([u[i][0] - u[i - 1][0], u[i][1] - u[i - 1][1]]);
    if (uv[0] === 0 && uv[1] === 0) continue;
    sum += cosineSimilarity(uv, tv); n++;
  }
  return n ? sum / n : 0;
}

/** Discrete Frechet distance between two polylines (same-length or not). @param {Pt[]} p @param {Pt[]} q */
export function frechetDistance(p, q) {
  const n = p.length, m = q.length;
  if (!n || !m) return Infinity;
  const ca = Array.from({ length: n }, () => new Float64Array(m).fill(-1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const d = dist(p[i], q[j]);
      if (i === 0 && j === 0) ca[i][j] = d;
      else if (i === 0) ca[i][j] = Math.max(ca[i][j - 1], d);
      else if (j === 0) ca[i][j] = Math.max(ca[i - 1][j], d);
      else ca[i][j] = Math.max(Math.min(ca[i - 1][j], ca[i - 1][j - 1], ca[i][j - 1]), d);
    }
  }
  return ca[n - 1][m - 1];
}

/** Resample to n points, centre on the centroid and scale to unit RMS radius (shape only). */
export function normalizeCurve(pts, n = 50) {
  const r = resample(pts, n);
  if (!r.length) return [];
  let cx = 0, cy = 0;
  for (const p of r) { cx += p[0]; cy += p[1]; }
  cx /= r.length; cy /= r.length;
  let ss = 0;
  for (const p of r) ss += (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
  const scale = Math.sqrt(ss / r.length) || 1;
  return r.map(p => /** @type {Pt} */ ([(p[0] - cx) / scale, (p[1] - cy) / scale]));
}

/** @param {Pt[]} pts @param {number} theta radians about origin */
export function rotate(pts, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return pts.map(p => /** @type {Pt} */ ([p[0] * c - p[1] * s, p[0] * s + p[1] * c]));
}

const ROTATIONS = [-Math.PI / 16, -Math.PI / 32, 0, Math.PI / 32, Math.PI / 16];

/** Minimum Frechet distance of normalized curves over small rotations. */
export function shapeDistance(user, target) {
  const a = normalizeCurve(user), b = normalizeCurve(target);
  if (!a.length || !b.length) return Infinity;
  let best = Infinity;
  for (const th of ROTATIONS) best = Math.min(best, frechetDistance(rotate(a, th), b));
  return best;
}

// ---------------------------------------------------------------- scoring

/**
 * @typedef {Object} ScoreOptions
 * @property {number} [leniency=1]  larger = more forgiving (0.8 strict .. 1.5-2 forgiving)
 * @property {boolean} [outlineVisible=true] halves the average-distance threshold (Hanzi Writer distMod)
 * @property {boolean} [acceptBackwardsStrokes=false]
 * @property {number} [thresholdScale=1] scale the distance thresholds for small letters (yod etc.)
 *
 * @typedef {Object} ScoreResult
 * @property {boolean} ok
 * @property {boolean} backwards   stroke would pass if drawn in the opposite direction
 * @property {string[]} failed     subset of: 'tooShort','avgDist','startEnd','direction','shape','length'
 * @property {Object} metrics
 */

/**
 * Score one user stroke against one target median.
 * @param {Pt[]} medianTarget  target centreline (>= 2 points)
 * @param {Pt[]} userPoints    raw user points
 * @param {number|ScoreOptions} [options] a number is treated as leniency
 * @returns {ScoreResult}
 */
export function scoreStroke(medianTarget, userPoints, options = {}) {
  const o = typeof options === 'number' ? { leniency: options } : (options || {});
  const leniency = Number.isFinite(o.leniency) && /** @type {number} */ (o.leniency) > 0 ? /** @type {number} */ (o.leniency) : 1;
  const tscale = Number.isFinite(o.thresholdScale) && /** @type {number} */ (o.thresholdScale) > 0 ? /** @type {number} */ (o.thresholdScale) : 1;
  const target = stripDuplicates(medianTarget);
  const user = stripDuplicates(userPoints);
  if (target.length < 2) throw new RangeError('scoreStroke: target median needs >= 2 distinct points');
  if (user.length < 2) {
    return { ok: false, backwards: false, failed: ['tooShort'], metrics: { userPoints: user.length } };
  }
  const first = evaluate(target, user, leniency, o.outlineVisible !== false, tscale);
  if (first.failed.length === 0) return { ok: true, backwards: false, failed: [], metrics: first.metrics };
  const rev = evaluate(target, user.slice().reverse(), leniency, o.outlineVisible !== false, tscale);
  const backwards = rev.failed.length === 0;
  if (backwards && o.acceptBackwardsStrokes) return { ok: true, backwards: true, failed: [], metrics: rev.metrics };
  return { ok: false, backwards, failed: first.failed, metrics: first.metrics };
}

function evaluate(target, user, leniency, outlineVisible, tscale) {
  const distMod = outlineVisible ? DEFAULTS.distModOutline : 1;
  const avg = averageDistance(user, target);
  const startD = dist(user[0], target[0]);
  const endD = dist(user[user.length - 1], target[target.length - 1]);
  const cos = averageDirectionCosine(user, target);
  const frechet = shapeDistance(user, target);
  const userLen = pathLength(user), targetLen = pathLength(target);
  const lenRatio = (leniency * (userLen + 25)) / (targetLen + 25);
  const failed = [];
  if (!(avg <= DEFAULTS.avgDist * distMod * leniency * tscale)) failed.push('avgDist');
  if (!(startD <= DEFAULTS.startEnd * leniency * tscale && endD <= DEFAULTS.startEnd * leniency * tscale)) failed.push('startEnd');
  if (!(cos >= DEFAULTS.cosine)) failed.push('direction');
  if (!(frechet <= DEFAULTS.frechet * leniency)) failed.push('shape');
  if (!(lenRatio >= DEFAULTS.minLen)) failed.push('length');
  return { failed, metrics: { avgDist: avg, startDist: startD, endDist: endD, cosine: cos, frechet, lengthRatio: lenRatio } };
}

/** Map a failed-check list to a learner-facing message (English; `key` is for i18n via ctx.t). */
export function feedbackFor(result, extra = {}) {
  if (!result || result.ok) return { key: 'trace.good', text: 'Good!' };
  if (extra.wrongOrder) return { key: 'trace.order', text: 'That is a different stroke. Follow the numbered order.' };
  if (result.backwards) return { key: 'trace.backwards', text: 'Right shape. Try the other direction. Start at the green dot.' };
  const f = result.failed || [];
  if (f.includes('tooShort')) return { key: 'trace.tooShort', text: 'Draw a longer line.' };
  if (f.includes('direction')) return { key: 'trace.direction', text: 'Check the direction of the arrow.' };
  if (f.includes('startEnd')) return { key: 'trace.startEnd', text: 'Start at the green dot and finish at the arrow.' };
  if (f.includes('length')) return { key: 'trace.length', text: 'Draw the whole stroke.' };
  if (f.includes('avgDist')) return { key: 'trace.avgDist', text: 'Stay closer to the guide.' };
  if (f.includes('shape')) return { key: 'trace.shape', text: 'Follow the curve of the guide.' };
  return { key: 'trace.retry', text: 'Try again.' };
}

/** Extent (max of width/height) of all median points of a script block; used to scale thresholds for small letters. */
export function letterExtent(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s.median) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return Math.max(x1 - x0, y1 - y0);
}

// ---------------------------------------------------------------- session (pure state machine)

/**
 * Pure tracing session: feed completed user strokes, get results. No DOM, fully testable.
 * @param {{id?:string, print?:any, cursive?:any}} letter
 * @param {'print'|'cursive'} script
 * @param {Object} [opts]
 */
export function createSession(letter, script, opts = {}) {
  const block = letter && letter[script];
  if (!block || !Array.isArray(block.strokes) || block.strokes.length === 0) throw new Error(`createSession: no ${script} strokes for ${letter && letter.id}`);
  const o = Object.assign({}, MODES.forgiving, opts);
  const strokes = block.strokes;
  const tscale = Math.max(0.5, Math.min(1, letterExtent(strokes) / 700));
  const state = { index: 0, totalMistakes: 0, mistakesOnStroke: 0, done: false, results: [] };
  const handlers = { strokeResult: [], mistake: [], complete: [] };

  function emit(name, payload) { for (const h of handlers[name]) { try { h(payload); } catch (e) { /* listener errors must not break tracing */ } } }

  /** @param {Pt[]} points */
  function submit(points) {
    if (state.done) return { ok: false, ignored: true };
    const target = strokes[state.index].median;
    const res = scoreStroke(target, points, { leniency: o.leniency, outlineVisible: o.showOutline !== false, acceptBackwardsStrokes: !!o.acceptBackwardsStrokes, thresholdScale: tscale });
    if (res.ok) return advance(res, false);
    // does it match a later stroke instead? (order error)
    let wrongOrder = false;
    for (let k = state.index + 1; k < strokes.length; k++) {
      const alt = scoreStroke(strokes[k].median, points, { leniency: Math.min(o.leniency, 1), outlineVisible: true, thresholdScale: tscale });
      if (alt.ok) { wrongOrder = true; break; }
    }
    state.totalMistakes++; state.mistakesOnStroke++;
    const fb = feedbackFor(res, { wrongOrder });
    const info = { strokeNum: state.index, totalMistakes: state.totalMistakes, mistakesOnStroke: state.mistakesOnStroke, strokesRemaining: strokes.length - state.index, reason: wrongOrder ? 'order' : (res.backwards ? 'backwards' : res.failed[0]), failed: res.failed, feedback: fb, metrics: res.metrics };
    const force = o.markStrokeCorrectAfterMisses > 0 && state.mistakesOnStroke >= o.markStrokeCorrectAfterMisses;
    const showHint = o.showHintAfterMisses > 0 && state.mistakesOnStroke >= o.showHintAfterMisses;
    emit('mistake', Object.assign({ showHint, forced: force }, info));
    if (force) return advance(res, true, info);
    return { ok: false, showHint, feedback: fb, info };
  }

  function advance(res, forced, info) {
    const strokeNum = state.index;
    const payload = { ok: true, forced, strokeNum, total: strokes.length, totalMistakes: state.totalMistakes, mistakesOnStroke: state.mistakesOnStroke, feedback: forced ? { key: 'trace.shown', text: 'Here is the correct stroke.' } : feedbackFor(res), metrics: res.metrics };
    state.results.push({ strokeNum, forced, mistakes: state.mistakesOnStroke });
    state.index++; state.mistakesOnStroke = 0;
    emit('strokeResult', payload);
    if (state.index >= strokes.length) {
      state.done = true;
      emit('complete', { letterId: letter.id, script, totalMistakes: state.totalMistakes, perfect: state.totalMistakes === 0 });
    }
    return payload;
  }

  return {
    submit,
    reset() { state.index = 0; state.totalMistakes = 0; state.mistakesOnStroke = 0; state.done = false; state.results = []; },
    on(name, fn) { if (!handlers[name]) throw new Error('unknown event ' + name); handlers[name].push(fn); return () => { const i = handlers[name].indexOf(fn); if (i >= 0) handlers[name].splice(i, 1); }; },
    getState() { return { index: state.index, total: strokes.length, done: state.done, totalMistakes: state.totalMistakes, mistakesOnStroke: state.mistakesOnStroke, thresholdScale: tscale, options: o }; },
    setOptions(p) { Object.assign(o, p); },
    strokes
  };
}

// ---------------------------------------------------------------- DOM (defensive)

const SVGNS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG tracing surface inside `container` and return a controller.
 * `container` may be an HTMLElement (an <svg> is created) or an existing <svg>.
 *
 * Controller: { animate(), hint(), reset(), destroy(), setOptions(o), getState(), submit(points),
 *               on('strokeResult'|'mistake'|'complete', fn) -> off(), onStrokeResult/onMistake/onComplete = fn,
 *               svg }
 * opts: leniency, markStrokeCorrectAfterMisses, showHintAfterMisses, showOutline (default true),
 *       strokeAnimationSpeed (1), delayBetweenStrokes (ms, 500), onUserStroke(points) (every raw learner stroke), onStrokeResult, onMistake, onComplete,
 *       onInputWhileDone() (the learner tried to draw on a finished letter; nothing is drawn, the view should point to "Start over"),
 *       document (inject for tests), strict (bool: apply MODES.strict)
 * @param {any} container
 * @param {any} letter record from letters.json
 * @param {'print'|'cursive'} script
 * @param {any} [opts]
 */
export function createTracer(container, letter, script, opts = {}) {
  const base = opts.strict ? MODES.strict : MODES.forgiving;
  const options = Object.assign({ showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 500 }, base, opts);
  const session = createSession(letter, script, options);
  const block = letter[script];
  const doc = options.document || (container && container.ownerDocument) || (typeof document !== 'undefined' ? document : null);
  const listeners = { strokeResult: [], mistake: [], complete: [] };
  for (const [k, fn] of [['strokeResult', options.onStrokeResult], ['mistake', options.onMistake], ['complete', options.onComplete]]) if (typeof fn === 'function') session.on(k, fn);

  /** @type {any} */ let svg = null, gGuide = null, gDone = null, gUser = null, gHint = null;
  let destroyed = false, timers = [], rafId = 0, drawing = null, animResolve = null;

  function el(name, attrs) {
    const e = doc.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    return e;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  const sw = block.strokeWidth || (script === 'print' ? 85 : 55);

  function build() {
    if (!doc || !container) return;
    if (container.namespaceURI === SVGNS && container.tagName && container.tagName.toLowerCase() === 'svg') svg = container;
    else {
      svg = el('svg', { viewBox: '0 0 1000 1000', role: 'img', 'aria-label': `Tracing area for ${letter.name || letter.id}` });
      svg.style.width = '100%'; svg.style.maxWidth = '480px'; svg.style.height = 'auto'; svg.style.aspectRatio = '1 / 1';
      container.appendChild(svg);
    }
    svg.style.touchAction = 'none'; svg.style.userSelect = 'none'; svg.style.cursor = 'crosshair';
    svg.setAttribute('direction', 'ltr'); // geometry is not mirrored; Hebrew reading direction is in the data
    gGuide = el('g', {}); gDone = el('g', {}); gHint = el('g', {}); gUser = el('g', {});
    svg.appendChild(gGuide); svg.appendChild(gDone); svg.appendChild(gHint); svg.appendChild(gUser);
    drawGuide();
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onCancel);
    svg.addEventListener('lostpointercapture', onCancel);
    // Fallback when pointer capture is unsupported or refused: the release happens off the surface and only the document sees it.
    if (doc.addEventListener) { doc.addEventListener('pointerup', onUp); doc.addEventListener('pointercancel', onCancel); }
  }

  function drawGuide() {
    clear(gGuide);
    if (options.showOutline === false) return;
    if (block.outline) gGuide.appendChild(el('path', { d: block.outline, fill: '#8f8fa0', stroke: 'none' }));
    else for (const s of block.strokes) gGuide.appendChild(el('path', { d: s.path, fill: 'none', stroke: '#8f8fa0', 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    // start dot for the current stroke
    const st = session.getState();
    if (!st.done) {
      const m = block.strokes[st.index].median;
      gGuide.appendChild(el('circle', { cx: m[0][0], cy: m[0][1], r: 30, fill: '#1a7f37', opacity: 1 }));
      gGuide.appendChild(el('text', { x: m[0][0], y: m[0][1] + 12, 'text-anchor': 'middle', 'font-size': 34, fill: '#fff', 'font-family': 'sans-serif', 'font-weight': 'bold' })).textContent = String(st.index + 1);
    }
  }

  function toBox(ev) {
    const r = svg.getBoundingClientRect();
    const w = r.width || 1, h = r.height || 1;
    return /** @type {Pt} */ ([((ev.clientX - r.left) / w) * 1000, ((ev.clientY - r.top) / h) * 1000]);
  }
  // Pointer state machine. Invariant: `drawing` is non-null only between a pointerdown and the matching pointerup /
  // pointercancel / lostpointercapture of the SAME pointer; every other path drops back to the idle (drawable) state.
  function onDown(ev) {
    if (destroyed) return;
    if (session.getState().done) { // finished letter: nothing is drawn; tell the view so it can say "Start over" instead of staying silent
      if (typeof options.onInputWhileDone === 'function') { try { options.onInputWhileDone(); } catch (e) { /* observer must not break tracing */ } }
      if (ev.preventDefault) ev.preventDefault();
      return;
    }
    if (ev.button !== undefined && ev.button > 0) return;
    if (drawing) {
      // same pointer again: its release was never seen (capture refused, window lost focus): drop the stale stroke and start afresh
      if (ev.pointerId === drawing.id) discardStroke();
      // another pointer (second finger, palm) while a stroke is in progress: the first pointer keeps the surface
      else return;
    }
    if (ev.isPrimary === false) return; // a non-primary touch never starts a stroke
    try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* not supported */ }
    cancelAnimation();
    clear(gHint);
    drawing = { id: ev.pointerId, pts: [toBox(ev)], path: el('path', { fill: 'none', stroke: '#1f4e9c', 'stroke-width': 26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85 }) };
    clear(gUser); gUser.appendChild(drawing.path); updateUser();
    if (ev.preventDefault) ev.preventDefault();
  }
  function onMove(ev) {
    if (!drawing || ev.pointerId !== drawing.id) return;
    // the button is already up (release happened where no listener saw it): finish the stroke now instead of trailing the pointer
    if (ev.buttons === 0) { finishStroke(); return; }
    const evs = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : null;
    for (const e of (evs && evs.length ? evs : [ev])) drawing.pts.push(toBox(e));
    updateUser();
  }
  function updateUser() { if (drawing) drawing.path.setAttribute('d', 'M' + drawing.pts.map(p => p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join('L')); }
  function onUp(ev) {
    if (!drawing || ev.pointerId !== drawing.id) return;
    finishStroke();
  }
  /** Score the stroke in progress and return to idle. */
  function finishStroke() {
    const pts = drawing.pts; const path = drawing.path; drawing = null;
    if (typeof options.onUserStroke === 'function') { try { options.onUserStroke(pts); } catch (e) { /* observer must not break tracing */ } }
    handleResult(session.submit(pts), path);
  }
  /** Drop the stroke in progress without scoring it and return to idle. */
  function discardStroke() { if (drawing) { if (drawing.path.parentNode) drawing.path.parentNode.removeChild(drawing.path); drawing = null; } }
  function onCancel(ev) {
    // only the active pointer may cancel the stroke; a second finger's cancel (or its lostpointercapture) leaves it alone
    if (!drawing || (ev && ev.pointerId !== undefined && ev.pointerId !== drawing.id)) return;
    discardStroke();
  }

  function handleResult(res, userPath) {
    if (destroyed) return res;
    if (res && res.ok) {
      clear(gUser);
      drawDone(session.getState().index - 1);
      drawGuide();
      if (svg) svg.setAttribute('data-progress', String(session.getState().index));
    } else if (res && !res.ignored) {
      if (userPath) { userPath.setAttribute('stroke', '#c0392b'); schedule(() => { if (userPath.parentNode) userPath.parentNode.removeChild(userPath); }, 500); }
      if (res.showHint) showHintStroke();
    }
    return res;
  }
  function drawDone(i) {
    const s = block.strokes[i];
    if (s) gDone.appendChild(el('path', { d: s.path, fill: 'none', stroke: '#222', 'stroke-width': sw * 0.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }

  function schedule(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function cancelAnimation() {
    timers.forEach(clearTimeout); timers = []; if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId); rafId = 0;
    // an interrupted animate() must still settle, or the view waits forever for "Your turn."
    if (animResolve) { const r = animResolve; animResolve = null; r(undefined); }
  }

  /** Animate drawing one median progressively into `node`; calls done() when finished. */
  function animateMedian(node, median, color, done) {
    const pts = resample(median, 60);
    const total = pathLength(median);
    const dur = Math.max(300, (total / 600) * 1000 / (options.strokeAnimationSpeed || 1));
    const path = el('path', { fill: 'none', stroke: color, 'stroke-width': sw * 0.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.9 });
    node.appendChild(path);
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const t0 = now();
    // prefers-reduced-motion: show the finished stroke at once instead of sweeping it (the strokes still appear one after another)
    if ((typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) || (typeof document !== 'undefined' && document.documentElement?.hasAttribute?.('data-calm'))) { path.setAttribute('d', 'M' + pts.map(p => p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join('L')); if (done) done(); return path; }
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn => setTimeout(() => fn(now()), 16));
    const step = () => {
      if (destroyed) return;
      const k = Math.min(1, (now() - t0) / dur);
      const n = Math.max(2, Math.round(k * (pts.length - 1)) + 1);
      path.setAttribute('d', 'M' + pts.slice(0, n).map(p => p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join('L'));
      if (k < 1) rafId = raf(step); else if (done) done();
    };
    step();
    return path;
  }

  function showHintStroke() {
    clear(gHint);
    const st = session.getState();
    if (st.done) return;
    animateMedian(gHint, block.strokes[st.index].median, '#b45309', () => schedule(() => clear(gHint), 800));
  }

  /** Play the whole letter's stroke order, one stroke after another. Resolves when finished. */
  function animate() {
    return new Promise(resolve0 => {
      if (!doc || destroyed) return resolve0(undefined);
      cancelAnimation(); clear(gHint);
      animResolve = resolve0;
      const resolve = () => { if (animResolve === resolve0) animResolve = null; resolve0(undefined); };
      let i = 0;
      const next = () => {
        if (destroyed) return resolve(undefined);
        if (i >= block.strokes.length) { schedule(() => { clear(gHint); resolve(undefined); }, 600); return; }
        const idx = i++;
        animateMedian(gHint, block.strokes[idx].median, '#b45309', () => schedule(next, options.delayBetweenStrokes));
        // number badge at start
        const s = block.strokes[idx].median[0];
        gHint.appendChild(el('text', { x: s[0], y: s[1] - 36, 'text-anchor': 'middle', 'font-size': 44, fill: '#b45309', 'font-family': 'sans-serif', 'font-weight': 'bold' })).textContent = String(idx + 1);
      };
      next();
    });
  }

  function reset() {
    cancelAnimation(); discardStroke(); session.reset();
    if (gDone) { clear(gDone); clear(gHint); clear(gUser); drawGuide(); }
    if (svg) svg.setAttribute('data-progress', '0');
  }
  function destroy() {
    destroyed = true; cancelAnimation(); drawing = null;
    if (doc && doc.removeEventListener) { doc.removeEventListener('pointerup', onUp); doc.removeEventListener('pointercancel', onCancel); }
    if (svg) {
      svg.removeEventListener('pointerdown', onDown); svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp); svg.removeEventListener('pointercancel', onCancel); svg.removeEventListener('lostpointercapture', onCancel);
      if (svg.parentNode === container) container.removeChild(svg);
    }
  }

  build();
  return {
    svg,
    animate,
    hint: showHintStroke,
    reset,
    destroy,
    /** programmatic stroke (tests, assistive input); updates the drawing like a real pointer stroke */
    submit(points) { return handleResult(session.submit(points), null); },
    /** true while a pointer stroke is in progress (tests) */
    get drawing() { return !!drawing; },
    on: session.on,
    set onStrokeResult(fn) { session.on('strokeResult', fn); },
    set onMistake(fn) { session.on('mistake', fn); },
    set onComplete(fn) { session.on('complete', fn); },
    setOptions(p) { Object.assign(options, p); session.setOptions(p); if (p && 'showOutline' in p) drawGuide(); },
    getState: session.getState
  };
}
