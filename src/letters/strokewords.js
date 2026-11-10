// Strokes in words: a text description of how each stroke of a letter is drawn, worked out from the stroke data in data/letters/letters.json
// (print.strokes[i].median / cursive.strokes[i].median: points in a 0..1000 box, y pointing DOWN). Pure functions, no DOM.
// Why: the tracing screen is a drag-on-canvas exercise that a person who cannot see it cannot use. This gives the same information (where to
// start, which way to go, what shape, how long) as sentences. It is NOT a replacement for tracing, which is a visual and motor skill.
// Honest limits: the sentences are computed by a program from draft stroke data that no teacher has checked, so they are a rough guide.
// "left" and "right" are as the letter is drawn on the screen (Hebrew is read from right to left, so a word begins on the right).
// @ts-check

const PTS = (s) => (s && Array.isArray(s.median) ? s.median.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) : []);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const pathLen = (pts) => { let n = 0; for (let i = 1; i < pts.length; i++) n += dist(pts[i - 1], pts[i]); return n; };

/** Nine places on the letter's own bounding box. A very narrow or very flat letter (Vav, a bar) has no meaningful left/right or top/bottom, so that axis is dropped. */
const ROWS = ['top', 'middle', 'bottom'], COLS = ['left', 'middle', 'right'];
export function placeOf(p, box) {
  const w = Math.max(1, box.x1 - box.x0), h = Math.max(1, box.y1 - box.y0);
  const col = Math.min(2, Math.max(0, Math.floor(((p[0] - box.x0) / w) * 3)));
  const row = Math.min(2, Math.max(0, Math.floor(((p[1] - box.y0) / h) * 3)));
  const narrow = w < 0.25 * h, flat = h < 0.25 * w;
  if (narrow) return ROWS[row];
  if (flat) return COLS[col];
  if (row === 1 && col === 1) return 'centre';
  return row === 1 ? 'middle ' + COLS[col] : col === 1 ? ROWS[row] + ' middle' : ROWS[row] + ' ' + COLS[col];
}

