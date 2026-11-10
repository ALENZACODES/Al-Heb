// Today's Mix composer (DRAFT). Pure functions — no DOM, no clock writes.
// Progressive depth: callers must hide the Mix until reveal thresholds (see data/fun/todays-mix.json).
// Freeze: does not touch cast art or production voice selection.

/** @param {{spokenTurns?:number, distinctDays?:number, revealAfterSpokenTurns?:number, revealAfterDistinctDays?:number}} s */
export function mixUnlocked(s = {}) {
  const turns = Math.max(0, Number(s.spokenTurns) || 0);
  const days = Math.max(0, Number(s.distinctDays) || 0);
  const needT = Math.max(0, Number(s.revealAfterSpokenTurns) || 3);
  const needD = Math.max(0, Number(s.revealAfterDistinctDays) || 2);
  return turns >= needT && days >= needD;
}

/**
 * Pick up to `tiles` costumes. Prefer bias list, then fill from costumes with hasRoute.
 * @param {{costumes:any[], beginnerBias?:string[], prayerBias?:string[], israelBias?:string[], tiles?:number}} catalog
 * @param {{goal?:string, hasRoute?:(n:string)=>boolean, rng?:()=>number}} opts
 */
export function composeMix(catalog, opts = {}) {
  const tiles = Math.max(1, Math.min(3, Number(catalog?.tiles) || 3));
  const goal = opts.goal || 'read';
  const ok = typeof opts.hasRoute === 'function' ? opts.hasRoute : () => true;
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const bias = goal === 'israel' ? (catalog.israelBias || [])
    : goal === 'read' ? (catalog.prayerBias || catalog.beginnerBias || [])
    : (catalog.beginnerBias || []);
  const byId = new Map((catalog.costumes || []).map((c) => [c.id, c]));
  const picked = [];
  const used = new Set();
  for (const id of bias) {
    const c = byId.get(id);
    if (!c || used.has(id) || !ok(c.route)) continue;
    picked.push(c); used.add(id);
    if (picked.length >= tiles) break;
  }
  const rest = (catalog.costumes || []).filter((c) => !used.has(c.id) && ok(c.route));
  while (picked.length < tiles && rest.length) {
    const i = Math.floor(rng() * rest.length);
    const [c] = rest.splice(i, 1);
    picked.push(c); used.add(c.id);
  }
  return {
    kind: 'todays-mix',
    title: "Today's Mix",
    blurb: 'About five minutes. The app picks the practice; you pick the path.',
    startLabel: 'Start my five minutes',
    tiles: picked.map((c) => ({ id: c.id, title: c.title, minutes: c.minutes, href: c.href, skill: c.skill })),
  };
}
