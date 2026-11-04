// 5,000-word vocabulary helpers (pure functions; load the JSON yourself with fetch or fs).
// Data: data/vocab/vocab5000.json  (schema "alef-vocab5k/1"). Built by tools/vocab/build_vocab5k.py.
// Tiers are cumulative SRS introduction bands: tier 500 = ranks 1-500, 1000 = 501-1000, 2000 = 1001-2000, 5000 = 2001-5000.

export const TIERS = [500, 1000, 2000, 5000];

/** @param {{entries:Array<{rank:number,tier:number,topic:string}>}} data @param {500|1000|2000|5000} tier cumulative */
export function upToTier(data, tier) {
  return data.entries.filter((e) => e.rank <= tier);
}

/** Entries introduced exactly in this tier band (not in earlier tiers). */
export function inTierBand(data, tier) {
  return data.entries.filter((e) => e.tier === tier);
}

export function byTopic(data, topic, maxTier = 5000) {
  return data.entries.filter((e) => e.topic === topic && e.tier <= maxTier);
}

/** Entries to teach next: ranked order, not in `known` (a Set of ids), limited to `n`. */
export function nextNew(data, known, n = 10, maxTier = 5000) {
  const out = [];
  for (const e of data.entries) {
    if (e.tier > maxTier) break;
    if (!known.has(e.id)) out.push(e);
    if (out.length >= n) break;
  }
  return out;
}

/** Seed for an SRS card: pointed form if present, else the unpointed lemma flagged for the UI. */
export function cardFor(e) {
  return { id: e.id, front: e.pointed || e.lemma, back: e.gloss, needsPointing: e.needsPointing, tier: e.tier, topic: e.topic };
}
