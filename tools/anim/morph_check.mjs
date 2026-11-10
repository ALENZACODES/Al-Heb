#!/usr/bin/env node
// DRAFT checker: does the candidate k1 outline (docs/drafts/animation-poses-v2) morph cleanly into the old k2 ... k7 poses?
// Variants per letter:  A = original k1..k7 (docs/drafts/animation-poses)
//                       B = v2 k1 + original k2..k7
//                       C = v2b k1 (cyclic start shift of B's k1) + original k2..k7, only when --v2b is given
// Frames come from src/letters/tween.js (sampleFrame, the same pure interpolation and easing the player uses):
// 12 steps per transition (13 samples incl. both ends of the transition), 0..2600 ms, 73 frames in all.
// Metrics are computed on path p1 (the letter outline): paths p2.. are byte-identical in A, B and C and are only verified to be.
//   crossings  proper self-crossings of the polygon in a frame (touching and collinear overlap are not counted)
//   areaJump   largest |area change| between consecutive frames, in square units (signed area, holes subtract)
//   disp       largest distance a single point moves between consecutive frames, in units
//   wobble     largest distance of the polygon centroid from the straight line between the transition's end centroids, in units
//   rms        RMS distance between matching points of the two key poses (how far the start is from the next pose)
// It measures geometry only. It cannot tell whether a frame looks good: that needs a designer.
// Usage: node tools/anim/morph_check.mjs [--poses DIR] [--v2 DIR] [--v2b DIR] [--json FILE] [--table FILE]
//          [--sheets DIR] [--make-v2b DIR] [--self-test]
// Exit 0 = ran, 1 = error or self-test failure, 2 = usage error. Zero dependencies (--sheets needs rsvg-convert).
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleFrame, parsePathD, parsePoseSvg, validatePoses } from '../../src/letters/tween.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
export const STEPS = 12;
export const DEFAULTS = {
  poses: path.join(ROOT, 'docs/drafts/animation-poses'),
  v2: path.join(ROOT, 'docs/drafts/animation-poses-v2'),
};

// ---- geometry --------------------------------------------------------------------------------
const ARITY = { M: 2, L: 2, C: 6, Z: 0 };

/** Path d -> array of sub-paths, each an array of [x,y]. C curves are flattened in 8 steps. Z closes (no repeated point). */
export function flatten(d) {
  const toks = String(d).trim().split(/[\s,]+/).filter(Boolean);
  const subs = [];
  let cur = null, last = null;
  for (let i = 0; i < toks.length;) {
    const c = toks[i++];
    const n = [];
    for (let k = 0; k < ARITY[c]; k++) n.push(Number(toks[i++]));
    if (c === 'M') { cur = [[n[0], n[1]]]; subs.push(cur); last = [n[0], n[1]]; }
    else if (c === 'L') { cur.push([n[0], n[1]]); last = [n[0], n[1]]; }
    else if (c === 'C') {
      const [x0, y0] = last;
      for (let s = 1; s <= 8; s++) {
        const t = s / 8, u = 1 - t;
        cur.push([u * u * u * x0 + 3 * u * u * t * n[0] + 3 * u * t * t * n[2] + t * t * t * n[4],
          u * u * u * y0 + 3 * u * u * t * n[1] + 3 * u * t * t * n[3] + t * t * t * n[5]]);
      }
      last = [n[4], n[5]];
    }
  }
  return subs;
}

const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
function properCross(p, q, r, s) {
  const e = 1e-9;
  const d1 = cross(p[0], p[1], q[0], q[1], r[0], r[1]), d2 = cross(p[0], p[1], q[0], q[1], s[0], s[1]);
  const d3 = cross(r[0], r[1], s[0], s[1], p[0], p[1]), d4 = cross(r[0], r[1], s[0], s[1], q[0], q[1]);
  return ((d1 > e && d2 < -e) || (d1 < -e && d2 > e)) && ((d3 > e && d4 < -e) || (d3 < -e && d4 > e));
}
/** Number of proper crossings between non-adjacent segments of all sub-paths (zero-length segments ignored). */
export function crossings(subs) {
  const segs = [];
  subs.forEach((pts, si) => {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if (a[0] === b[0] && a[1] === b[1]) continue;
      segs.push({ a, b, si, i, n });
    }
  });
  let count = 0;
  for (let x = 0; x < segs.length; x++) {
    for (let y = x + 1; y < segs.length; y++) {
      const s = segs[x], t = segs[y];
      if (s.si === t.si && (t.i - s.i === 1 || (s.i === 0 && t.i === s.n - 1) || t.i === s.i)) continue; // neighbours share an end
      if (properCross(s.a, s.b, t.a, t.b)) count++;
    }
  }
  return count;
}

/** Signed area (shoelace) summed over sub-paths, and area centroid (vertex mean if the area is below 1 square unit). */
export function areaCentroid(subs) {
  let A = 0, cx = 0, cy = 0, sx = 0, sy = 0, np = 0;
  for (const pts of subs) {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
      const w = x0 * y1 - x1 * y0;
      A += w / 2; cx += (x0 + x1) * w; cy += (y0 + y1) * w;
      sx += x0; sy += y0; np++;
    }
  }
  if (Math.abs(A) < 1) return { area: A, cx: np ? sx / np : 0, cy: np ? sy / np : 0 };
  return { area: A, cx: cx / (6 * A), cy: cy / (6 * A) };
}

