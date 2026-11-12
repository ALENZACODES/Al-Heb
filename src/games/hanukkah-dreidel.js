// Dreidel rules: pure logic, no DOM, so every rule is unit tested in Node (tests/games.hanukkah.test.js).
// House rules Aleph plays by (also shown to the learner, data/games/hanukkah/dreidel.json):
//   - everyone starts with the same gelt and antes one into the pot;
//   - נ Nun: nothing. ג Gimel: take the whole pot. ה Hey: take half the pot, rounding UP when the pot is odd.
//     ש Shin (or פ Pe on the Israeli dreidel): put one piece in;
//   - when the pot is empty or holds one piece, everyone antes again;
//   - a player with no gelt left is out; the last player with gelt wins. A short game also ends after a set number
//     of spins, and then the most gelt wins (a tie is shared).

export const FACES = Object.freeze({ diaspora: Object.freeze(['nun', 'gimel', 'hey', 'shin']), israel: Object.freeze(['nun', 'gimel', 'hey', 'pe']) });
export const RULE_OF = Object.freeze({ nun: 'none', gimel: 'all', hey: 'half', shin: 'put', pe: 'put' });

/** Hey's share of the pot: half, rounded up on an odd pot (5 gives 3; 1 gives 1). */
export const heyShare = (pot) => Math.ceil(Math.max(0, pot) / 2);

/** One line that shows the rounding, for the screen: "Half of 5 is 2½. Round up: take 3." */
export function heyExplain(pot) {
  const take = heyShare(pot);
  if (pot % 2 === 0) return `Half of ${pot} is ${take}. Take ${take}.`;
  return `Half of ${pot} is ${Math.floor(pot / 2)}½. Round up: take ${take}.`;
}

/**
 * A fair whole number in [0, n): crypto.getRandomValues with rejection sampling (no modulo bias), falling back to
 * Math.random when the browser has no crypto. Tests pass their own rnd() instead.
 */
export function fairIndex(n, rnd = null) {
  if (typeof rnd === 'function') return Math.min(n - 1, Math.floor(rnd() * n));
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const limit = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    for (let i = 0; i < 64; i++) { c.getRandomValues(buf); if (buf[0] < limit) return buf[0] % n; }
  }
  return Math.floor(Math.random() * n);
}

/** Spin: one of the four faces, each equally likely. */
export function spinFace(variant = 'diaspora', rnd = null) {
  const faces = FACES[variant] || FACES.diaspora;
  return faces[fairIndex(faces.length, rnd)];
}

/**
 * New game. players: [{ id, name, human? }]. Everyone antes once at the start.
 * @param {{players:{id:string,name:string,human?:boolean}[], start?:number, variant?:'diaspora'|'israel', maxSpins?:number}} o
 */
export function createDreidelGame({ players, start = 10, variant = 'diaspora', maxSpins = 0 } = {}) {
  if (!Array.isArray(players) || players.length < 2) throw new Error('dreidel needs at least two players');
  const g = {
    variant: FACES[variant] ? variant : 'diaspora', start, maxSpins,
    players: players.map((p) => ({ id: p.id, name: p.name, human: !!p.human, gelt: start, out: false })),
    pot: 0, turn: 0, spins: 0, over: false, winners: [], log: [],
  };
  const paid = ante(g);
  g.log.push({ type: 'ante', paid, pot: g.pot });
  return g;
}

/** Every player still in puts one piece in. Returns the ids that paid. Players with no gelt are marked out. */
export function ante(g) {
  const paid = [];
  for (const p of g.players) {
    if (p.out) continue;
    if (p.gelt > 0) { p.gelt -= 1; g.pot += 1; paid.push(p.id); }
  }
  return paid;
}

export const activePlayers = (g) => g.players.filter((p) => !p.out);
export const currentPlayer = (g) => g.players[g.turn];

