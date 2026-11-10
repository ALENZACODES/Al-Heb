// Pair pictures for a lesson that already teaches both words. The picture is the pair, not a vocabulary-id cue.

/** @type {readonly {id:string, glosses:readonly string[], alt:string}[]} */
export const OPPOSITE_PAIRS = Object.freeze([
  { id: 'OPP_expensive_cheap', glosses: ['expensive', 'cheap'], alt: 'A jewelled crown beside a plain paper cup.' },
  { id: 'OPP_expensive_cheap', glosses: ["it's expensive", "it's cheap"], alt: 'A jewelled crown beside a plain paper cup.' },
  { id: 'OPP_near_far', glosses: ['near', 'far'], alt: 'A large lighthouse beside a small lighthouse across the water.' },
]);

const norm = (s) => String(s || '').trim().toLowerCase();

/** The pair image for a lesson word list, or null when the list does not contain both exact glosses. */
export function oppositeFor(words) {
  const ens = new Set((words || []).map((w) => norm(w.en)));
  return OPPOSITE_PAIRS.find((p) => p.glosses.every((g) => ens.has(g))) || null;
}