const flatPts = (subs) => subs.flat();
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function distToLine(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (L < 1e-9) return dist(p, a);
  return Math.abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / L;
}

// ---- loading ---------------------------------------------------------------------------------
export const LETTER_ORDER = ['shin', 'bet', 'alef', 'mem', 'lamed', 'resh', 'vav', 'tav', 'yod', 'dalet', 'he', 'kaf', 'nun', 'samech', 'ayin',
  'pe', 'tsadi', 'qof', 'gimel', 'zayin', 'chet', 'tet', 'final-kaf', 'final-mem', 'final-nun', 'final-pe', 'final-tsadi'];

/** Contract records (time_ms, easing) of the 7 letter poses, from the batch JSON files. */
export function loadRecords(posesDir) {
  const out = {};
  for (const f of readdirSync(posesDir).filter((n) => /^batch-\d+\.json$/.test(n)).sort()) {
    const j = JSON.parse(readFileSync(path.join(posesDir, f), 'utf8'));
    for (const r of j.files || []) if (r.phase === 'A') (out[r.item] ||= {})[r.pose] = { time_ms: r.time_ms, easing: r.easing, file: r.file, batch: f.replace('.json', '') };
  }
  return out;
}

export function loadOriginalPoses(posesDir, item, records) {
  const poses = [];
  for (let k = 1; k <= 7; k++) {
    const r = records[item]?.[k];
    if (!r) throw new Error(`no record for ${item} pose ${k}`);
    const svg = parsePoseSvg(readFileSync(path.join(posesDir, r.batch, r.file), 'utf8'));
    poses.push({ time_ms: r.time_ms, easing: r.easing, paths: svg.paths });
  }
  return poses;
}

/** Variant poses: the original list with pose 1 path p1 replaced by the p1 of a candidate k1 file. Other paths are checked identical. */
export function withK1(poses, k1Text) {
  const k1 = parsePoseSvg(k1Text);
  const out = poses.map((p) => ({ ...p, paths: p.paths.map((q) => ({ ...q })) }));
  const note = [];
  if (k1.paths.length !== out[0].paths.length) throw new Error('k1 path count differs');
  out[0].paths.forEach((p, i) => {
    if (k1.paths[i].id !== p.id) throw new Error('k1 path id differs');
    if (i === 0) p.d = k1.paths[i].d;
    else if (k1.paths[i].d !== p.d || k1.paths[i].fill !== p.fill || k1.paths[i].opacity !== p.opacity) note.push(`${p.id} differs from original`);
  });
  if (out[0].paths[0].fill !== k1.paths[0].fill) note.push('p1 fill differs');
  return { poses: out, note };
}

// ---- metrics ---------------------------------------------------------------------------------
export function frameTimes(poses, steps = STEPS, maxTr = Infinity) {
  const times = [];
  for (let i = 0; i + 1 < poses.length && i < maxTr; i++) {
    for (let j = i === 0 ? 0 : 1; j <= steps; j++) times.push({ t: poses[i].time_ms + (poses[i + 1].time_ms - poses[i].time_ms) * j / steps, tr: i + 1, j });
  }
  return times;
}

/** Per-frame geometry of path index 0 (p1) for every frame. */
export function frameGeometry(poses, pathIndex = 0, steps = STEPS, maxTr = Infinity) {
  return frameTimes(poses, steps, maxTr).map((ft) => {
    const subs = flatten(sampleFrame(poses, ft.t)[pathIndex].d);
    return { ...ft, subs, x: crossings(subs), ...areaCentroid(subs) };
  });
}

const r2 = (v) => Math.round(v * 100) / 100;
/** Metrics over a slice of frames (a transition, or all). keyX = crossings of the key poses at the ends of the slice. */
export function metricsOf(frames, keyXs) {
  let maxX = 0, areaJump = 0, disp = 0, firstMax = 0;
  frames.forEach((f, i) => {
    maxX = Math.max(maxX, f.x);
    if (i > 0) {
      areaJump = Math.max(areaJump, Math.abs(f.area - frames[i - 1].area));
      const a = flatPts(frames[i - 1].subs), b = flatPts(f.subs);
      for (let k = 0; k < a.length; k++) disp = Math.max(disp, dist(a[k], b[k]));
    }
  });
  let wobble = 0;
  const a = [frames[0].cx, frames[0].cy], b = [frames.at(-1).cx, frames.at(-1).cy];
  for (const f of frames) wobble = Math.max(wobble, distToLine([f.cx, f.cy], a, b));
  const keyX = Math.max(...keyXs);
  firstMax = frames.filter((f) => f.x > keyX).length; // frames that have more crossings than the key poses
  return { maxX, keyX, addedX: Math.max(0, maxX - keyX), badFrames: firstMax, areaJump: r2(areaJump), disp: r2(disp), wobble: r2(wobble) };
}

