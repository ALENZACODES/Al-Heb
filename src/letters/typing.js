// Aleph lane 2: Israeli SI-1452 typing trainer (pure logic; the view draws the keyboard).
// Layout data: data/letters/keyboard-si1452.json (built from xkeyboard-config symbols/il; see SOURCES.md).
// @ts-check

/** XKB key name -> DOM KeyboardEvent.code (physical position, independent of the OS layout). */
export const XKB_TO_DOM = Object.freeze({
  TLDE: 'Backquote', AE01: 'Digit1', AE02: 'Digit2', AE03: 'Digit3', AE04: 'Digit4', AE05: 'Digit5', AE06: 'Digit6',
  AE07: 'Digit7', AE08: 'Digit8', AE09: 'Digit9', AE10: 'Digit0', AE11: 'Minus', AE12: 'Equal',
  AD01: 'KeyQ', AD02: 'KeyW', AD03: 'KeyE', AD04: 'KeyR', AD05: 'KeyT', AD06: 'KeyY', AD07: 'KeyU', AD08: 'KeyI', AD09: 'KeyO', AD10: 'KeyP',
  AD11: 'BracketLeft', AD12: 'BracketRight', BKSL: 'Backslash',
  AC01: 'KeyA', AC02: 'KeyS', AC03: 'KeyD', AC04: 'KeyF', AC05: 'KeyG', AC06: 'KeyH', AC07: 'KeyJ', AC08: 'KeyK', AC09: 'KeyL', AC10: 'Semicolon', AC11: 'Quote',
  AB01: 'KeyZ', AB02: 'KeyX', AB03: 'KeyC', AB04: 'KeyV', AB05: 'KeyB', AB06: 'KeyN', AB07: 'KeyM', AB08: 'Comma', AB09: 'Period', AB10: 'Slash'
});

/** @typedef {{code:string, qwerty:string|null, char:string, layer?:string, modifier?:string, keycapBase?:string, codepoint?:string}} KeyRef */

/** Physical key for a letter id (e.g. 'kaf-final'). @returns {KeyRef|null} */
export function keyForLetter(layout, id) { return (layout && layout.letters && layout.letters[id]) || null; }

/** Physical key + AltGr for a niqqud id (e.g. 'kamatz'). Returns null for ids with no key (shuruk). @returns {KeyRef|null} */
export function keyForNiqqud(layout, id) { return (layout && layout.niqqud && layout.niqqud[id]) || null; }

/** Reverse lookup: Hebrew character (base layer) -> letter id. */
export function letterIdForChar(layout, ch) {
  for (const id of Object.keys(layout.letters || {})) if (layout.letters[id].char === ch) return id;
  return null;
}

/**
 * Check one key press against a target.
 * @param {any} layout
 * @param {{kind:'letter'|'niqqud', id:string}} target
 * @param {{code?:string, key?:string, altGraph?:boolean}} input  from a KeyboardEvent (altGraph = ev.getModifierState('AltGraph'))
 * @returns {{ok:boolean, expected:KeyRef|null, reason?:string}}
 */
export function checkInput(layout, target, input) {
  const expected = target.kind === 'niqqud' ? keyForNiqqud(layout, target.id) : keyForLetter(layout, target.id);
  if (!expected) return { ok: false, expected: null, reason: 'no-key' };
  const domCode = XKB_TO_DOM[expected.code];
  const needsAltGr = target.kind === 'niqqud';
  const codeOk = !!input.code && input.code === domCode;
  const charOk = !!input.key && input.key === expected.char;
  if (needsAltGr) {
    if (charOk) return { ok: true, expected };          // OS already produced the mark
    if (codeOk && input.altGraph) return { ok: true, expected };
    if (codeOk) return { ok: false, expected, reason: 'needs-altgr' };
    return { ok: false, expected, reason: 'wrong-key' };
  }
  if (charOk || (codeOk && !input.altGraph)) return { ok: true, expected };
  return { ok: false, expected, reason: 'wrong-key' };
}

/** Deterministic PRNG (mulberry32) so drills are testable. */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Typing trainer: picks targets (weighted toward recent misses) and checks key presses.
 * @param {any} layout parsed keyboard-si1452.json
 * @param {{pool?:string[], kind?:'letter'|'niqqud', rng?:()=>number}} [opts] pool = ids; default all letters (or all niqqud with a key)
 */
export function createTrainer(layout, opts = {}) {
  const kind = opts.kind || 'letter';
  const rng = opts.rng || Math.random;
  const all = Object.keys(kind === 'niqqud' ? layout.niqqud : layout.letters);
  const pool = (opts.pool && opts.pool.length ? opts.pool : all).filter(id => all.includes(id));
  if (!pool.length) throw new Error('createTrainer: empty pool');
  const weight = new Map(pool.map(id => [id, 1]));
  const stats = { asked: 0, correct: 0, missed: /** @type {Record<string,number>} */ ({}) };
  /** @type {{kind:'letter'|'niqqud', id:string}} */ let current = pick(null);

  function pick(avoid) {
    let total = 0; for (const id of pool) total += (pool.length > 1 && id === avoid) ? 0 : weight.get(id);
    let r = rng() * total;
    for (const id of pool) {
      if (pool.length > 1 && id === avoid) continue;
      r -= weight.get(id); if (r <= 0) return { kind, id };
    }
    return { kind, id: pool[pool.length - 1] };
  }

  return {
    target() { return current; },
    expected() { return kind === 'niqqud' ? keyForNiqqud(layout, current.id) : keyForLetter(layout, current.id); },
    /** @param {{code?:string,key?:string,altGraph?:boolean}} input */
    answer(input) {
      const res = checkInput(layout, current, input);
      stats.asked++;
      if (res.ok) {
        stats.correct++;
        weight.set(current.id, Math.max(1, weight.get(current.id) - 1));
        current = pick(current.id);
      } else {
        stats.missed[current.id] = (stats.missed[current.id] || 0) + 1;
        weight.set(current.id, weight.get(current.id) + 2);
      }
      return res;
    },
    skip() { current = pick(current.id); },
    stats() { return { asked: stats.asked, correct: stats.correct, accuracy: stats.asked ? stats.correct / stats.asked : 0, missed: Object.assign({}, stats.missed) }; }
  };
}

/** Rows for drawing an on-screen keyboard: [{code, qwerty, base, shift, altgr, domCode}] grouped by row. */
export function keyboardRows(layout) {
  const order = [
    ['TLDE','AE01','AE02','AE03','AE04','AE05','AE06','AE07','AE08','AE09','AE10','AE11','AE12'],
    ['AD01','AD02','AD03','AD04','AD05','AD06','AD07','AD08','AD09','AD10','AD11','AD12','BKSL'],
    ['AC01','AC02','AC03','AC04','AC05','AC06','AC07','AC08','AC09','AC10','AC11'],
    ['AB01','AB02','AB03','AB04','AB05','AB06','AB07','AB08','AB09','AB10']
  ];
  const by = new Map(layout.keys.map(k => [k.code, k]));
  return order.map(row => row.filter(c => by.has(c)).map(c => Object.assign({ domCode: XKB_TO_DOM[c] }, by.get(c))));
}
