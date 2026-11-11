// @ts-check
/**
 * Krav Maga style (IKMF-style) belts and rank patches (data/curriculum/belts.json). Pure. Each rank is a contiguous run of
 * Reading-track lessons in course order (file order), `from`..`to`; it is earned only when all its lessons and all earlier ranks are done.
 *
 *   White  P0          Yellow P1 P2      Orange P3 P4      Green P5 G1
 *   Blue   G2 G3       Brown  G4 G5      Black  E1 E2 E3 E4 E5
 */

export const PATCH_NAMES = Object.freeze({ P: 'Practitioner', G: 'Graduate', E: 'Expert' });
export const PATCH_COLOURS = Object.freeze({ P: 'yellow', G: 'cyan', E: 'red' });

function splitId(id) {
  const m = /^(.*?)(\d+)$/.exec(String(id));
  return m ? { pre: m[1], n: Number(m[2]) } : null;
}

/** ["r10","r11","r12"] -> "r10–r12"; a gap starts a new run ("I-09–I-10, I-26"). */
export function rangeText(ids) {
  const runs = [];
  for (const id of ids) {
    const s = splitId(id), last = runs[runs.length - 1];
    if (last && s && last.pre === s.pre && last.n + 1 === s.n) { last.n = s.n; last.to = id; } else runs.push(s ? { pre: s.pre, n: s.n, from: id, to: id } : { pre: id, n: NaN, from: id, to: id });
  }
  return runs.map((r) => (r.from === r.to ? r.from : `${r.from}–${r.to}`)).join(', ');
}

/** "Yellow belt · P2" */
export function rankLabel(r) { return `${r.beltName} belt · ${r.id}`; }

/** "Yellow belt, Practitioner 2: yellow P patch with 2 stripes" (screen readers, tooltips). */
export function rankA11y(r) {
  const s = r.stripes === 0 ? 'no stripes' : r.stripes === 1 ? '1 stripe' : `${r.stripes} stripes`;
  return `${r.beltName} belt, ${PATCH_NAMES[r.patch] || r.patch} ${r.stripes}: ${PATCH_COLOURS[r.patch] || ''} ${r.patch} patch with ${s}`.replace(/\s+/g, ' ');
}

/** Ranks with lesson ids, label and range. Throws when `from`/`to` is off the track or backwards. @param {any} beltsFile @param {any[]} lessons */
export function resolveRanks(beltsFile, lessons) {
  const track = beltsFile?.track || 'read';
  const order = (lessons || []).filter((l) => l && l.track === track).map((l) => l.id);
  const beltName = Object.fromEntries((beltsFile?.belts || []).map((b) => [b.id, b.name]));
  return (beltsFile?.ranks || []).map((r, i) => {
    const a = order.indexOf(r.from), b = order.indexOf(r.to);
    if (a < 0 || b < 0 || b < a) throw new Error(`belts.json rank ${r.id}: ${r.from}..${r.to} is not a forward range on the ${track} track`);
    const ids = order.slice(a, b + 1);
    const out = { ...r, index: i, track, beltName: beltName[r.belt] || r.belt, patchName: PATCH_NAMES[r.patch] || r.patch, lessons: ids, range: rangeText(ids) };
    return { ...out, label: rankLabel(out), a11y: rankA11y(out) };
  });
}

/** Map lesson id -> rank (only lessons that belong to a rank). */
export function rankByLesson(ranks) {
  const m = new Map();
  for (const r of ranks) for (const id of r.lessons) m.set(id, r);
  return m;
}

/** state per rank: earned | current (first not earned) | later. `done`: Set, array or {id: truthy} of finished lessons. @returns {any[]} */
export function rankStates(ranks, done) {
  const has = done instanceof Set ? (id) => done.has(id) : Array.isArray(done) ? ((s) => (id) => s.has(id))(new Set(done)) : (id) => !!(done && done[id]);
  let chainOk = true, currentSeen = false;
  return ranks.map((r) => {
    const doneCount = r.lessons.filter(has).length, total = r.lessons.length;
    const complete = total > 0 && doneCount === total;
    let state;
    if (chainOk && complete) state = 'earned';
    else { chainOk = false; state = currentSeen ? 'later' : 'current'; currentSeen = true; }
    return { ...r, state, doneCount, total };
  });
}

/** Highest earned rank (or null) and current rank (null once all are earned). */
export function rankSummary(ranks, done) {
  const st = rankStates(ranks, done);
  const earned = st.filter((r) => r.state === 'earned');
  return { states: st, highest: earned.length ? earned[earned.length - 1] : null, current: st.find((r) => r.state === 'current') || null, earnedCount: earned.length, total: st.length };
}

/** A lesson's level: its rank label, else the Israel-track stage (not a CEFR claim). */
export const STAGE_LABEL = Object.freeze({ A1: 'Stage 1', A2: 'Stage 2', B1: 'Stage 3', intermediate: 'Intermediate' });
export function lessonLevelLabel(lesson, byLesson) {
  const r = byLesson && lesson ? byLesson.get(lesson.id) : null;
  if (r) return r.label;
  const L = String(lesson?.level || '');
  return STAGE_LABEL[L] || (L ? L[0].toUpperCase() + L.slice(1) + ' belt' : '');
}

/**
 * Badge: CSS belt swatch and patch (aria-hidden) plus the text label, so colour is never the only cue; title = full description.
 * `h` is the caller's element factory. o.text overrides the visible text (null: screen-reader text only). @param {Function} h @param {any} r
 */
export function rankBadge(h, r, o = {}) {
  const stripes = [];
  for (let i = 0; i < r.stripes; i++) stripes.push(h('i', { class: 'alef-rank-stripe' }));
  const text = o.text === undefined ? r.label : o.text;
  return h('span', { class: 'alef-rank', 'data-belt': r.belt, 'data-patch': r.patch, 'data-rank': r.id, title: r.a11y },
    h('span', { class: 'alef-rank-belt', 'aria-hidden': 'true' }),
    h('span', { class: 'alef-rank-patch', 'aria-hidden': 'true', 'data-letter': r.patch }, ...stripes), // letter drawn by CSS: copied text stays "Yellow belt · P2"
    text === null ? h('span', { class: 'visually-hidden' }, r.a11y) : h('span', { class: 'alef-rank-text' }, text));
}