export function rmsKeys(poses, a = 0, b = 1) {
  const pa = flatPts(flatten(poses[a].paths[0].d)), pb = flatPts(flatten(poses[b].paths[0].d));
  let s = 0;
  for (let i = 0; i < pa.length; i++) s += dist(pa[i], pb[i]) ** 2;
  return r2(Math.sqrt(s / pa.length));
}

export function analyse(poses) {
  const g = frameGeometry(poses);
  const keyX = poses.map((p) => crossings(flatten(p.paths[0].d)));
  const t1 = g.filter((f) => f.tr === 1);
  return { keyX, rms12: rmsKeys(poses), t1: metricsOf(t1, [keyX[0], keyX[1]]), t2: metricsOf(g.filter((f) => f.tr === 2), [keyX[1], keyX[2]]), all: metricsOf(g, keyX), later: metricsOf(g.filter((f) => f.tr >= 2), keyX.slice(1)) };
}

/**
 * Does variant x (B or C) pass against the original A on the first transition (the only one v2 changes)? All four must hold:
 *   no more in-between crossings than A (maxX), no more self-crossings in the key pose k1 than A,
 *   area jump at most 1.5 x A + 50 square units, centroid wobble at most A + 3 units.
 * These tolerances are judgement calls, not standards. A passing letter can still be rough if A was rough: read the raw numbers.
 */
export function passes(a, x) {
  return x.t1.maxX <= a.t1.maxX && x.keyX[0] <= a.keyX[0] && x.t1.areaJump <= a.t1.areaJump * 1.5 + 50 && x.t1.wobble <= a.t1.wobble + 3;
}
/**
 * Verdict for the v2 start (B). ok = B passes. twists = B fails but the start-shifted C passes (a start alignment cures it).
 * needs redraw = B and C both fail (the later poses need redrawing). Without a C only ok / twists can be said.
 */
export function verdict(a, b, c = null) {
  if (passes(a, b)) return 'ok';
  if (!c) return 'twists';
  return passes(a, c) ? 'twists' : 'needs redraw';
}

// ---- cyclic start shift ----------------------------------------------------------------------
/** Rotate the points of every sub-path of d by `shifts[i]` places (the new start is point shifts[i]); commands unchanged. */
export function rotatePath(d, shifts) {
  const p = parsePathD(d);
  const subs = flatten(d);
  const out = [];
  subs.forEach((pts, si) => {
    const n = pts.length, s = ((shifts[si] % n) + n) % n;
    const r = pts.map((_, i) => pts[(i + s) % n]);
    out.push('M ' + r[0].join(' ') + ' ' + r.slice(1).map((q) => 'L ' + q.join(' ')).join(' ') + ' Z');
  });
  const res = out.join(' ');
  if (!p || p.cmds.replace(/[^ML]/g, '') !== (res.match(/[ML]/g) || []).join('')) throw new Error('rotatePath: path is not M L ... Z only');
  return res;
}

/** For each sub-path pick the cyclic shift of d1's points that minimises the sum of squared distances to the points of d2. Winding is kept. */
export function bestShifts(d1, d2) {
  const s1 = flatten(d1), s2 = flatten(d2);
  if (s1.length !== s2.length) throw new Error('sub-path count differs');
  return s1.map((a, si) => {
    const b = s2[si], n = a.length;
    if (b.length !== n) throw new Error('point count differs');
    let best = 0, bestC = Infinity;
    for (let s = 0; s < n; s++) {
      let c = 0;
      for (let i = 0; i < n; i++) { const p = a[(i + s) % n], q = b[i]; c += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; }
      if (c < bestC - 1e-9) { bestC = c; best = s; }
    }
    return best;
  });
}

/** Per-sub-path shift costs: cost[si][s] = sum of squared distances between k1 point (i+s) and k2 point i. */
export function shiftCosts(d1, d2) {
  const s1 = flatten(d1), s2 = flatten(d2);
  return s1.map((a, si) => {
    const b = s2[si], n = a.length;
    return Array.from({ length: n }, (_, s) => { let c = 0; for (let i = 0; i < n; i++) { const p = a[(i + s) % n], q = b[i]; c += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; } return c; });
  });
}

const t1Of = (poses) => {
  const keyX = [crossings(flatten(poses[0].paths[0].d)), crossings(flatten(poses[1].paths[0].d))];
  return { keyX, rms12: rmsKeys(poses), t1: metricsOf(frameGeometry(poses, 0, STEPS, 1), keyX) };
};

/**
 * Start shift for each sub-path of k1 p1. Candidates are tried in order of total squared distance to k2 p1 (lowest first);
 * the first one whose first-transition crossings and area jump are no worse than the unshifted v2 is taken, else shift 0.
 * Winding, point count and commands are never changed. At most `limit` candidates are tried.
 */
