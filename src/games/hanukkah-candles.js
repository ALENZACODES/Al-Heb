// Hanukkah candle order: pure logic, no DOM (tests/games.hanukkah.test.js).
// Holders are numbered 1 to 8 from the RIGHT (holder 1 is the right-most). The shamash is separate.
//   - placing: right to left, so night n fills holders 1, 2, ..., n in that order;
//   - lighting: the shamash first, then left to right, newest candle first: holders n, n-1, ..., 1.

export const HOLDERS = 8;
export const SHAMASH = 'shamash';

/** Holders to fill on night n, in the order the candles go in (right to left). */
export function placementOrder(night) {
  const n = Math.max(1, Math.min(HOLDERS, Math.floor(night) || 1));
  return Array.from({ length: n }, (_, i) => i + 1);
}

/** Lighting order on night n: the shamash, then the newest (left-most) candle first, moving right. */
export function lightingOrder(night) {
  return [SHAMASH, ...placementOrder(night).reverse()];
}

/** Holders drawn from left to right on screen: 8 7 6 5 | shamash | 4 3 2 1 (shamash in the middle, raised). */
export const VISUAL_ORDER = Object.freeze([8, 7, 6, 5, SHAMASH, 4, 3, 2, 1]);

/**
 * A step-by-step checker for one night. phase 'place' then 'light' then 'done'.
 * tap(target) -> { ok, expected, phase, done } where target is a holder number or 'shamash'.
 */
export function createLighting(night) {
  const place = placementOrder(night);
  const light = lightingOrder(night);
  let phase = 'place', i = 0;
  const placed = new Set(), lit = new Set();
  return {
    night: place.length,
    get phase() { return phase; },
    get expected() { return phase === 'place' ? place[i] : phase === 'light' ? light[i] : null; },
    get placed() { return new Set(placed); },
    get lit() { return new Set(lit); },
    tap(target) {
      const expected = this.expected;
      if (phase === 'done') return { ok: false, expected: null, phase, done: true };
      if (phase === 'place' && target === SHAMASH) {
        // the shamash candle is always in its own holder; placing it is not a step
        return { ok: false, expected, phase, done: false, reason: 'shamash-stays' };
      }
      if (target !== expected) return { ok: false, expected, phase, done: false, reason: phase === 'place' ? 'place-order' : 'light-order' };
      if (phase === 'place') { placed.add(target); i++; if (i >= place.length) { phase = 'light'; i = 0; } }
      else { lit.add(target); i++; if (i >= light.length) phase = 'done'; }
      return { ok: true, expected: this.expected, phase, done: phase === 'done' };
    },
  };
}