const COMPASS = ['to the right', 'down and to the right', 'down', 'down and to the left', 'to the left', 'up and to the left', 'up', 'up and to the right'];
/** Direction words for a vector (y down). */
export function directionWords(dx, dy) {
  const a = Math.atan2(dy, dx); // 0 = right, +90deg = down
  const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return COMPASS[i];
}
const SIDE = ['to the right', 'toward the bottom right', 'toward the bottom', 'toward the bottom left', 'to the left', 'toward the top left', 'toward the top', 'toward the top right'];
const sideWords = (dx, dy) => { const a = Math.atan2(dy, dx); return SIDE[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; };

/** Douglas-Peucker: indices of the points that keep the polyline within eps. */
function simplify(pts, eps) {
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const rec = (a, b) => {
    let maxD = 0, idx = -1;
    for (let i = a + 1; i < b; i++) { const d = distToLine(pts[i], pts[a], pts[b]); if (d > maxD) { maxD = d; idx = i; } }
    if (idx >= 0 && maxD > eps) { keep[idx] = true; rec(a, idx); rec(idx, b); }
  };
  rec(0, pts.length - 1);
  return pts.map((p, i) => (keep[i] ? i : -1)).filter((i) => i >= 0);
}
function distToLine(p, a, b) {
  const len = dist(a, b); if (len < 1e-6) return dist(p, a);
  return Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len;
}
/** Largest signed offset of the points between a..b from the chord a-b: [distance, side vector] (side vector points from the chord to the bulge). */
function bulge(pts, a, b) {
  let best = 0, vec = [0, 0]; const A = pts[a], B = pts[b];
  for (let i = a + 1; i < b; i++) { const d = distToLine(pts[i], A, B); if (d > best) { best = d; const t = ((pts[i][0] - A[0]) * (B[0] - A[0]) + (pts[i][1] - A[1]) * (B[1] - A[1])) / (Math.pow(dist(A, B), 2) || 1); const fx = A[0] + t * (B[0] - A[0]), fy = A[1] + t * (B[1] - A[1]); vec = [pts[i][0] - fx, pts[i][1] - fy]; } }
  return [best, vec];
}
const turnDeg = (v1, v2) => { let d = (Math.atan2(v2[1], v2[0]) - Math.atan2(v1[1], v1[0])) * 180 / Math.PI; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

/** Bounding box of every median point of one script block. */
export function boxOf(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of PTS(s)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: 1000, y1: 1000 };
}

/**
 * Describe one stroke. Returns plain data plus a sentence.
 * @param {number[][]} pts median points
 * @param {{x0:number,y0:number,x1:number,y1:number}} box the whole letter's box
 */
export function describeStroke(pts, box) {
  const size = Math.max(1, box.x1 - box.x0, box.y1 - box.y0);
  const L = pathLen(pts);
  const start = pts[0], end = pts[pts.length - 1];
  const startPlace = placeOf(start, box), endPlace = placeOf(end, box);
  const rel = L / size;
  const length = rel < 0.22 ? 'very short' : rel < 0.5 ? 'short' : rel < 1.0 ? 'medium length' : 'long';
  const closed = dist(start, end) < 0.12 * L && L > 0.4 * size;
  if (L < 0.08 * size) return { start: startPlace, end: startPlace, length: 'a dot', kind: 'dot', parts: [], closed: false, text: `a small dot at the ${startPlace}. Tap or draw a very short mark there.` };
  // simplify the path until it has at most 4 parts
  let eps = 0.06 * size, idx = simplify(pts, eps);
  while (idx.length > 5 && eps < size) { eps *= 1.4; idx = simplify(pts, eps); }
  const parts = [];
  for (let k = 1; k < idx.length; k++) {
    const a = idx[k - 1], b = idx[k]; const A = pts[a], B = pts[b]; const [bd, bv] = bulge(pts, a, b); const chord = dist(A, B);
    const curved = chord > 1 && bd / chord > 0.12;
    parts.push({ dir: directionWords(B[0] - A[0], B[1] - A[1]), curved, bows: curved ? sideWords(bv[0], bv[1]) : null, vec: [B[0] - A[0], B[1] - A[1]], chord });
  }
  // merge neighbouring parts that go the same way
  const merged = [];
  for (const p of parts) { const last = merged[merged.length - 1]; if (last && last.dir === p.dir) { last.curved = last.curved || p.curved; last.bows = last.bows || p.bows; last.vec = [last.vec[0] + p.vec[0], last.vec[1] + p.vec[1]]; last.chord += p.chord; } else merged.push({ ...p }); }
  const words = merged.map((p, i) => {
    const turn = i ? turnDeg(merged[i - 1].vec, p.vec) : 0;
    const sharp = Math.abs(turn) > 70;
    const lead = i === 0 ? 'Go' : (sharp ? 'Turn sharply and go' : 'Then bend and go');
    const shape = p.curved ? `in a curve (the middle of the curve is pushed ${p.bows})` : 'in a straight line';
    return `${lead} ${p.dir}, ${shape}`;
  });
  let kind = merged.length === 1 ? (merged[0].curved ? 'curve' : 'straight') : merged.length === 2 ? 'bent' : 'winding';
  if (closed) kind = 'loop';
  const text = `starts at the ${startPlace}. ${words.join('. ')}. ${closed ? 'It comes back near where it started. ' : ''}It ends at the ${endPlace}. This is a ${length} stroke.`;
  return { start: startPlace, end: endPlace, length, kind, parts: merged.map((p) => ({ dir: p.dir, curved: p.curved })), closed, text };
}

/**
 * Describe every stroke of a letter in drawing order.
 * @param {any} letter a record from letters.json
 * @param {'print'|'cursive'} script
 * @returns {{ok:boolean, total:number, strokes:{n:number,total:number,text:string,sentence:string,start:string,end:string,length:string,kind:string,startsWherePreviousEnded:boolean}[], summary:string}}
 */
export function describeLetterStrokes(letter, script) {
  const block = letter && letter[script];
  const strokes = block && Array.isArray(block.strokes) ? block.strokes.filter((s) => PTS(s).length >= 2) : [];
  if (!strokes.length) return { ok: false, total: 0, strokes: [], summary: 'There is no stroke data for this letter.' };
  const box = boxOf(strokes);
  const out = [];
  for (let i = 0; i < strokes.length; i++) {
    const pts = PTS(strokes[i]);
    const d = describeStroke(pts, box);
    const size = Math.max(1, box.x1 - box.x0, box.y1 - box.y0);
    const prevEnd = i ? PTS(strokes[i - 1]).slice(-1)[0] : null;
    const cont = !!prevEnd && dist(prevEnd, pts[0]) < 0.08 * size;
    const lift = i === 0 ? '' : cont ? 'Keep going from where the last stroke ended. ' : 'Lift your finger and move. ';
    const sentence = `Stroke ${i + 1} of ${strokes.length}: ${lift}It ${d.text}`;
    out.push({ n: i + 1, total: strokes.length, text: d.text, sentence, start: d.start, end: d.end, length: d.length, kind: d.kind, startsWherePreviousEnded: cont });
  }
  const name = letter.name || letter.id;
  const summary = `${name} (${script}) is drawn in ${strokes.length} stroke${strokes.length === 1 ? '' : 's'}, in this order.`;
  return { ok: true, total: strokes.length, strokes: out, summary };
}

/** The honest note shown with the description. */
export const STROKE_WORDS_NOTE = 'Tracing is a visual skill: you follow a drawn shape with a finger or a mouse. This panel does not replace it. It describes each stroke in words (where it starts, which way it goes, what shape it has) so you can learn the stroke order and the shape without seeing the drawing. A program worked these sentences out from stroke data that a teacher has not checked yet, so they are a rough guide, and some curves are described more simply than they are drawn. Left and right are as the letter appears on screen; Hebrew words start on the right.';