export function chooseShifts(posesB, limit = 80) {
  const d1 = posesB[0].paths[0].d, d2 = posesB[1].paths[0].d;
  const costs = shiftCosts(d1, d2);
  const base = t1Of(posesB);
  let combos = [[]];
  for (const c of costs) {
    const order = c.map((v, s) => [v, s]).sort((x, y) => x[0] - y[0] || x[1] - y[1]).slice(0, 12);
    combos = combos.flatMap((pre) => order.map(([v, s]) => ({ shifts: [...(pre.shifts || []), s], cost: (pre.cost || 0) + v })));
  }
  combos.sort((x, y) => x.cost - y.cost);
  let tried = 0;
  for (const c of combos) {
    if (c.shifts.every((s) => s === 0)) return { shifts: c.shifts, tried, why: 'every lower-distance start was worse on crossings or area jump; kept the existing start' };
    if (tried++ >= limit) break;
    const poses = posesB.map((p, i) => (i ? p : { ...p, paths: p.paths.map((q, k) => (k ? q : { ...q, d: rotatePath(d1, c.shifts) })) }));
    const m = t1Of(poses);
    if (m.t1.maxX <= base.t1.maxX && m.keyX[0] <= base.keyX[0] && m.t1.areaJump <= base.t1.areaJump && m.rms12 <= base.rms12) return { shifts: c.shifts, tried, why: 'lowest-distance start that is no worse on crossings and area jump' };
  }
  return { shifts: costs.map(() => 0), tried, why: 'no shifted start in the first candidates was as good; kept the existing start' };
}

// ---- proposal D: carry the old k1 -> k2 change over to the v2 outline (never applied to any file) ------
/** Least-squares affine map taking points P to points Q: returns [a,b,c,d,e,f] with x' = a x + b y + c, y' = d x + e y + f. */
export function fitAffine(P, Q) {
  const solve = (rhs) => {
    // normal equations for [x y 1]: M w = v
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
    P.forEach((p, i) => { const r = [p[0], p[1], 1]; for (let a = 0; a < 3; a++) { v[a] += r[a] * rhs[i]; for (let b = 0; b < 3; b++) M[a][b] += r[a] * r[b]; } });
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M);
    if (Math.abs(D) < 1e-9) return [1, 0, 0];
    return [0, 1, 2].map((k) => det(M.map((row, i) => row.map((x, j) => (j === k ? v[i] : x)))) / D);
  };
  const [a, b, c] = solve(Q.map((q) => q[0])), [d, e, f] = solve(Q.map((q) => q[1]));
  return [a, b, c, d, e, f];
}
export const applyAffine = (m, p) => [m[0] * p[0] + m[1] * p[1] + m[2], m[3] * p[0] + m[4] * p[1] + m[5]];
const toD = (subs) => subs.map((pts) => 'M ' + pts[0].join(' ') + ' ' + pts.slice(1).map((q) => 'L ' + q.join(' ')).join(' ') + ' Z').join(' ');

/** Proposal D: pose 2 p1 = v2b k1 p1 moved by the affine map that carries the old k1 p1 onto the old k2 p1 (rounded to whole numbers). Same commands. */
export function proposeK2(posesA, posesC) {
  const oldK1 = flatten(posesA[0].paths[0].d).flat(), oldK2 = flatten(posesA[1].paths[0].d).flat();
  const m = fitAffine(oldK1, oldK2);
  const moved = flatten(posesC[0].paths[0].d).map((pts) => pts.map((q) => applyAffine(m, q).map((v) => Math.round(v))));
  const d = toD(moved);
  if (!compatibleCmds(d, posesA[1].paths[0].d)) throw new Error('proposeK2: commands differ');
  return posesC.map((p, i) => (i === 1 ? { ...p, paths: p.paths.map((q, k) => (k ? q : { ...q, d })) } : p));
}
const compatibleCmds = (a, b) => { const pa = parsePathD(a), pb = parsePathD(b); return !!(pa && pb && pa.cmds === pb.cmds); };

// ---- run over all letters --------------------------------------------------------------------
export function runAll({ poses: posesDir = DEFAULTS.poses, v2 = DEFAULTS.v2, v2b = null } = {}) {
  const records = loadRecords(posesDir);
  const rows = [];
  for (const item of LETTER_ORDER) {
    const A = loadOriginalPoses(posesDir, item, records);
    const bad = validatePoses(A);
    const bK1 = readFileSync(path.join(v2, `${item}-k1.svg`), 'utf8');
    const { poses: B, note } = withK1(A, bK1);
    const row = { item, structure: bad || 'ok', notes: note, A: analyse(A), B: analyse(B), _A: A, _B: B };
    const ch = chooseShifts(B);
    row.shifts = ch.shifts; row.shiftWhy = ch.why;
    row.pureMinShift = bestShifts(B[0].paths[0].d, B[1].paths[0].d);
    if (v2b) {
      const text = readFileSync(path.join(v2b, `${item}-k1.svg`), 'utf8');
      const { poses: C, note: nc } = withK1(A, text);
      row.C = analyse(C); row._C = C; row.notes.push(...nc.map((x) => 'v2b: ' + x));
      row.passC = passes(row.A, row.C);
      row._D = proposeK2(A, C); row.D = analyse(row._D); row.passD = passes(row.A, row.D);
    }
    row.verdictB = verdict(row.A, row.B, row.C || null);
    rows.push(row);
  }
  return rows;
}

const strip = (r) => { const { _A, _B, _C, _D, ...rest } = r; return rest; };