/**
 * Apply a face for the current player. Returns what happened, in order, so the screen can show and announce it:
 * { player, face, rule, potBefore, took, put, potAfter, reAnte: [ids]|null, out: [ids], over, winners }.
 */
export function applyFace(g, face) {
  if (g.over) throw new Error('game is over');
  const rule = RULE_OF[face];
  if (!rule) throw new Error('unknown face ' + face);
  const p = currentPlayer(g);
  const potBefore = g.pot;
  let took = 0, put = 0;
  if (rule === 'all') took = g.pot;
  else if (rule === 'half') took = heyShare(g.pot);
  else if (rule === 'put' && p.gelt > 0) put = 1;
  p.gelt += took - put; g.pot += put - took;
  const owedButBroke = rule === 'put' && put === 0; // a Shin with nothing to give
  g.spins += 1;
  // Out: anyone at zero gelt (the spinner after paying their last piece, or one who could not pay).
  const out = [];
  const markOut = () => { for (const q of g.players) if (!q.out && q.gelt <= 0) { q.out = true; out.push(q.id); } };
  if (owedButBroke) { p.out = true; out.push(p.id); }
  markOut();
  // Re-ante when the pot is empty or has one piece, and at least two players remain to play for it.
  let reAnte = null;
  if (g.pot <= 1 && activePlayers(g).length >= 2) { reAnte = ante(g); markOut(); }
  const event = { player: p.id, face, rule, potBefore, took, put, potAfter: g.pot, reAnte, out, over: false, winners: [] };
  g.log.push({ type: 'spin', ...event });
  finishIfDone(g);
  if (!g.over) advance(g);
  event.over = g.over; event.winners = [...g.winners];
  return event;
}

/** Move the turn to the next player still in. */
export function advance(g) {
  const n = g.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (g.turn + k) % n;
    if (!g.players[i].out) { g.turn = i; return i; }
  }
  return g.turn;
}

/** Ends the game when one player is left, or (short game) after maxSpins; winners are the most gelt (ties shared). */
export function finishIfDone(g) {
  const left = activePlayers(g);
  if (left.length === 1) { g.over = true; g.winners = [left[0].id]; return true; }
  if (left.length === 0) { // cannot happen with start >= 2 (the gelt never vanishes), kept so a bad start value still ends cleanly
    const top = Math.max(...g.players.map((p) => p.gelt));
    g.over = true; g.winners = g.players.filter((p) => p.gelt === top).map((p) => p.id); return true;
  }
  if (g.maxSpins && g.spins >= g.maxSpins) {
    const top = Math.max(...left.map((p) => p.gelt));
    g.over = true; g.winners = left.filter((p) => p.gelt === top).map((p) => p.id);
    return true;
  }
  return false;
}

/** Plain-English sentence for one spin result (also the screen-reader line). names: id -> display name. */
export function describe(event, names = {}, letters = {}) {
  const who = names[event.player] || event.player;
  const L = letters[event.face] || { he: '', name: event.face };
  const head = `${who} spun ${L.he} ${L.name}.`.replace(/\s+/g, ' ');
  let body = '';
  if (event.rule === 'none') body = 'Nothing happens.';
  else if (event.rule === 'all') body = event.took ? `Takes the whole pot: ${event.took}.` : 'The pot was empty, so nothing to take.';
  else if (event.rule === 'half') body = event.potBefore ? `${heyExplain(event.potBefore)}` : 'The pot was empty, so nothing to take.';
  else body = event.put ? 'Puts one piece in.' : 'Has nothing left to put in.';
  const tail = [];
  if (event.out.length) tail.push(`${event.out.map((id) => names[id] || id).join(' and ')} ${event.out.length > 1 ? 'are' : 'is'} out.`);
  if (event.reAnte) tail.push(`The pot is ${event.potAfter - event.reAnte.length <= 0 ? 'empty' : 'down to one'}, so everyone puts one in.`);
  return [head, body, ...tail].join(' ');
}