export function tableMarkdown(rows) {
  const hasC = rows.some((r) => r.C);
  const L = [];
  const head = ['letter', 'rms k1-k2 A/B' + (hasC ? '/C' : ''), 'keyX k1 A/B' + (hasC ? '/C' : ''), 'maxX k1>k2 A/B' + (hasC ? '/C' : ''),
    'areaJump A/B' + (hasC ? '/C' : ''), 'disp A/B' + (hasC ? '/C' : ''), 'wobble A/B' + (hasC ? '/C' : ''), 'k2>k7 maxX', 'verdict B' + (hasC ? ' (C passes: yes/no)' : '')];
  L.push('| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|');
  for (const r of rows) {
    const v = (k) => [r.A.t1[k], r.B.t1[k], ...(hasC ? [r.C.t1[k]] : [])].join(' / ');
    const key = [r.A.keyX[0], r.B.keyX[0], ...(hasC ? [r.C.keyX[0]] : [])].join(' / ');
    const rms = [r.A.rms12, r.B.rms12, ...(hasC ? [r.C.rms12] : [])].join(' / ');
    L.push(`| ${r.item} | ${rms} | ${key} | ${v('maxX')} | ${v('areaJump')} | ${v('disp')} | ${v('wobble')} | ${r.A.later.maxX} | ${r.verdictB}${hasC ? ' (' + (r.passC ? 'yes' : 'no') + ')' : ''} |`);
  }
  return L.join('\n');
}

/** Second table: proposal D (v2b k1 plus a k2 p1 carried over by an affine map), first and second transition, against the original. */
export function proposalMarkdown(rows) {
  const L = ['| letter | k1>k2 maxX A / D | k1>k2 areaJump A / D | k1>k2 wobble A / D | k2>k3 maxX A / D | k2>k3 areaJump A / D | D passes the test |', '|---|---|---|---|---|---|---|'];
  for (const r of rows) {
    if (!r.D) continue;
    L.push(`| ${r.item} | ${r.A.t1.maxX} / ${r.D.t1.maxX} | ${r.A.t1.areaJump} / ${r.D.t1.areaJump} | ${r.A.t1.wobble} / ${r.D.t1.wobble} | ${r.A.t2.maxX} / ${r.D.t2.maxX} | ${r.A.t2.areaJump} / ${r.D.t2.areaJump} | ${r.passD ? 'yes' : 'no'} |`);
  }
  return L.join('\n');
}

// ---- contact sheets --------------------------------------------------------------------------
const paint = (s) => s.replace(/var\(--m-ink, currentColor\)/g, '#111').replace(/var\(--m-\d, (#[0-9a-fA-F]{6})\)/g, '$1').replace(/"white"/g, '"#fff"');

function cell(poses, t, x, y, scale, label) {
  const fr = sampleFrame(poses, t);
  const body = fr.map((p) => {
    if (Number(p.opacity) <= 0.004) return '';
    return paint(`<path d="${p.d}" fill="${p.fill}" fill-rule="${p['fill-rule'] || 'evenodd'}" stroke="${p.stroke}" stroke-width="${p['stroke-width']}" stroke-linecap="round" stroke-linejoin="round" opacity="${p.opacity}"/>`);
  }).join('');
  return `<g transform="translate(${x},${y})"><rect width="${200 * scale}" height="${200 * scale}" fill="#fff" stroke="#ccc"/><g transform="scale(${scale})">${body}</g>`
    + `<text x="3" y="11" font-family="sans-serif" font-size="9" fill="#777">${label}</text></g>`;
}

/** SVG of the first transition (k1 to k2, 13 frames) for each variant: [{name, poses}]. */
export function sheetSvg(item, variants, steps = STEPS, scale = 0.42) {
  const cw = 200 * scale, labW = 70, top = 18;
  const w = labW + (steps + 1) * cw + 4, h = top + variants.length * (cw + 4) + 4;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fafafa"/>`,
    `<text x="4" y="13" font-family="sans-serif" font-size="12" fill="#222">${item}: k1 to k2 in ${steps} steps (0 to ${variants[0].poses[1].time_ms} ms, ${variants[0].poses[1].easing}). D is a proposal, not applied. Draft, no designer has reviewed this</text>`];
  variants.forEach((v, vi) => {
    const y = top + vi * (cw + 4);
    out.push(`<text x="4" y="${y + cw / 2}" font-family="sans-serif" font-size="11" fill="#222">${v.name}</text>`);
    for (let j = 0; j <= steps; j++) {
      const t = v.poses[0].time_ms + (v.poses[1].time_ms - v.poses[0].time_ms) * j / steps;
      out.push(cell(v.poses, t, labW + j * cw, y, scale, `${j}`));
    }
  });
  out.push('</svg>');
  return out.join('\n');
}

/** SVG overview: one row per letter, cells = old k1, v2 k1, then the original k2..k7 (the key poses only). */
export function overviewSvg(rows, scale = 0.36) {
  const cw = 200 * scale, labW = 70, top = 22, cols = 8;
  const w = labW + cols * (cw + 2) + 4, h = top + rows.length * (cw + 2) + 4;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fafafa"/>`];
  ['old k1', 'v2 k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'].forEach((n, c) => out.push(`<text x="${labW + c * (cw + 2) + 2}" y="14" font-family="sans-serif" font-size="10" fill="#222">${n}</text>`));
  rows.forEach((r, ri) => {
    const y = top + ri * (cw + 2);
    out.push(`<text x="3" y="${y + cw / 2 + 4}" font-family="sans-serif" font-size="10" fill="#222">${r.item}</text>`);
    const poses = [r._A[0], r._B[0], ...r._A.slice(1)];
    poses.forEach((p, c) => out.push(cell([p, p], p.time_ms, labW + c * (cw + 2), y, scale, '')));
  });
  out.push('</svg>');
  return out.join('\n');
}

function writeSheets(rows, dir) {
  mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, '.tmp.svg');
  const render = (name) => {
    const res = spawnSync('rsvg-convert', ['-o', path.join(dir, name), tmp], { encoding: 'utf8' });
    if (res.status !== 0) throw new Error('rsvg-convert failed: ' + (res.stderr || res.error));
  };
  let n = 0;
  for (const r of rows) {
    const variants = [{ name: 'A  old k1', poses: r._A }, { name: 'B  v2 k1', poses: r._B }];
    if (r._C) variants.push({ name: 'C  v2b k1', poses: r._C });
    if (r._D) variants.push({ name: 'D proposal', poses: r._D });
    writeFileSync(tmp, sheetSvg(r.item, variants));
    render(`${r.item}.png`);
    n++;
  }
  const half = Math.ceil(rows.length / 2);
  [rows.slice(0, half), rows.slice(half)].forEach((chunk, i) => { writeFileSync(tmp, overviewSvg(chunk)); render(`keyposes-${i + 1}.png`); n++; });
  rmSync(tmp, { force: true });
  return n;
}

// ---- v2b writer ------------------------------------------------------------------------------
/** Write v2b: copies of the v2 k1 files with each sub-path of p1 cyclically shifted. Everything else byte-identical. */
export function makeV2b(rows, v2, out) {
  mkdirSync(out, { recursive: true });
  const report = [];
  for (const r of rows) {
    const src = readFileSync(path.join(v2, `${r.item}-k1.svg`), 'utf8');
    const d = parsePoseSvg(src).paths[0].d;
    const nd = rotatePath(d, r.shifts);
    const text = src.replace(`d="${d}"`, `d="${nd}"`);
    if (text === src && r.shifts.some((s) => s !== 0)) throw new Error('v2b: replacement failed for ' + r.item);
    writeFileSync(path.join(out, `${r.item}-k1.svg`), text);
    report.push({ item: r.item, shifts: r.shifts });
  }
  return report;
}

/** Check a v2b folder against v2: same text except p1 d, which must be a cyclic shift (per sub-path) of the v2 d with the same commands and winding. Returns a list of problems. */
export function verifyV2b(v2, v2b) {
  const bad = [];
  for (const item of LETTER_ORDER) {
    const f = `${item}-k1.svg`;
    if (!existsSync(path.join(v2b, f))) { bad.push(`${item}: missing in v2b`); continue; }
    const a = readFileSync(path.join(v2, f), 'utf8'), b = readFileSync(path.join(v2b, f), 'utf8');
    const pa = parsePoseSvg(a), pb = parsePoseSvg(b);
    if (pa.paths.length !== pb.paths.length) { bad.push(`${item}: path count differs`); continue; }
    if (pa.paths.some((p, i) => p.id !== pb.paths[i].id)) bad.push(`${item}: ids differ`);
    const ca = parsePathD(pa.paths[0].d), cb = parsePathD(pb.paths[0].d);
    if (!ca || !cb || ca.cmds !== cb.cmds) bad.push(`${item}: commands differ`);
    if (a.replace(pa.paths[0].d, '#') !== b.replace(pb.paths[0].d, '#')) bad.push(`${item}: text differs outside p1 d`);
    const sa = flatten(pa.paths[0].d), sb = flatten(pb.paths[0].d);
    if (sa.length !== sb.length) { bad.push(`${item}: sub-path count differs`); continue; }
    sa.forEach((x, si) => {
      const y = sb[si];
      if (x.length !== y.length) { bad.push(`${item}: sub-path ${si + 1} point count differs`); return; }
      const key = (q) => q.join(',');
      const ok = x.some((_, s) => x.every((__, i) => key(x[(i + s) % x.length]) === key(y[i])));
      if (!ok) bad.push(`${item}: sub-path ${si + 1} is not a cyclic shift of the v2 one`);
      if (Math.sign(areaCentroid([x]).area) !== Math.sign(areaCentroid([y]).area)) bad.push(`${item}: winding changed`);
    });
  }
  return bad;
}

// ---- self-test -------------------------------------------------------------------------------
export function selfTest() {
  const out = [];
  const t = (name, ok, extra = '') => out.push({ name, ok: !!ok, extra });
  const sq = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';
  const bow = 'M 0 0 L 10 10 L 10 0 L 0 10 Z';
  t('square has 0 crossings', crossings(flatten(sq)) === 0);
  t('bow tie has 1 crossing', crossings(flatten(bow)) === 1, String(crossings(flatten(bow))));
  t('square area is 100 (signed)', Math.abs(areaCentroid(flatten(sq)).area) === 100);
  const c = areaCentroid(flatten(sq));
  t('square centroid is 5,5', c.cx === 5 && c.cy === 5);
  t('collapsed path has 0 crossings and no NaN', crossings(flatten('M 5 5 L 5 5 L 5 5 Z')) === 0 && Number.isFinite(areaCentroid(flatten('M 5 5 L 5 5 L 5 5 Z')).cx));
  t('hole subtracts area', Math.abs(areaCentroid(flatten('M 0 0 L 10 0 L 10 10 L 0 10 Z M 2 2 L 2 8 L 8 8 L 8 2 Z')).area) === 100 - 36);
  // rotation and best shift
  const rot = rotatePath(sq, [2]);
  t('rotatePath keeps the command letters', rot === 'M 10 10 L 0 10 L 0 0 L 10 0 Z', rot);
  t('bestShifts undoes a rotation', bestShifts(rot, sq)[0] === 2, String(bestShifts(rot, sq)));
  t('bestShifts of equal paths is 0', bestShifts(sq, sq)[0] === 0);
  t('rotatePath rejects curves', (() => { try { rotatePath('M 0 0 C 1 1 2 2 3 3 Z', [0]); return false; } catch { return true; } })());
  // a morph that twists: square to the same square started two corners later (diagonal collapse), versus aligned start
  const P = (d, tm, op = 1) => ({ time_ms: tm, easing: 'linear', paths: [{ id: 'p1', d, fill: 'none', stroke: '#000', 'stroke-width': '6', opacity: op }] });
  const quad = 'M 0 0 L 40 0 L 40 40 L 0 40 Z', shifted = rotatePath(quad, [1]);
  const bad = analyse([P(quad, 0), P(shifted, 400), P(shifted, 800), P(shifted, 1300), P(shifted, 1800), P(shifted, 2200), P(shifted, 2600)]);
  const good = analyse([P(quad, 0), P(quad, 400), P(quad, 800), P(quad, 1300), P(quad, 1800), P(quad, 2200), P(quad, 2600)]);
  t('a still morph has zero everything', good.t1.maxX === 0 && good.t1.disp === 0 && good.t1.areaJump === 0 && good.t1.wobble === 0);
  t('a rotated start moves points', bad.t1.disp > 0 && bad.rms12 > 0);
  // diagonal swap: a start that is a half-turn off makes the middle frame collapse through the centre
  const half = rotatePath(quad, [2]);
  const mid = analyse([P(quad, 0), P(half, 400), P(half, 800), P(half, 1300), P(half, 1800), P(half, 2200), P(half, 2600)]);
  t('a half-turn start collapses the middle frame (area jump or smaller area)', mid.t1.areaJump > 0 && mid.rms12 > 40, JSON.stringify(mid.t1));
  // an L shape turned half a turn and started one point later: both key poses are clean, the in-between frames cross
  const L6 = [[0, 0], [40, 0], [40, 10], [10, 10], [10, 40], [0, 40]];
  const mk = (pts) => 'M ' + pts[0].join(' ') + pts.slice(1).map((q) => ' L ' + q.join(' ')).join('') + ' Z';
  const turned = L6.map((q) => [40 - q[0], 40 - q[1]]);
  const tw1 = mk(turned.map((_, i) => turned[(i + 1) % 6])), tw0 = mk(turned);
  const tw = analyse([P(mk(L6), 0), P(tw1, 400), P(tw1, 800), P(tw1, 1300), P(tw1, 1800), P(tw1, 2200), P(tw1, 2600)]);
  const ok = analyse([P(mk(L6), 0), P(tw0, 400), P(tw0, 800), P(tw0, 1300), P(tw0, 1800), P(tw0, 2200), P(tw0, 2600)]);
  t('a mis-started turn adds crossings that the key poses do not have', tw.keyX[1] === 0 && tw.t1.addedX >= 1, JSON.stringify(tw.t1));
  t('the aligned start of the same turn adds none', ok.t1.addedX === 0, JSON.stringify(ok.t1));
  t('bestShifts finds the aligned start', bestShifts(tw1, tw0)[0] === 5, String(bestShifts(tw1, tw0)));
  t('verdict ok when B equals A', verdict(good, good) === 'ok');
  t('verdict twists when B fails and no shifted C is given', verdict(good, tw) === 'twists');
  t('verdict twists when B fails and C passes', verdict(good, tw, good) === 'twists');
  t('verdict needs redraw when B and C both fail', verdict(good, tw, tw) === 'needs redraw');
  t('passes rejects a larger first-transition crossing count', !passes(good, tw) && passes(tw, tw));
  const sc = chooseShifts([P(tw1, 0), P(tw0, 400), P(tw0, 800), P(tw0, 1300), P(tw0, 1800), P(tw0, 2200), P(tw0, 2600)]);
  t('chooseShifts re-aligns a start that is one point off', sc.shifts[0] === 5, JSON.stringify(sc));
  t('frameTimes gives 73 frames for 7 poses', frameTimes([P('M 0 0 L 1 1 Z', 0), P('M 0 0 L 1 1 Z', 400), P('M 0 0 L 1 1 Z', 800), P('M 0 0 L 1 1 Z', 1300), P('M 0 0 L 1 1 Z', 1800), P('M 0 0 L 1 1 Z', 2200), P('M 0 0 L 1 1 Z', 2600)]).length === 73);
  // withK1 refuses a different id
  t('withK1 rejects a file whose ids differ', (() => { try { withK1([P(quad, 0)], '<svg><path id="q9" d="M 0 0 L 1 1 Z"/></svg>'); return false; } catch { return true; } })());
  const tmpd = mkdtempSync(path.join(tmpdir(), 'mc-'));
  try {
    const v2d = path.join(tmpd, 'a'), v2bd = path.join(tmpd, 'b');
    mkdirSync(v2d); mkdirSync(v2bd);
    const svgOf = (d) => `<svg><title id="title">x</title><path id="p1" d="${d}" fill="none"/><path id="p2" d="M 1 1 L 2 2 Z"/></svg>`;
    for (const it of LETTER_ORDER) { writeFileSync(path.join(v2d, it + '-k1.svg'), svgOf(quad)); writeFileSync(path.join(v2bd, it + '-k1.svg'), svgOf(rotatePath(quad, [1]))); }
    t('verifyV2b accepts a pure start shift', verifyV2b(v2d, v2bd).length === 0, verifyV2b(v2d, v2bd).join(';'));
    writeFileSync(path.join(v2bd, 'shin-k1.svg'), svgOf('M 0 0 L 40 0 L 40 41 L 0 40 Z'));
    t('verifyV2b rejects a moved point', verifyV2b(v2d, v2bd).some((x) => x.startsWith('shin')));
    writeFileSync(path.join(v2bd, 'shin-k1.svg'), svgOf('M 0 0 L 0 40 L 40 40 L 40 0 Z'));
    t('verifyV2b rejects reversed winding', verifyV2b(v2d, v2bd).some((x) => x.startsWith('shin')));
  } finally { rmSync(tmpd, { recursive: true, force: true }); }
  const bad2 = out.filter((o) => !o.ok);
  return { out, bad: bad2.length, summary: bad2.length ? `${bad2.length} self-test check(s) FAILED` : `all ${out.length} self-test checks passed` };
}

// ---- CLI -------------------------------------------------------------------------------------
function main(argv) {
  const o = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--poses') o.poses = path.resolve(argv[++i]);
    else if (a === '--v2') o.v2 = path.resolve(argv[++i]);
    else if (a === '--v2b') o.v2b = path.resolve(argv[++i]);
    else if (a === '--json') o.json = path.resolve(argv[++i]);
    else if (a === '--table') o.table = path.resolve(argv[++i]);
    else if (a === '--sheets') o.sheets = path.resolve(argv[++i]);
    else if (a === '--make-v2b') o.makeV2b = path.resolve(argv[++i]);
    else if (a === '--self-test') o.self = true;
    else if (a === '-h' || a === '--help') { console.log('usage: morph_check.mjs [--poses DIR] [--v2 DIR] [--v2b DIR] [--json FILE] [--table FILE] [--sheets DIR] [--make-v2b DIR] [--self-test]'); return 0; }
    else { console.error('unknown argument ' + a); return 2; }
  }
  if (o.self) {
    const r = selfTest();
    for (const x of r.out) console.log((x.ok ? 'ok   ' : 'FAIL ') + x.name + (x.ok ? '' : '  ' + x.extra));
    console.log(r.summary);
    return r.bad ? 1 : 0;
  }
  for (const d of [o.poses, o.v2]) if (!existsSync(d)) { console.error('missing folder ' + d); return 2; }
  if (o.makeV2b) {
    const rows0 = runAll({ poses: o.poses, v2: o.v2 });
    const rep = makeV2b(rows0, o.v2, o.makeV2b);
    console.log(`wrote ${rep.length} k1 files to ${o.makeV2b}`);
    o.v2b = o.makeV2b;
  }
  if (o.v2b) { const bad = verifyV2b(o.v2, o.v2b); if (bad.length) { console.error('v2b is not a pure start shift of v2:\n' + bad.join('\n')); return 1; } console.log('v2b verified: 27 files, same commands, ids and point sets; only the start point of each sub-path moved'); }
  const rows = runAll({ poses: o.poses, v2: o.v2, v2b: o.v2b });
  if (o.sheets) console.log(`wrote ${writeSheets(rows, o.sheets)} contact sheets to ${o.sheets}`);
  const table = tableMarkdown(rows);
  if (o.table) writeFileSync(o.table, table + '\n\n' + proposalMarkdown(rows) + '\n');
  if (o.json) writeFileSync(o.json, JSON.stringify(rows.map(strip), null, 1) + '\n');
  console.log(table);
  if (o.v2b) console.log('\n' + proposalMarkdown(rows));
  const struct = rows.filter((r) => r.structure !== 'ok' || r.notes.length);
  for (const r of struct) console.log(`note ${r.item}: ${r.structure !== 'ok' ? r.structure + ' ' : ''}${r.notes.join('; ')}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
